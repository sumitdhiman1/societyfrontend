"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supportService } from "@/lib/supportService";
import { authService } from "@/lib/authService";

export default function SupportHistoryPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const formatDateTime = (dateStr?: string | Date) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  useEffect(() => {
    const fetchTickets = async () => {
      if (!authService.isAuthenticated()) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res: any = await supportService.getAllTickets();
        if (res?.data?.tickets && Array.isArray(res.data.tickets)) {
          setTickets(res.data.tickets);
        } else if (res?.data && Array.isArray(res.data)) {
          setTickets(res.data);
        } else {
          setTickets([]);
        }
      } catch (error) {
        console.error("Failed to fetch tickets:", error);
        setTickets([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans">
      {/* Hero Section */}
      <div className="bg-primary-100 border-[3px] border-gray-600">
        <div className="container mx-auto px-4 md:px-8 lg:px-[54px] py-10 md:py-16 max-w-[1536px]">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            My Support History
          </h1>
        </div>
      </div>

      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:px-[54px] py-12 md:py-20 lg:pb-40">
        <div className="min-h-[300px]">
          {loading ? (
            <div className="flex justify-center items-center py-24">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4343F0]"></div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 max-w-[1280px]">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No support history found</h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">You haven&apos;t submitted any support tickets yet. If you need help, you can open a new ticket.</p>
              <Link href="/help-support/submit-ticket">
                <button className="bg-[#4343F0] hover:bg-[#3232b7] text-white font-bold py-3 px-8 rounded-lg transition-all shadow-md cursor-pointer">
                  Open a New Ticket
                </button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-14 max-w-[1280px]">
              {tickets.map((ticket) => (
                <Link
                  key={ticket._id}
                  href={`/help-support/history/${ticket._id}`}
                  className="block w-full"
                >
                  <div className="border border-[#717171] rounded-[10px] p-6 md:p-8 lg:p-12 flex flex-col md:flex-row justify-between items-start md:items-center bg-white transition-all cursor-pointer gap-6 md:gap-0">
                    <div className="flex flex-col gap-4 md:gap-8 lg:gap-10">
                      <h3 className="text-[#646464] font-bold text-xl md:text-2xl lg:text-3xl leading-tight tracking-tight">
                        {ticket.subject}
                      </h3>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm md:text-[16px] text-[#909090] font-normal">
                        <span className="font-medium whitespace-nowrap">
                          Chat {ticket.ticketNumber || ticket._id?.slice(-8)?.toUpperCase()} - {formatDateTime(ticket.createdAt)}
                        </span>
                        <span
                          className={`border px-4 py-1 rounded-md text-[11px] md:text-[13px] font-bold uppercase tracking-wider w-fit ${ticket.status === "open"
                              ? "bg-blue-100 text-blue-600 border-blue-200"
                              : ticket.status === "in_progress"
                                ? "bg-amber-100 text-amber-600 border-amber-200"
                                : "bg-gray-100 text-gray-600 border-gray-200"
                            }`}
                        >
                          {ticket.status || "open"}
                        </span>
                      </div>
                    </div>
                    <div className="bg-[#4343F0] hover:bg-[#5c5cf2] text-white font-bold py-3 md:py-4 px-8 lg:px-16 rounded-md text-sm md:text-[16px] transition-colors whitespace-nowrap w-full md:w-auto text-center">
                      View ticket
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
