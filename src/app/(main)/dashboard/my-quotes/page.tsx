"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/authService";
import { quoteService } from "@/lib/quoteService";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";

const STATUS_MAPPING: Record<string, string | undefined> = {
  all: undefined,
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  sent: "Sent",
  inactive: "Inactive",
};

export default function MyQuotesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetchingData, setFetchingData] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    limit: 10,
  });
  const [counts, setCounts] = useState({
    all: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login?redirect=/dashboard/my-quotes");
      return;
    }

    setCurrentTime(new Date());
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, [router]);

  const fetchQuotes = useCallback(async (page: number, tab: string) => {
    if (page === 1) setInitialLoading(true);
    setFetchingData(true);

    try {
      const statusParam = STATUS_MAPPING[tab];
      const res = await quoteService.getAllQuotes(statusParam, page, 10);

      const quoteList = Array.isArray(res?.data) ? res.data : [];
      setQuotes(quoteList);

      if (res.pagination) {
        setPagination({
          total: res.pagination.total,
          totalPages: res.pagination.totalPages,
          limit: res.pagination.limit,
        });
      }

      if (res.summary) {
        setCounts({
          all: res.summary.total || 0,
          pending: res.summary.pending || 0,
          approved: res.summary.approved || 0,
          rejected: res.summary.rejected || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch quotes:", error);
      setQuotes([]);
    } finally {
      setInitialLoading(false);
      setFetchingData(false);
    }
  }, []);

  useEffect(() => {
    if (authService.isAuthenticated()) {
      setCurrentPage(1);
      setQuotes([]);
      fetchQuotes(1, activeTab);
    }
  }, [activeTab, fetchQuotes]);

  useEffect(() => {
    if (authService.isAuthenticated() && currentPage > 1) {
      fetchQuotes(currentPage, activeTab);
    }
  }, [currentPage, activeTab, fetchQuotes]);

  const tabs = [
    { id: "all", label: "All Quotes", count: counts.all },
    { id: "pending", label: "Pending", count: counts.pending },
    { id: "approved", label: "Approved", count: counts.approved },
    { id: "rejected", label: "Rejected", count: counts.rejected },
  ];

  const getStatusBadgeStyles = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
      case "requested":
      case "submitted":
        return "bg-[#FEF08A] text-[#854D0E] border-[#FEF08A]";
      case "approved":
      case "accepted":
        return "bg-[#DCFCE7] text-[#15803D] border-[#DCFCE7]";
      case "rejected":
      case "declined":
        return "bg-[#FEE2E2] text-[#B91C1C] border-[#FEE2E2]";
      case "sent":
      case "offer_sent":
      case "proposal_sent":
        return "bg-[#DBEAFE] text-[#1D4ED8] border-[#DBEAFE]";
      case "inactive":
        return "bg-gray-100 text-gray-500 border-gray-200";
      default:
        return "bg-[#FEF08A] text-[#854D0E] border-[#FEF08A]";
    }
  };

  const formatSubmittedDate = (dateString: string) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";
    const month = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
    const day = d.getDate();
    const time = d
      .toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
      .toUpperCase();
    return `Submitted on ${month} ${day}, ${time}`;
  };

  return (
    <div className="bg-[#F4F5FA] min-h-screen flex flex-col">
      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-8 md:pt-12 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-6 md:gap-0">
          <div className="w-full md:w-auto min-w-0 overflow-hidden">
            <h1 className="text-[28px] md:text-[32px] font-medium text-primary-100 mb-8 md:mb-12">
              My Quotes
            </h1>

            <div
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              className="flex space-x-6 md:space-x-8 border-b border-gray-200 w-full overflow-x-auto hide-scrollbar"
            >
              <style jsx>{`
                div::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 text-sm font-medium transition-colors relative whitespace-nowrap flex-shrink-0 ${activeTab === tab.id
                      ? "text-primary-300 border-b-2 border-primary-300"
                      : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>

          <div className="hidden md:flex flex-col justify-center border-2 border-[#707070] rounded-[8px] px-8 bg-[#EEEEEE] text-left w-[254px] h-[99px]">
            {currentTime ? (
              <>
                <div className="text-[11px] font-medium text-[#707070] mb-1 leading-none uppercase tracking-wide">
                  {currentTime.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </div>
                <div className="text-[15px] font-semibold text-[#505050] leading-tight mt-1">
                  {`${currentTime.toLocaleDateString("en-US", { weekday: "long" })} ${currentTime.getDate()}, ${currentTime.toLocaleDateString("en-US", { month: "short" })}, ${currentTime.getFullYear()}`}
                </div>
              </>
            ) : (
              <div className="h-full w-full bg-gray-200 rounded animate-pulse" />
            )}
          </div>
        </div>

        <div className={`space-y-6 mt-8 min-h-[300px] transition-all duration-300 ${fetchingData ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
          {initialLoading && quotes.length === 0 ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="border border-gray-200 rounded-[8px] p-6 h-40 animate-pulse bg-white" />
            ))
          ) : quotes.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No quotes found</h3>
              <p className="text-gray-500 text-sm mb-6">You don't have any quotes in this status yet.</p>
              <button
                onClick={() => router.push("/dashboard/new-project/custom-quote")}
                className="bg-[#4343F0] hover:bg-[#3232b7] text-white text-sm font-bold py-2.5 px-6 rounded-[6px] transition-colors"
              >
                Request a Quote
              </button>
            </div>
          ) : (
            quotes.map((quote) => (
              <div key={quote._id} className="border border-gray-200 rounded-[8px] p-6 bg-white hover:shadow-sm transition-shadow">
                <div className="flex flex-col gap-4">
                  <div className="flex-grow">
                    {(quote.quoteNumber || quote.quoteId) && (
                      <span className="text-xs font-mono text-gray-400 font-bold block mb-1">
                        {quote.quoteNumber || quote.quoteId}
                      </span>
                    )}
                    <h3 className="text-lg font-bold text-gray-800">
                      {quote.projectTitle || "Custom Quote"}
                    </h3>
                    {quote.projectDescription && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                        {quote.projectDescription}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="text-sm text-gray-500 font-medium">
                        {formatSubmittedDate(quote.createdAt)}
                      </span>
                      <span className={`px-3 py-1 rounded-[4px] text-xs font-bold uppercase border ${getStatusBadgeStyles(quote.status)}`}>
                        {quote.status}
                      </span>
                      {(quote.totalCost != null || quote.estimatedPrice != null) && (
                        <span className="text-sm font-bold text-gray-700">
                          ${(quote.totalCost ?? quote.estimatedPrice ?? 0).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        const id = quote.quoteId || quote._id;
                        router.push(`/dashboard/my-quotes/${id}`);
                      }}
                      className="bg-[#4343F0] hover:bg-[#3232b7] text-white text-sm font-bold py-2.5 px-6 rounded-[6px] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      View details
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* New Quote Banner */}
          <div className="border border-dashed border-[#717171] rounded-[8px] p-8 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-6 mt-8">
            <h3
              className="text-[22px] font-bold text-gray-900 font-sans"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              New Quote
            </h3>
            <button
              onClick={() => router.push("/dashboard/new-project/custom-quote")}
              className="bg-[#4343F0] hover:bg-[#3232b7] text-white text-[15px] font-bold py-3.5 px-8 rounded-[7px] transition-all shadow-sm whitespace-nowrap font-sans border-2 border-[#4343F0] cursor-pointer"
            >
              Create a New Quote
            </button>
          </div>
        </div>

        {!initialLoading && quotes.length > 0 && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12 py-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-[4px] text-sm font-bold transition-all ${currentPage === 1
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-95"
                }`}
            >
              Previous
            </button>
            <div className="flex items-center gap-1 mx-4">
              {[...Array(pagination.totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-10 h-10 flex items-center justify-center rounded-[4px] text-sm font-bold transition-all ${currentPage === i + 1
                      ? "bg-primary-300 text-white shadow-lg shadow-blue-500/20"
                      : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={currentPage === pagination.totalPages}
              className={`px-4 py-2 rounded-[4px] text-sm font-bold transition-all ${currentPage === pagination.totalPages
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-95"
                }`}
            >
              Next
            </button>
          </div>
        )}

        <div className="mt-16">
          <SupportNewsletter />
        </div>
      </main>
    </div>
  );
}
