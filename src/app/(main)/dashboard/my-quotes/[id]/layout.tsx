"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { quoteService } from "@/lib/quoteService";
import { authService } from "@/lib/authService";
import DashboardSubNav from "@/components/dashboard/DashboardSubNav";

const QuoteContext = createContext<any>(undefined);

export const QuoteProvider = ({ children }: { children: React.ReactNode }) => {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [quote, setQuote] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fetchedRef = useRef(false);

  const fetchQuote = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await quoteService.getQuoteById(id);
      if (response?.data) {
        setQuote(response.data);
      }
    } catch (e) {
      console.error("Failed to fetch quote:", e);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (authService.isAuthenticated()) {
      if (id && !fetchedRef.current) {
        fetchedRef.current = true;
        fetchQuote();
      }
      return () => {
        if (fetchedRef.current) {
          fetchedRef.current = false;
        }
      };
    } else {
      router.push("/login?redirect=/dashboard/my-projects");
    }
  }, [id, fetchQuote, router]);

  const value = useMemo(() => ({
    quote,
    isLoading,
    refreshQuote: () => fetchQuote()
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

const TooltipIcon = ({ className = "", text = "Time spent waiting for client replies does not count towards project deadlines." }) => {
  const [show, setShow] = useState(false);
  return (
    <div className={`relative inline-block ml-1 ${className}`}>
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="w-4 h-4 rounded-full bg-gray-400 text-white text-[9px] font-bold flex items-center justify-center cursor-help leading-none transition-colors hover:bg-gray-500"
        aria-label="About estimated deadline"
      >
        ?
      </button>
      {show && (
        <div role="tooltip" className="absolute left-6 bottom-0 w-64 bg-gray-900 text-white text-[11px] rounded-lg p-2.5 shadow-xl z-[9999] leading-relaxed font-normal normal-case break-words whitespace-normal">
          {text}
        </div>
      )}
    </div>
  );
};

function MyQuotesLayoutContent({ children }: { children: React.ReactNode }) {
  const { quote, isLoading, refreshQuote } = useQuote();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const id = params.id as string;

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleRename = async () => {
    if (!quote?._id || !titleInput.trim() || titleInput.trim() === quote.projectTitle) {
      setIsEditingTitle(false);
      return;
    }
    
    setIsSaving(true);
    try {
      const res = await quoteService.renameQuote(quote._id, titleInput.trim());
      if (res && (res.isSuccessful || res.statusCode === 200)) {
        refreshQuote();
      }
    } catch (e) {
      console.error("Failed to rename quote:", e);
    } finally {
      setIsSaving(false);
      setIsEditingTitle(false);
    }
  };

  const activeTabName = pathname.split("/").pop();

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
        <button onClick={() => router.push("/dashboard/my-projects")} className="text-primary-500 hover:underline">
          Back to My Quotes
        </button>
      </div>
    );
  }

  const tabs = ["details", "payment", "files"];
  const activeTab = tabs.includes(activeTabName || "") ? activeTabName : "details";

  return (
    <div className="bg-white min-h-screen flex flex-col font-sans" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <DashboardSubNav />
      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-8 md:pt-12 pb-12">
        <div className="mb-10">
          <div className="flex items-center gap-3 group mb-8 md:mb-12">
            {isEditingTitle ? (
              <div className="flex items-center gap-2 flex-1 max-w-2xl">
                <input
                  ref={inputRef}
                  type="text"
                  value={titleInput}
                  onChange={e => setTitleInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") handleRename();
                    if (e.key === "Escape") setIsEditingTitle(false);
                  }}
                  className="text-[28px] md:text-[32px] font-medium text-primary-100 bg-transparent border-b-2 border-[#4343F0] focus:outline-none flex-1 py-1"
                  disabled={isSaving}
                />
                <button
                  onClick={handleRename}
                  disabled={isSaving}
                  className="px-3 py-1.5 bg-[#4343F0] text-white text-sm font-bold rounded transition-colors hover:bg-[#3232b7] disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setIsEditingTitle(false)}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm font-bold rounded transition-colors hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <React.Fragment>
                <h1 className="text-[28px] md:text-[32px] font-medium text-primary-100 leading-tight">
                  {quote.projectTitle}
                </h1>
                <button
                  onClick={() => {
                    if (quote) {
                      setTitleInput(quote.projectTitle);
                      setIsEditingTitle(true);
                      setTimeout(() => inputRef.current?.focus(), 50);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded mt-1"
                  title="Edit quote title"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </React.Fragment>
            )}
          </div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-200">
            <div className="flex gap-4 sm:gap-6 md:gap-10 overflow-x-auto w-full md:w-auto scrollbar-hide">
              {tabs.map(tab => (
                <Link
                  key={tab}
                  href={`/dashboard/my-quotes/${id}/${tab}`}
                  className={`pb-4 text-base sm:text-lg font-inter capitalize transition-colors relative whitespace-nowrap ${
                    activeTab === tab ? "text-[#363636] font-bold" : "text-[#88909D] font-normal hover:text-gray-600"
                  }`}
                >
                  {tab === "payment" ? "Payments" : tab}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 w-full h-[4px] bg-[#4343F0] rounded-t-[2px]" />
                  )}
                </Link>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-8 mb-4 sm:mb-3 text-[11px] sm:text-sm font-medium text-[#363636] mt-4 md:mt-0">
              <div>
                <span className="text-[#88909D] mr-2">Submitted:</span>
                {quote.dateSubmitted ? new Date(quote.dateSubmitted).toLocaleDateString() : "Pending"}
              </div>
              <div>
                <span className="text-[#88909D] mr-2">Expires:</span>
                {quote.expirationDate ? new Date(quote.expirationDate).toLocaleDateString() : "N/A"}
                <TooltipIcon />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8">
          {children}
        </div>
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
