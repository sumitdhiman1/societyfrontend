"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";
import { supportService } from "@/lib/supportService";
import { authService } from "@/lib/authService";

export default function SupportHistoryPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        <div className="max-w-[1536px] mx-auto px-4 md:px-8 lg:px-[54px] py-16">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            My Support History
          </h1>
        </div>
      </div>

      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:px-[54px] py-12 md:py-20">
        <div className="min-h-[400px]">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5356ff]"></div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No support history found</h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">You haven&apos;t submitted any support tickets yet. If you need help, you can open a new ticket.</p>
              <Link href="/help-support/submit-ticket">
                <button className="bg-primary-300 hover:bg-primary-100 text-white font-bold py-3 px-8 rounded-lg transition-all shadow-md">
                  Open a New Ticket
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {tickets.map((ticket) => (
                <div key={ticket._id} className="border border-gray-300 rounded-lg p-6 bg-white hover:shadow-lg transition-all group">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-grow">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-bold text-primary-300 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded">
                          {ticket.type || "General"}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">
                          #{ticket.ticketNumber || ticket._id.slice(-8).toUpperCase()}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 mb-1 group-hover:text-primary-300 transition-colors">
                        {ticket.subject}
                      </h3>
                      <p className="text-sm text-gray-500 line-clamp-1">
                        {ticket.messages?.[0]?.text || ticket.description || "Support ticket opened"}
                      </p>
                    </div>
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Status</p>
                        <span className={`text-sm font-bold ${
                          ticket.status === "closed" || ticket.status === "resolved" ? "text-green-500" :
                          ticket.status === "in_progress" ? "text-orange-500" : "text-primary-300"
                        } uppercase text-xs tracking-wider`}>
                          {ticket.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Newsletter Section */}
        <div className="mt-20 border-t border-gray-100 pt-16">
          <SupportNewsletter />
        </div>
      </main>
    </div>
  );
}
