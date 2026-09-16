"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import HttpClient from "@/lib/HttpClient";
import StatusPopup from "@/components/common/StatusPopup";
import { supportService } from "@/lib/supportService";
import { useChatWidget } from "@/context/ChatWidgetContext";

const httpClient = new HttpClient();

interface FormField {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
}

interface ContactPageData {
  seo?: {
    title?: string;
    description?: string;
  };
  hero?: {
    title?: string;
    subtitle?: string;
  };
  textBlock?: {
    title?: string;
    content?: string;
    subtitle?: string;
  };
  form?: {
    heading?: string;
    submitButtonLabel?: string;
    fields?: FormField[];
  };
  sidebar?: {
    region1?: { heading?: string; hours?: string; phone?: string };
    region2?: { heading?: string; hours?: string; phone?: string };
    region3?: { heading?: string; availability?: string };
  };
}

export default function ContactUsPage() {
  const { openChat } = useChatWidget();
  const [pageData, setPageData] = useState<ContactPageData | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState({
    isOpen: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });

  useEffect(() => {
    const fetchPageData = async () => {
      try {
        const res: any = await supportService.getContactUsPage();
        if (res?.data || res?.isSuccessful) {
          const raw = res.data || res;
          const sections = raw.sections || [];
          const heroSec = sections.find(
            (s: any) => s.type === "hero_simple" || s.id === "hero" || s.id === "contact_hero"
          );
          const textSec = sections.find(
            (s: any) => s.type === "text_block_centered" || s.id === "text_block_centered" || s.id === "intro"
          );
          const contactSec = sections.find(
            (s: any) =>
              s.type === "contact_form_sidebar" ||
              s.id === "contact_form_sidebar" ||
              s.id === "contact_form_and_sidebar" ||
              s.id === "contact_info"
          );

          const parsed: ContactPageData = {
            seo: raw.seo,
            hero: heroSec?.data,
            textBlock: textSec?.data,
            form: contactSec?.data?.form,
            sidebar: contactSec?.data?.sidebar,
          };

          setPageData(parsed);

          if (raw.seo?.title) {
            document.title = raw.seo.title;
          }
        }
      } catch (error) {
        console.error("Error fetching contact page data:", error);
      }
    };

    fetchPageData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phone.trim(),
        phone: formData.phone.trim(),
        subject: formData.subject.trim(),
        message: formData.message.trim(),
      };

      const res: any = await httpClient.post("/contact/submit", payload);
      
      if (res?.isSuccessful || res?.statusCode === 201 || res?.data || res?.success) {
        setPopup({
          isOpen: true,
          type: "success",
          title: "Message Sent!",
          message: "Thank you for contacting us. We will get back to you shortly.",
        });
        setFormData({
          fullName: "",
          email: "",
          phone: "",
          subject: "",
          message: "",
        });
      } else {
        throw new Error(res?.message || "Failed to send message");
      }
    } catch (error: any) {
      console.error("Contact submission error:", error);
      const errMsg = error?.response?.data?.message || error?.data?.message || error?.message || "An error occurred. Please try again later.";
      setPopup({
        isOpen: true,
        type: "error",
        title: "Submission Failed",
        message: Array.isArray(errMsg) ? errMsg.join(", ") : errMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  const heroTitle = pageData?.hero?.title || "Contact Us";
  const introContent =
    pageData?.hero?.subtitle ||
    pageData?.textBlock?.content ||
    pageData?.textBlock?.subtitle ||
    "We'd love to hear from you. Whether you have a question about our services, pricing, or need technical assistance, our team is ready to answer all your questions.";
  const formHeadingText = pageData?.form?.heading || "Send Us a Message";
  const submitBtnText = pageData?.form?.submitButtonLabel || "Submit";

  const region1 = pageData?.sidebar?.region1 || {
    heading: "United States",
    hours: "From Monday to Friday, 9 AM to 5 PM (EDT) (UTC-4)",
    phone: "+1 (561) 935-3359",
  };
  const region2 = pageData?.sidebar?.region2 || {
    heading: "Europe",
    hours: "From Monday to Friday, 12 PM to 8 PM (EEST) (UTC+3)",
    phone: "+372 5681 3501",
  };
  const region3 = pageData?.sidebar?.region3 || {
    heading: "Global",
    availability: "Available 24/7",
  };

  return (
    <div className="bg-white min-h-screen flex flex-col font-sans">
      <StatusPopup
        isOpen={popup.isOpen}
        onClose={() => setPopup({ ...popup, isOpen: false })}
        type={popup.type}
        title={popup.title}
        message={popup.message}
      />

      {/* Hero Banner */}
      <div className="bg-primary-100 border-[3px] border-gray-600">
        <div className="container mx-auto px-4 md:px-8 lg:px-[54px] py-10 md:py-16 max-w-[1536px]">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            {heroTitle}
          </h1>
        </div>
      </div>

      <main className="flex-grow container mx-auto px-4 md:px-8 lg:px-[54px] py-12 max-w-[1536px]">
        <div className="text-gray-500 mb-16 max-w-4xl text-sm leading-relaxed ql-editor-preview">
          {introContent.includes("<p>") || introContent.includes("<br") ? (
            <div dangerouslySetInnerHTML={{ __html: introContent }} />
          ) : (
            <p>
              <span style={{ backgroundColor: "rgb(255, 255, 255)", color: "rgb(107, 114, 128)" }}>
                {introContent}
              </span>
            </p>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-24">
          <div className="flex-grow lg:w-2/3">
            <h2 className="text-2xl font-bold text-gray-500 mb-8">{formHeadingText}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col">
                  <label htmlFor="fullName" className="text-sm font-bold text-gray-600 mb-2 block">
                    Full name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="fullName"
                    required
                    placeholder={pageData?.form?.fields?.find((f) => f.name === "fullName")?.placeholder || "Enter your full name"}
                    className="w-full border border-gray-400 rounded-[4px] px-3 py-2 text-sm placeholder:text-sm placeholder:text-gray-400 text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-400 h-[42px]"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="email" className="text-sm font-bold text-gray-600 mb-2 block">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    required
                    placeholder={pageData?.form?.fields?.find((f) => f.name === "email")?.placeholder || "Enter your email"}
                    className="w-full border border-gray-400 rounded-[4px] px-3 py-2 text-sm placeholder:text-sm placeholder:text-gray-400 text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-400 h-[42px]"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="phone" className="text-sm font-bold text-gray-600 mb-2 block">
                    Phone number
                  </label>
                  <input
                    id="phone"
                    placeholder={pageData?.form?.fields?.find((f) => f.name === "phone")?.placeholder || "Enter your phone number"}
                    className="w-full border border-gray-400 rounded-[4px] px-3 py-2 text-sm placeholder:text-sm placeholder:text-gray-400 text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-400 h-[42px]"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label htmlFor="subject" className="text-sm font-bold text-gray-600 mb-2 block">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  id="subject"
                  required
                  placeholder={pageData?.form?.fields?.find((f) => f.name === "subject")?.placeholder || "Enter subject"}
                  className="w-full border border-gray-400 rounded-[4px] px-3 py-2 text-sm placeholder:text-sm placeholder:text-gray-400 text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-400 h-[42px]"
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>

              <div className="flex flex-col">
                <label htmlFor="message" className="text-sm font-bold text-gray-600 mb-2 block">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message"
                  rows={8}
                  required
                  placeholder={pageData?.form?.fields?.find((f) => f.name === "message")?.placeholder || "Enter your message"}
                  className="w-full border border-gray-400 rounded-[4px] px-3 py-2 text-sm placeholder:text-sm placeholder:text-gray-400 text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-primary-300 hover:bg-primary-100 text-white font-bold py-3 px-12 rounded-md transition-colors w-full md:w-[350px] mt-4 text-sm disabled:opacity-75 cursor-pointer shadow-sm hover:shadow-md"
              >
                {loading ? "Sending..." : submitBtnText}
              </button>
            </form>
          </div>

          <div className="hidden lg:block w-[1px] bg-gray-300 self-stretch"></div>

          <div className="lg:w-1/3 flex flex-col gap-10">
            <div>
              <h3 className="text-xl font-bold text-gray-500 mb-6">{region1.heading}</h3>
              {region1.hours && <p className="text-xs text-gray-500 mb-3">{region1.hours}</p>}
              <a
                href={`tel:${(region1.phone || "+15619353359").replace(/\s+/g, '')}`}
                className="flex items-center gap-4 w-full bg-primary-300 hover:bg-primary-100 text-white px-4 py-3 rounded-md border-[3px] border-gray-300 transition-colors cursor-pointer shadow-xs"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <span className="text-sm font-semibold">{region1.phone || "+1 (561) 935-3359"}</span>
              </a>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-500 mb-6">{region2.heading}</h3>
              {region2.hours && <p className="text-xs text-gray-500 mb-3">{region2.hours}</p>}
              <a
                href={`tel:${(region2.phone || "+37256813501").replace(/\s+/g, '')}`}
                className="flex items-center gap-4 w-full bg-primary-300 hover:bg-primary-100 text-white px-4 py-3 rounded-md border-[3px] border-gray-300 transition-colors cursor-pointer shadow-xs"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <span className="text-sm font-semibold">{region2.phone || "+372 5681 3501"}</span>
              </a>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-500 mb-6">{region3.heading}</h3>
              {region3.availability && (
                <p className="text-xs text-gray-500 mb-3 font-semibold">{region3.availability}</p>
              )}
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={openChat}
                  className="flex items-center gap-4 w-full bg-primary-300 hover:bg-primary-100 text-white px-4 py-3 rounded-md border-[3px] border-gray-300 transition-colors cursor-pointer shadow-xs text-left"
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-semibold">Live chat</span>
                </button>
                <Link
                  className="flex items-center gap-4 w-full bg-primary-300 hover:bg-primary-100 text-white px-4 py-3 rounded-md border-[3px] border-gray-300 transition-colors cursor-pointer shadow-xs"
                  href="/help-support/submit-ticket"
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-semibold">Open a ticket</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
