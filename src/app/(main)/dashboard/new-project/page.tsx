"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/authService";
import HttpClient from "@/lib/HttpClient";
import Toast from "@/components/common/Toast";

const httpClient = new HttpClient();

interface ProjectOption {
  title: string;
  description: string;
  image: string;
  buttonText: string;
  href: string;
}

const defaultOptions: ProjectOption[] = [
  {
    title: "Browse Our Packages",
    description: "We offer a wide range of pre-created packages and plans to make your purchasing of projects a breeze!",
    image: "http://res.cloudinary.com/dgg6e3flf/image/upload/v1786888301/cms-assets/a_professional_3d_illustration_for_a_browse_our_packages_section_featuring.webp",
    buttonText: "Our Packages",
    href: "/dashboard/new-project/packages",
  },
  {
    title: "Calculate Your Own Quote",
    description: "Use our custom price calculator to choose your project and select your exact requirements. You can generate a price quote instantly!",
    image: "http://res.cloudinary.com/dgg6e3flf/image/upload/v1786888303/cms-assets/a_professional_high_fidelity_3d_illustration_of_a_stylized_3d_calculator_with.webp",
    buttonText: "Quote Calculator",
    href: "/calculator",
  },
  {
    title: "Request a Custom Quote",
    description: "Submit all relevant information about your project through a simple form. Our team will review it and get back to you with recommendations and quotes!",
    image: "http://res.cloudinary.com/dgg6e3flf/image/upload/v1786888306/cms-assets/a_professional_high_fidelity_3d_illustration_of_a_golden_3d_scroll_or_document.webp",
    buttonText: "Custom Quote",
    href: "/dashboard/new-project/custom-quote",
  },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [pageTitle, setPageTitle] = useState("New Project");
  const [options, setOptions] = useState<ProjectOption[]>(defaultOptions);

  useEffect(() => {
    setUser(authService.getUser());

    authService.getProfile().then((freshUser) => {
      if (freshUser) {
        setUser(freshUser);
      }
    }).catch(() => { });

    const handleUserUpdate = () => {
      setUser(authService.getUser());
    };
    window.addEventListener("auth:user_update", handleUserUpdate);

    const fetchPageData = async () => {
      try {
        let res = await httpClient.get<any>("/pages/getpagebyslug/new-project");
        if (!res?.isSuccessful || !res?.data) {
          res = await httpClient.get<any>("/pages/getpagebyslug/projects/new");
        }

        if (res?.isSuccessful && res?.data) {
          const pageData = res.data?.data || res.data;
          const sections = Array.isArray(pageData?.sections) ? pageData.sections : [];

          // 0. SEO
          if (pageData?.seo?.title && typeof document !== "undefined") {
            document.title = pageData.seo.title;
          }

          // 1. Hero Simple
          const heroSec = sections.find(
            (s: any) => s.id === "hero" || s.type === "hero_simple" || s.type === "hero"
          );
          if (heroSec) {
            const hTitle = heroSec.data?.title || heroSec.title;
            if (hTitle) setPageTitle(hTitle);
          }

          // 2. Options Grid
          const optionsSec = sections.find(
            (s: any) =>
              s.id === "support-options" ||
              s.id === "project-options" ||
              s.id === "options" ||
              s.type === "support_options_grid" ||
              s.type === "options_grid" ||
              s.type === "grid" ||
              s.type === "project_options"
          );

          const rawItems =
            optionsSec?.data?.items ||
            optionsSec?.data?.options ||
            optionsSec?.items ||
            optionsSec?.options ||
            pageData?.items ||
            pageData?.options;

          if (Array.isArray(rawItems) && rawItems.length > 0) {
            const mappedOptions: ProjectOption[] = rawItems.map((item: any, idx: number) => {
              const fallback = defaultOptions[idx] || defaultOptions[0];
              return {
                title: item.title || fallback.title,
                description: item.description || fallback.description,
                image: item.image || item.imageUrl || fallback.image,
                buttonText: item.buttonText || item.btnText || fallback.buttonText,
                href: item.actionUrl || item.url || item.href || fallback.href,
              };
            });
            setOptions(mappedOptions);
          }
        }
      } catch (err) {
        console.error("Failed to fetch new-project page data from CMS:", err);
      }
    };

    fetchPageData();

    return () => {
      window.removeEventListener("auth:user_update", handleUserUpdate);
    };
  }, []);

  const handleNavigation = (option: ProjectOption) => {
    const btnTextLower = (option.buttonText || "").toLowerCase();
    const hrefLower = (option.href || "").toLowerCase();

    if (
      btnTextLower.includes("custom quote") ||
      hrefLower.includes("custom-quote")
    ) {
      if (!authService.isAuthenticated()) {
        router.push(`/login?redirect=${encodeURIComponent(option.href)}`);
        return;
      }
      if (user && (user.isEmailVerified === false || String(user.isEmailVerified) === "false")) {
        setShowPopup(true);
        return;
      }
    }
    router.push(option.href);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-8 md:pt-12 pb-12 bg-[#F3F4F6]">
        <h1 className="text-[28px] md:text-[32px] font-medium text-primary-100 mb-8 md:mb-12 ggg">
          {pageTitle}
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {options.map((option, index) => (
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
                <h2 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-[#5c5cf2] transition-colors capitalize">
                  {option.title}
                </h2>
                <p className="text-gray-500 text-sm leading-relaxed mb-8 flex-grow">
                  {option.description}
                </p>
                <button
                  onClick={() => handleNavigation(option)}
                  className="w-full py-3 px-6 rounded-lg bg-[#4343F0] hover:bg-[#5c5cf2] text-white font-semibold transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98] text-sm cursor-pointer"
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
    </div>
  );
}
