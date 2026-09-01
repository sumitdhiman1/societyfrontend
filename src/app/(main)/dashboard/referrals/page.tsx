"use client";

import React, { useState, useEffect } from "react";
import DashboardSubNav from "@/components/dashboard/DashboardSubNav";

export default function ReferralsPage() {
  const [referralCode, setReferralCode] = useState("john-doe");
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { profileService } = await import("@/lib/profileService");
        const res: any = await profileService.getReferralStats();
        if (res?.data) {
          setTotalReferrals(res.data.totalReferrals || 0);
          setReferralCode(res.data.referralCode || "user-code");
        }
      } catch (e) {
        console.error("Failed to fetch referrals:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const referralLink = `https://societywebsolutions.com/ref/${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white min-h-screen flex flex-col font-sans">
      <DashboardSubNav />
      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-8 md:pt-12 pb-12">
        <h1 className="text-[28px] md:text-[32px] font-medium text-primary-100 mb-8 md:mb-12">
          Referrals
        </h1>

        <div className="border border-gray-300 rounded-[4px] p-10 flex flex-col md:flex-row items-center gap-12">
          {/* Left: total count */}
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4">
              Total Referrals
            </h3>
            <div className="text-5xl font-medium text-gray-800">
              {loading ? "..." : totalReferrals}
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-[1px] h-[100px] bg-gray-200" />

          {/* Right: share link */}
          <div className="flex-[2]">
            <h4 className="font-bold text-sm text-gray-800 mb-4">Invite Your Friends</h4>
            <p className="text-xs text-gray-500 leading-relaxed max-w-xl mb-6">
              Share your unique referral link with friends and colleagues. Earn credits for every
              successful referral that joins Society Web Solutions.
            </p>
            <div className="bg-gray-100 rounded-[4px] p-4 flex items-center justify-between border border-gray-200 max-w-md">
              <span className="text-sm text-gray-600 font-medium truncate mr-4">
                {referralLink}
              </span>
              <button
                onClick={handleCopy}
                className="text-xs font-bold text-primary-300 hover:text-primary-350 uppercase tracking-wide shrink-0"
              >
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
