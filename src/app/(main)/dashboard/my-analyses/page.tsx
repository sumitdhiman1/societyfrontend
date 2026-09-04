"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/authService";
import { requestAnalysisService } from "@/lib/requestAnalysisService";

export default function MyAnalysesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState({
    time: "",
    date: "",
  });

  // Real-time digital clock in header
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime({
        time: now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
        date: now.toLocaleDateString("en-US", {
          weekday: "long",
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      });
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login?redirect=/dashboard/my-analyses");
      return;
    }

    const fetchAnalyses = async () => {
      try {
        setLoading(true);
        const res = await requestAnalysisService.getProjects();
        if (res && res.data) {
          const rawList = Array.isArray(res.data) ? res.data : res.data.data || [];
          const mapped = rawList.map((item: any) => {
            const aid = item._id || item.id;
            const statusKey = (item.status || "active").toLowerCase();
            const normalizedStatus =
              statusKey === "active" ? "in_progress" : statusKey;

            const target = item.targetWebsiteUrl || item.websiteUrl || item.domain || "website";
            const cleanTarget = target.replace(/^https?:\/\//i, '').replace(/\/+$/, '');

            return {
              id: aid,
              title: item.title || `Free website analysis - ${cleanTarget}`,
              analysisNumber: item.projectNumber || item.invoiceNumber || `INV-2026-${aid.slice(-3)}`,
              targetUrl: cleanTarget,
              submittedDate: item.createdAt
                ? new Date(item.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })
                : "Recently",
              status: normalizedStatus,
            };
          });
          setAnalyses(mapped);
        }
      } catch (err) {
        console.error("Failed to fetch analyses:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyses();
  }, [router]);

  const counts = useMemo(() => {
    return {
      all: analyses.length,
      in_progress: analyses.filter((a) => a.status === "in_progress" || a.status === "active").length,
      paused: analyses.filter((a) => a.status === "paused").length,
      completed: analyses.filter((a) => a.status === "completed").length,
      canceled: analyses.filter((a) => a.status === "canceled").length,
    };
  }, [analyses]);

  const filteredAnalyses = useMemo(() => {
    if (activeTab === "all") return analyses;
    if (activeTab === "in_progress") {
      return analyses.filter((a) => a.status === "in_progress" || a.status === "active");
    }
    return analyses.filter((a) => a.status === activeTab);
  }, [activeTab, analyses]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="px-3 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#EBF5FF] text-[#2563EB]">
            COMPLETED
          </span>
        );
      case "in_progress":
      case "active":
        return (
          <span className="px-3 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600">
            IN PROGRESS
          </span>
        );
      case "paused":
        return (
          <span className="px-3 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600">
            PAUSED
          </span>
        );
      case "canceled":
        return (
          <span className="px-3 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600">
            CANCELED
          </span>
        );
      default:
        return (
          <span className="px-3 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600">
            {status.toUpperCase()}
          </span>
        );
    }
  };

  const tabs = [
    { id: "all", label: "All Analysis Projects", count: counts.all },
    { id: "in_progress", label: "In Progress", count: counts.in_progress },
    { id: "paused", label: "Paused", count: counts.paused },
    { id: "completed", label: "Completed", count: counts.completed },
    { id: "canceled", label: "Canceled", count: counts.canceled },
  ];

  return (
    <div className="bg-[#F8FAFC] min-h-screen flex flex-col font-sans">
      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] py-10">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#0D1939] tracking-tight">
              My Analyses
            </h1>
          </div>

          {/* Clock Widget */}
          {currentTime.time && (
            <div className="border border-gray-300 rounded-xl p-3.5 bg-white shadow-2xs min-w-[170px] text-left">
              <p className="text-[11px] text-gray-500 font-normal leading-tight">{currentTime.time}</p>
              <p className="text-xs font-semibold text-gray-800 mt-0.5 leading-tight">{currentTime.date}</p>
            </div>
          )}
        </div>

        {/* Status Tabs Navigation */}
        <div className="flex items-center gap-6 sm:gap-8 border-b border-gray-200 overflow-x-auto no-scrollbar mb-8">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer relative ${
                  isActive
                    ? "font-bold text-[#2563EB]"
                    : "font-normal text-gray-500 hover:text-gray-900"
                }`}
              >
                {tab.label} ({tab.count})
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2563EB]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Analyses Cards List */}
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
                <div className="h-4 bg-gray-100 rounded w-1/4 mb-4"></div>
                <div className="h-4 bg-gray-100 rounded w-1/6"></div>
              </div>
            ))
          ) : filteredAnalyses.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <h3 className="text-base font-bold text-gray-800 mb-1">No analysis projects found</h3>
              <p className="text-xs text-gray-500 mb-4">
                You do not have any {activeTab !== "all" ? activeTab.replace(/_/g, " ") : ""} analysis requests.
              </p>
              <button
                onClick={() => router.push("/dashboard/new-project/packages")}
                className="inline-flex items-center px-5 py-2.5 bg-[#4343F0] hover:bg-[#3232b7] text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer"
              >
                Request a New Analysis
              </button>
            </div>
          ) : (
            filteredAnalyses.map((a) => (
              <div
                key={a.id}
                className="bg-white rounded-xl border border-gray-200/80 p-6 shadow-2xs hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left Content */}
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-gray-900">
                    {a.title} <span className="text-xs text-gray-400 font-normal">({a.analysisNumber})</span>
                  </h3>
                  <p className="text-xs text-gray-500">
                    Target:{" "}
                    <a
                      href={a.targetUrl.startsWith("http") ? a.targetUrl : `https://${a.targetUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#2563EB] hover:underline font-medium"
                    >
                      {a.targetUrl}
                    </a>
                  </p>
                  <div className="flex items-center gap-3 pt-3">
                    <span className="text-xs text-gray-500">Submitted on {a.submittedDate}</span>
                    {getStatusBadge(a.status)}
                  </div>
                </div>

                {/* Right Action Button */}
                <div className="shrink-0 pt-2 md:pt-0">
                  <button
                    onClick={() => router.push(`/dashboard/my-analyses/${a.id}/details`)}
                    className="w-full md:w-auto px-6 py-2.5 bg-[#4343F0] hover:bg-[#3232b7] text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer"
                  >
                    View details
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Banner Card */}
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-8">
          <div>
            <h3 className="text-lg font-bold text-gray-900">New Analysis</h3>
          </div>
          <button
            onClick={() => router.push("/dashboard/new-project/packages")}
            className="px-6 py-3 bg-[#4343F0] hover:bg-[#3232b7] text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer"
          >
            Request a New Analysis
          </button>
        </div>

      </main>
    </div>
  );
}
