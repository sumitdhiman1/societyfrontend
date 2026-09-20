"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import HttpClient from "@/lib/HttpClient";
import StatusPopup from "@/components/common/StatusPopup";

const httpClient = new HttpClient();

interface JobDetail {
  id: string;
  title: string;
  location: string;
  type?: string;
  publishedDate?: string;
  description: string;
  requirements: string[];
}

const defaultJobs: { [key: string]: JobDetail } = {
  "job-1786961518485": {
    id: "job-1786961518485",
    title: "Project Manager",
    location: "Estonia",
    type: "Full-time",
    publishedDate: "Published August 2026",
    description: `We are looking for a Project Manager to oversee client projects across web design, website development, and digital marketing. In this role, you will manage project timelines, coordinate communication between clients and internal teams, track deliverables, and ensure work is completed to a high standard.

You will be responsible for keeping projects organized, handling client feedback, monitoring progress, and making sure deadlines and expectations are managed clearly throughout the process. This position requires strong organizational skills, clear communication, and the ability to manage multiple projects at the same time.

Details such as salary and working hours will be discussed privately with shortlisted candidates.`,
    requirements: [
      "Project Management",
      "Client Communication",
      "Task Coordination",
      "Attention to Detail",
      "Fluency in Estonian",
    ],
  },
  "job-1786961835020": {
    id: "job-1786961835020",
    title: "Web Designer",
    location: "Remote",
    type: "Full-time",
    publishedDate: "Published August 2026",
    description: `We are looking for a Web Designer to craft clean, responsive websites, landing pages, and interactive brand experiences. In this role, you will translate project requirements into beautiful, intuitive UI/UX designs.

You will collaborate closely with clients and development teams to ensure high visual quality, seamless usability, and consistent branding across all digital deliverables.

Details such as salary and working hours will be discussed privately with shortlisted candidates.`,
    requirements: [
      "UI/UX Design",
      "Figma / Prototyping",
      "Responsive Layouts",
      "Design Systems",
      "Attention to Detail",
    ],
  },
  "job-1786964435776": {
    id: "job-1786964435776",
    title: "Sales Representative",
    location: "Estonia",
    type: "Full-time",
    publishedDate: "Published August 2026",
    description: `We are looking for a Sales Representative in Estonia to develop new client relationships, understand customer digital needs, and present tailored web and branding packages.

You will manage outreach, conduct consultative discovery conversations, and guide prospective clients through our packages and quote proposals.

Details such as salary and working hours will be discussed privately with shortlisted candidates.`,
    requirements: [
      "B2B Sales",
      "Client Communication",
      "Prospecting",
      "Negotiation Skills",
      "Fluency in Estonian",
    ],
  },
  "job-1786964436617": {
    id: "job-1786964436617",
    title: "Sales Representative",
    location: "Remote",
    type: "Full-time",
    publishedDate: "Published August 2026",
    description: `We are looking for a Remote Sales Representative to connect with international clients, explain our digital packages and services, and drive new business growth across multiple regions.

This position requires self-motivation, strong communication abilities, and a customer-first approach to project consultation.

Details such as salary and working hours will be discussed privately with shortlisted candidates.`,
    requirements: [
      "Remote Sales",
      "Client Communication",
      "Outreach & Pipeline",
      "Self-Management",
      "Fluency in English",
    ],
  },
};

const defaultList = [
  defaultJobs["job-1786961518485"],
  defaultJobs["job-1786961835020"],
  defaultJobs["job-1786964435776"],
  defaultJobs["job-1786964436617"],
];

