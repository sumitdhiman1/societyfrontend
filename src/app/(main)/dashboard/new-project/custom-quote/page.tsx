"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { quoteService } from "@/lib/quoteService";
import { authService } from "@/lib/authService";
import { mediaService } from "@/lib/mediaService";

type FileItem = {
  id: string;
  file: File;
  status: "uploading" | "done" | "error";
  name: string;
  type: string;
  size: number;
  errorMessage?: string;
  url?: string;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB in bytes

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

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

    const fileList = Array.from(targetFiles);
    const validFiles: File[] = [];
    const oversizedFiles: string[] = [];

    fileList.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        oversizedFiles.push(`${file.name} (${formatFileSize(file.size)})`);
      } else {
        validFiles.push(file);
      }
    });

    if (oversizedFiles.length > 0) {
      toast.error("File size limit exceeded (Max 10 MB)", {
        description: `The following file(s) exceed 10 MB: ${oversizedFiles.join(", ")}`,
        duration: 10000,
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (validFiles.length === 0) return;

    const newFiles: FileItem[] = validFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      status: "uploading",
      name: file.name,
      type: file.type,
      size: file.size,
    }));

    setFiles((prev) => [...prev, ...newFiles]);

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
            prev.map((f) =>
              f.id === newFile.id
                ? { ...f, status: "error", errorMessage: response.message || "Upload failed" }
                : f
            )
          );
        }
      } catch (error: any) {
        console.error("Upload failed", error);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === newFile.id
              ? { ...f, status: "error", errorMessage: error?.message || "Upload failed" }
              : f
          )
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
        toast.error("Email verification required", {
          description: "Please verify your email to submit a custom quote request. Use the resend link in the top banner if needed.",
        });
        return;
      }
      if (!authService.isAuthenticated()) {
        toast.error("Session expired", {
          description: "Your session has expired. Please log in again.",
        });
        router.push("/login?redirect=/dashboard/new-project/custom-quote");
        return;
      }
      if (files.some((f) => f.status === "uploading")) {
        toast.warning("Upload in progress", {
          description: "Please wait for all files to finish uploading before submitting.",
        });
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
          toast.success("Quote request submitted successfully!");
          router.push("/dashboard/my-quotes");
        } else {
          const errorMessage = response.message || "Failed to submit quote request.";
          if (errorMessage.toLowerCase().includes("logged in") || errorMessage.toLowerCase().includes("unauthorized") || errorMessage.toLowerCase().includes("authentication")) {
            toast.error("Session expired", {
              description: "Please log in again.",
            });
            router.push("/login?redirect=/dashboard/new-project/custom-quote");
          } else {
            toast.error(errorMessage);
          }
        }
      } catch (error: any) {
        console.error("Quote submission error:", error);
        const errorMessage = error?.message || "An error occurred. Please try again later.";
        if (errorMessage.toLowerCase().includes("logged in") || errorMessage.toLowerCase().includes("unauthorized") || errorMessage.toLowerCase().includes("authentication")) {
          toast.error("Session expired", {
            description: "Please log in again.",
          });
          router.push("/login?redirect=/dashboard/new-project/custom-quote");
        } else {
          toast.error(errorMessage);
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-8 md:pt-12 pb-12 bg-white min-h-screen">
      <h1 className="text-[28px] md:text-[32px] font-medium text-primary-100 mb-8 md:mb-12">New Quote</h1>

      {/* Tell us about your project box */}
      <div className="border border-gray-400 rounded-sm p-8 pb-12 mb-12 bg-white">
        <div className="mb-8">
          <h2 className="text-[22px] font-bold text-gray-800 mb-3">Tell us about your project</h2>
          <p className="text-xs text-gray-600 leading-relaxed max-w-4xl">
            We'd love to hear more about your specific needs. Please fill out the form below with as much detail as possible so we can provide an accurate and tailored quote for your project. Our team reviews every request carefully to ensure we understand your vision before getting back to you.
          </p>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-stretch">
          {/* Step 1 */}
          <div className="w-full md:w-1/3 border-r-0 md:border-r border-gray-300 last:border-r-0 py-4">
            <div className="flex flex-col items-center text-center px-4 h-full justify-between">
              <div className="flex items-center gap-4 mb-4">
                <h3 className="font-normal text-3xl text-gray-500">1</h3>
                <div className="w-14 h-14 bg-primary-300 rounded-full flex items-center justify-center text-white shadow-md">
                  <img
                    alt="Submit project details"
                    loading="lazy"
                    width="24"
                    height="24"
                    decoding="async"
                    data-nimg="1"
                    className="w-6 h-6 object-contain"
                    style={{ color: "transparent" }}
                    src="/assets/mail-01.svg"
                  />
                </div>
              </div>
              <h4 className="font-semibold text-lg text-gray-600 mb-2 truncate px-2">Submit project details</h4>
              <p className="text-xs text-gray-500 max-w-[250px] leading-relaxed mx-auto">
                Submit any relevant materials about your project through the form below. The more details we get the more accurate quotations will be.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="w-full md:w-1/3 border-r-0 md:border-r border-gray-300 last:border-r-0 py-4">
            <div className="flex flex-col items-center text-center px-4 h-full justify-between">
              <div className="flex items-center gap-4 mb-4">
                <h3 className="font-normal text-3xl text-gray-500">2</h3>
                <div className="w-14 h-14 bg-primary-300 rounded-full flex items-center justify-center text-white shadow-md">
                  <img
                    alt="Our team will review"
                    loading="lazy"
                    width="24"
                    height="24"
                    decoding="async"
                    data-nimg="1"
                    className="w-6 h-6 object-contain"
                    style={{ color: "transparent" }}
                    src="/assets/users-02.svg"
                  />
                </div>
              </div>
              <h4 className="font-semibold text-lg text-gray-600 mb-2 truncate px-2">Our team will review</h4>
              <p className="text-xs text-gray-500 max-w-[250px] leading-relaxed mx-auto">
                After submitting project details, our team will internally review them. We may contact you with questions.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="w-full md:w-1/3 py-4">
            <div className="flex flex-col items-center text-center px-4 h-full justify-between">
              <div className="flex items-center gap-4 mb-4">
                <h3 className="font-normal text-3xl text-gray-500">3</h3>
                <div className="w-14 h-14 bg-primary-300 rounded-full flex items-center justify-center text-white shadow-md">
                  <img
                    alt="Receive your quote"
                    loading="lazy"
                    width="24"
                    height="24"
                    decoding="async"
                    data-nimg="1"
                    className="w-6 h-6 object-contain"
                    style={{ color: "transparent" }}
                    src="/assets/message-notification-circle.svg"
                  />
                </div>
              </div>
              <h4 className="font-semibold text-lg text-gray-600 mb-2 truncate px-2">Receive your quote</h4>
              <p className="text-xs text-gray-500 max-w-[250px] leading-relaxed mx-auto">
                You'll usually receive the quote within 1-3 business days. More complex projects may require more time, in which case you'll be notified.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="mb-12 max-w-5xl">
        <div className="flex flex-col md:flex-row gap-6 mb-8 items-start w-full">
          {/* Project Title */}
          <div className="flex-1 w-full">
            <label className="text-sm font-bold text-gray-600 mb-2 block">
              Project title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter your project Title"
              className={`w-full border ${
                projectTitleError ? "border-red-500" : "border-gray-400"
              } rounded-[4px] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 h-[42px]`}
              value={projectTitle}
              onChange={(e) => {
                setProjectTitle(e.target.value);
                if (projectTitleError) setProjectTitleError("");
              }}
            />
            {projectTitleError && <p className="text-red-500 text-xs mt-1">{projectTitleError}</p>}
          </div>

          {/* Attach Files */}
          <div
            className={`w-full md:w-[45%] flex flex-col ${
              isDragging ? "bg-blue-50/60 rounded-[4px] ring-1 ring-primary-300" : ""
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <label className="text-sm font-bold text-gray-600 mb-2 block">
              Attach files
            </label>
            <div className="flex items-center gap-3 rounded-[4px]">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.json,.xml,.ai,.psd,audio/*,video/*,application/*,*/*"
                multiple
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 bg-primary-300 hover:bg-primary-350 text-white text-sm font-medium px-8 h-[42px] rounded-[4px] transition-colors shadow-sm shrink-0"
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
              <p className="text-xs text-gray-400 leading-tight max-w-xs">
                Drag &amp; drop any images or documents that might be helpful in explaining your project (Max 10 MB per file).
              </p>
            </div>
          </div>
        </div>

        {/* Attached Files Preview Grid */}
        {files.length > 0 && (
          <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {files.map((fileItem) => {
              const ext = (fileItem.name.split(".").pop() || "FILE").toUpperCase();
              const isPdf =
                fileItem.type === "application/pdf" || ext === "PDF";
              const isWord =
                fileItem.type === "application/msword" ||
                fileItem.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                ["DOC", "DOCX"].includes(ext);
              const isExcel =
                fileItem.type.includes("sheet") ||
                fileItem.type.includes("excel") ||
                fileItem.type === "text/csv" ||
                ["XLS", "XLSX", "CSV"].includes(ext);
              const isPpt =
                fileItem.type.includes("presentation") ||
                fileItem.type.includes("powerpoint") ||
                ["PPT", "PPTX"].includes(ext);
              const isArchive = ["ZIP", "RAR", "7Z", "TAR", "GZ"].includes(ext);
              const isImage =
                fileItem.type.startsWith("image/") ||
                ["PNG", "JPG", "JPEG", "WEBP", "GIF", "BMP", "SVG", "ICO"].includes(ext);
              const previewSrc =
                fileItem.url || (fileItem.file ? URL.createObjectURL(fileItem.file) : "");

              return (
                <div
                  key={fileItem.id}
                  className={`relative flex items-center gap-3 p-2.5 bg-white rounded-md border shadow-sm transition-all group ${
                    fileItem.status === "error"
                      ? "border-red-300 bg-red-50/50"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <div className="h-9 w-9 flex-shrink-0 rounded bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 relative">
                    {isPdf ? (
                      <span className="text-red-600 font-extrabold text-[9px] uppercase tracking-wider">
                        PDF
                      </span>
                    ) : isWord ? (
                      <span className="text-blue-600 font-extrabold text-[9px] uppercase tracking-wider">
                        {ext === "DOCX" ? "DOCX" : "DOC"}
                      </span>
                    ) : isExcel ? (
                      <span className="text-emerald-600 font-extrabold text-[9px] uppercase tracking-wider">
                        {ext}
                      </span>
                    ) : isPpt ? (
                      <span className="text-amber-600 font-extrabold text-[9px] uppercase tracking-wider">
                        {ext}
                      </span>
                    ) : isArchive ? (
                      <span className="text-purple-600 font-extrabold text-[9px] uppercase tracking-wider">
                        {ext}
                      </span>
                    ) : isImage && previewSrc ? (
                      <img
                        src={previewSrc}
                        alt={fileItem.name}
                        className={`h-full w-full object-cover ${
                          fileItem.status === "uploading" ? "opacity-50" : ""
                        }`}
                      />
                    ) : (
                      <span className="text-gray-600 font-extrabold text-[9px] uppercase tracking-wider">
                        {ext.slice(0, 4)}
                      </span>
                    )}
                    {fileItem.status === "uploading" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-300" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pr-6">
                    <p className="text-xs font-medium text-gray-700 truncate" title={fileItem.name}>
                      {fileItem.name}
                    </p>
                    <p className="text-[11px] text-gray-400 font-normal flex items-center gap-1">
                      <span>{formatFileSize(fileItem.size)}</span>
                      {fileItem.status === "error" && (
                        <span className="text-red-500 font-medium truncate" title={fileItem.errorMessage || "Upload failed"}>
                          • {fileItem.errorMessage || "Upload failed"}
                        </span>
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((f) => f.id !== fileItem.id))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-red-600 hover:bg-gray-100 transition-colors cursor-pointer"
                    title="Remove file"
                  >
                    <svg
                      width="14"
                      height="14"
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
        <div className="mb-8 w-full">
          <label className="text-sm font-bold text-gray-600 mb-2 block">
            Project description <span className="text-red-500">*</span>
          </label>
          <textarea
            className={`w-full border ${
              projectDescriptionError ? "border-red-500" : "border-gray-400"
            } rounded-[4px] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 h-32 resize-none`}
            value={projectDescription}
            onChange={(e) => {
              setProjectDescription(e.target.value);
              if (projectDescriptionError) setProjectDescriptionError("");
            }}
          />
          {projectDescriptionError && <p className="text-red-500 text-xs mt-1">{projectDescriptionError}</p>}
        </div>

        {/* Submit Button */}
        <div className="mt-8">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || files.some((f) => f.status === "uploading") || requiresVerification}
            className={`bg-primary-300 hover:bg-primary-350 text-white font-medium py-2.5 px-6 rounded-[4px] text-sm w-auto flex justify-center items-center transition-colors shadow-sm ${
              isSubmitting || files.some((f) => f.status === "uploading") || requiresVerification
                ? "opacity-75 cursor-not-allowed"
                : "active:scale-[0.98] cursor-pointer"
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
          className="px-12 py-2.5 bg-primary-300 hover:bg-primary-350 rounded-[4px] text-sm text-white font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          My Quotes
        </button>
      </div>
    </main>
  );
}
