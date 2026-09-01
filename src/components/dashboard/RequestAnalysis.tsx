"use client";

import React, { useState, useEffect } from "react";
import { requestAnalysisService } from "@/lib/requestAnalysisService";
import AnalysisIllustration from "./AnalysisIllustration";

export default function RequestAnalysis() {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await requestAnalysisService.getSettings();
        if (response.isSuccessful && response.data) {
          setSettings(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch analysis settings", error);
      }
    })();
  }, []);

  useEffect(() => {
    if (settings === null || !settings.isPopupEnabled) return;

    if (document.cookie.includes("requestwebsite_analysis_shown=true")) {
      console.log("RequestAnalysis already shown (cookie found)");
      return;
    }

    const handleScroll = () => {
      const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercent > (settings.popupScrollPercentage || 80)) {
        console.log("Triggering RequestAnalysis popup", { scrollPercent });
        setIsOpen(true);
        document.cookie = "requestwebsite_analysis_shown=true; path=/; max-age=31536000";
        window.removeEventListener("scroll", handleScroll);
      }
    };

    console.log("RequestAnalysis mounted, listening for scroll");
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [settings]);

  const closePopup = () => {
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await requestAnalysisService.submitRequest({ email, websiteUrl });
      if (response.statusCode === 201) {
        setWebsiteUrl("");
        setEmail("");
        closePopup();
      } else {
        console.error("Submission failed:", response.message);
      }
    } catch (error) {
      console.error("Error submitting analysis request:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] backdrop-blur-sm px-4">
      <div className="relative bg-white rounded-[10px] shadow-2xl w-full max-w-[1051px] lg:h-[382px] max-h-[90vh] overflow-y-auto lg:overflow-hidden">
        <button
          onClick={closePopup}
          className="absolute top-5 right-5 w-10 h-10 bg-[#5356ff] hover:bg-[#3232b7] text-white rounded-full flex items-center justify-center transition-colors shadow-lg z-10"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="p-6 md:p-8 lg:px-[81px] lg:py-[69px]">
          <div className="flex flex-col lg:flex-row lg:items-start w-full lg:w-[889px] lg:h-[244.59px] gap-8 lg:gap-0">
            <div className="flex items-center justify-center lg:self-center mx-auto lg:mx-0">
              <div className="relative w-[180px] h-[205px] md:w-[215.34px] md:h-[244.59px] rounded-[5px] shadow-[0px_0px_9.33548px_rgba(80,78,78,0.2)] flex items-center justify-center overflow-hidden p-2">
                <AnalysisIllustration />
              </div>
            </div>
            <div className="lg:ml-[51px] w-full lg:w-[623px] flex flex-col justify-start">
              <h2 className="font-sans font-semibold text-[32px] md:text-[38px] lg:text-[44px] leading-[42px] md:leading-[50px] lg:leading-[58px] text-[#363636] mb-4 lg:mb-[21px]">
                Get a free website analysis!
              </h2>
              <p className="font-sans font-normal text-[16px] md:text-[17px] lg:text-[18px] leading-[24px] md:leading-[26px] lg:leading-[28px] text-[#707070] mb-6 lg:mb-[29px]">
                Send us your website, we will analyze it and email you a detailed report of what we found, for free!
              </p>
              <form onSubmit={handleSubmit}>
                <div className="w-full lg:w-[613px] flex flex-col sm:flex-row lg:h-[45px] gap-4 lg:gap-5 items-stretch sm:items-center">
                  <input
                    type="url"
                    placeholder="Your website"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    required
                    className="w-full sm:w-[200px] h-[45px] px-[15px] bg-white border-[1.5px] border-[#B8B8B8] rounded-[5px] font-sans font-medium text-[12px] leading-[15px] text-[#363636] placeholder:text-[#8C8C8C] focus:outline-none focus:border-[#5356ff] transition-colors"
                  />
                  <input
                    type="email"
                    placeholder="Your Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full sm:w-[200px] h-[45px] px-[15px] bg-white border-[1.5px] border-[#B8B8B8] rounded-[5px] font-sans font-medium text-[12px] leading-[15px] text-[#363636] placeholder:text-[#8C8C8C] focus:outline-none focus:border-[#5356ff] transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-[173px] h-[45px] bg-[#5356ff] hover:bg-[#3232b7] rounded-[5px] font-sans font-semibold text-[12px] leading-[15px] text-white transition-colors disabled:opacity-50 flex items-center justify-center shrink-0"
                  >
                    {isSubmitting ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Check My Website"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
