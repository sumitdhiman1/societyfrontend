"use client";

import React, { useState, useEffect } from "react";
import { supportService } from "@/lib/supportService";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface FAQCtaCard {
  title: string;
  buttonText: string;
  link: string;
  icon?: string;
}

interface FAQPageData {
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[] | string;
    ogImage?: string;
    og_image?: string;
  };
  hero: {
    title: string;
    subtitle: string;
  };
  faqItems: FAQItem[];
  ctaCards?: FAQCtaCard[];
}

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden bg-white h-fit self-start transition-all duration-200 shadow-sm hover:border-gray-400">
      <button
        type="button"
        className="w-full py-4 px-6 flex items-center justify-between text-left focus:outline-none bg-white cursor-pointer select-none"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-semibold text-gray-700 pr-4">{title}</span>
        <div
          className={`w-8 h-8 rounded-full shrink-0 bg-[#4343F0] flex items-center justify-center text-white transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-6 pb-6 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-4 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1">
          {typeof children === "string" && (children.includes("<p>") || children.includes("<ul>") || children.includes("<ol>") || children.includes("<br")) ? (
            <div dangerouslySetInnerHTML={{ __html: children }} />
          ) : (
            <div>
              <p>{children}</p>
            </div>
          )}
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
          if (response.data.seo?.title) {
            document.title = response.data.seo.title;
          }
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4343F0] mx-auto mb-4"></div>
            <p className="text-gray-500 font-medium">Loading FAQ...</p>
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
              className="bg-[#4343F0] hover:bg-[#3232b7] text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 cursor-pointer"
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
      {/* Header Banner */}
      <div className="bg-primary-100 border-[3px] border-gray-600">
        <div className="container mx-auto px-4 md:px-8 lg:px-[54px] py-10 md:py-16 max-w-[1536px]">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            {pageData.hero.title || "Frequently Asked Questions"}
          </h1>
        </div>
      </div>

      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:px-[54px] py-12 md:py-16">
        {pageData.hero.subtitle && (
          <div className="text-gray-500 mb-10 text-base sm:text-lg leading-relaxed whitespace-pre-wrap [&_p]:mb-3 [&_p:last-child]:mb-0 [&_a]:underline [&_a]:text-[#4343F0]">
            {pageData.hero.subtitle.includes("<p>") || pageData.hero.subtitle.includes("<br") ? (
              <div dangerouslySetInnerHTML={{ __html: pageData.hero.subtitle }} />
            ) : (
              <p>{pageData.hero.subtitle}</p>
            )}
          </div>
        )}

        {/* FAQ Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 items-start gap-6">
          {pageData.faqItems.map((item) => (
            <Accordion key={item.id} title={item.question}>
              {item.answer}
            </Accordion>
          ))}
        </div>
      </main>
    </div>
  );
}
