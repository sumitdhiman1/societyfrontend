"use client";

import React, { useState, useEffect } from "react";
import DashboardSubNav from "@/components/dashboard/DashboardSubNav";
import { authService } from "@/lib/authService";

export default function CreditsPage() {
  const [credits, setCredits] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Production: first try local user cache, then fall back to API
        const localUser = authService.getUser();
        if (localUser && typeof localUser.credits !== "undefined") {
          setCredits(localUser.credits);
        } else {
          const { profileService } = await import("@/lib/profileService");
          const res = await profileService.getMyProfile();
          if (res?.data) {
            setCredits(res.data.credits || 0);
            authService.updateInternalUser({ credits: res.data.credits || 0 });
          }
        }
      } catch (e) {
        console.error("Failed to fetch credits:", e);
        setCredits(0);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <div className="bg-white min-h-screen flex flex-col font-sans">
      <DashboardSubNav />
      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-8 md:pt-12 pb-12">
        <h1 className="text-[28px] md:text-[32px] font-medium text-primary-100 mb-8 md:mb-12">
          Credits
        </h1>

        <div className="border border-gray-300 rounded-[4px] p-10 flex flex-col md:flex-row items-center gap-12">
          {/* Left: credit balance */}
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4">
              Credits Available To Use
            </h3>
            <div className="text-5xl font-medium text-primary-300">
              {isLoading ? "$---" : `$${credits.toFixed(0)}`}
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-[1px] h-[100px] bg-gray-200" />

          {/* Right: explanation */}
          <div className="flex-[2]">
            <h4 className="font-bold text-sm text-gray-800 mb-4">What Are Credits?</h4>
            <p className="text-xs text-gray-500 leading-relaxed max-w-xl">
              Credits are your account balance that can be applied toward any project or service payment.
              If you have credits available, you can use them during the checkout process to reduce the
              final amount due. Credits are automatically applied when you select the option in the payment form.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
