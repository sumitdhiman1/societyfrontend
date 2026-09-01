"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";
import { supportService } from "@/lib/supportService";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface FAQPageData {
  hero: {
    title: string;
    subtitle: string;
  };
  faqItems: FAQItem[];
}

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-gray-400 rounded-md overflow-hidden bg-white">
      <button
        className="w-full py-4 px-6 flex items-center justify-between text-left focus:outline-none bg-white hover:bg-gray-50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-semibold text-gray-600">{title}</span>
        <div
          className={`w-8 h-8 rounded-full shrink-0 bg-[#5356ff] flex items-center justify-center text-white transition-transform duration-200 ${isOpen ? "rotate-180" : ""
            }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          }`}
      >
        <div className="px-6 pb-6 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function FAQPage() {
  const [pageData, setPageData] = useState<FAQPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFaqData = async () => {
      try {
        setIsLoading(true);
        const response = await supportService.getFaqPage();
        if (response.data) {
          setPageData(response.data);
          setError(null);
        } else {
          setError("Failed to load FAQ data.");
        }
      } catch (err) {
        console.error("Error fetching FAQ data:", err);
        setError("An error occurred while loading FAQ data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFaqData();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white min-h-screen flex flex-col font-sans text-gray-600">
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5356ff] mx-auto mb-4"></div>
            <p className="text-gray-500">Loading FAQ...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !pageData) {
    return (
      <div className="bg-white min-h-screen flex flex-col font-sans text-gray-600">
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center px-4">
            <p className="text-red-500 mb-4">{error || "Failed to load FAQ data"}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#5356ff] hover:bg-[#3232b7] text-white px-8 py-3 rounded-md font-bold transition-all shadow-md"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen flex flex-col font-sans text-gray-600">
      {/* Dynamic Hero Section */}
      <div className="bg-primary-100 border-[3px] border-gray-600">
        <div className="container mx-auto px-4 md:px-8 lg:px-[54px] py-16 max-w-[1536px]">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white uppercase tracking-tight">
            {pageData.hero.title}
          </h1>
        </div>
      </div>

      <main className="flex-grow w-full max-w-[1600px] mx-auto px-4 md:px-8 lg:px-[54px] py-16">
        <p className="text-gray-500 mb-12 max-w-4xl text-lg leading-relaxed">
          {pageData.hero.subtitle}
        </p>

        {/* FAQ Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {pageData.faqItems.map((item) => (
            <Accordion key={item.id} title={item.question}>
              {item.answer}
            </Accordion>
          ))}
        </div>

        {/* Newsletter Section */}
        <div className="pt-16 border-t border-gray-100">
          <SupportNewsletter />
        </div>
      </main>
    </div>
  );
}
