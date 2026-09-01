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
  const [currency, setCurrencyState] = useState("usd");
  const [conversionRate, setConversionRate] = useState(1.08);

  useEffect(() => {
    const savedCurrency = localStorage.getItem("app-currency");
    if (savedCurrency === "usd" || savedCurrency === "eur") {
      setCurrencyState(savedCurrency);
    }

    const fetchRates = () => {
      // Fallback live rates
      fetch("https://open.er-api.com/v6/latest/USD")
        .then((res) => res.json())
        .then((data) => {
          if (data?.rates?.EUR) {
            setConversionRate(1 / data.rates.EUR);
          }
        })
        .catch((err) => console.error("Failed to fetch live exchange rates", err));
    };

    // Try to get exchange rate from backend first
    fetch("/api-gateway/system-settings/exchange_rate_usd_eur")
      .then(res => res.json())
      .then(res => {
        const rate = res?.data;
        if (typeof rate === 'number') {
          setConversionRate(rate);
        } else {
          fetchRates();
        }
      })
      .catch(() => fetchRates());

    // Sync from profile if logged in
    if (authService.isAuthenticated()) {
      profileService.getMyProfile().then(res => {
        if (res?.data?.currency && (res.data.currency === "usd" || res.data.currency === "eur")) {
          setCurrencyState(res.data.currency);
          localStorage.setItem("app-currency", res.data.currency);
        }
      }).catch(err => console.error("Failed to sync currency from profile", err));
    }
  }, []);

  const setCurrency = (newCurrency: string) => {
    setCurrencyState(newCurrency);
    localStorage.setItem("app-currency", newCurrency);
    
    if (authService.isAuthenticated()) {
      profileService.updateProfile({ currency: newCurrency })
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

