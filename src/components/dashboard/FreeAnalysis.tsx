"use client";

import React, { useState, useEffect } from "react";
import { requestAnalysisService } from "@/lib/requestAnalysisService";
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

  if (settings && settings.isHomepageSectionEnabled === false) return null;

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
    <div className="max-w-[1536px] w-full mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] mt-20 md:mt-32 mb-0">
      <StatusPopup
        isOpen={!!status}
        onClose={() => setStatus(null)}
        type={status?.type || "success"}
        title={status?.title || ""}
        message={status?.message || ""}
      />

      <div className="mb-12 w-full font-sans" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
        <div className="w-full">
          {/* Desktop Version */}
          <div
            className="hidden lg:flex w-full h-[303px] bg-white rounded-[10px] relative overflow-hidden mx-auto"
            style={{ boxShadow: "9px 7px 50px rgba(14, 16, 63, 0.07)" }}
          >
            {/* Background SVG Wave */}
            <div className="absolute bottom-[-10px] right-[-10px] w-[583px] h-[250px] pointer-events-none z-0">
              <svg
                width="573"
                height="240"
                viewBox="0 0 573 240"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
                className="w-full h-full"
              >
                <path
                  d="M573 0C476.81 -15.0041 366.72 -7.002 236.54 99.557C80.449 227.316 2.798 234.124 0.071 234.214H0C0.008 234.215 0.032 234.215 0.071 234.214H564.29C569.1 234.215 573 230.315 573 225.506L573 0Z"
                  fill="#E3E3FD"
                />
              </svg>
            </div>

            {/* Content Container */}
            <div className="relative z-10 flex flex-row items-center w-full h-full justify-between px-8">
              {/* PDF Document Preview */}
              <div className="flex-shrink-0 flex items-center justify-center h-full w-[220px]">
                <img
                  src="/assets/PDF.svg"
                  alt="Website Analysis Report"
                  style={{ height: "210px", width: "auto", objectFit: "contain", display: "block" }}
                />
              </div>

              {/* Form and Content */}
              <div className="flex flex-col justify-center flex-grow pl-6 pr-5 gap-4">
                <h2 className="text-[28px] font-bold text-[#434343] leading-[1.25] font-sans">
                  Get a Free Website Analysis!
                </h2>
                <form onSubmit={handleSubmit} className="flex flex-row items-center gap-3">
                  <input
                    type="text"
                    placeholder="Your website"
                    className="w-[240px] h-[48px] px-4 bg-[#F4F5FA] border border-[#D9D9D9] rounded-[6px] text-[15px] text-[#363636] outline-none font-sans"
                    required
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                  <input
                    type="email"
                    placeholder="Your email address"
                    className="w-[240px] h-[48px] px-4 bg-[#F4F5FA] border border-[#D9D9D9] rounded-[6px] text-[15px] text-[#363636] outline-none font-sans"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="h-[48px] px-7 bg-[#4343F0] hover:bg-[#3232b7] rounded-[6px] text-white font-bold text-[15px] border-none cursor-pointer whitespace-nowrap flex items-center justify-center shrink-0 transition-colors font-sans disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      "Check My Website"
                    )}
                  </button>
                </form>
              </div>

              {/* Right Illustration */}
              <div className="flex-shrink-0 flex items-end h-full">
                <img
                  src="/assets/Graphic.svg?v=2"
                  alt="Analysis Illustration"
                  style={{
                    height: "240px",
                    width: "auto",
                    objectFit: "contain",
                    display: "block",
                    marginBottom: "24px",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Mobile / Tablet Version */}
          <div className="lg:hidden flex flex-col bg-white rounded-[10px] shadow-[0px_4px_20px_rgba(14,16,63,0.07)] relative overflow-hidden w-full max-w-[400px] md:max-w-[600px] mx-auto">
            <div className="relative w-full flex justify-center bg-[#EBE9FA]">
              <img src="/assets/Mask group.png" alt="" className="w-full h-auto object-cover" />
              <div className="absolute inset-0 flex items-center justify-center pt-8">
                <img
                  src="/assets/Graphic.svg?v=2"
                  alt="Analysis Illustration"
                  className="w-[75%] md:w-[60%] h-auto object-contain"
                />
              </div>
            </div>
            </div>
          
          <div className="lg:hidden flex flex-col bg-white rounded-[10px] shadow-[0px_4px_20px_rgba(14,16,63,0.07)] relative overflow-hidden w-full max-w-[400px] md:max-w-[600px] mx-auto">
            <div className="lg:hidden flex flex-col bg-white rounded-[10px]  relative overflow-hidden w-full max-w-[400px] md:max-w-[600px] mx-auto">
                <div className="relative w-full flex justify-center md:bg-[#EBE9FA]">
                   <img src="/assets/mobile-check-bg.png" alt="" className="w-full h-auto object-cover" /> 
                    <div className="absolute inset-0 flex items-center justify-center pt-8">
                      <img src="/assets/mobile-check.svg" alt="Analysis Illustration" className="w-[66%] md:w-[60%] h-auto object-contain " />
                      </div>
                </div>
            </div>


            <div className="flex flex-col items-center text-center px-6 pb-8 pt-2" style={{ gap: "20px" }}>
              <h2 className="text-[26px] sm:text-[28px] font-bold text-[#434343] leading-[1.25]">
                Get a Free<br className="md:hidden" /> Website Analysis!
              </h2>
              <form onSubmit={handleSubmit} className="flex flex-col w-full md:max-w-[400px]" style={{ gap: "16px" }}>
                <input
                  type="text"
                  placeholder="Your website"
                  className="w-full px-5 bg-[#F4F5FA] text-[#363636] text-[15px] placeholder-[#8C8C8C] outline-none h-[50px] border border-[#D9D9D9] rounded-[5px] focus:border-[#4343F0] transition-colors font-sans"
                  required
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
                <input
                  type="email"
                  placeholder="Your email address"
                  className="w-full px-5 bg-[#F4F5FA] text-[#363636] text-[15px] placeholder-[#8C8C8C] outline-none h-[50px] border border-[#D9D9D9] rounded-[5px] focus:border-[#4343F0] transition-colors font-sans"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#4343F0] hover:bg-[#3232b7] text-white font-bold text-[16px] h-[50px] rounded-[5px] shadow-sm flex items-center justify-center transition-colors mt-2 font-sans disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    "Check My Website"
                  )}
                </button>
              </form>
            </div>
            </div>
        </div>
      </div>
    </div>
  );
}
