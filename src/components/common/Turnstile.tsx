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
          size?: "normal" | "compact" | "invisible" | "flexible";
          appearance?: "always" | "execute" | "interaction-only";
          [key: string]: any;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
      execute: (container?: HTMLElement | string, params?: any) => void;
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
  size?: "normal" | "compact" | "invisible" | "flexible";
  appearance?: "always" | "execute" | "interaction-only";
  className?: string;
}

const DEFAULT_TEST_SITE_KEY = "1x00000000000000000000AA";

// Robust global script loader helper with event listener and polling fallback
function loadTurnstileScript(onLoaded: () => void) {
  if (typeof window === "undefined") return;

  if (window.turnstile) {
    onLoaded();
    return;
  }

  const handleScriptReady = () => {
    window.removeEventListener("cf-turnstile:ready", handleScriptReady);
    onLoaded();
  };

  window.addEventListener("cf-turnstile:ready", handleScriptReady);

  const scriptId = "cf-turnstile-script";
  let script = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit";
    script.async = true;
    script.defer = true;

    script.onerror = (err) => {
      console.error("Failed to load Cloudflare Turnstile script:", err);
    };

    document.head.appendChild(script);
  }

  const prevCallback = window.onloadTurnstileCallback;
  window.onloadTurnstileCallback = () => {
    if (prevCallback) {
      try {
        prevCallback();
      } catch (e) {
        console.error("Error in previous turnstile callback:", e);
      }
    }
    window.dispatchEvent(new CustomEvent("cf-turnstile:ready"));
  };

  // Fallback poller in case the script finishes without calling the hook
  const interval = setInterval(() => {
    if (window.turnstile) {
      clearInterval(interval);
      window.dispatchEvent(new CustomEvent("cf-turnstile:ready"));
      onLoaded();
    }
  }, 50);

  setTimeout(() => clearInterval(interval), 10000);
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

    useImperativeHandle(ref, () => ({
      reset: () => {
        latestTokenRef.current = null;
        if (typeof window !== "undefined" && window.turnstile && widgetIdRef.current) {
          try {
            window.turnstile.reset(widgetIdRef.current);
          } catch (e) {
            console.error("Turnstile reset error:", e);
          }
        }
      },
      remove: () => {
        latestTokenRef.current = null;
        if (typeof window !== "undefined" && window.turnstile && widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current);
            widgetIdRef.current = null;
          } catch (e) {
            console.error("Turnstile remove error:", e);
          }
        }
      },
      execute: () => {
        if (typeof window !== "undefined" && window.turnstile && widgetIdRef.current) {
          try {
            window.turnstile.execute(widgetIdRef.current);
          } catch (e) {
            console.error("Turnstile execute error:", e);
          }
        }
      },
      getResponse: () => {
        if (latestTokenRef.current) {
          return latestTokenRef.current;
        }
        if (typeof window !== "undefined" && window.turnstile && widgetIdRef.current) {
          try {
            const token = window.turnstile.getResponse(widgetIdRef.current);
            if (token) {
              latestTokenRef.current = token;
              return token;
            }
          } catch (e) {
            console.error("Turnstile getResponse error:", e);
          }
        }
        return undefined;
      },
    }));

    useEffect(() => {
      loadTurnstileScript(() => {
        setIsScriptLoaded(true);
      });
    }, []);

    useEffect(() => {
      if (!isScriptLoaded || !containerRef.current || !window.turnstile) return;

      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }

      try {
        const isInvisibleMode = size === "invisible";
        const renderParams: any = {
          sitekey: resolvedSiteKey,
          theme,
          // Cloudflare does not accept "invisible" as a size value.
          // Use "flexible" with appearance="interaction-only" for background challenges.
          size: isInvisibleMode ? "flexible" : size,
          appearance: appearance || (isInvisibleMode ? "interaction-only" : "always"),
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
            console.error("Turnstile verification error:", err);
            if (onErrorRef.current) onErrorRef.current(err);
          },
        };

        const widgetId = window.turnstile.render(containerRef.current, renderParams);
        widgetIdRef.current = widgetId;
      } catch (err) {
        console.error("Failed to render Cloudflare Turnstile widget:", err);
        if (onErrorRef.current) onErrorRef.current(err);
      }

      return () => {
        if (typeof window !== "undefined" && window.turnstile && widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // ignore
          }
          widgetIdRef.current = null;
        }
      };
    }, [isScriptLoaded, resolvedSiteKey, theme, size, appearance]);

    const isInvisible = size === "invisible";

    return (
      <div
        className={`turnstile-container ${className}`}
        style={
          isInvisible
            ? {
                // Must be positioned off-screen with real dimensions.
                // Cloudflare Turnstile flexible widgets need actual width/height
                // to pass internal render checks and auto-execute the challenge.
                position: "fixed",
                top: "-9999px",
                left: "-9999px",
                width: "300px",
                height: "65px",
                opacity: 0,
                pointerEvents: "none",
                zIndex: -9999,
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
