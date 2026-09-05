"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { quoteService } from "@/lib/quoteService";

const QuoteContext = createContext<any>(undefined);

export const QuoteProvider = ({ children }: { children: React.ReactNode }) => {
  const params = useParams();
  const id = params.id as string;
  
  const [quote, setQuote] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialMount = useRef(true);

  const fetchQuote = useCallback(async (silent = false) => {
    if (!id) return;
    if (!silent && !quote) {
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
  }, [id, quote]);

  useEffect(() => {
    if (id && isInitialMount.current) {
      isInitialMount.current = false;
      fetchQuote(false);
    }

    // Active silent background polling (every 3 seconds) for live chat updates
    const pollInterval = setInterval(() => {
      fetchQuote(true);
    }, 3000);

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
      isInitialMount.current = true;
      clearInterval(pollInterval);
      window.removeEventListener("notification:new", handleRealtimeQuote);
      window.removeEventListener("quote_message", handleRealtimeQuote);
      window.removeEventListener("quote_updated", handleRealtimeQuote);
      window.removeEventListener("focus", handleVisibilityChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [id, fetchQuote]);

  const value = useMemo(() => ({
    quote,
    setQuote,
    isLoading,
    refreshQuote: (silent = true) => fetchQuote(silent)
  }), [quote, isLoading, fetchQuote]);

  return <QuoteContext.Provider value={value}>{children}</QuoteContext.Provider>;
};

export const useQuote = () => {
  const context = useContext(QuoteContext);
  if (!context) {
    throw new Error("useQuote must be used within a QuoteProvider");
  }
  return context;
};

function MyQuotesLayoutContent({ children }: { children: React.ReactNode }) {
  const { quote, isLoading } = useQuote();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-gray-500">
        <p className="text-xl font-semibold mb-4">Quote not found</p>
        <button onClick={() => router.push("/dashboard/my-quotes")} className="text-primary-500 hover:underline">
          Back to My Quotes
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen flex flex-col font-sans" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-8 md:pt-10 pb-16">
        {children}
      </main>
    </div>
  );
}

export default function MyQuotesLayout({ children }: { children: React.ReactNode }) {
  return (
    <QuoteProvider>
      <MyQuotesLayoutContent>{children}</MyQuotesLayoutContent>
    </QuoteProvider>
  );
}
