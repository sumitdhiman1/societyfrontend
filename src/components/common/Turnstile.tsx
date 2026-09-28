"use client";

import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: (error?: any) => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "flexible";
          appearance?: "always" | "execute" | "interaction-only";
          execution?: "render" | "execute";
          [key: string]: any;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
      execute: (container: HTMLElement | string, params?: any) => void;
      getResponse: (widgetId?: string) => string | undefined;
    };
    onloadTurnstileCallback?: () => void;
  }
}

export interface TurnstileRef {
  reset: () => void;
  remove: () => void;
  execute: () => void;
  getResponse: () => string | undefined;
}

export interface TurnstileProps {
  siteKey?: string;
  onVerify?: (token: string) => void;
  onExpire?: () => void;
  onError?: (error?: any) => void;
  theme?: "light" | "dark" | "auto";
  /** Use "invisible" to render a hidden widget that challenges on execute(). */
  size?: "normal" | "compact" | "flexible" | "invisible";
  appearance?: "always" | "execute" | "interaction-only";
  className?: string;
}

const DEFAULT_TEST_SITE_KEY = "1x00000000000000000000AA";

// Global script loader — shared across all Turnstile widget instances on the page
function loadTurnstileScript(onLoaded: () => void) {
  if (typeof window === "undefined") return;

  if (window.turnstile) {
    onLoaded();
    return;
  }

  // Subscribe to the ready event
  const handleScriptReady = () => {
    window.removeEventListener("cf-turnstile:ready", handleScriptReady);
    onLoaded();
  };
  window.addEventListener("cf-turnstile:ready", handleScriptReady);

  const scriptId = "cf-turnstile-script";
  if (!document.getElementById(scriptId)) {
    const script = document.createElement("script");
    script.id = scriptId;
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit";
    script.async = true;
    script.defer = true;
    script.onerror = (err) => console.error("Failed to load Turnstile script:", err);
    document.head.appendChild(script);
  }

  // Chain onto existing callback so multiple mounts don't stomp each other
  const prevCallback = window.onloadTurnstileCallback;
  window.onloadTurnstileCallback = () => {
    if (prevCallback) {
      try { prevCallback(); } catch { /* ignore */ }
    }
    window.dispatchEvent(new CustomEvent("cf-turnstile:ready"));
  };

  // Polling fallback — catches race where script already loaded before we attached
  const interval = setInterval(() => {
    if (window.turnstile) {
      clearInterval(interval);
      window.dispatchEvent(new CustomEvent("cf-turnstile:ready"));
    }
  }, 50);
  setTimeout(() => clearInterval(interval), 15000);
}

export const Turnstile = forwardRef<TurnstileRef, TurnstileProps>(
  (
    {
      siteKey,
      onVerify,
      onExpire,
      onError,
      theme = "light",
      size = "normal",
      appearance,
      className = "",
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<string | null>(null);
    const latestTokenRef = useRef<string | null>(null);
    const [isScriptLoaded, setIsScriptLoaded] = useState(false);

    const onVerifyRef = useRef(onVerify);
    const onExpireRef = useRef(onExpire);
    const onErrorRef = useRef(onError);

    useEffect(() => {
      onVerifyRef.current = onVerify;
      onExpireRef.current = onExpire;
      onErrorRef.current = onError;
    });

    const resolvedSiteKey =
      siteKey ||
      process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY ||
      DEFAULT_TEST_SITE_KEY;

    const isInvisibleMode = size === "invisible";

    useImperativeHandle(ref, () => ({
      reset: () => {
        latestTokenRef.current = null;
        if (window.turnstile && widgetIdRef.current) {
          try { window.turnstile.reset(widgetIdRef.current); } catch { /* ignore */ }
        }
      },
      remove: () => {
        latestTokenRef.current = null;
        if (window.turnstile && widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current);
            widgetIdRef.current = null;
          } catch { /* ignore */ }
        }
      },
      execute: () => {
        // Pass the container element — Cloudflare execute() requires the DOM node
        if (window.turnstile && containerRef.current) {
          try {
            window.turnstile.execute(containerRef.current);
          } catch (e) {
            console.error("Turnstile execute error:", e);
          }
        }
      },
      getResponse: () => {
        if (latestTokenRef.current) return latestTokenRef.current;
        if (window.turnstile && widgetIdRef.current) {
          try {
            const token = window.turnstile.getResponse(widgetIdRef.current);
            if (token) { latestTokenRef.current = token; return token; }
          } catch { /* ignore */ }
        }
        return undefined;
      },
    }));

    useEffect(() => {
      loadTurnstileScript(() => setIsScriptLoaded(true));
    }, []);

    useEffect(() => {
      if (!isScriptLoaded || !containerRef.current || !window.turnstile) return;

      // Clean up any previous widget in this container
      if (widgetIdRef.current) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
        widgetIdRef.current = null;
      }

      try {
        const renderParams: any = {
          sitekey: resolvedSiteKey,
          theme,
          // Cloudflare valid sizes: "normal" | "compact" | "flexible"
          // For invisible mode: use "compact" with appearance="execute" so the widget
          // renders dormant and only challenges when execute() is explicitly called.
          size: isInvisibleMode ? "compact" : size,
          appearance: appearance ?? (isInvisibleMode ? "execute" : "always"),
          // execution="execute" means the challenge only runs when execute() is called
          ...(isInvisibleMode ? { execution: "execute" } : {}),
          callback: (token: string) => {
            latestTokenRef.current = token;
            if (onVerifyRef.current) onVerifyRef.current(token);
          },
          "expired-callback": () => {
            latestTokenRef.current = null;
            if (onExpireRef.current) onExpireRef.current();
          },
          "error-callback": (err: any) => {
            latestTokenRef.current = null;
            console.error("Turnstile error:", err);
            if (onErrorRef.current) onErrorRef.current(err);
          },
        };

        const widgetId = window.turnstile.render(containerRef.current, renderParams);
        widgetIdRef.current = widgetId;
        console.log("[Turnstile] Widget rendered:", widgetId, "| sitekey:", resolvedSiteKey, "| mode:", isInvisibleMode ? "invisible" : size);
      } catch (err) {
        console.error("Failed to render Turnstile widget:", err);
        if (onErrorRef.current) onErrorRef.current(err);
      }

      return () => {
        if (window.turnstile && widgetIdRef.current) {
          try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
          widgetIdRef.current = null;
        }
      };
    }, [isScriptLoaded, resolvedSiteKey, theme, size, appearance]);

    return (
      <div
        className={`turnstile-container ${className}`}
        style={
          isInvisibleMode
            ? {
                // Render in normal flow but invisible.
                // Real dimensions are required for Cloudflare's iframe to load and
                // complete the challenge. visibility:hidden preserves layout space.
                visibility: "hidden",
                width: "130px",
                height: "30px",
                overflow: "hidden",
                pointerEvents: "none",
              }
            : undefined
        }
      >
        <div ref={containerRef} />
      </div>
    );
  }
);

Turnstile.displayName = "Turnstile";
export default Turnstile;
