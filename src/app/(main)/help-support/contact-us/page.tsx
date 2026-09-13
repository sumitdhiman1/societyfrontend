"use client";

import React, { useState } from "react";
import Link from "next/link";
import HttpClient from "@/lib/HttpClient";
import StatusPopup from "@/components/common/StatusPopup";

const httpClient = new HttpClient();

export default function ContactUsPage() {
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

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <StatusPopup
        isOpen={popup.isOpen}
        onClose={() => setPopup({ ...popup, isOpen: false })}
        type={popup.type}
        title={popup.title}
        message={popup.message}
      />

      {/* Hero Section */}
      <div className="bg-primary-100 border-[3px] border-gray-600">
        <div className="max-w-[1536px] mx-auto px-4 md:px-8 lg:px-[54px] py-16">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            Contact Us
          </h1>
        </div>
      </div>

      <main className="flex-grow container mx-auto px-4 md:px-8 lg:px-[54px] py-12 max-w-[1536px]">
        <div className="text-gray-500 mb-16 max-w-4xl text-sm leading-relaxed ql-editor-preview">
          <p>
            <span style={{ backgroundColor: "rgb(255, 255, 255)", color: "rgb(107, 114, 128)" }}>
              We&apos;d&nbsp;love&nbsp;to&nbsp;hear&nbsp;from&nbsp;you.&nbsp;Whether&nbsp;you&nbsp;have&nbsp;a&nbsp;question&nbsp;about&nbsp;our&nbsp;services,&nbsp;pricing,&nbsp;or&nbsp;need&nbsp;technical&nbsp;assistance,&nbsp;our&nbsp;team&nbsp;is&nbsp;ready&nbsp;to&nbsp;answer&nbsp;all&nbsp;your&nbsp;questions.
            </span>
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-24">
          <div className="flex-grow lg:w-2/3">
            <h2 className="text-2xl font-bold text-gray-500 mb-8">Send Us a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-2">
                  <label htmlFor="fullName" className="font-bold text-gray-500 text-sm">Full name</label>
                  <input
                    id="fullName"
                    required
                    className="w-full px-3 py-2 border border-gray-400 rounded-[12px] focus:outline-none focus:ring-1 focus:ring-gray-400 h-[42px] text-sm"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="email" className="font-bold text-gray-500 text-sm">Email</label>
                  <input
                    id="email"
                    required
                    className="w-full px-3 py-2 border border-gray-400 rounded-[12px] focus:outline-none focus:ring-1 focus:ring-gray-400 h-[42px] text-sm"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="phone" className="font-bold text-gray-500 text-sm">Phone number</label>
                  <input
                    id="phone"
                    required
                    className="w-full px-3 py-2 border border-gray-400 rounded-[12px] focus:outline-none focus:ring-1 focus:ring-gray-400 h-[42px] text-sm"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="subject" className="font-bold text-gray-500 text-sm">Subject</label>
                <input
                  id="subject"
                  required
                  className="w-full px-3 py-2 border border-gray-400 rounded-[12px] focus:outline-none focus:ring-1 focus:ring-gray-400 h-[42px] text-sm"
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="message" className="font-bold text-gray-500 text-sm">Message</label>
                <textarea
                  id="message"
                  rows={8}
                  required
                  className="w-full px-3 py-2 border border-gray-400 rounded-[12px] focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm resize-none"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-[#4343f0] hover:bg-[#3232b7] text-white font-bold py-3.5 px-12 rounded-lg text-sm w-full md:w-[350px] mt-4 flex justify-center items-center transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-75 cursor-pointer"
              >
                {loading ? "Sending..." : "Submit"}
              </button>
            </form>
          </div>

          <div className="hidden lg:block w-[1px] bg-gray-300 self-stretch"></div>

          <div className="lg:w-1/3 flex flex-col gap-10">
            <div>
              <h3 className="text-xl font-bold text-gray-500 mb-6">United States</h3>
              <p className="text-xs text-gray-500 mb-3">From Monday to Friday, 9 AM to 5 PM (EDT) (UTC-4)</p>
              <a
                href="tel:+15619353359"
                className="flex items-center gap-4 w-full bg-[#4343f0] hover:bg-[#3232b7] text-white px-4 py-3 rounded-lg border-[3px] border-gray-300 shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <span className="text-sm font-semibold">+1 (561) 935-3359</span>
              </a>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-500 mb-6">Europe</h3>
              <p className="text-xs text-gray-500 mb-3">From Monday to Friday, 12 PM to 8 PM (EEST) (UTC+3)</p>
              <a
                href="tel:+37256813501"
                className="flex items-center gap-4 w-full bg-[#4343f0] hover:bg-[#3232b7] text-white px-4 py-3 rounded-lg border-[3px] border-gray-300 shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <span className="text-sm font-semibold">+372 5681 3501</span>
              </a>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-500 mb-6">Global</h3>
              <p className="text-xs text-gray-500 mb-3 font-semibold">Available 24/7</p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  className="flex items-center gap-4 w-full bg-[#4343f0] hover:bg-[#3232b7] text-white px-4 py-3 rounded-lg border-[3px] border-gray-300 shadow-sm hover:shadow-md transition-all text-left cursor-pointer"
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
                  className="flex items-center gap-4 w-full bg-[#4343f0] hover:bg-[#3232b7] text-white px-4 py-3 rounded-lg border-[3px] border-gray-300 shadow-sm hover:shadow-md transition-all cursor-pointer"
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
