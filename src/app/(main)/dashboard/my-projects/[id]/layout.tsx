"use client";

import React from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ProjectProvider, useProject } from "@/context/ProjectContext";
import DeadlineTooltip from "@/components/common/DeadlineTooltip";

function ProjectLayoutContent({ children }: { children: React.ReactNode }) {
  const { project, isLoading } = useProject();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const projectId = params.id as string;

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

  if (!project) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-gray-500">
        <p className="text-xl font-semibold mb-4">Project not found</p>
        <button
          onClick={() => router.push("/dashboard/my-projects")}
          className="text-[#5356ff] hover:underline"
        >
          Back to My Projects
        </button>
      </div>
    );
  }

  const formatDate = (date: any) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const month = d.toLocaleString("en-US", { month: "short" });
    const day = d.getDate();
    const time = d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${month} ${day}, ${time}`;
  };

  return (
    <div className="bg-white min-h-screen flex flex-col font-sans" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-8 md:pt-12 pb-12 overflow-x-hidden">
        <div className="mb-10">
          <h1 className="text-[28px] md:text-[32px] font-medium text-primary-100 mb-8 md:mb-12">
            {project.title}
          </h1>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-200">
            <div className="flex gap-4 sm:gap-6 md:gap-10 overflow-x-auto w-full md:w-auto hide-scrollbar">
              {tabs.map((tab) => (
                <Link
                  key={tab}
                  href={`/dashboard/my-projects/${projectId}/${tab}`}
                  className={`pb-4 text-base sm:text-lg font-medium capitalize transition-colors relative whitespace-nowrap ${activeTab === tab
                    ? "text-[#363636] font-bold"
                    : "text-[#88909D] font-normal hover:text-gray-600"
                    }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 w-full h-[4px] bg-[#4343F0] rounded-t-[2px]" />
                  )}
                </Link>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-8 mb-4 sm:mb-3 text-[11px] sm:text-sm font-medium text-[#363636] mt-4 md:mt-0">
              <div className="flex items-center">
                <span className="text-[#88909D] mr-2">Start date:</span>
                <span className="font-bold">
                  {project.startDate ? formatDate(project.startDate) : "TBD"}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-[#88909D] mr-2">Estimated Deadline:</span>
                <span className="font-bold">
                  {project.deadline ? formatDate(project.deadline) : "Ongoing"}
                </span>
                <DeadlineTooltip position="left" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProjectProvider>
      <ProjectLayoutContent>{children}</ProjectLayoutContent>
    </ProjectProvider>
  );
}
