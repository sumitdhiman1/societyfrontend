"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { quoteService } from "@/lib/quoteService";
import { authService } from "@/lib/authService";
import { mediaService } from "@/lib/mediaService";

type FileItem = {
  id: string;
  file: File;
  status: "uploading" | "done" | "error";
  name: string;
  type: string;
  url?: string;
};

// Step Icons matching the UI screenshot
const MailIcon = () => (
  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M2 7L10.1649 12.7154C10.8261 13.1783 11.1567 13.4097 11.5163 13.4993C11.8339 13.5785 12.1661 13.5785 12.4837 13.4993C12.8433 13.4097 13.1739 13.1783 13.8351 12.7154L22 7M6.8 20H17.2C18.8802 20 19.7202 20 20.362 19.673C20.9265 19.3854 21.3854 18.9265 21.673 18.362C22 17.7202 22 16.8802 22 15.2V8.8C22 7.11984 22 6.27976 21.673 5.63803C21.3854 5.07354 20.9265 4.6146 20.362 4.32698C19.7202 4 18.8802 4 17.2 4H6.8C5.11984 4 4.27976 4 3.63803 4.32698C3.07354 4.6146 2.6146 5.07354 2.32698 5.63803C2 6.27976 2 7.11984 2 8.8V15.2C2 16.8802 2 17.7202 2.32698 18.362C2.6146 18.9265 3.07354 19.3854 3.63803 19.673C4.27976 20 5.11984 20 6.8 20Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M15.1045 3.02273C15.3503 2.52815 15.9505 2.32646 16.445 2.57225C18.2536 3.47103 19.5 5.33904 19.5 7.5C19.5 9.66096 18.2536 11.529 16.445 12.4278C15.9505 12.6735 15.3503 12.4719 15.1045 11.9773C14.8587 11.4827 15.0604 10.8825 15.555 10.6367C16.7098 10.0628 17.5 8.87276 17.5 7.5C17.5 6.12724 16.7098 4.9372 15.555 4.36327C15.0604 4.11749 14.8587 3.51731 15.1045 3.02273Z" fill="currentColor"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M17.0889 16.3541C17.3166 15.851 17.9091 15.6276 18.4123 15.8553C20.0902 16.6146 21.5741 17.8393 22.7863 19.3822C23.1275 19.8165 23.0521 20.4451 22.6178 20.7863C22.1835 21.1275 21.5549 21.0521 21.2137 20.6178C20.171 19.2907 18.9327 18.2861 17.5877 17.6775C17.0846 17.4498 16.8613 16.8573 17.0889 16.3541Z" fill="currentColor"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M4.00001 7.5C4.00001 4.46243 6.46244 2 9.50001 2C12.5376 2 15 4.46243 15 7.5C15 10.5376 12.5376 13 9.50001 13C6.46244 13 4.00001 10.5376 4.00001 7.5Z" fill="currentColor"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M1.21368 19.3822C3.30547 16.7198 6.21714 15 9.50001 15C12.7829 15 15.6946 16.7198 17.7863 19.3822C18.0228 19.6832 18.0667 20.0928 17.8994 20.4371C17.7321 20.7814 17.3828 21 17 21H2.00001C1.61719 21 1.26796 20.7814 1.10062 20.4371C0.933269 20.0928 0.977171 19.6832 1.21368 19.3822Z" fill="currentColor"/>
  </svg>
);

