"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/authService";
import { requestAnalysisService } from "@/lib/requestAnalysisService";
import DashboardSubNav from "@/components/dashboard/DashboardSubNav";

const CardsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="0.75" y="0.75" width="7.5" height="7.5" rx="1.5" fill="currentColor" />
    <rect x="9.75" y="0.75" width="7.5" height="7.5" rx="1.5" fill="currentColor" />
    <rect x="0.75" y="9.75" width="7.5" height="7.5" rx="1.5" fill="currentColor" />
    <rect x="9.75" y="9.75" width="7.5" height="7.5" rx="1.5" fill="currentColor" />
  </svg>
);

const ListIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 4.5H16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 9H16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 13.5H16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M1.5 4.5H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M1.5 9H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M1.5 13.5H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function MyAnalysesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

            return {
              id: aid,
              title: item.title || "Free website analysis",
              analysisNumber: item.projectNumber || `#ANL-${aid.slice(-8).toUpperCase()}`,
              submittedDate: item.createdAt
                ? new Date(item.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Recently",
              deadline: item.deadline
                ? new Date(item.deadline).toLocaleDateString("en-US", {
                    month: "2-digit",
                    day: "2-digit",
                    year: "numeric",
                  })
                : "Pending",
              status: normalizedStatus,
              unreadMessages: item.unreadMessagesCount || 0,
              isFree: item.isFree !== false,
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
      case "in_progress":
      case "active":
        return <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-blue-50 text-blue-600 border border-blue-200">In Progress</span>;
      case "paused":
        return <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-amber-50 text-amber-600 border border-amber-200">Paused</span>;
      case "completed":
        return <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-green-50 text-green-600 border border-green-200">Completed</span>;
      case "canceled":
        return <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-gray-100 text-gray-600 border border-gray-300">Canceled</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-gray-50 text-gray-600 border border-gray-200">{status}</span>;
    }
  };

  const TabButton = ({ id, label, count }: { id: string; label: string; count: number }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`text-[16px] sm:text-[18px] leading-[21px] text-left transition-colors relative pb-4 whitespace-nowrap ${
        activeTab === id ? "font-bold text-[#363636]" : "font-normal text-[#434343] opacity-50 hover:opacity-100"
      }`}
    >
      {label}
      <span className="ml-1 text-sm text-gray-400 font-bold">({count})</span>
      {activeTab === id && <div className="absolute bottom-0 left-0 w-full h-[4px] bg-[#5356ff] rounded-t-[2px]" />}
    </button>
  );

  return (
    <div className="bg-[#F8F9FD] min-h-screen flex flex-col font-sans" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <DashboardSubNav />
      <main className="flex-grow w-full max-w-[1600px] mx-auto px-4 md:px-8 lg:px-[54px] pt-8 md:pt-12 pb-16">
        <div className="flex flex-row justify-between items-center w-full">
          <div>
            <h1 className="text-[28px] md:text-3xl lg:text-[42px] leading-[38px] md:leading-normal font-bold text-[#363636]">
              My Analyses
            </h1>
            <p className="text-sm text-gray-500 mt-1">Manage and view reports for your website analyses.</p>
          </div>

          <div className="relative md:hidden text-[14px]">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="appearance-none bg-[#4343F0] text-white font-semibold py-2.5 px-6 pr-10 rounded-[6px] text-[14px] focus:outline-none shadow-md"
            >
              <option value="all">All ({counts.all})</option>
              <option value="in_progress">In Progress ({counts.in_progress})</option>
              <option value="paused">Paused ({counts.paused})</option>
              <option value="completed">Completed ({counts.completed})</option>
              <option value="canceled">Canceled ({counts.canceled})</option>
            </select>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="hidden md:flex flex-row flex-nowrap justify-between items-end border-b border-gray-200 pb-0 w-full mt-6 md:mt-8 gap-x-4">
          <div className="flex gap-6 sm:gap-10 overflow-x-auto flex-nowrap min-w-0" style={{ scrollbarWidth: "none" }}>
            <TabButton id="all" label="All" count={counts.all} />
            <TabButton id="in_progress" label="In Progress" count={counts.in_progress} />
            <TabButton id="paused" label="Paused" count={counts.paused} />
            <TabButton id="completed" label="Completed" count={counts.completed} />
            <TabButton id="canceled" label="Canceled" count={counts.canceled} />
          </div>

          <div className="flex items-end gap-6 pb-4 ml-auto">
            <span className="text-[18px] text-[#434343] hidden sm:block">View</span>
            <div className="flex gap-6">
              <button
                onClick={() => setViewMode("cards")}
                className={`flex items-center gap-2 transition-colors ${
                  viewMode === "cards" ? "text-[#363636] font-bold" : "text-gray-500 font-normal"
                }`}
              >
                <span className={viewMode === "cards" ? "text-[#4343F0]" : "text-gray-500"}>
                  <CardsIcon />
                </span>
                <span>Cards</span>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-2 transition-colors ${
                  viewMode === "list" ? "text-[#363636] font-bold" : "text-gray-500 font-normal"
                }`}
              >
                <span className={viewMode === "list" ? "text-[#4343F0]" : "text-gray-500"}>
                  <ListIcon />
                </span>
                <span>List</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-lg p-8 shadow-sm h-52 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-8" />
                <div className="flex gap-8">
                  <div className="h-10 bg-gray-200 rounded w-28" />
                  <div className="h-10 bg-gray-200 rounded w-28" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredAnalyses.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center mt-8">
            <div className="w-16 h-16 bg-blue-50 text-[#5356ff] rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              🔍
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No analyses found</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
              You do not have any {activeTab !== "all" ? activeTab.replace(/_/g, " ") : ""} analysis requests yet.
            </p>
            <button
              onClick={() => router.push("/dashboard/new-project/analyses")}
              className="px-8 py-3 bg-[#5356ff] hover:bg-[#3232b7] text-white font-bold rounded-lg transition-colors shadow-sm text-sm"
            >
              Order a Free Analysis
            </button>
          </div>
        ) : (
          <>
            {viewMode === "cards" ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 xl:gap-x-[62px] xl:gap-y-[48px] mt-8">
                {filteredAnalyses.map((a) => (
                  <div
                    key={a.id}
                    className="bg-white rounded-[8px] p-6 lg:p-8 shadow-[0px_5px_25px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col justify-between hover:shadow-lg transition-shadow"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <h3 className="text-xl font-bold text-gray-800 leading-snug line-clamp-2">
                          {a.title}
                        </h3>
                        {getStatusBadge(a.status)}
                      </div>

                      <div className="grid grid-cols-3 gap-3 my-6">
                        <div>
                          <p className="text-[#4343F0] text-xs font-bold mb-0.5">Analysis #</p>
                          <p className="text-[#363636] text-sm font-medium">{a.analysisNumber}</p>
                        </div>
                        <div>
                          <p className="text-[#4343F0] text-xs font-bold mb-0.5">Submitted</p>
                          <p className="text-[#363636] text-sm font-medium">{a.submittedDate}</p>
                        </div>
                        <div>
                          <p className="text-[#4343F0] text-xs font-bold mb-0.5">Exp. Deadline</p>
                          <p className="text-[#363636] text-sm font-medium">{a.deadline}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 items-center justify-end w-full pt-4 border-t border-gray-100">
                      <button
                        onClick={() => router.push(`/dashboard/my-analyses/${a.id}/details#messages`)}
                        className="bg-[#E3E6F5] text-[#4343F0] min-w-[120px] px-6 py-2.5 rounded-[6px] text-xs font-bold relative hover:bg-[#d4d8f0] transition-colors"
                      >
                        {a.unreadMessages > 0 && (
                          <span className="absolute -top-[9px] -left-[9px] bg-[#363636] text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">
                            {a.unreadMessages}
                          </span>
                        )}
                        Messages
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/my-analyses/${a.id}/details`)}
                        className="bg-[#5356ff] text-white min-w-[100px] px-6 py-2.5 rounded-[6px] text-xs font-bold hover:bg-[#3232b7] transition-colors shadow-sm"
                      >
                        Info
                      </button>
                    </div>
                  </div>
                ))}

                {/* New Analysis Card */}
                <div className="w-full min-h-[200px] border-2 border-dashed border-[#4343F0]/30 rounded-[8px] flex flex-col p-8 justify-between hover:bg-[#F2F4FF] text-center lg:text-left transition-colors">
                  <div>
                    <h3 className="text-2xl font-bold text-[#363636] mb-2">New Analysis</h3>
                    <p className="text-sm text-gray-500">Order free website analysis or checking of work.</p>
                  </div>
                  <button
                    onClick={() => router.push("/dashboard/new-project/analyses")}
                    className="w-full bg-[#4343F0] hover:bg-[#3232b7] text-white font-bold py-3.5 rounded-[6px] transition-all shadow-md text-sm mt-4"
                  >
                    Start a New Analysis
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-8 overflow-hidden">
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[900px]">
                    <div className="grid grid-cols-12 gap-4 py-4 px-6 text-sm font-bold text-[#5356ff] bg-[#F2F1FE] items-center">
                      <div className="col-span-4">Analysis Name</div>
                      <div className="col-span-2">Analysis #</div>
                      <div className="col-span-2">Submitted Date</div>
                      <div className="col-span-2">Exp. Deadline</div>
                      <div className="col-span-2 text-right">Actions</div>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {filteredAnalyses.map((a) => (
                        <div key={a.id} className="grid grid-cols-12 gap-4 items-center py-5 px-6 hover:bg-gray-50 transition-colors">
                          <div className="col-span-4 text-sm font-semibold text-[#363636] truncate" title={a.title}>
                            {a.title}
                          </div>
                          <div className="col-span-2 text-sm text-gray-600">{a.analysisNumber}</div>
                          <div className="col-span-2 text-sm text-gray-600">{a.submittedDate}</div>
                          <div className="col-span-2 text-sm text-gray-600 font-medium">{a.deadline}</div>
                          <div className="col-span-2 flex justify-end gap-2">
                            <button
                              onClick={() => router.push(`/dashboard/my-analyses/${a.id}/details#messages`)}
                              className="bg-[#EBE9FA] text-[#4343F0] px-4 py-2 rounded text-xs font-bold hover:bg-[#dcd9f5]"
                            >
                              Messages
                            </button>
                            <button
                              onClick={() => router.push(`/dashboard/my-analyses/${a.id}/details`)}
                              className="bg-[#5356ff] text-white px-4 py-2 rounded text-xs font-bold hover:bg-[#3232b7]"
                            >
                              Info
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
