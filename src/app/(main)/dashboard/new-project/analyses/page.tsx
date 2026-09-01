"use client";

import React, { useState, useEffect } from "react";
import { requestAnalysisService } from "@/lib/requestAnalysisService";

export default function AnalysesPage() {
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalyses = async () => {
      try {
        setLoading(true);
        // Assuming there's a list endpoint, using getSettings as a placeholder or mock
        // For now, we'll mock the data based on the UI
        setAnalyses([
          { id: 1, title: "Website Performance", desc: "Get detailed insights on your site speed and performance." },
          { id: 2, title: "SEO Audit", desc: "Identify key areas for improvement in your search engine ranking." },
          { id: 3, title: "UX Review", desc: "Enhance your user experience with a professional review." },
        ]);
      } catch (error) {
        console.error("Failed to fetch analyses:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalyses();
  }, []);

  return (
    <div className="bg-[#F4F5FA] min-h-screen flex flex-col">
      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-8 md:pt-12 pb-12">
        <h1 className="text-[28px] md:text-[32px] font-medium text-primary-100 mb-8">
          Browse Analyses
        </h1>
        <p className="text-gray-600 mb-8 max-w-2xl">
          Submit your website for analysis and get expert insights on how to improve your performance, SEO, or UX. Then, you can decide which solutions to implement.
        </p>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-200 animate-pulse rounded-xl shadow-sm"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {analyses.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col h-full shadow-sm hover:shadow-lg transition-all"
              >
                <h3 className="text-xl font-bold text-gray-800 mb-4">{item.title}</h3>
                <p className="text-gray-500 text-sm mb-8 flex-grow">{item.desc}</p>
                <button className="w-full py-3 bg-[#5356ff] hover:bg-[#3232b7] text-white font-bold rounded-lg transition-colors">
                  Request Analysis
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
