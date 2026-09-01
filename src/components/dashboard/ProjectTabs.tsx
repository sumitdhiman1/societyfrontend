"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/authService";
import { projectService } from "@/lib/projectService";
import DeadlineTooltip from "@/components/common/DeadlineTooltip";

const CardsIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="0.75"
      y="0.75"
      width="7.5"
      height="7.5"
      rx="1.5"
      fill="currentColor"
    />
    <rect
      x="9.75"
      y="0.75"
      width="7.5"
      height="7.5"
      rx="1.5"
      fill="currentColor"
    />
    <rect
      x="0.75"
      y="9.75"
      width="7.5"
      height="7.5"
      rx="1.5"
      fill="currentColor"
    />
    <rect
      x="9.75"
      y="9.75"
      width="7.5"
      height="7.5"
      rx="1.5"
      fill="currentColor"
    />
  </svg>
);

const ListIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M6 4.5H16.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 9H16.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 13.5H16.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M1.5 4.5H3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M1.5 9H3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M1.5 13.5H3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function ProjectTabs() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("active");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [projects, setProjects] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const auth = authService.isAuthenticated();
      setIsAuth(auth);
      return auth;
    };

    const fetchStats = async () => {
      if (!checkAuth()) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await projectService.getDashboardStats();
        if (res?.data) {
          setCounts(res.data.counts);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard counts", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    if (isAuth) {
      const fetchProjects = async () => {
        try {
          const res = await projectService.getDashboardStats(activeTab);
          if (res?.data) {
            const mapped = res.data.projects.map((p: any) => {
              const pid = p._id || p.id || p.projectId;
              return {
                id: pid,
                name: p.title,
                number: pid ? `#${pid.slice(-8).toUpperCase()}` : "#00000000",
                started: new Date(p.startDate).toLocaleDateString("en-US", {
                  month: "numeric",
                  day: "numeric",
                  year: "2-digit",
                }),
                deadline: "Ongoing",
                status: p.status.toLowerCase() === "cancelled" ? "canceled" : p.status.toLowerCase(),
                messages: p.unreadMessagesCount,
                infoUrl: p.infoUrl || `/dashboard/my-projects/${pid}`,
              };
            });
            setProjects(mapped);
            if (res.data.counts) setCounts(res.data.counts);
          }
        } catch (error) {
          console.error("Failed to fetch dashboard projects", error);
        }
      };
      fetchProjects();
    }
  }, [activeTab, isAuth]);

  const filteredProjects = useMemo(
    () => projects.filter((p) => p.status === activeTab),
    [activeTab, projects],
  );

  const stats = {
    active: counts?.active ?? 0,
    paused: counts?.paused ?? 0,
    delivered: counts?.delivered ?? 0,
    completed: counts?.completed ?? 0,
    canceled: counts?.canceled ?? 0,
  };

  const TabButton = ({
    id,
    label,
    count,
  }: {
    id: string;
    label: string;
    count: number;
  }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`text-[16px] sm:text-[18px] leading-[21px] font-inter text-left transition-colors relative pb-4 whitespace-nowrap ${
        activeTab === id
          ? "font-bold text-[#363636]"
          : "font-normal text-[#434343] opacity-50 hover:opacity-100"
      }`}
    >
      {label}
      <span className="ml-1 text-sm text-gray-400 font-bold">({count})</span>
      {activeTab === id && (
        <div className="absolute bottom-0 left-0 w-full h-[4px] bg-[#5356ff] rounded-t-[2px]" />
      )}
    </button>
  );

  return (
    <div
      className="font-sans"
      style={{ fontFamily: "var(--font-inter), sans-serif" }}
    >
      <div className="flex flex-row justify-between items-center w-full">
        <h2 className="text-[24px] md:text-3xl lg:text-[42px] leading-[38px] md:leading-normal lg:leading-[51px] font-bold text-[#434343] capitalize font-inter text-left">
          My Projects
        </h2>
        <div className="relative md:hidden text-[14px]">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="appearance-none bg-[#4343F0] text-white font-semibold py-2.5 px-6 pr-10 rounded-[6px] text-[14px] focus:outline-none shadow-md"
          >
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="canceled">Canceled</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            <svg
              className="h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="hidden md:flex flex-row flex-nowrap justify-between items-end border-b border-gray-200 pb-0 w-full mt-6 md:mt-8 lg:mt-[46px] gap-x-4">
        <div
          className="flex gap-6 sm:gap-10 overflow-x-auto flex-nowrap min-w-0"
          style={{ scrollbarWidth: "none" }}
        >
          <TabButton id="active" label="Active" count={stats.active} />
          <TabButton id="paused" label="Paused" count={stats.paused} />
          <TabButton id="completed" label="Completed" count={stats.completed} />
          <TabButton id="canceled" label="Canceled" count={stats.canceled} />
        </div>

        <div className="flex items-end gap-6 sm:gap-10 md:gap-12 lg:gap-[60px] pb-4 ml-auto">
          <span className="text-[18px] leading-[21px] font-normal font-inter text-[#434343] hidden sm:block">
            View
          </span>
          <div className="flex gap-6">
            <button
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-2 font-inter transition-colors relative ${
                viewMode === "cards"
                  ? "text-[#363636] font-bold"
                  : "text-gray-500 font-normal"
              }`}
            >
              <span
                className={
                  viewMode === "cards" ? "text-[#4343F0]" : "text-gray-500"
                }
              >
                <CardsIcon />
              </span>
              <span className="text-[18px] leading-[21px]">Cards</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-2 font-inter transition-colors relative ${
                viewMode === "list"
                  ? "text-[#363636] font-bold"
                  : "text-gray-500 font-normal"
              }`}
            >
              <span
                className={
                  viewMode === "list" ? "text-[#4343F0]" : "text-gray-500"
                }
              >
                <ListIcon />
              </span>
              <span className="text-[18px] leading-[21px]">List</span>
            </button>
          </div>
        </div>
      </div>

      {viewMode === "cards" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 xl:gap-x-[62px] xl:gap-y-[48px] mt-6 md:mt-8 lg:mt-[50px]">
          {loading ? (
            [1, 2].map((i) => (
              <div
                key={i}
                className="bg-white rounded-[8px] p-8 shadow-sm w-full h-[221px] animate-pulse"
              >
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-10" />
                <div className="flex gap-8">
                  <div className="h-10 bg-gray-200 rounded w-20" />
                  <div className="h-10 bg-gray-200 rounded w-20" />
                </div>
              </div>
            ))
          ) : (
            <>
              {filteredProjects.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-[6px] p-6 lg:p-8 shadow-[0px_5px_25px_#0000000D] w-full min-h-[221px] flex flex-col justify-between hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2 mb-6 lg:mb-4">
                    <h3 className="text-[26px] md:text-[22px] lg:text-[20px] xl:text-[22px] font-bold text-[#363636] lg:text-[#1A202C] leading-[32px] md:leading-[30px] lg:leading-[26px] xl:leading-[30px] line-clamp-2">
                      {p.name}
                    </h3>
                  </div>
                  <div className="flex flex-col w-full gap-8 lg:gap-4">
                    <div className="grid grid-cols-3 gap-3 xl:gap-4 flex-1">
                      <div>
                        <p className="text-[#4343F0] text-[11px] xl:text-[13px] font-bold">
                          Project #
                        </p>
                        <p className="text-[#363636] text-[13px] xl:text-[15px] font-medium">
                          {p.number}
                        </p>
                      </div>
                      <div>
                        <p className="text-[#4343F0] text-[11px] xl:text-[13px] font-bold">
                          Started
                        </p>
                        <p className="text-[#363636] text-[13px] xl:text-[15px] font-medium">
                          {p.started}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center">
                          <p className="text-[#4343F0] md:hidden block text-[11px] xl:text-[13px] font-bold">
                           Deadline
                          </p>
                          <p className="hidden md:block text-[#4343F0] text-[11px] xl:text-[13px] font-bold">
                            Exp. Deadline
                          </p>
                          {/* <DeadlineTooltip /> */}
                        </div>
                        <p className="text-[#363636] text-[13px] xl:text-[15px] font-medium">
                          {p.deadline}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 lg:gap-[16px] items-center 
                    justify-between lg:justify-end w-full">
                      <button
                        onClick={() =>
                          router.push(`${p.infoUrl}/details#messages`)
                        }
                        className="bg-[#E3E6F5] text-[#4343F0] min-w-[120px] px-6 py-2.5 rounded-[8px] lg:rounded-[6px] text-[14px] lg:text-[13px] font-bold relative hover:bg-[#d4d8f0]"
                      >
                        {p.messages > 0 && (
                          <span className="absolute -top-[10px] -left-[10px] bg-[#363636] text-white rounded-full w-[24px] h-[24px] flex items-center justify-center text-[12px] font-bold">
                            {p.messages}
                          </span>
                        )}
                        Messages
                      </button>
                      <button
                        onClick={() => router.push(p.infoUrl)}
                        className="bg-[#E3E6F5] text-[#5356ff] min-w-[120px] px-6 py-2.5 
                        rounded-[8px] lg:rounded-[6px] text-[14px] lg:text-[13px] font-bold hover:bg-[#d4d8f0]"
                      >
                        Info
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <div className="w-full max-h-[166px] md:min-h-[221px] border-2 border-dashed border-[#4343F0]/30   rounded-[6px] flex flex-col p-6 md:p-8 justify-between hover:bg-[#F2F4FF] text-center lg:text-left">
                <h3 className="text-[26px] md:text-[29px] font-semibold text-[#363636]">
                  New Project
                </h3>
                <button
                  onClick={() => router.push("/dashboard/new-project")}
                  className="w-full bg-[#4343F0] md:mt-0 mt-4 hover:bg-[#3232b7] text-white font-semibold py-3.5 rounded-[4px] transition-all shadow-lg text-[14px] md:text-sm"
                >
                  Create a New Project
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {viewMode === "list" && (
        <div className="bg-white rounded-[8px] shadow-sm border border-gray-100 mt-6 flex flex-col overflow-hidden">
          <div className="w-full overflow-x-auto pb-0">
            <div className="min-w-[1000px]">
              <div className="grid grid-cols-12 gap-4 py-4 px-6 text-[13px] lg:text-[14px] font-bold text-[#5356ff] mb-0 bg-[#F2F1FE] items-center">
                <div className="col-span-4">Project name</div>
                <div className="col-span-2">Project number</div>
                <div className="col-span-2">Started</div>
                <div className="col-span-2 text-[#4343F0] font-bold">
                  Exp. Deadline
                </div>
                <div className="col-span-2"></div>
              </div>
              <div className="flex flex-col gap-0">
                {filteredProjects.map((p) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-12 gap-4 items-center border-b border-gray-100 py-6 px-6 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className="col-span-4 text-[15px] font-medium text-[#363636] pr-4"
                      title={p.name}
                    >
                      {p.name}
                    </div>
                    <div className="col-span-2 text-[15px] text-[#363636] font-medium">
                      {p.number}
                    </div>
                    <div className="col-span-2 text-[15px] text-[#363636] font-medium">
                      {p.started}
                    </div>
                    <div className="col-span-2 text-[15px] text-[#363636] font-medium">
                      {p.deadline}
                    </div>
                    <div className="col-span-2 flex justify-end gap-3">
                      <button
                        onClick={() =>
                          router.push(`${p.infoUrl}/details#messages`)
                        }
                        className="bg-[#EBE9FA] text-[#4343F0] w-[105px] h-[38px] rounded-[6px] text-[13px] font-bold relative hover:bg-[#dcd9f5] shrink-0"
                      >
                        {p.messages > 0 && (
                          <span className="absolute -top-[9px] -left-[9px] bg-[#363636] text-white rounded-full w-[24px] h-[24px] flex items-center justify-center text-[12px] font-bold">
                            {p.messages}
                          </span>
                        )}
                        Messages
                      </button>
                      <button
                        onClick={() => p.infoUrl && router.push(p.infoUrl)}
                        className="bg-[#EBE9FA] text-[#5356ff] w-[75px] h-[38px] rounded-[6px] text-[13px] font-bold hover:bg-[#dcd9f5] shrink-0"
                      >
                        Info
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mx-6 mb-6 mt-6 border-2 border-dashed border-[#4343F0]/25 rounded-[8px] p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <h3 className="text-[20px] font-bold text-[#363636] capitalize">
              New Project
            </h3>
            <button
              onClick={() => router.push("/dashboard/new-project")}
              className="w-full md:w-auto bg-[#5356ff] hover:bg-[#3333D0] text-white font-bold py-3 px-12 rounded-[4px] transition-colors"
            >
              Start New Project
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
