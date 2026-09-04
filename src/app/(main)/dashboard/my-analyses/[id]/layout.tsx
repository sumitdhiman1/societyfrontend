"use client";

import React, { useState, useRef, useEffect } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { AnalysisProvider, useAnalysis } from "@/context/AnalysisContext";
import DashboardSubNav from "@/components/dashboard/DashboardSubNav";
import { requestAnalysisService, savePendingAnalysisId, savePendingAnalysisInfo, claimPendingAnalyses } from "@/lib/requestAnalysisService";
import { authService } from "@/lib/authService";

function AnalysisLayoutContent({ children }: { children: React.ReactNode }) {
  const { analysis, isLoading, refreshAnalysis } = useAnalysis();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const analysisId = params.id as string;

  useEffect(() => {
    if (analysis) {
      savePendingAnalysisInfo(analysis);
    }
    if (analysisId) {
      savePendingAnalysisId(analysisId);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("from_analysis_detail", analysisId);
      }
      if (authService.isAuthenticated()) {
        claimPendingAnalyses();
      }
    }
  }, [analysisId, analysis]);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const tabs = ["details", "payments", "files"];
  const currentTab = pathname.split("/").pop();
  const activeTab = tabs.includes(currentTab || "") ? currentTab : "details";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4343F0]"></div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-gray-500">
        <p className="text-xl font-semibold mb-4">Analysis order not found</p>
        <button
          onClick={() => router.push("/dashboard/my-analyses")}
          className="text-[#4343F0] hover:underline font-bold cursor-pointer"
        >
          Back to My Analyses
        </button>
      </div>
    );
  }

  const handleRename = async () => {
    const aId = analysis._id || analysis.id;
    if (!aId || !newTitle.trim() || newTitle.trim() === analysis.title) {
      setIsEditingTitle(false);
      return;
    }

    setIsRenaming(true);
    try {
      const res = await requestAnalysisService.renameProject(aId, newTitle.trim());
      if (res && (res.statusCode === 200 || res.statusCode === 201 || res.isSuccessful)) {
        refreshAnalysis();
      }
    } catch (error) {
      console.error("Failed to rename analysis:", error);
    } finally {
      setIsRenaming(false);
      setIsEditingTitle(false);
    }
  };

  const startDateFormatted = analysis.startDate || analysis.createdAt
    ? new Date(analysis.startDate || analysis.createdAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "TBD";

  return (
    <div
      className="bg-white min-h-screen flex flex-col font-sans"
      style={{ fontFamily: "var(--font-inter), sans-serif" }}
    >
      <DashboardSubNav />
      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-8 md:pt-12 pb-12">
        <div className="mb-10">
          <div className="flex items-center gap-3 group mb-8 md:mb-12">
            {isEditingTitle ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  ref={titleInputRef}
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename();
                    if (e.key === "Escape") setIsEditingTitle(false);
                  }}
                  className="text-[28px] md:text-[32px] font-medium text-primary-100 leading-tight bg-transparent border-b-2 border-[#4343F0] focus:outline-none flex-1 py-1"
                  disabled={isRenaming}
                />
                <button
                  onClick={handleRename}
                  disabled={isRenaming}
                  className="px-3 py-1.5 bg-[#4343F0] text-white text-xs font-bold rounded transition-colors hover:bg-[#3232b7] disabled:opacity-50 cursor-pointer"
                >
                  {isRenaming ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setIsEditingTitle(false)}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-bold rounded transition-colors hover:bg-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-[28px] md:text-[32px] font-medium text-primary-100 leading-tight">
                  {analysis.title}
                </h1>
                <button
                  onClick={() => {
                    setNewTitle(analysis.title);
                    setIsEditingTitle(true);
                    setTimeout(() => titleInputRef.current?.focus(), 50);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded mt-1 cursor-pointer"
                  title="Edit analysis title"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </button>
              </>
            )}
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-200">
            <div
              className="flex gap-4 sm:gap-6 md:gap-10 overflow-x-auto w-full md:w-auto scrollbar-hide"
              style={{ cursor: "grab" }}
            >
              {tabs.map((tab) => (
                <Link
                  key={tab}
                  href={`/dashboard/my-analyses/${analysisId}/${tab}`}
                  className={`pb-4 text-base sm:text-lg font-inter capitalize transition-colors relative whitespace-nowrap ${
                    activeTab === tab
                      ? "text-[#363636] font-bold"
                      : "text-[#88909D] font-normal hover:text-gray-600"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 w-full h-[4px] bg-[#4343F0] rounded-t-[2px]" />
                  )}
                </Link>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-8 mb-4 sm:mb-3 text-[11px] sm:text-sm font-medium text-[#363636] mt-4 md:mt-0">
              <div>
                <span className="text-[#88909D] mr-2">Start date:</span>
                {startDateFormatted}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}

export default function AnalysisLayout({ children }: { children: React.ReactNode }) {
  return (
    <AnalysisProvider>
      <AnalysisLayoutContent>{children}</AnalysisLayoutContent>
    </AnalysisProvider>
  );
}
