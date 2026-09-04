"use client";

import React, { useState } from "react";
import Link from "next/link";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";
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

      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:px-[54px] py-12">
        <p className="text-gray-500 mb-16 max-w-4xl text-sm leading-relaxed">
          We&apos;d love to hear from you. Whether you have a question about our services, pricing, or need technical assistance, our team is ready to answer all your questions.
        </p>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-24">
          {/* Contact Form */}
          <div className="flex-grow lg:w-2/3">
            <h2 className="text-2xl font-bold text-gray-500 mb-8">Get in touch</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-2">
                  <label htmlFor="fullName" className="font-bold text-gray-500 text-sm">Full name</label>
                  <input
                    type="text"
                    id="fullName"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg focus:outline-none focus:border-gray-600 transition-all"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="email" className="font-bold text-gray-500 text-sm">Email</label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg focus:outline-none focus:border-gray-600 transition-all"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="phone" className="font-bold text-gray-500 text-sm">Phone number</label>
                  <input
                    type="tel"
                    id="phone"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg focus:outline-none focus:border-gray-600 transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="subject" className="font-bold text-gray-500 text-sm">Subject</label>
                <input
                  type="text"
                  id="subject"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg focus:outline-none focus:border-gray-600 transition-all"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="message" className="font-bold text-gray-500 text-sm">Message</label>
                <textarea
                  id="message"
                  rows={8}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg focus:outline-none focus:border-gray-600 transition-all resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-primary-300 hover:bg-primary-100 text-white font-bold py-3 px-12 rounded-md transition-colors w-full md:w-[350px] mt-4 text-sm shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-70"
              >
                {loading ? "Sending..." : "Submit"}
              </button>
            </form>
          </div>

          <div className="hidden lg:block w-[1px] bg-gray-200 self-stretch"></div>

          {/* Sidebar */}
          <div className="lg:w-1/3 flex flex-col gap-10">
            <div>
              <h3 className="text-xl font-bold text-gray-500 mb-6">Sales</h3>
              <p className="text-xs text-gray-500 mb-3">Monday to Friday, 10:00 to 18:00 hs (EST)</p>
              <button className="flex items-center gap-4 w-full bg-primary-300 hover:bg-primary-100 text-white px-4 py-3 rounded-md border-[3px] border-gray-300 shadow-md transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <span className="text-sm font-semibold tracking-tight">+1 (542) 145-1521</span>
              </button>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-500 mb-6">Support team</h3>
              <p className="text-xs text-gray-500 mb-3">Monday to Friday, 10:00 to 18:00 hs (EST)</p>
              <div className="flex flex-col gap-3">
                <Link
                  href="/help-support/live-chat"
                  className="flex items-center gap-4 w-full bg-primary-300 hover:bg-primary-100 text-white px-4 py-3 rounded-md border-[3px] border-gray-300 shadow-md transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-semibold tracking-tight">Live chat</span>
                </Link>
                <button className="flex items-center gap-4 w-full bg-primary-300 hover:bg-primary-100 text-white px-4 py-3 rounded-md border-[3px] border-gray-300 shadow-md transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  <span className="text-sm font-semibold tracking-tight">+1 (542) 145-1521</span>
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-3 font-semibold uppercase tracking-widest">Available anytime</p>
              <Link href="/help-support/submit-ticket">
                <button className="flex items-center gap-4 w-full bg-primary-300 hover:bg-primary-100 text-white px-4 py-3 rounded-md border-[3px] border-gray-300 shadow-md transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                    <path d="M14 11a1 1 0 10-2 0 1 1 0 002 0zM10 11a1 1 0 10-2 0 1 1 0 002 0zM6 11a1 1 0 10-2 0 1 1 0 002 0z" />
                  </svg>
                  <span className="text-sm font-semibold tracking-tight">Open a ticket</span>
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="mt-16 border-t border-gray-100 pt-16">
          <SupportNewsletter />
        </div>
      </main>
    </div>
  );
}
