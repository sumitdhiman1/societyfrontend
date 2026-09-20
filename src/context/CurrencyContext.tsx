"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { profileService } from "@/lib/profileService";
import { authService } from "@/lib/authService";

interface CurrencyContextType {
  currency: string;
  setCurrency: (currency: string) => void;
  conversionRate: number;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: "usd",
  setCurrency: () => {},
  conversionRate: 1.08,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("app-currency");
      if (saved === "usd" || saved === "eur") return saved;
    }
    return "usd";
  });
  const [conversionRate, setConversionRate] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const cachedRate = localStorage.getItem("app-conversion-rate");
      if (cachedRate && !isNaN(Number(cachedRate)) && Number(cachedRate) > 0) {
        return Number(cachedRate);
      }
    }
    return 1.14776;
  });

  useEffect(() => {
    const savedCurrency = localStorage.getItem("app-currency");
    if (savedCurrency === "usd" || savedCurrency === "eur") {
      setCurrencyState(savedCurrency);
    }

    const fetchFallbackExternalRates = () => {
      fetch("https://open.er-api.com/v6/latest/USD")
        .then((res) => res.json())
        .then((data) => {
          if (data?.rates?.EUR) {
            const fallbackRate = 1 / data.rates.EUR;
            setConversionRate(fallbackRate);
          }
        })
        .catch((err) => console.error("Failed to fetch fallback live exchange rates", err));
    };

    // Priority 1: Fetch authoritative exchange rate from DB system-settings
    fetch("/api-gateway/system-settings/exchange_rate_usd_eur")
      .then((res) => res.json())
      .then((res) => {
        const rawRate = res?.data?.value ?? res?.data;
        const rate = typeof rawRate === "number" ? rawRate : Number(rawRate);
        if (!isNaN(rate) && rate > 0) {
          setConversionRate(rate);
          localStorage.setItem("app-conversion-rate", String(rate));
        } else {
          fetchFallbackExternalRates();
        }
      })
      .catch(() => {
        // If DB cannot be reached and no cached rate, use external fallback
        const hasCached = localStorage.getItem("app-conversion-rate");
        if (!hasCached) {
          fetchFallbackExternalRates();
        }
      });

    // Sync from profile if logged in
    const syncProfileCurrency = () => {
      if (authService.isAuthenticated()) {
        profileService.getMyProfile().then(res => {
          if (res?.data?.currency && (res.data.currency === "usd" || res.data.currency === "eur")) {
            setCurrencyState(res.data.currency);
            localStorage.setItem("app-currency", res.data.currency);
            authService.updateInternalUser({ currency: res.data.currency });
          }
        }).catch(err => console.error("Failed to sync currency from profile", err));
      }
    };

    syncProfileCurrency();
    window.addEventListener("auth:login", syncProfileCurrency);
    return () => window.removeEventListener("auth:login", syncProfileCurrency);
  }, []);

  const setCurrency = (newCurrency: string) => {
    const norm = newCurrency?.toLowerCase() === "eur" ? "eur" : "usd";
    setCurrencyState(norm);
    localStorage.setItem("app-currency", norm);
    authService.updateInternalUser({ currency: norm });
    
    if (authService.isAuthenticated()) {
      profileService.updateProfile({ currency: norm })
        .catch(err => console.error("Failed to sync currency to backend", err));
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, conversionRate }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);

