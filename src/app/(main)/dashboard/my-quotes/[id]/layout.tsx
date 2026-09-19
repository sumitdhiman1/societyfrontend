"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { QuoteProvider, useQuote } from "@/context/QuoteContext";

function MyQuotesLayoutContent({ children }: { children: React.ReactNode }) {
  const { quote, isLoading } = useQuote();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex flex-col items-center justify-center text-gray-500">
        <p className="text-xl font-semibold mb-4">Quote not found</p>
        <button onClick={() => router.push("/dashboard/my-quotes")} className="text-primary-500 hover:underline">
          Back to My Quotes
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#F3F4F6] flex-grow flex flex-col font-sans" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <main className="w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-8 md:pt-12 pb-8 md:pb-12">
        {children}
      </main>
    </div>
  );
}

export default function MyQuotesLayout({ children }: { children: React.ReactNode }) {
  return (
    <QuoteProvider>
      <MyQuotesLayoutContent>{children}</MyQuotesLayoutContent>
    </QuoteProvider>
  );
}
