"use client";

import React from "react";
import UserWelcome from "@/components/dashboard/UserWelcome";
import PromoCarousel from "@/components/dashboard/PromoCarousel";
import ServiceGrid from "@/components/dashboard/ServiceGrid";
import ProjectTabs from "@/components/dashboard/ProjectTabs";
import FreeAnalysis from "@/components/dashboard/FreeAnalysis";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";
import RequestAnalysis from "@/components/dashboard/RequestAnalysis";

export default function DashboardPage() {
  return (
    <>
      <div className="flex flex-col w-full pb-8 md:pb-12 lg:pb-16">
        <div className="max-w-[1600px] w-full mx-auto px-4 md:px-8 lg:px-[54px] pt-6 md:pt-6 lg:pt-[32px]">
          {/* Top Section: Welcome and Promo */}
          <div className="flex flex-col gap-5 md:gap-6 lg:grid lg:grid-cols-[404px_1fr] lg:gap-[53px]">
            <UserWelcome />
            <PromoCarousel />
          </div>

          {/* Middle Section: Services */}
          <div className="mt-6 md:mt-8 lg:mt-[32px]">
            <ServiceGrid />
          </div>

          {/* Bottom Section: My Projects */}
          <div className="mt-8 md:mt-10 lg:mt-[55px]">
            <ProjectTabs />
          </div>
        </div>

        {/* Informational Sections */}
        <div className="mt-8 md:mt-10 lg:mt-[60px] w-full">
          <FreeAnalysis />
        </div>

        <div className="mt-8 md:mt-10 lg:mt-[60px] w-full">
          <SupportNewsletter />
        </div>
      </div>

      {/* Popups */}
      <RequestAnalysis />
    </>
  );
}
