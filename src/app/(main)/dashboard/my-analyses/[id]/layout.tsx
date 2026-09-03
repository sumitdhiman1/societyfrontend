"use client";

import React from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { AnalysisProvider, useAnalysis } from "@/context/AnalysisContext";
import DeadlineTooltip from "@/components/common/DeadlineTooltip";
import DashboardSubNav from "@/components/dashboard/DashboardSubNav";

function AnalysisLayoutContent({ children }: { children: React.ReactNode }) {
  const { analysis, isLoading } = useAnalysis();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const analysisId = params.id as string;

  const tabs = ["details", "payments", "files"];
  const currentTab = pathname.split("/").pop();
  const activeTab = tabs.includes(currentTab || "") ? currentTab : "details";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5356ff]"></div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-gray-500">
        <p className="text-xl font-semibold mb-4">Analysis order not found</p>
        <button
          onClick={() => router.push("/dashboard/my-analyses")}
          className="text-[#5356ff] hover:underline font-bold"
        >
          Back to My Analyses
        </button>
      </div>
    );
  }

  const analysisNumber =
    analysis.projectNumber || `#ANL-${analysis._id?.slice(-8).toUpperCase() || "XXXXXXXX"}`;

  return (
    <div
      className="bg-white min-h-screen flex flex-col font-sans"
      style={{ fontFamily: "var(--font-inter), sans-serif" }}
    >
      <DashboardSubNav />
      <main className="flex-grow w-full max-w-[1600px] mx-auto px-4 md:px-8 lg:px-[54px] pt-8 md:pt-12 pb-16">
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h1 className="text-[28px] md:text-[32px] font-bold text-[#1A202C]">
              {analysis.title}
            </h1>
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-md self-start sm:self-auto">
              Analysis {analysisNumber}
            </span>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-200">
            <div className="flex gap-4 sm:gap-6 md:gap-10 overflow-x-auto w-full md:w-auto hide-scrollbar">
              {tabs.map((tab) => (
                <Link
                  key={tab}
                  href={`/dashboard/my-analyses/${analysisId}/${tab}`}
                  className={`pb-4 text-base sm:text-lg font-medium capitalize transition-colors relative whitespace-nowrap ${
                    activeTab === tab
                      ? "text-[#363636] font-bold"
                      : "text-[#88909D] font-normal hover:text-gray-600"
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 w-full h-[4px] bg-[#5356ff] rounded-t-[2px]" />
                  )}
                </Link>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-8 mb-4 sm:mb-3 text-[11px] sm:text-sm font-medium text-[#363636] mt-4 md:mt-0">
              <div className="flex items-center">
                <span className="text-[#88909D] mr-2">Start date:</span>
                <span className="font-bold">
                  {analysis.startDate
                    ? new Date(analysis.startDate).toLocaleDateString()
                    : "TBD"}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-[#88909D] mr-2">Estimated Deadline:</span>
                <span className="font-bold">
                  {analysis.deadline
                    ? new Date(analysis.deadline).toLocaleDateString()
                    : "Pending"}
                </span>
                <DeadlineTooltip />
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
