"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/authService";
import { requestAnalysisService, claimPendingAnalyses } from "@/lib/requestAnalysisService";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";

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
      const time = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
      const day = now.getDate();
      const month = now.toLocaleDateString("en-US", { month: "short" });
      const year = now.getFullYear();
      setCurrentTime({
        time,
        date: `${weekday} ${day}, ${month}, ${year}`,
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
        // Ensure any guest analysis from cookie is claimed and attached to this user
        await claimPendingAnalyses();
        const res = await requestAnalysisService.getProjects();
        if (res && res.data) {
          const rawList = Array.isArray(res.data) ? res.data : res.data.data || [];
          const mapped = rawList.map((item: any) => {
            const aid = item._id || item.id;
            const statusKey = (item.status || "active").toLowerCase();
            const normalizedStatus =
              statusKey === "active" ? "in_progress" : statusKey;

            const target = item.targetWebsiteUrl || item.websiteUrl || item.domain || "website";
            const cleanTarget = target.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
            const fullTargetUrl = target.startsWith("http") ? target : `https://${cleanTarget}`;

            return {
              id: aid,
              title: item.title || `Free website analysis - ${cleanTarget}`,
              analysisNumber: item.projectNumber || item.invoiceNumber || `INV-2026-${aid.slice(-3)}`,
              targetUrl: fullTargetUrl,
              displayTarget: cleanTarget,
              submittedDate: item.createdAt
                ? new Date(item.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
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
    const s = (status || "").toLowerCase();
    switch (s) {
      case "completed":
        return (
          <span className="px-4 py-1 rounded-[4px] text-xs font-bold uppercase border bg-[#EBF5FF] text-[#2563EB] border-[#EBF5FF]">
            COMPLETED
          </span>
        );
      case "paused":
        return (
          <span className="px-4 py-1 rounded-[4px] text-xs font-bold uppercase border bg-[#FEF3C7] text-[#D97706] border-[#FEF3C7]">
            PAUSED
          </span>
        );
      case "canceled":
        return (
          <span className="px-4 py-1 rounded-[4px] text-xs font-bold uppercase border bg-[#F3F4F6] text-[#6B7280] border-[#F3F4F6]">
            CANCELED
          </span>
        );
      case "in_progress":
      case "active":
      default:
        return (
          <span className="px-4 py-1 rounded-[4px] text-xs font-bold uppercase border bg-[#E1FCEF] text-[#14804A] border-[#E1FCEF]">
            IN PROGRESS
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
    <div
      className="bg-white min-h-screen flex flex-col font-sans"
      style={{ fontFamily: "var(--font-inter), sans-serif" }}
    >
      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-8 md:pt-12 pb-6 md:pb-8 flex flex-col justify-between">
        {/* Top Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-6 md:gap-0">
          <div className="w-full md:w-auto min-w-0 overflow-hidden">
            <div className="flex items-center gap-6 mb-8 md:mb-12">
              <h1 className="text-[28px] md:text-[32px] font-medium text-primary-100">
                My Analyses
              </h1>
            </div>

            {/* Filter Tabs */}
            <div
              className="flex space-x-6 md:space-x-8 border-b border-gray-200 w-full overflow-x-auto"
              style={{ scrollbarWidth: "none" }}
            >
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`pb-3 text-sm font-medium transition-colors relative whitespace-nowrap flex-shrink-0 rounded-none cursor-pointer ${
                      isActive
                        ? "text-primary-300 border-b-2 border-primary-300 font-bold"
                        : "text-gray-500 hover:text-gray-700 font-normal"
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clock Widget */}
          <div className="hidden md:flex flex-col justify-center border-2 border-[#707070] rounded-[8px] px-8 bg-[#EEEEEE] text-left w-[254px] h-[99px] shrink-0">
            <div className="flex flex-col justify-center">
              <div className="text-[12px] font-semibold text-[#707070] mb-1.5 leading-none">
                {currentTime.time || "10:35 PM"}
              </div>
              <div className="text-[15px] font-medium text-[#505050] leading-tight">
                {currentTime.date || "Friday 4, Sep, 2026"}
              </div>
            </div>
          </div>
        </div>

        {/* Content List Section */}
        <div className="space-y-6 mt-6 flex-grow flex flex-col">
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="border border-gray-200 rounded-[8px] p-6 bg-white animate-pulse"
              >
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
                <div className="h-4 bg-gray-100 rounded w-1/4 mb-4"></div>
                <div className="h-4 bg-gray-100 rounded w-1/6"></div>
              </div>
            ))
          ) : filteredAnalyses.length === 0 ? (
            <div className="border border-gray-200 rounded-[8px] p-12 bg-white text-center">
              <h3 className="text-base font-bold text-gray-800 mb-1">
                No analysis projects found
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                You do not have any{" "}
                {activeTab !== "all" ? activeTab.replace(/_/g, " ") : ""} analysis requests.
              </p>
              <button
                onClick={() => router.push("/dashboard/new-project/packages?categorycode=ANALYSIS&sortBy=order_asc")}
                className="bg-[#4343F0] hover:bg-[#3333D0] text-white text-sm font-bold py-2.5 px-6 rounded-[4px] transition-colors whitespace-nowrap cursor-pointer"
              >
                Request a New Analysis
              </button>
            </div>
          ) : (
            filteredAnalyses.map((a) => (
              <div
                key={a.id}
                className="border border-gray-200 rounded-[8px] p-6 bg-white hover:shadow-sm transition-shadow"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex-grow">
                    <h3 className="text-lg font-bold text-gray-800">
                      {a.title}
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        ({a.analysisNumber})
                      </span>
                    </h3>
                    <div className="text-sm text-gray-600 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold text-gray-500">Target:</span>
                      <a
                        href={a.targetUrl}
                        className="text-blue-600 hover:underline break-all"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {a.targetUrl}
                      </a>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="text-sm text-gray-500 font-medium">
                        Submitted on {a.submittedDate}
                      </span>
                      {getStatusBadge(a.status)}
                    </div>
                    <button
                      onClick={() => router.push(`/dashboard/my-analyses/${a.id}/details`)}
                      className="bg-[#4343F0] hover:bg-[#3333D0] text-white text-sm font-bold py-2.5 px-6 rounded-[4px] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      View details
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* New Analysis Banner */}
          <div className="border border-dashed border-[#717171] rounded-[8px] p-8 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-6 mt-8">
            <h3
              className="text-[22px] font-bold text-gray-900 font-sans"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              New Analysis
            </h3>
            <button
              onClick={() => router.push("/dashboard/new-project/packages?categorycode=ANALYSIS&sortBy=order_asc")}
              className="bg-[#4343F0] hover:bg-[#3333D0] text-white text-[15px] font-bold py-3.5 px-8 rounded-[7px] transition-all shadow-sm whitespace-nowrap font-sans border-2 border-[#4343F0] cursor-pointer"
            >
              Request a New Analysis
            </button>
          </div>
        </div>

        {/* Support & Newsletter Section */}
        <div className="mt-10 md:mt-14 mb-2">
          <SupportNewsletter />
        </div>
      </main>
    </div>
  );
}
