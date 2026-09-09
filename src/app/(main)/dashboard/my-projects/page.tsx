"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/authService";
import { projectService } from "@/lib/projectService";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";

export default function MyProjectsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    limit: 10
  });

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login?redirect=/dashboard/my-projects");
      return;
    }

    setCurrentTime(new Date());
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, [router]);

  const fetchProjectsData = React.useCallback(async (page: number = 1, status: string = "all") => {
    setIsTransitioning(true);

    try {
      const projectsRes = await projectService.getAllProjects(10, page, status);

      if (projectsRes?.isSuccessful || projectsRes?.statusCode === 200 || projectsRes?.data) {
        const pList = Array.isArray(projectsRes.data) ? projectsRes.data : [];
        const seenIds = new Set<string>();
        const seenQuoteIds = new Set<string>();
        const deduplicatedProjects = pList.filter((p: any) => {
          const pId = String(p._id || p.id || "");
          const qId = String(p.quoteId || "");
          if (pId && seenIds.has(pId)) return false;
          if (pId) seenIds.add(pId);
          if (qId && seenQuoteIds.has(qId)) return false;
          if (qId) seenQuoteIds.add(qId);
          return true;
        });
        setProjects(deduplicatedProjects);

        // Update pagination from response
        const pag = projectsRes.pagination;
        if (pag) {
          const total = Number(pag.total ?? 0);
          const limit = Number(pag.limit ?? 10) || 10;
          const totalPages = Number(pag.totalPages) || Math.max(1, Math.ceil(total / limit) || 1);
          setPagination({ total, totalPages, limit });
        }

        // Update counts from summary if available
        if (projectsRes.summary) {
          setCounts(projectsRes.summary);
        }
      }
    } catch (error) {
      console.error("Failed to fetch projects data:", error);
      setProjects([]);
    } finally {
      setLoading(false);
      setIsTransitioning(false);
    }
  }, []);

  useEffect(() => {
    if (authService.isAuthenticated()) {
      fetchProjectsData(currentPage, activeTab);
    }
  }, [currentPage, activeTab, fetchProjectsData]);

  const formatDate = (date: any) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const month = d.toLocaleString("en-US", { month: "short" });
    const day = d.getDate();
    const time = d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `Submitted on ${month} ${day}, ${time}`;
  };

  const stats = {
    all: counts ? (counts.active || 0) + (counts.paused || 0) + (counts.completed || 0) + (counts.canceled || 0) : 0,
    active: counts?.active || 0,
    paused: counts?.paused || 0,
    completed: counts?.completed || 0,
    cancelled: counts?.canceled || 0,
  };

  const tabs = [
    { id: "all", label: "All Projects", count: stats.all },
    { id: "active", label: "Active", count: stats.active },
    { id: "paused", label: "Paused", count: stats.paused },
    { id: "completed", label: "Completed", count: stats.completed },
    { id: "canceled", label: "Cancelled", count: stats.cancelled },
  ];

  return (
    <div className="bg-[#F4F5FA] min-h-screen flex flex-col">
      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-8 md:pt-12 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-6 md:gap-0">
          <div className="w-full md:w-auto min-w-0 overflow-hidden">
            <h1 className="text-[28px] md:text-[32px] font-medium text-primary-100 mb-8 md:mb-12">
              My Projects
            </h1>

            <div
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              className="flex space-x-6 md:space-x-8 border-b border-gray-200 w-full overflow-x-auto"
            >
              <style jsx>{`
                div::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setCurrentPage(1);
                  }}
                  className={`pb-3 text-sm font-medium transition-colors relative whitespace-nowrap flex-shrink-0 cursor-pointer ${activeTab === tab.id
                      ? "text-primary-300 border-b-2 border-primary-300"
                      : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>

          {/* Clock Widget */}
          <div className="hidden md:flex flex-col justify-center border-2 border-[#707070] rounded-[8px] px-8 bg-[#EEEEEE] text-left w-[254px] h-[99px]">
            {currentTime ? (
              <>
                <div className="text-[11px] font-medium text-[#707070] mb-1 leading-none uppercase tracking-wide">
                  {currentTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                </div>
                <div className="text-[15px] font-semibold text-[#505050] leading-tight mt-1">
                  {(() => {
                    const day = currentTime.toLocaleDateString("en-US", { weekday: "long" });
                    const date = currentTime.getDate();
                    const month = currentTime.toLocaleDateString("en-US", { month: "short" });
                    const year = currentTime.getFullYear();
                    return `${day} ${date}, ${month}, ${year}`;
                  })()}
                </div>
              </>
            ) : (
              <div className="h-full w-full bg-gray-200 rounded animate-pulse" />
            )}
          </div>
        </div>

        <div className={`space-y-6 mt-8 min-h-[400px] transition-all duration-300 ${isTransitioning ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
          {loading && projects.length === 0 ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="border border-gray-200 rounded-[4px] p-6 h-40 animate-pulse bg-gray-50" />
            ))
          ) : projects.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No projects found</h3>
              <p className="text-gray-500 text-sm">You don't have any projects in this status yet.</p>
            </div>
          ) : (
            projects.map((project) => {
              const projectId = project._id || project.id || project.projectId || project.project_id || project.orderId || project.uuid || project.uid || project.project?._id || project.project?.id;
              return (
              <div key={projectId || Math.random()} className="border border-gray-200 rounded-[8px] p-6 bg-white hover:shadow-sm transition-shadow">
                <div className="flex flex-col gap-4">
                  <div className="flex-grow">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{project.title}</h3>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="text-sm text-gray-500 font-medium">
                        {formatDate(project.createdAt)}
                      </span>
                      <span className={`px-4 py-1 rounded-[4px] text-xs font-bold uppercase border ${(() => {
                          const status = (project.status || "").toLowerCase();
                          if (status === "active" || status === "in_progress") return "bg-[#E1FCEF] text-[#14804A] border-[#E1FCEF]";
                          if (status === "paused") return "bg-[#FEF3C7] text-[#D97706] border-[#FEF3C7]";
                          if (status === "completed") return "bg-[#EBF5FF] text-[#2563EB] border-[#EBF5FF]";
                          if (status === "canceled" || status === "cancelled") return "bg-[#FEE2E2] text-[#B91C1C] border-[#FEE2E2]";
                          return "bg-gray-100 text-gray-700 border-gray-200";
                        })()
                        }`}>
                        {project.status}
                      </span>
                    </div>
                    <button
                      onClick={() => router.push(`/dashboard/my-projects/${projectId}`)}
                      className="bg-[#5356ff] hover:bg-[#3333D0] text-white text-sm font-bold py-2.5 px-6 rounded-[4px] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      View details
                    </button>
                  </div>
                </div>
              </div>
            );
          })
          )}

          {/* New Project Banner */}
          <div className="border border-dashed border-[#717171] rounded-[8px] p-8 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-6 mt-8">
            <h3
              className="text-[22px] font-bold text-gray-900 font-sans"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              New Project
            </h3>
            <button
              onClick={() => router.push("/dashboard/new-project")}
              className="bg-[#4343F0] hover:bg-[#3232b7] text-white text-[15px] font-bold py-3.5 px-8 rounded-[7px] transition-all shadow-sm whitespace-nowrap font-sans border-2 border-[#4343F0] cursor-pointer"
            >
              Create a New Project
            </button>
          </div>

          {/* Pagination */}
          {!loading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-12 py-4">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-[4px] text-sm font-bold transition-all ${currentPage === 1
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-95 cursor-pointer"
                  }`}
              >
                Previous
              </button>

              <div className="flex items-center gap-1 mx-4">
                {[...Array(pagination.totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-10 h-10 flex items-center justify-center rounded-[4px] text-sm font-bold transition-all cursor-pointer ${currentPage === i + 1
                        ? "bg-[#4343F0] text-white shadow-md shadow-blue-500/20"
                        : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
                      }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                disabled={currentPage === pagination.totalPages}
                className={`px-4 py-2 rounded-[4px] text-sm font-bold transition-all ${currentPage === pagination.totalPages
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-95 cursor-pointer"
                  }`}
              >
                Next
              </button>
            </div>
          )}
        </div>

        <div className="mt-16">
          <SupportNewsletter />
        </div>
      </main>
    </div>
  );
}
