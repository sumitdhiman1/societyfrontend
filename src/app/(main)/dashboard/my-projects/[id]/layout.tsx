"use client";

import React, { useState, useEffect } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ProjectProvider, useProject } from "@/context/ProjectContext";
import DeadlineTooltip from "@/components/common/DeadlineTooltip";
import { getProjectEstimatedDeadline } from "@/lib/calculatorUtils";
import { projectService } from "@/lib/projectService";
import { toast } from "sonner";

function ProjectLayoutContent({ children }: { children: React.ReactNode }) {
  const { project, isLoading, refreshProject, setProject } = useProject();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const projectId = params.id as string;

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(project?.title || "");
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  useEffect(() => {
    if (project?.title) {
      setEditedTitle(project.title);
    }
  }, [project?.title]);

  const handleSaveTitle = async () => {
    if (!editedTitle.trim() || (!project?._id && !projectId)) return;
    setIsSavingTitle(true);
    try {
      const targetId = project?._id || projectId;
      const res: any = await projectService.renameProject(targetId, editedTitle.trim());
      if (res?.isSuccessful || res?.statusCode === 200 || res?.data) {
        toast.success("Project title updated successfully");
        if (res.data) setProject(res.data);
        else refreshProject(true);
        setIsEditingTitle(false);
      } else {
        toast.error(res?.message || "Failed to update project title");
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to update project title");
    } finally {
      setIsSavingTitle(false);
    }
  };

  const tabs = ["details", "payments", "files"];
  const currentTab = pathname.split("/").pop();
  const activeTab = tabs.includes(currentTab || "") ? currentTab : "details";

  if (isLoading && !project) {
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
          <div className="flex items-center gap-3 group mb-8 md:mb-12">
            {isEditingTitle ? (
              <div className="flex items-center gap-2 w-full max-w-xl">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") {
                      setIsEditingTitle(false);
                      setEditedTitle(project.title || "");
                    }
                  }}
                  autoFocus
                  className="text-[24px] md:text-[28px] font-medium text-primary-100 border-b-2 border-[#4343F0] outline-none px-1 py-0.5 w-full bg-transparent"
                  placeholder="Enter project title..."
                />
                <button
                  type="button"
                  onClick={handleSaveTitle}
                  disabled={isSavingTitle}
                  className="px-3 py-1.5 bg-[#4343F0] hover:bg-[#3232b7] text-white text-xs font-bold rounded cursor-pointer shrink-0 disabled:opacity-50 transition-colors"
                >
                  {isSavingTitle ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingTitle(false);
                    setEditedTitle(project.title || "");
                  }}
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded cursor-pointer shrink-0 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-[28px] md:text-[32px] font-medium text-primary-100">
                  {project.title}
                </h1>
                <button
                  type="button"
                  onClick={() => {
                    setEditedTitle(project.title || "");
                    setIsEditingTitle(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded cursor-pointer"
                  title="Edit project title"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </>
            )}
          </div>

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
                  {getProjectEstimatedDeadline(project)
                    ? formatDate(getProjectEstimatedDeadline(project))
                    : project.deadline
                    ? formatDate(project.deadline)
                    : "Ongoing"}
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
