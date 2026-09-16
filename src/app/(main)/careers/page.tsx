"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import HttpClient from "@/lib/HttpClient";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";

const httpClient = new HttpClient();

interface JobItem {
  id?: string;
  title: string;
  location: string;
  type?: string;
  status?: string;
  department?: string;
  description?: string;
  requirements?: string;
  applyUrl?: string;
  publishedDate?: string;
}

interface CareersPageData {
  heroTitle?: string;
  descTitle?: string;
  descContent?: string;
  jobsTitle?: string;
  jobs?: JobItem[];
}

export default function CareersPage() {
  const [data, setData] = useState<CareersPageData>({
    heroTitle: "Careers",
    descTitle: "Join Our Team",
    descContent:
      "We’re looking for talented people who want to help us deliver high-quality websites, branding, and digital solutions for clients around the world. Work remotely with a growing team that values craftsmanship, clear communication, and real results.",
    jobsTitle: "Openings",
    jobs: [
      {
        id: "job-1786961518485",
        title: "Project Manager",
        location: "Estonia",
        type: "Full-time",
        status: "active",
        publishedDate: "Published August 2026",
        applyUrl: "mailto:careers@society-web-solutions.com?subject=Application:%20Project%20Manager",
      },
      {
        id: "job-1786961835020",
        title: "Web Designer",
        location: "Remote",
        type: "Full-time",
        status: "active",
        publishedDate: "Published August 2026",
        applyUrl: "mailto:careers@society-web-solutions.com?subject=Application:%20Web%20Designer",
      },
      {
        id: "job-1786964435776",
        title: "Sales Representative",
        location: "Estonia",
        type: "Full-time",
        status: "active",
        publishedDate: "Published August 2026",
        applyUrl: "mailto:careers@society-web-solutions.com?subject=Application:%20Sales%20Representative%20(Estonia)",
      },
      {
        id: "job-1786964436617",
        title: "Sales Representative",
        location: "Remote",
        type: "Full-time",
        status: "active",
        publishedDate: "Published August 2026",
        applyUrl: "mailto:careers@society-web-solutions.com?subject=Application:%20Sales%20Representative%20(Remote)",
      },
    ],
  });

  useEffect(() => {
    const fetchCareers = async () => {
      try {
        const res = await httpClient.get<any>("/pages/getpagebyslug/careers");
        if (res?.isSuccessful && res?.data) {
          const p = res.data?.data || res.data;
          const sections = Array.isArray(p.sections) ? p.sections : [];

          // 1. Heading
          const headSec = sections.find(
            (s: any) => s.id === "heading" || s.id === "hero" || s.type === "heading" || s.type === "hero_simple"
          );
          const heroTitle = headSec?.data?.title || headSec?.title || "Careers";

          // 2. Description Block
          const descSec = sections.find(
            (s: any) =>
              s.id === "description-block" ||
              s.id === "intro" ||
              s.id === "description" ||
              s.type === "description_block" ||
              s.type === "text_block" ||
              s.type === "text_block_centered"
          );
          const descTitle = descSec?.data?.title || descSec?.title || "Join Our Team";
          const descContent =
            descSec?.data?.content ||
            descSec?.content ||
            "We’re looking for talented people who want to help us deliver high-quality websites, branding, and digital solutions for clients around the world. Work remotely with a growing team that values craftsmanship, clear communication, and real results.";

          // 3. Job Listings
          const jobsSec = sections.find(
            (s: any) =>
              s.id === "job-listings" ||
              s.id === "jobs" ||
              s.id === "openings" ||
              s.type === "job_listings" ||
              s.type === "jobs" ||
              s.type === "careers"
          );
          const jobsTitle = jobsSec?.data?.title || jobsSec?.title || "Openings";
          const rawJobs =
            jobsSec?.data?.jobs ||
            jobsSec?.data?.items ||
            jobsSec?.data?.openings ||
            jobsSec?.jobs ||
            jobsSec?.items ||
            jobsSec?.openings;

          let parsedJobs: JobItem[] = [];
          if (Array.isArray(rawJobs) && rawJobs.length > 0) {
            parsedJobs = rawJobs
              .filter((j: any) => j.status !== "closed")
              .map((j: any, idx: number) => ({
                id: j.id || `job-${idx + 1}`,
                title: j.title || "Open Position",
                location: j.location || "Remote",
                type: j.type || "Full-time",
                status: j.status || "active",
                department: j.department || "",
                description: j.description || "",
                requirements: j.requirements || "",
                applyUrl: j.applyUrl || `mailto:careers@society-web-solutions.com?subject=Application:%20${encodeURIComponent(j.title || "Job")}`,
                publishedDate: j.publishedDate || "Published August 2026",
              }));
          }

          setData({
            heroTitle,
            descTitle,
            descContent,
            jobsTitle,
            jobs: parsedJobs.length > 0 ? parsedJobs : data.jobs,
          });
        }
      } catch (err) {
        console.error("Failed to fetch careers page from API, using default:", err);
      }
    };

    fetchCareers();
  }, []);

  return (
    <div className="bg-white min-h-screen flex flex-col font-sans">
      {/* Hero Header */}
      <div className="bg-primary-100 border-[3px] border-gray-600">
        <div className="container mx-auto px-4 md:px-8 lg:px-[54px] py-10 md:py-16 max-w-[1536px]">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            {data.heroTitle || "Careers"}
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-10 md:pt-16 pb-8 md:pb-12 max-w-[1536px] w-full">
        {/* Join Our Team Section */}
        <div className="mb-8 md:mb-16">
          <h2 className="text-xl font-bold text-gray-600 mb-4">
            {data.descTitle || "Join Our Team"}
          </h2>
          <div className="text-gray-500 text-sm leading-relaxed max-w-[1600px] [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-[#4343F0] [&_a]:underline">
            <p>{data.descContent}</p>
          </div>
        </div>

        {/* Openings Grid */}
        <div>
          <h2 className="text-xl font-bold text-gray-600 mb-6 md:mb-8">
            {data.jobsTitle || "Openings"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.jobs && data.jobs.length > 0 ? (
              data.jobs.map((job, idx) => {
                const jobHref = `/careers/${job.id || `job-${idx + 1}`}`;

                return (
                  <a
                    key={idx}
                    className="block group"
                    href={jobHref}
                  >
                    <div className="bg-[#0d1939] rounded-lg p-6 md:p-8 flex flex-col justify-between hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-[#4343F0] h-full group">
                      <div className="flex justify-between items-start mb-6 md:mb-8 gap-4">
                        <h3 className="font-bold text-white text-lg transition-colors group-hover:text-[#8888ff]">
                          {job.title}
                        </h3>
                        <span className="text-xs text-gray-400 font-bold shrink-0">
                          {job.publishedDate || "Published August 2026"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-300 font-bold">
                          {job.location}
                        </span>
                        {job.type && (
                          <span className="text-xs text-gray-400 font-medium">
                            {job.type}
                          </span>
                        )}
                      </div>
                    </div>
                  </a>
                );
              })
            ) : (
              <div className="col-span-2 bg-gray-50 rounded-xl p-8 border border-gray-200 text-center">
                <p className="text-gray-500 text-sm font-medium">No current openings.</p>
                <p className="text-gray-400 text-xs mt-2">
                  Check back later or contact us at careers@society-web-solutions.com.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Support Newsletter */}
        <div className="mt-16 md:mt-24">
          <SupportNewsletter />
        </div>
      </main>
    </div>
  );
}
