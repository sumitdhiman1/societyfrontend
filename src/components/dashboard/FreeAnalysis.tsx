"use client";

import React, { useState, useEffect } from "react";
import { requestAnalysisService } from "@/lib/requestAnalysisService";
import AnalysisIllustration from "./AnalysisIllustration";
import StatusPopup from "@/components/common/StatusPopup";

export default function FreeAnalysis() {
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [status, setStatus] = useState<{ type: "success" | "error"; title: string; message: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await requestAnalysisService.getSettings();
        if (res.isSuccessful && res.data) {
          setSettings(res.data);
        }
      } catch (error) {
        console.error("Failed to fetch analysis settings", error);
      }
    };
    fetchSettings();
  }, []);

  if (settings && !settings.isHomepageSectionEnabled) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await requestAnalysisService.submitRequest({ email, websiteUrl: website });
      if (res.statusCode === 201) {
        setStatus({
          type: "success",
          title: "Request Received",
          message: "We've received your request and will email you the analysis soon!",
        });
        setWebsite("");
        setEmail("");
      } else {
        setStatus({
          type: "error",
          title: "Submission Failed",
          message: res.message || "Something went wrong. Please try again later.",
        });
      }
    } catch (error) {
      console.error("Error submitting analysis request:", error);
      setStatus({
        type: "error",
        title: "Error",
        message: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="w-full bg-[#EBE9FA] font-sans">
      <StatusPopup
        isOpen={!!status}
        onClose={() => setStatus(null)}
        type={status?.type || "success"}
        title={status?.title || ""}
        message={status?.message || ""}
      />

      <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-[54px] py-12 md:py-16 lg:py-[69px]">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-[51px]">
          <div className="flex-shrink-0 flex items-center justify-center">
            <div className="relative w-[180px] h-[205px] md:w-[215.34px] md:h-[244.59px] bg-white rounded-[5px] shadow-[0px_0px_9.33548px_rgba(80,78,78,0.2)] flex items-center justify-center overflow-hidden p-2">
              <AnalysisIllustration />
            </div>
          </div>
          <div className="flex-grow max-w-[650px] text-center lg:text-left">
            <h2 className="font-sans font-semibold text-[32px] md:text-[38px] lg:text-[44px] leading-[42px] md:leading-[50px] lg:leading-[58px] text-[#363636] mb-4 lg:mb-[21px]">
              Get a free website analysis!
            </h2>
            <p className="font-sans font-normal text-[16px] md:text-[17px] lg:text-[18px] leading-[24px] md:leading-[26px] lg:leading-[28px] text-[#707070] mb-6 lg:mb-[29px] max-w-[623px] mx-auto lg:mx-0">
              Send us your website, we will analyze it and email you a detailed report of what we found, for free!
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 lg:gap-5 items-stretch sm:items-center justify-center lg:justify-start lg:w-full">
              <input
                type="url"
                placeholder="Your website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                required
                className="w-full sm:w-[200px] h-[45px] px-[15px] bg-white border border-[#B8B8B8] rounded-[5px] font-sans font-medium text-[12px] text-[#363636] placeholder:text-[#8C8C8C] outline-none focus:border-[#5356ff]"
              />
              <input
                type="email"
                placeholder="Your Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full sm:w-[200px] h-[45px] px-[15px] bg-white border border-[#B8B8B8] rounded-[5px] font-sans font-medium text-[12px] text-[#363636] placeholder:text-[#8C8C8C] outline-none focus:border-[#5356ff]"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-[173px] h-[45px] bg-[#5356ff] hover:bg-[#3232b7] text-white rounded-[5px] font-sans font-semibold text-[12px] transition-all disabled:opacity-50 flex items-center justify-center shrink-0"
              >
                {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Check My Website"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
