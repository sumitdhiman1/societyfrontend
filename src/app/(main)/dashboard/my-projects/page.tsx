"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/authService";
import { projectService } from "@/lib/projectService";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";
import DashboardSubNav from "@/components/dashboard/DashboardSubNav";

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

  const fetchProjectsData = async (page = currentPage) => {
    // Show loading state if it's the first fetch
    if (projects.length === 0) setLoading(true);
    setIsTransitioning(true);

    try {
      // Fetch projects for the current tab and page
      // The getAllProjects endpoint already includes dashboard summary counts in the response
      const projectsRes = await projectService.getAllProjects(10, page, activeTab);

      if (projectsRes?.isSuccessful) {
        const pList = Array.isArray(projectsRes.data) ? projectsRes.data : [];
        setProjects(pList);

        // Update pagination from response
        if (projectsRes.pagination) {
          setPagination({
            total: projectsRes.pagination.total,
            totalPages: projectsRes.pagination.totalPages,
            limit: projectsRes.pagination.limit
          });
        }

        // Update counts from summary if available
        if (projectsRes.summary) {
          setCounts(projectsRes.summary);
        }
      }
    } catch (error) {
      console.error("Failed to fetch projects data:", error);
    } finally {
      setLoading(false);
      setIsTransitioning(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchProjectsData(1);
  }, [activeTab]);

  useEffect(() => {
    if (currentPage > 1) {
      fetchProjectsData(currentPage);
    }
  }, [currentPage]);

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
      <DashboardSubNav />
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
                        Submitted - {new Date(project.createdAt).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" })}
                      </span>
                      <span className={`px-4 py-1 rounded-[4px] text-xs font-bold uppercase border ${(() => {
                          const status = project.status.toLowerCase();
                          if (status === "active" || status === "paused") return "bg-[#E1FCEF] text-[#14804A] border-[#E1FCEF]";
                          if (status === "completed") return "bg-blue-100 text-blue-800 border-blue-200";
                          if (status === "canceled" || status === "cancelled") return "bg-red-100 text-red-800 border-red-200";
                          return "bg-gray-100 text-gray-800 border-gray-200";
                        })()
                        }`}>
                        {project.status}
                      </span>
                    </div>
                    <button
                      onClick={() => router.push(`/dashboard/my-projects/${projectId}`)}
                      className="bg-[#5356ff] hover:bg-[#3333D0] text-white text-sm font-bold py-2.5 px-6 rounded-[4px] transition-colors whitespace-nowrap"
                    >
                      View details
                    </button>
                  </div>
                </div>
              </div>
            );
          })
          )}

          {/* Pagination */}
          {!loading && projects.length > 0 && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-12 py-4">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
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
                onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
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
        </div>

        <div className="mt-16">
          <SupportNewsletter />
        </div>
      </main>
    </div>
  );
}
