"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import UserWelcome from "@/components/dashboard/UserWelcome";
import PromoCarousel from "@/components/dashboard/PromoCarousel";
import ProjectTabs from "@/components/dashboard/ProjectTabs";
import ServiceGrid from "@/components/dashboard/ServiceGrid";
import FreeAnalysis from "@/components/dashboard/FreeAnalysis";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";
import RequestAnalysis from "@/components/dashboard/RequestAnalysis";

function DashboardContent() {
  const searchParams = useSearchParams();
  const message = searchParams.get("message");

  return (
    <div className="w-full flex-grow space-y-12 md:space-y-16">
      <div className="mx-auto px-4 md:px-8 lg:px-[54px] max-w-[1536px]">

        {/* Hero / Top Section */}
        <div className="flex  flex-col lg:flex-row gap-6 lg:gap-8 pt-6 lg:pt-[32px]">
          <div className=" lg:w-[408px] shrink-0 min-w-0">
            <UserWelcome />
          </div>
          <div className="flex-1 min-w-0">
            <PromoCarousel />
          </div>
        </div>

        {/* Services Grid */}
        <div className="md:mt-12 mt-10 ">
          <ServiceGrid />
        </div>

        {/* Projects Section */}
        <div className="">
          <ProjectTabs />
        </div>
      </div>

      {/* Free Analysis Section */}
      <FreeAnalysis />

      {/* Support & Newsletter Section */}
      <SupportNewsletter />

      {/* Request Analysis Popup */}
      <RequestAnalysis />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