const ChatIcon = () => (
  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M11.707 3.03647C7.38421 3.43621 3.99962 7.07285 3.99962 11.5C3.99962 12.45 4.15547 13.3636 4.44299 14.2166C4.55119 14.5376 4.60529 14.6981 4.61505 14.8214C4.62469 14.9432 4.6174 15.0286 4.58728 15.1469C4.55677 15.2668 4.48942 15.3915 4.35472 15.6408L2.71906 18.6684C2.48575 19.1002 2.36909 19.3161 2.3952 19.4828C2.41794 19.6279 2.50337 19.7557 2.6288 19.8322C2.7728 19.9201 3.01692 19.8948 3.50517 19.8444L8.62619 19.315C8.78121 19.299 8.85882 19.291 8.92949 19.2937C8.999 19.2963 9.04807 19.3029 9.11586 19.3185C9.18478 19.3344 9.27145 19.3678 9.44478 19.4345C10.3928 19.7998 11.4228 20 12.4996 20C16.9304 20 20.5694 16.6098 20.9641 12.2819M20.1209 3.87868C21.2925 5.05025 21.2925 6.94975 20.1209 8.12132C18.9494 9.29289 17.0499 9.29289 15.8783 8.12132C14.7067 6.94975 14.7067 5.05025 15.8783 3.87868C17.0499 2.70711 18.9494 2.70711 20.1209 3.87868Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const StepCard = ({
  number,
  icon,
  title,
  description,
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
}) => (
  <div className="flex flex-col items-center text-center px-4 h-full justify-start">
    <div className="flex items-center gap-3.5 mb-3">
      <span className="font-normal text-3xl sm:text-4xl text-gray-500">{number}</span>
      <div className="w-11 h-11 bg-[#4343F0] rounded-full flex items-center justify-center text-white shadow-sm flex-shrink-0">
        {icon}
      </div>
    </div>
    <h4 className="font-bold text-base sm:text-lg text-gray-800 mb-2">{title}</h4>
    <p className="text-xs text-gray-400 max-w-[280px] leading-relaxed mx-auto font-normal">{description}</p>
  </div>
);

export default function CustomQuotePage() {
  const router = useRouter();
  const [projectTitle, setProjectTitle] = useState("");
  const [projectTitleError, setProjectTitleError] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectDescriptionError, setProjectDescriptionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const currentUser = authService.getUser();
    setUser(currentUser);
    if (!authService.isAuthenticated()) {
      router.push("/login?redirect=/dashboard/new-project/custom-quote");
    }
  }, [router]);

  const requiresVerification = user && !user.isEmailVerified;
  const [files, setFiles] = useState<FileItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesUpload = async (targetFiles: FileList | File[]) => {
    if (!targetFiles || targetFiles.length === 0) return;

    const newFiles: FileItem[] = Array.from(targetFiles).map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      status: "uploading",
      name: file.name,
      type: file.type,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    for (const newFile of newFiles) {
      try {
        const currentUser = authService.getUser();
        const userId = currentUser?._id || "anonymous";
        const titleSafe = projectTitle.trim().replace(/[^a-zA-Z0-9]/g, "_").toLowerCase() || "untitled";
        const folder = `customquote/${userId}/${titleSafe}`;

        const response = await mediaService.uploadImage({ file: newFile.file, folder });

        if (response.isSuccessful && response.data?.url) {
          setFiles((prev) =>
            prev.map((f) => (f.id === newFile.id ? { ...f, status: "done", url: response.data.url } : f))
          );
        } else {
          setFiles((prev) =>
            prev.map((f) => (f.id === newFile.id ? { ...f, status: "error" } : f))
          );
        }
      } catch (error) {
        console.error("Upload failed", error);
        setFiles((prev) =>
          prev.map((f) => (f.id === newFile.id ? { ...f, status: "error" } : f))
        );
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFilesUpload(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleFilesUpload(e.dataTransfer.files);
    }
  };

  const handleSubmit = async () => {
    let isValid = true;
    if (projectTitleError) setProjectTitleError("");
    if (projectDescriptionError) setProjectDescriptionError("");

    if (!projectTitle.trim()) {
      setProjectTitleError("Please provide a project title.");
      isValid = false;
    }
    if (!projectDescription.trim()) {
      setProjectDescriptionError("Please provide a project description.");
      isValid = false;
    }

    if (isValid) {
      if (requiresVerification) {
        alert("Verification Required: Please verify your email to submit a custom quote request. You can use the resend button in the top banner if you haven't received the link.");
        return;
      }
      if (!authService.isAuthenticated()) {
        alert("Your session has expired. Please log in again.");
        router.push("/login?redirect=/dashboard/new-project/custom-quote");
        return;
      }
      if (files.some((f) => f.status === "uploading")) {
        alert("Please wait for all files to finish uploading.");
        return;
      }

      setIsSubmitting(true);
      try {
        const attachedFilesUrl = files.filter((f) => f.status === "done" && f.url).map((f) => f.url);

        const response = await quoteService.requestQuote({
          projectTitle,
          projectDescription,
          serviceType: null,
          attachedFilesUrl,
        });

        if (response.isSuccessful) {
          router.push("/dashboard/my-quotes");
        } else {
          const errorMessage = response.message || "Failed to submit quote request.";
          if (errorMessage.toLowerCase().includes("logged in") || errorMessage.toLowerCase().includes("unauthorized") || errorMessage.toLowerCase().includes("authentication")) {
            alert("Your session has expired. Please log in again.");
            router.push("/login?redirect=/dashboard/new-project/custom-quote");
          } else {
            alert(errorMessage);
          }
        }
      } catch (error: any) {
        console.error("Quote submission error:", error);
        const errorMessage = error?.message || "An error occurred. Please try again later.";
        if (errorMessage.toLowerCase().includes("logged in") || errorMessage.toLowerCase().includes("unauthorized") || errorMessage.toLowerCase().includes("authentication")) {
          alert("Your session has expired. Please log in again.");
          router.push("/login?redirect=/dashboard/new-project/custom-quote");
        } else {
          alert(errorMessage);
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="w-full min-h-screen bg-white flex flex-col font-sans">
      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-8 md:pt-12 pb-12 bg-white font-sans">
        <h1 className="text-[28px] md:text-[32px] font-medium text-primary-100 mb-8 md:mb-12">New Quote</h1>

        {/* Tell us about your project box */}
        <div className="border border-gray-300 rounded-[8px] p-6 sm:p-8 pb-10 mb-10 bg-white">
          <div className="mb-8">
            <h2 className="text-xl sm:text-[22px] font-bold text-gray-900 mb-2">Tell us about your project</h2>
            <p className="text-xs text-gray-500 leading-relaxed max-w-4xl font-normal">
              We'd love to hear more about your specific needs. Please fill out the form below with as much detail as possible so we can provide an accurate and tailored<br className="hidden md:inline" />
              quote for your project. Our team reviews every request carefully to ensure we understand your vision before getting back to you.
            </p>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-stretch">
            <div className="w-full md:w-1/3 border-r-0 md:border-r border-gray-200 py-4">
              <StepCard
                number={1}
                icon={<MailIcon />}
                title="Submit project details"
                description={
                  <>
                    Submit any relevant materials about your<br />
                    project through the form below. The more<br />
                    details we get the more accurate quotations<br />
                    will be.
                  </>
                }
              />
            </div>
            <div className="w-full md:w-1/3 border-r-0 md:border-r border-gray-200 py-4">
              <StepCard
                number={2}
                icon={<UsersIcon />}
                title="Our team will review"
                description={
                  <>
                    After submitting project details, our team<br />
                    will internally review them. We may contact<br />
                    you with questions.
                  </>
                }
              />
            </div>
            <div className="w-full md:w-1/3 py-4">
              <StepCard
                number={3}
                icon={<ChatIcon />}
                title="Receive your quote"
                description={
                  <>
                    You'll usually receive the quote within 1-3<br />
                    business days. More complex projects may<br />
                    require more time, in which case you'll be<br />
                    notified.
                  </>
                }
              />
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="mb-12 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10 mb-6 items-start">
            {/* Project Title Field */}
            <div className="w-full">
              <label className="text-sm font-bold text-gray-700 mb-2 block">
                Project title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter your project Title"
                className={`w-full border ${
                  projectTitleError ? "border-red-500" : "border-gray-300"
                } rounded-[6px] px-3.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#4343F0] h-[44px]`}
                value={projectTitle}
                onChange={(e) => {
                  setProjectTitle(e.target.value);
                  if (projectTitleError) setProjectTitleError("");
                }}
              />
              {projectTitleError && <p className="text-red-500 text-xs mt-1">{projectTitleError}</p>}
            </div>

            {/* Attach Files Field */}
            <div
              className={`w-full transition-colors rounded-lg ${
                isDragging ? "bg-blue-50/60 p-2 border border-dashed border-[#4343F0]" : ""
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <label className="text-sm font-bold text-gray-700 mb-2 block">
                Attach files
              </label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,application/pdf"
                multiple
              />

              <div className="flex items-center gap-3.5 h-[44px]">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-[44px] inline-flex items-center justify-center gap-2 bg-[#4343F0] hover:bg-[#3232b7] text-white text-sm font-semibold px-6 rounded-[6px] transition-colors shadow-sm cursor-pointer whitespace-nowrap flex-shrink-0"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                  Attach
                </button>
                <span className="text-xs text-gray-400 font-normal leading-snug">
                  Drag & drop any images or documents that might be<br />
                  helpful in explaining your project.
                </span>
              </div>
            </div>
          </div>

          {/* Attached Files Preview Grid */}
          {files.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-5">
              {files.map((fileItem) => {
                const isImage =
                  fileItem.type.startsWith("image/") ||
                  /\.(svg|png|jpg|jpeg|webp|gif|bmp|ico)$/i.test(fileItem.name);
                const previewSrc =
                  fileItem.url || (fileItem.file ? URL.createObjectURL(fileItem.file) : "");

                return (
                  <div
                    key={fileItem.id}
                    className={`flex items-center justify-between py-2 px-3 bg-white rounded-[8px] border shadow-xs transition-colors ${
                      fileItem.status === "error"
                        ? "border-red-300 bg-red-50/50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center min-w-0 flex-1 mr-2.5">
                      <div className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 rounded-[6px] bg-gray-50 flex items-center justify-center overflow-hidden mr-2.5 border border-gray-200 relative p-0.5">
                        {isImage && previewSrc ? (
                          <img
                            src={previewSrc}
                            alt={fileItem.name}
                            className={`h-full w-full object-contain ${
                              fileItem.status === "uploading" ? "opacity-50" : ""
                            }`}
                          />
                        ) : (
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-gray-500"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        )}
                        {fileItem.status === "uploading" && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#4343F0]" />
                          </div>
                        )}
                      </div>
                      <span className="text-[13px] font-medium text-gray-800 truncate" title={fileItem.name}>
                        {fileItem.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((f) => f.id !== fileItem.id))}
                      className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors cursor-pointer flex-shrink-0"
                      title="Remove file"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Project Description */}
          <div className="mb-6 w-full">
            <label className="text-sm font-bold text-gray-700 mb-2 block">
              Project description <span className="text-red-500">*</span>
            </label>
            <textarea
              className={`w-full border ${projectDescriptionError ? "border-red-500" : "border-gray-300"} rounded-[6px] p-3 text-sm placeholder-gray-400 focus:outline-none focus:border-[#4343F0] min-h-[140px] resize-none`}
              value={projectDescription}
              onChange={(e) => {
                setProjectDescription(e.target.value);
                if (projectDescriptionError) setProjectDescriptionError("");
              }}
            />
            {projectDescriptionError && <p className="text-red-500 text-xs mt-1">{projectDescriptionError}</p>}
          </div>

          {/* Submit Button (Align Left) */}
          <div className="flex justify-start">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || files.some((f) => f.status === "uploading") || requiresVerification}
              className={`bg-[#4343F0] hover:bg-[#3232b7] text-white font-medium py-3 px-8 rounded-[6px] text-sm shadow-sm transition-all cursor-pointer ${
                isSubmitting || files.some((f) => f.status === "uploading") || requiresVerification
                  ? "opacity-75 cursor-not-allowed"
                  : "active:scale-[0.98]"
              }`}
            >
              {isSubmitting ? (
                <span className="inline-flex items-center">
                  Submitting
                  <span className="inline-flex items-center ml-1 gap-0.5" style={{ transform: "translateY(-1px)" }}>
                    <span className="w-1 h-1 bg-current rounded-full animate-bounce"></span>
                    <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
                    <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></span>
                  </span>
                </span>
              ) : requiresVerification ? (
                "Verification Required"
              ) : (
                "Request a quote for this project"
              )}
            </button>
          </div>
        </div>

        {/* Bottom My Quotes Banner */}
        <div className="flex flex-col items-center mt-12 pt-8">
          <h3 className="text-gray-500 font-bold mb-6 text-[18px]">Find all of your custom quotes on the My Quotes page</h3>
          <button
            onClick={() => router.push("/dashboard/my-quotes")}
            className="px-12 py-2.5 bg-[#4343F0] hover:bg-[#3232b7] rounded-[4px] text-sm text-white font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            My Quotes
          </button>
        </div>
      </main>
    </div>
  );
}
