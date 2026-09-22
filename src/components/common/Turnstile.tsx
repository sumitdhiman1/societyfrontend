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
          [key: string]: any;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

export interface TurnstileRef {
  reset: () => void;
  remove: () => void;
}

export interface TurnstileProps {
  siteKey?: string;
  onVerify?: (token: string) => void;
  onExpire?: () => void;
  onError?: (error?: any) => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact" | "flexible";
  className?: string;
}

const DEFAULT_TEST_SITE_KEY = "1x00000000000000000000AA";

export const Turnstile = forwardRef<TurnstileRef, TurnstileProps>(
  (
    {
      siteKey,
      onVerify,
      onExpire,
      onError,
      theme = "light",
      size = "normal",
      className = "",
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<string | null>(null);
    const [isScriptLoaded, setIsScriptLoaded] = useState(false);

    // Store callbacks in refs to prevent widget re-mounting when parent re-renders
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
        if (typeof window !== "undefined" && window.turnstile && widgetIdRef.current) {
          try {
            window.turnstile.reset(widgetIdRef.current);
          } catch (e) {
            console.error("Turnstile reset error:", e);
          }
        }
      },
      remove: () => {
        if (typeof window !== "undefined" && window.turnstile && widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current);
            widgetIdRef.current = null;
          } catch (e) {
            console.error("Turnstile remove error:", e);
          }
        }
      },
    }));

    useEffect(() => {
      // Check if script is already present
      const scriptId = "cf-turnstile-script";
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;

      const handleScriptReady = () => {
        setIsScriptLoaded(true);
      };

      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit";
        script.async = true;
        script.defer = true;

        window.onloadTurnstileCallback = () => {
          setIsScriptLoaded(true);
        };

        script.onerror = (err) => {
          console.error("Failed to load Cloudflare Turnstile script:", err);
          if (onErrorRef.current) onErrorRef.current(err);
        };

        document.head.appendChild(script);
      } else if (window.turnstile) {
        setIsScriptLoaded(true);
      } else {
        const existingCallback = window.onloadTurnstileCallback;
        window.onloadTurnstileCallback = () => {
          if (existingCallback) existingCallback();
          setIsScriptLoaded(true);
        };
      }
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
        const widgetId = window.turnstile.render(containerRef.current, {
          sitekey: resolvedSiteKey,
          theme,
          size,
          callback: (token: string) => {
            if (onVerifyRef.current) onVerifyRef.current(token);
          },
          "expired-callback": () => {
            if (onExpireRef.current) onExpireRef.current();
          },
          "error-callback": (err: any) => {
            console.error("Turnstile verification error:", err);
            if (onErrorRef.current) onErrorRef.current(err);
          },
        });
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
    }, [isScriptLoaded, resolvedSiteKey, theme, size]);

    return (
      <div className={`turnstile-container ${className}`}>
        <div ref={containerRef} />
      </div>
    );
  }
);

Turnstile.displayName = "Turnstile";
export default Turnstile;
