"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import { quoteService } from "@/lib/quoteService";

interface QuoteContextType {
  quote: any;
  setQuote: React.Dispatch<React.SetStateAction<any>>;
  isLoading: boolean;
  refreshQuote: (silent?: boolean) => Promise<void>;
}

const QuoteContext = createContext<QuoteContextType | undefined>(undefined);

export function QuoteProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const id = params.id as string;

  const [quote, setQuote] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const quoteRef = useRef<any>(null);
  useEffect(() => {
    quoteRef.current = quote;
  }, [quote]);

  const fetchQuote = useCallback(async (silent = false) => {
    if (!id) return;
    if (!silent && !quoteRef.current) {
      setIsLoading(true);
    }
    try {
      const response = await quoteService.getQuoteById(id);
      if (response?.data) {
        setQuote(response.data);
      }
    } catch (e) {
      if (!silent) {
        console.error("Failed to fetch quote:", e);
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetchQuote(false);

    // Active silent background polling (every 5 seconds) for live chat updates
    const pollInterval = setInterval(() => {
      fetchQuote(true);
    }, 5000);

    // Listen to window custom events from sockets
    const handleRealtimeQuote = (e: any) => {
      const payload = e?.detail;
      const targetId = payload?.quoteId || payload?.data?.quoteId || payload?.id;
      if (!targetId || targetId === id) {
        fetchQuote(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchQuote(true);
      }
    };

    window.addEventListener("notification:new", handleRealtimeQuote);
    window.addEventListener("quote_message", handleRealtimeQuote);
    window.addEventListener("quote_updated", handleRealtimeQuote);
    window.addEventListener("focus", handleVisibilityChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("notification:new", handleRealtimeQuote);
      window.removeEventListener("quote_message", handleRealtimeQuote);
      window.removeEventListener("quote_updated", handleRealtimeQuote);
      window.removeEventListener("focus", handleVisibilityChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [id, fetchQuote]);

  const refreshQuote = useCallback((silent = true) => fetchQuote(silent), [fetchQuote]);

  const value = useMemo(() => ({
    quote,
    setQuote,
    isLoading,
    refreshQuote,
  }), [quote, isLoading, refreshQuote]);

  return <QuoteContext.Provider value={value}>{children}</QuoteContext.Provider>;
}

export function useQuote() {
  const context = useContext(QuoteContext);
  if (!context) {
    throw new Error("useQuote must be used within a QuoteProvider");
  }
  return context;
}
