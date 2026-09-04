"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";
import StatusPopup from "@/components/common/StatusPopup";
import { supportService } from "@/lib/supportService";
import { mediaService } from "@/lib/mediaService";
import { authService } from "@/lib/authService";

export default function SubmitTicketPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    subject: "",
    type: "general",
    description: "",
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState({
    isOpen: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
    actionButton: undefined as { text: string; onClick: () => void } | undefined,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // Check authentication
    if (!authService.isAuthenticated()) {
      setPopup({
        isOpen: true,
        type: "error",
        title: "Authentication Required",
        message: "Please log in to submit a support ticket so our team can follow up with your account.",
        actionButton: {
          text: "Log In",
          onClick: () => router.push("/login?redirect=/help-support/submit-ticket"),
        },
      });
      return;
    }

    if (formData.subject.trim().length < 5) {
      setPopup({
        isOpen: true,
        type: "error",
        title: "Invalid Subject",
        message: "Subject must be at least 5 characters long.",
        actionButton: undefined,
      });
      return;
    }

    if (formData.description.trim().length < 10) {
      setPopup({
        isOpen: true,
        type: "error",
        title: "Invalid Description",
        message: "Description message must be at least 10 characters long.",
        actionButton: undefined,
      });
      return;
    }

    try {
      setLoading(true);

      // Upload any attachments first
      const attachmentUrls: string[] = [];
      if (attachments.length > 0) {
        for (const file of attachments) {
          try {
            const uploadRes: any = await mediaService.uploadImage({ file, folder: "support_tickets" });
            const fileUrl = uploadRes?.data?.url || uploadRes?.url || uploadRes?.data?.secure_url || uploadRes?.data?.Location;
            if (fileUrl) {
              attachmentUrls.push(fileUrl);
            }
          } catch (uploadErr) {
            console.warn("Failed to upload attachment:", file.name, uploadErr);
          }
        }
      }

      const mappedType = formData.type === "feature_request" ? "feature" : formData.type;

      const payload = {
        subject: formData.subject.trim(),
        message: formData.description.trim(),
        type: mappedType,
        attachmentUrls,
      };

      const res: any = await supportService.createTicket(payload);

      if (res?.isSuccessful || res?.statusCode === 201 || res?.data) {
        const ticketNum = res.data?.ticketNumber || res.data?._id?.slice(-8).toUpperCase();
        setPopup({
          isOpen: true,
          type: "success",
          title: "Ticket Submitted!",
          message: `Your support ticket ${ticketNum ? `#${ticketNum} ` : ""}has been created successfully. Our team will review it soon.`,
          actionButton: {
            text: "View Support History",
            onClick: () => router.push("/help-support/history"),
          },
        });
        setFormData({ subject: "", type: "general", description: "" });
        setAttachments([]);
      } else {
        throw new Error(res?.message || "Failed to submit ticket");
      }
    } catch (error: any) {
      console.error("Support ticket submission error:", error);
      const errMsg = error?.response?.data?.message || error?.data?.message || error?.message || "An error occurred while submitting your ticket.";
      setPopup({
        isOpen: true,
        type: "error",
        title: "Submission Failed",
        message: Array.isArray(errMsg) ? errMsg.join(", ") : errMsg,
        actionButton: undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <StatusPopup
        isOpen={popup.isOpen}
        onClose={() => setPopup({ ...popup, isOpen: false })}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        actionButton={popup.actionButton}
      />

      {/* Hero Section */}
      <div className="bg-primary-100 border-[3px] border-gray-600">
        <div className="max-w-[1536px] mx-auto px-4 md:px-8 lg:px-[54px] py-16">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            Submit a Support Ticket
          </h1>
        </div>
      </div>

      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:px-[54px] py-12 text-[#646464]">
        <div className="border border-gray-400 rounded-sm p-8 md:p-12 mb-12 bg-white">
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Tell us about your issue</h2>
            <p className="text-sm text-gray-500 leading-relaxed max-w-4xl">
              We&apos;re here to help. Please detail the issue you&apos;re facing so our support team can assist you effectively. Providing clear screenshots or documents can significantly speed up the resolution process.
            </p>
          </div>

          {/* Steps Indicator */}
          <div className="flex flex-col md:flex-row justify-between items-stretch mb-16 border-b border-gray-200 pb-12">
            {[
              { num: 1, title: "Describe the issue", desc: "Provide a clear subject and detailed description of the problem." },
              { num: 2, title: "Team Review", desc: "Our support team will review your ticket and investigate the issue." },
              { num: 3, title: "Get Resolution", desc: "Receive a response or resolution within 24-48 hours." },
            ].map((step, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center text-center px-4 border-r-0 md:border-r border-gray-300 last:border-r-0">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-3xl font-light text-gray-500">{step.num}</span>
                  <div className="w-14 h-14 bg-primary-300 rounded-full flex items-center justify-center text-white">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                </div>
                <h4 className="font-bold text-gray-700 mb-2">{step.title}</h4>
                <p className="text-xs text-gray-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-bold text-gray-600 mb-2 block">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full border border-gray-400 rounded-[4px] px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 transition-all h-[50px]"
                    placeholder="Brief summary of the issue (min. 5 chars)"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-600 mb-2 block">Ticket Type</label>
                  <div className="relative">
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full border border-gray-400 rounded-[4px] px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 transition-all h-[50px] appearance-none bg-white cursor-pointer"
                    >
                      <option value="general">General Inquiry</option>
                      <option value="technical">Technical Issue</option>
                      <option value="billing">Billing & Account</option>
                      <option value="feature_request">Feature Request</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-baseline gap-4 mb-3">
                  <label className="text-sm font-bold text-gray-600">Attach files</label>
                  <span className="text-gray-400 text-[11px]">Helpful images or documents</span>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                  multiple
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-all gap-3"
                >
                  <svg className="w-8 h-8 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                  <span className="text-xs font-bold text-primary-300 uppercase tracking-widest">
                    {attachments.length > 0 ? `${attachments.length} files selected` : "Click to Attach"}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-600 mb-2 block">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full border border-gray-400 rounded-[4px] px-4 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 transition-all h-48 resize-none"
                placeholder="Please explain your issue in detail (min. 10 chars)..."
              ></textarea>
            </div>

            <div className="flex justify-center pt-8">
              <button
                type="submit"
                disabled={loading}
                className="bg-primary-300 hover:bg-primary-350 text-white font-bold py-4 px-12 rounded-lg text-sm w-full md:w-[350px] transition-all shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-70 uppercase tracking-widest"
              >
                {loading ? "Submitting..." : "Submit Ticket"}
              </button>
            </div>
          </form>
        </div>

        {/* Newsletter Section */}
        <div className="mt-16 border-t border-gray-100 pt-16">
          <SupportNewsletter />
        </div>
      </main>
    </div>
  );
}