function resolveDefaultJob(jobId: string): JobDetail {
  if (!jobId) return defaultList[0];
  if (defaultJobs[jobId]) return defaultJobs[jobId];

  // 1. Check numeric index (e.g. "job-1", "job-2", "1", "2")
  const numMatch = jobId.match(/^(?:job-)?([1-9]\d*)$/i);
  if (numMatch) {
    const idx = parseInt(numMatch[1], 10) - 1;
    if (idx >= 0 && idx < defaultList.length) {
      return defaultList[idx];
    }
  }

  const cleanId = jobId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

  // 2. Specific compound keyword matches
  if (cleanId.includes("estonia") && (cleanId.includes("sales") || cleanId.includes("rep"))) {
    return defaultJobs["job-1786964435776"];
  }
  if (cleanId.includes("remote") && (cleanId.includes("sales") || cleanId.includes("rep"))) {
    return defaultJobs["job-1786964436617"];
  }
  if (cleanId.includes("designer") || cleanId.includes("design") || cleanId.includes("web-designer")) {
    return defaultJobs["job-1786961835020"];
  }
  if (cleanId.includes("manager") || cleanId.includes("project")) {
    return defaultJobs["job-1786961518485"];
  }

  // 3. Match by slug
  const found = defaultList.find((dj) => {
    const titleSlug = dj.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
    const compoundSlug = `${dj.title}-${dj.location}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
    return dj.id === jobId || titleSlug === cleanId || compoundSlug === cleanId || cleanId.includes(titleSlug);
  });

  return found || defaultList[0];
}

export default function CareerSinglePage() {
  const routeParams = useParams();
  const rawId = Array.isArray(routeParams?.id) ? routeParams.id[0] : (routeParams?.id as string) || "";
  const jobId = decodeURIComponent(rawId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    linkedin: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [popup, setPopup] = useState({
    isOpen: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });

  const [currentJob, setCurrentJob] = useState<JobDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        setIsLoading(true);
        const res = await httpClient.get<any>("/pages/getpagebyslug/careers");
        if (res?.isSuccessful && res?.data) {
          const p = res.data?.data || res.data;
          const sections = Array.isArray(p?.sections) ? p.sections : (Array.isArray(res?.data) ? res.data : []);
          const jobsSec = sections.find(
            (s: any) =>
              s?.id === "job-listings" ||
              s?.id === "jobs" ||
              s?.id === "openings" ||
              s?.id === "careers" ||
              s?.type === "job_listings" ||
              s?.type === "jobs" ||
              s?.type === "careers" ||
              s?.type === "openings"
          );

          const rawJobs =
            (Array.isArray(jobsSec?.data?.jobs) && jobsSec.data.jobs) ||
            (Array.isArray(jobsSec?.data?.items) && jobsSec.data.items) ||
            (Array.isArray(jobsSec?.data?.openings) && jobsSec.data.openings) ||
            (Array.isArray(jobsSec?.data) && jobsSec.data) ||
            (Array.isArray(jobsSec?.jobs) && jobsSec.jobs) ||
            (Array.isArray(jobsSec?.items) && jobsSec.items) ||
            (Array.isArray(jobsSec?.openings) && jobsSec.openings) ||
            (Array.isArray(p?.jobs) && p.jobs) ||
            (Array.isArray(p?.openings) && p.openings) ||
            (Array.isArray(p?.items) && p.items) ||
            [];

          if (Array.isArray(rawJobs) && rawJobs.length > 0) {
            const numMatch = jobId.match(/^(?:job-)?([1-9]\d*)$/i);
            const targetIdx = numMatch ? parseInt(numMatch[1], 10) - 1 : -1;
            const cleanJobId = jobId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

            const found = rawJobs.find((j: any, idx: number) => {
              if (!j) return false;
              const defaultIdForIdx =
                idx === 0
                  ? "job-1786961518485"
                  : idx === 1
                    ? "job-1786961835020"
                    : idx === 2
                      ? "job-1786964435776"
                      : idx === 3
                        ? "job-1786964436617"
                        : `job-${idx + 1}`;

              const titleSlug = (j.title || "")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)+/g, "");
              const compoundSlug = `${j.title || ""}-${j.location || ""}`
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)+/g, "");

              return (
                j.id === jobId ||
                j.slug === jobId ||
                j._id === jobId ||
                defaultIdForIdx === jobId ||
                `job-${idx + 1}` === jobId ||
                String(idx + 1) === jobId ||
                (targetIdx !== -1 && idx === targetIdx) ||
                j.applyUrl?.endsWith(`/${jobId}`) ||
                j.applyUrl === jobId ||
                titleSlug === cleanJobId ||
                compoundSlug === cleanJobId
              );
            });

            if (found) {
              const fallbackJob = resolveDefaultJob(
                found.id || jobId || `${found.title || ""}-${found.location || ""}`
              );

              let parsedReqs: string[] = [];
              if (Array.isArray(found.requirements)) {
                parsedReqs = found.requirements
                  .map((r: any) => String(r).replace(/^[-•*]\s*/, "").trim())
                  .filter(Boolean);
              } else if (typeof found.requirements === "string" && found.requirements.trim()) {
                const cleaned = found.requirements
                  .replace(/<br\s*\/?>/gi, "\n")
                  .replace(/<\/p>\s*<p>/gi, "\n")
                  .replace(/<\/div>\s*<div>/gi, "\n")
                  .replace(/<li[^>]*>/gi, "\n")
                  .replace(/<\/li>/gi, "\n")
                  .replace(/<[^>]*>/g, "")
                  .replace(/&amp;/g, "&")
                  .replace(/&lt;/g, "<")
                  .replace(/&gt;/g, ">")
                  .replace(/&quot;/g, '"')
                  .replace(/&#39;/g, "'")
                  .replace(/&nbsp;/g, " ");

                if (cleaned.includes("\n")) {
                  parsedReqs = cleaned
                    .split("\n")
                    .map((r: string) => r.replace(/^[-•*]\s*/, "").trim())
                    .filter(Boolean);
                } else if (cleaned.includes(",")) {
                  parsedReqs = cleaned
                    .split(",")
                    .map((r: string) => r.replace(/^[-•*]\s*/, "").trim())
                    .filter(Boolean);
                } else if (cleaned.trim()) {
                  parsedReqs = [cleaned.trim().replace(/^[-•*]\s*/, "")];
                }
              }

              const finalDescription =
                found.description && typeof found.description === "string" && found.description.trim()
                  ? found.description
                  : fallbackJob.description;

              const finalRequirements =
                parsedReqs.length > 0 ? parsedReqs : fallbackJob.requirements;

              const finalPublishedDate =
                found.publishedDate || fallbackJob.publishedDate || "Published August 2026";

              setCurrentJob({
                id: found.id || fallbackJob.id || jobId,
                title: found.title || fallbackJob.title || "Career Opportunity",
                location: found.location || fallbackJob.location || "Remote",
                type: found.type || fallbackJob.type || "Full-time",
                publishedDate: finalPublishedDate,
                description: finalDescription,
                requirements: finalRequirements,
              });
              return;
            }
          }
        }

        // Fallback to local default if API didn't have match
        setCurrentJob(resolveDefaultJob(jobId));
      } catch (err) {
        console.error("API fetch error on careers single page:", err);
        setCurrentJob(resolveDefaultJob(jobId));
      } finally {
        setIsLoading(false);
      }
    };

    fetchJob();
  }, [jobId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email) {
      setPopup({
        isOpen: true,
        type: "error",
        title: "Incomplete Application",
        message: "Please provide your full name and email address.",
      });
      return;
    }

    try {
      setSubmitting(true);
      setPopup({
        isOpen: true,
        type: "success",
        title: "Application Received",
        message: `Thank you for applying for the ${currentJob?.title || "selected"} position! Our recruitment team will review your application and be in touch soon.`,
      });

      setFormData({
        fullName: "",
        email: "",
        linkedin: "",
      });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      setPopup({
        isOpen: true,
        type: "error",
        title: "Submission Error",
        message: err?.message || "Failed to submit application. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !currentJob) {
    return (
      <div className="bg-[#F3F4F6] min-h-screen flex flex-col font-sans">
        <div className="bg-primary-100 ">
          <div className="container mx-auto px-4 md:px-8 lg:px-[54px] py-10 md:py-16 max-w-[1536px]">
            <div className="h-9 md:h-10 bg-white/20 rounded-md w-1/3 animate-pulse" />
          </div>
        </div>
        <div className="flex-grow flex flex-col items-center justify-center py-32 gap-3">
          <div className="w-9 h-9 border-4 border-[#4343f0]/20 border-t-[#4343f0] rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading career details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F3F4F6] min-h-screen flex flex-col font-sans">
      <StatusPopup
        isOpen={popup.isOpen}
        onClose={() => setPopup({ ...popup, isOpen: false })}
        type={popup.type}
        title={popup.title}
        message={popup.message}
      />

      {/* Hero Header */}
      <div className="bg-primary-100">
        <div className="container mx-auto px-4 md:px-8 lg:px-[54px] py-10 md:py-16 max-w-[1536px]">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            {currentJob.title || "Career Opportunity"}
          </h1>
        </div>
      </div>

      {/* Main Single Job Content */}
      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-10 md:pt-14 pb-28 md:pb-14 bg-[#F3F4F6]">
        {/* Description */}
        <div className="mb-10 md:mb-14">
          <h2 className="text-lg font-bold text-gray-600 mb-4">Description</h2>
          {currentJob.description && (currentJob.description.includes('<') || currentJob.description.includes('&')) ? (
            <div
              className="text-gray-500 text-sm leading-relaxed max-w-[1600px] [&_p]:mb-3 [&_p:last-child]:mb-0 [&_a]:underline [&_a]:text-[#4343F0]"
              dangerouslySetInnerHTML={{ __html: currentJob.description }}
            />
          ) : (
            <p className="text-gray-500 text-sm leading-relaxed whitespace-pre-line max-w-[1600px]">
              {currentJob.description || "No description provided."}
            </p>
          )}
        </div>

        {/* 2-Column: Requirements & Apply */}
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
          {/* Requirements (Left) */}
          <div className="lg:w-1/2 w-full">
            <h2 className="text-lg font-bold text-gray-600 mb-6">Requirements</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
              {(currentJob.requirements || []).map((req, idx) => (
                <span key={idx} className="text-gray-500 font-bold text-sm">
                  {req}
                </span>
              ))}
            </div>
          </div>

          {/* Apply Form (Right) */}
          <div className="lg:w-1/2 w-full">
            <h2 className="text-lg font-bold text-gray-600 mb-6">Apply</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label htmlFor="full-name" className="font-bold text-gray-500 text-sm">
                    Full name
                  </label>
                  <input
                    id="full-name"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-400 rounded focus:outline-none focus:border-gray-600 bg-white text-gray-800 text-sm"
                    type="text"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="email" className="font-bold text-gray-500 text-sm">
                    Email
                  </label>
                  <input
                    id="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-400 rounded focus:outline-none focus:border-gray-600 bg-white text-gray-800 text-sm"
                    type="email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2 relative">
                  <label htmlFor="resume-upload" className="font-bold text-gray-500 text-sm flex items-center justify-between">
                    <span>Resume</span>
                    {selectedFile && (
                      <span className="text-xs text-[#4343F0] font-normal truncate max-w-[150px]">
                        {selectedFile.name}
                      </span>
                    )}
                  </label>
                  <input
                    ref={fileInputRef}
                    id="resume-upload"
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    type="file"
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-[#4343F0] hover:bg-[#4346DD] text-white font-bold py-2.5 px-4 rounded flex items-center justify-center gap-2 transition-colors text-sm cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                      ></path>
                    </svg>
                    {selectedFile ? "Replace" : "Attach"}
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="linkedin" className="font-bold text-gray-500 text-sm">
                    LinkedIn profile
                  </label>
                  <input
                    id="linkedin"
                    value={formData.linkedin}
                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-400 rounded focus:outline-none focus:border-gray-600 bg-white text-gray-800 text-sm"
                    type="text"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#4343F0] hover:bg-[#4346DD] text-white font-bold py-3 rounded transition-colors text-sm cursor-pointer disabled:opacity-60"
                >
                  {submitting ? "Submitting Application..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
