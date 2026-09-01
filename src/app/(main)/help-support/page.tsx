"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useChatWidget } from "@/context/ChatWidgetContext";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";

export default function HelpSupportPage() {
  const { openChat } = useChatWidget();

  const supportOptions = [
    {
      title: "Chat with Support",
      description: "Connect with our support team instantly. We are available 24/7 to help you resolve your queries in real-time.",
      image: "/assets/support/chat_support.png",
      buttonText: "Chat with Support",
      onClick: openChat,
    },
    {
      title: "Submit a Support Ticket",
      description: "Have a complex issue? Create a support ticket describing your problem, and we will get back to you with a solution.",
      image: "/assets/support/ticket_support.png",
      buttonText: "Submit a Ticket",
      href: "/help-support/submit-ticket",
    },
    {
      title: "Contact Us",
      description: "Need to reach us directly? Find our contact details including email addresses and physical office locations.",
      image: "/assets/support/contact_us.png",
      buttonText: "Contact Us",
      href: "/help-support/contact-us",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-primary-100 border-[3px] border-gray-600">
        <div className="max-w-[1536px] mx-auto px-4 md:px-8 lg:px-[54px] py-16">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            Help & Support
          </h1>
        </div>
      </div>

      <main className="flex-grow w-full max-w-[1600px] mx-auto px-4 md:px-8 lg:px-[54px] py-12 md:py-16">
        {/* Main Support Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {supportOptions.map((option, idx) => (
            <div
              key={idx}
              className="border border-[#B0B0B0] rounded-lg overflow-hidden group hover:shadow-lg transition-shadow bg-white flex flex-col h-full"
            >
              <div className="h-48 bg-[#f5f5f5] overflow-hidden shrink-0">
                <Image
                  src={option.image}
                  alt={option.title}
                  width={500}
                  height={200}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-8 flex flex-col flex-grow">
                <h3 className="text-2xl font-bold mb-4 text-[#404040]">
                  {option.title}
                </h3>
                <p className="text-sm text-[#808080] mb-8 leading-relaxed">
                  {option.description}
                </p>
                <div className="mt-auto">
                  {option.onClick ? (
                    <button
                      onClick={option.onClick}
                      className="w-full py-3 px-6 bg-[#5356ff] hover:bg-[#3232b7] border border-transparent rounded text-sm font-bold text-white transition-colors uppercase"
                    >
                      {option.buttonText}
                    </button>
                  ) : (
                    <Link href={option.href || "#"}>
                      <button className="w-full py-3 px-6 bg-[#5356ff] hover:bg-[#3232b7] border border-transparent rounded text-sm font-bold text-white transition-colors uppercase">
                        {option.buttonText}
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Secondary Options */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          <div className="lg:col-span-3 border border-[#B0B0B0] rounded-lg overflow-hidden hover:shadow-md transition-shadow">
            <Link href="/faq" className="block h-full group">
              <div className="h-32 bg-[#f5f5f5] overflow-hidden">
                <Image
                  src="/assets/support/faq_support.png"
                  alt="FAQ"
                  width={300}
                  height={128}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-6">
                <h3 className="text-lg font-bold text-[#404040]">
                  Frequently Asked Questions
                </h3>
              </div>
            </Link>
          </div>

          <div className="lg:col-span-3 border border-[#B0B0B0] rounded-lg overflow-hidden hover:shadow-md transition-shadow">
            <Link href="/help-support/history" className="block h-full group">
              <div className="h-32 bg-[#f5f5f5] overflow-hidden">
                <Image
                  src="/assets/support/history_support.png"
                  alt="Support History"
                  width={300}
                  height={128}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-6">
                <h3 className="text-lg font-bold text-[#404040]">
                  My Support History
                </h3>
              </div>
            </Link>
          </div>

          <div className="lg:col-span-6 pl-0 lg:pl-10 flex flex-col justify-center">
            <h3 className="text-2xl font-bold text-[#404040] mb-8">Give us a call</h3>
            <div className="flex flex-col md:flex-row gap-8 mb-4">
              <div className="flex-1">
                <p className="text-sm font-bold text-[#808080] mb-2">United States</p>
                <div className="bg-[#5356ff] rounded-lg px-4 py-3 flex items-center gap-3 shadow-md hover:bg-[#3232b7] transition-colors cursor-pointer group">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  <span className="font-bold text-white text-lg tracking-tight">+1 (542) 144-2141</span>
                </div>
                <p className="text-xs text-[#999999] mt-2">Monday to Saturday, 9 AM to 8 PM</p>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-[#808080] mb-2">Europe</p>
                <div className="bg-[#5356ff] rounded-lg px-4 py-3 flex items-center gap-3 shadow-md hover:bg-[#3232b7] transition-colors cursor-pointer group">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  <span className="font-bold text-white text-lg tracking-tight">+44 542 144 2141</span>
                </div>
                <p className="text-xs text-[#999999] mt-2">Monday to Saturday, 9 AM to 8 PM</p>
              </div>
            </div>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="mt-8 border-t border-gray-100 pt-16">
          <SupportNewsletter />
        </div>
      </main>
    </div>
  );
}
