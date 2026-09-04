"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/authService";
import Toast from "@/components/common/Toast";

const projectOptions = [
  {
    title: "Browse our packages",
    description: "We offer a wide range of pre-created packages and plans to make your purchasing of projects a breeze!",
    image: "/images/packages_illustration_1770345611911.png",
    buttonText: "Our packages",
    href: "/dashboard/new-project/packages",
  },
  {
    title: "Calculate your own quote",
    description: "Use our custom price calculator to choose your project and select your exact requirements. You can generate a price quote instantly!",
    image: "/images/calculator.png",
    buttonText: "Quote calculator",
    href: "/calculator",
  },
  {
    title: "Request a custom quote",
    description: "Submit all relevant information about your project through a simple form. Our team will review it and get back to you with recommendations and quotes!",
    image: "/images/custom_quote_card_1770345880796.png",
    buttonText: "Custom quote",
    href: "/dashboard/new-project/custom-quote",
  },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    setUser(authService.getUser());
  }, []);

  const handleNavigation = (option: typeof projectOptions[0]) => {
    if (option.buttonText === "Custom quote") {
      if (!authService.isAuthenticated()) {
        router.push(`/login?redirect=${encodeURIComponent(option.href)}`);
        return;
      }
      if (user && !user.isEmailVerified) {
        setShowPopup(true);
        return;
      }
    }
    router.push(option.href);
  };

  return (
    <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-8 md:pt-12 pb-12 bg-white min-h-screen">
      <h1 className="text-[28px] md:text-[32px] font-medium text-primary-100 mb-8 md:mb-12">
        New Project
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {projectOptions.map((option, index) => (
          <div
            key={index}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col h-full shadow-sm hover:shadow-xl transition-all duration-300 group hover:-translate-y-1"
          >
            <div className="h-[220px] relative overflow-hidden bg-gray-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={option.image}
                alt={option.title}
                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500 ease-out"
              />
            </div>
            <div className="p-8 flex flex-col flex-grow bg-white">
              <h2 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-primary-300 transition-colors">
                {option.title}
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-8 flex-grow">
                {option.description}
              </p>
              <button
                onClick={() => handleNavigation(option)}
                className="w-full py-3 px-6 rounded-lg bg-primary-300 hover:bg-primary-500 text-white font-semibold transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98] text-sm text-center"
              >
                {option.buttonText}
              </button>
            </div>
          </div>
        ))}
      </div>

      <Toast
        isOpen={showPopup}
        onClose={() => setShowPopup(false)}
        type="info"
        title="Verification Required"
        message="Please verify your email to request a custom quote."
      />
    </main>
  );
}
