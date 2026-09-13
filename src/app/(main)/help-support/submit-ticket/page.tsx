"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
  const [errors, setErrors] = useState<{ subject?: string; description?: string }>({});
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

    const newErrors: { subject?: string; description?: string } = {};
    if (formData.subject.trim().length < 5) {
      newErrors.subject = "Subject must be at least 5 characters long.";
    }
    if (formData.description.trim().length < 10) {
      newErrors.description = "Description must be at least 10 characters long.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
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
        setFormData({ subject: "", type: "general", description: "" });
        setAttachments([]);
        setErrors({});
        const ticketId = res.data?._id || res.data?.ticket?._id || res.data?.id || res._id;
        if (ticketId) {
          router.push(`/help-support/history/${ticketId}`);
        } else {
          router.push("/help-support/history");
        }
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

      <main className="flex-grow container mx-auto px-4 md:px-8 lg:px-[54px] py-12 max-w-[1536px]">
        <div className="border border-gray-400 rounded-sm p-8 pb-12 mb-12 bg-white">
          <div className="mb-8">
            <h2 className="text-[22px] font-bold text-gray-800 mb-3">Tell us about your issue</h2>
            <p className="text-xs text-gray-600 leading-relaxed max-w-4xl">
              We&apos;re here to help. Please detail the issue you&apos;re facing so our support team can assist you effectively. Providing clear screenshots or documents can significantly speed up the resolution process.
            </p>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-stretch">
            <div className="w-full md:w-1/3 border-r-0 md:border-r border-gray-300 last:border-r-0 py-4">
              <div className="flex flex-col items-center text-center px-4 h-full justify-between">
                <div className="flex items-center gap-4 mb-4">
                  <h3 className="font-normal text-3xl text-gray-500">1</h3>
                  <div className="w-14 h-14 bg-[#4343f0] rounded-full flex items-center justify-center text-white shadow-md">
                    <Image
                      alt="Describe the issue"
                      width={24}
                      height={24}
                      className="w-6 h-6 object-contain"
                      src="/assets/message-chat-circle.svg"
                    />
                  </div>
                </div>
                <h4 className="font-semibold text-lg text-gray-600 mb-2 truncate px-2">Describe the issue</h4>
                <p className="text-xs text-gray-500 max-w-[250px] leading-relaxed mx-auto">
                  Provide a clear subject and detailed description of the problem you are encountering.
                </p>
              </div>
            </div>

            <div className="w-full md:w-1/3 border-r-0 md:border-r border-gray-300 last:border-r-0 py-4">
              <div className="flex flex-col items-center text-center px-4 h-full justify-between">
                <div className="flex items-center gap-4 mb-4">
                  <h3 className="font-normal text-3xl text-gray-500">2</h3>
                  <div className="w-14 h-14 bg-[#4343f0] rounded-full flex items-center justify-center text-white shadow-md">
                    <Image
                      alt="Team Review"
                      width={24}
                      height={24}
                      className="w-6 h-6 object-contain"
                      src="/assets/users-02.svg"
                    />
                  </div>
                </div>
                <h4 className="font-semibold text-lg text-gray-600 mb-2 truncate px-2">Team Review</h4>
                <p className="text-xs text-gray-500 max-w-[250px] leading-relaxed mx-auto">
                  Our dedicated support team will review your ticket and investigate the reported issue.
                </p>
              </div>
            </div>

            <div className="w-full md:w-1/3 py-4">
              <div className="flex flex-col items-center text-center px-4 h-full justify-between">
                <div className="flex items-center gap-4 mb-4">
                  <h3 className="font-normal text-3xl text-gray-500">3</h3>
                  <div className="w-14 h-14 bg-[#4343f0] rounded-full flex items-center justify-center text-white shadow-md">
                    <Image
                      alt="Get Resolution"
                      width={24}
                      height={24}
                      className="w-6 h-6 object-contain"
                      src="/assets/bx-support.svg"
                    />
                  </div>
                </div>
                <h4 className="font-semibold text-lg text-gray-600 mb-2 truncate px-2">Get Resolution</h4>
                <p className="text-xs text-gray-500 max-w-[250px] leading-relaxed mx-auto">
                  You will receive a response or resolution within 24-48 hours. You can track progress in your history.
                </p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mb-12 max-w-5xl">
          <div className="flex flex-col md:flex-row gap-6 md:gap-12 mb-8 items-start">
            <div className="flex-1 w-full md:max-w-[400px]">
              <label className="text-sm font-bold text-gray-600 mb-2 block">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                className={`w-full border ${errors.subject ? "border-red-500" : "border-gray-400"} rounded-[4px] px-3 py-2 text-sm focus:outline-none focus:ring-1 ${errors.subject ? "focus:ring-red-400" : "focus:ring-gray-400"} h-[42px]`}
                placeholder="Brief summary of the issue"
                type="text"
                value={formData.subject}
                onChange={(e) => {
                  setFormData({ ...formData, subject: e.target.value });
                  if (errors.subject) setErrors((prev) => ({ ...prev, subject: undefined }));
                }}
              />
              {errors.subject && (
                <p className="text-xs text-red-500 mt-1">{errors.subject}</p>
              )}
              <div className="mt-6">
                <label className="text-sm font-bold text-gray-600 mb-2 block">Ticket Type</label>
                <div className="relative">
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full border border-gray-400 rounded-[4px] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 h-[42px] appearance-none bg-white cursor-pointer"
                  >
                    <option value="general">General Inquiry</option>
                    <option value="technical">Technical Issue</option>
                    <option value="billing">Billing &amp; Account</option>
                    <option value="feature_request">Feature Request</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 w-full">
              <label className="text-sm font-bold text-gray-600 mb-2 block">Attach files</label>
              <div
                className="flex flex-col sm:flex-row items-start sm:items-center gap-3"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files) {
                    setAttachments((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
                  }
                }}
              >
                <input
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                  multiple
                  type="file"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 bg-[#4343f0] hover:bg-[#3232b7] text-white text-sm font-medium px-8 h-[42px] rounded-[4px] transition-colors shrink-0 cursor-pointer"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                  </svg>
                  Attach
                </button>
                <p className="text-xs text-gray-400 leading-tight max-w-xs">
                  Drag &amp; drop any images or documents that might be helpful in explaining your issue.
                </p>
              </div>
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {attachments.map((file, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-[#F1F3F5] text-xs text-[#404040] font-medium"
                    >
                      <span className="max-w-[200px] truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                        className="text-red-500 hover:text-red-700 font-bold transition-colors cursor-pointer flex items-center justify-center p-0.5"
                        aria-label={`Remove ${file.name}`}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mb-8 w-full">
            <label className="text-sm font-bold text-gray-600 mb-2 block">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => {
                setFormData({ ...formData, description: e.target.value });
                if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
              }}
              className={`w-full border ${errors.description ? "border-red-500" : "border-gray-400"} rounded-[4px] px-3 py-2 text-sm focus:outline-none focus:ring-1 ${errors.description ? "focus:ring-red-400" : "focus:ring-gray-400"} h-32 resize-none`}
              placeholder="Please explain your issue in detail..."
            ></textarea>
            {errors.description && (
              <p className="text-xs text-red-500 mt-1">{errors.description}</p>
            )}
          </div>

          <div className="flex justify-center mt-12">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#4343f0] hover:bg-[#3232b7] text-white font-bold py-3.5 px-12 rounded-lg text-sm w-full md:w-[350px] flex justify-center items-center transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-75 cursor-pointer"
            >
              {loading ? "Submitting..." : "Submit Ticket"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
