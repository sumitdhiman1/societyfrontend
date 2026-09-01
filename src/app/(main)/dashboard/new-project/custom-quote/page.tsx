"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
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

const StepIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="currentColor" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5l-4-4 1.41-1.41L11 12.67l5.59-5.59L18 8.5l-7 7z" fill="none" />
    <path d="M4 11v6c0 .55.45 1 1 1h2v5c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-5h2c1.72 0 3.22-1.12 3.73-2.73l.8-2.52C19.79 11.23 18.66 10 17.5 10H4c-.55 0-1 .45-1 1z" stroke="none" fill="white" transform="translate(2,0) scale(0.9)" />
    <path d="M18.86 11.23l.14-.42c.11-.34.1-.73-.04-1.07-.12-.32-.38-.59-.72-.74-.34-.14-.72-.14-1.07-.01l-.42.14-9 3-2.12.71c-.55.18-.84.77-.66 1.32.18.55.77.84 1.32.66l2.12-.71 9-3z" stroke="none" fill="white" opacity="0" />
    <path d="M21 4H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-6.17 12.3c-.63 1.9-2.3 3.3-4.33 3.3H5v-4.17L14.83 16.3z M6 13h-.5v-2h.5c1.1 0 2 .9 2 2s-.9 2-2 2zm15-2.5c0 2.49-2.01 4.5-4.5 4.5s-4.5-2.01-4.5-4.5 2.01-4.5 4.5-4.5 4.5 2.01 4.5 4.5z" opacity="0" />
    <path d="M3 10v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71V6.41c0-.89-1.08-1.34-1.71-.71L7 9H4c-.55 0-1 .45-1 1zm13.5 2c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
  </svg>
);

const StepCard = ({ number, title, description }: { number: number; title: string; description: string }) => (
  <div className="flex flex-col items-center text-center px-4 h-full justify-between">
    <div className="flex items-center gap-4 mb-4">
      <h3 className="font-normal text-3xl text-gray-500">{number}</h3>
      <div className="w-14 h-14 bg-primary-300 rounded-full flex items-center justify-center text-white">
        <StepIcon />
      </div>
    </div>
    <h4 className="font-semibold text-lg text-gray-600 mb-2 truncate px-2">{title}</h4>
    <p className="text-xs text-gray-500 max-w-[250px] leading-relaxed mx-auto">{description}</p>
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

  useEffect(() => {
    setUser(authService.getUser());
  }, []);

  const requiresVerification = user && !user.isEmailVerified;
  const [files, setFiles] = useState<FileItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetFiles = e.target.files;
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
    <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-8 md:pt-12 pb-12 bg-white min-h-screen">
      <h1 className="text-[28px] md:text-[32px] font-medium text-primary-100 mb-8 md:mb-12">New Quote</h1>
      
      <div className="border border-gray-400 rounded-sm p-8 pb-12 mb-12 bg-white">
        <div className="mb-8">
          <h2 className="text-[22px] font-bold text-gray-800 mb-3">Tell us about your project</h2>
          <p className="text-xs text-gray-600 leading-relaxed max-w-4xl">
            We'd love to hear more about your specific needs. Please fill out the form below with as much detail as possible so we can provide an accurate and tailored quote for your project. Our team reviews every request carefully to ensure we understand your vision before getting back to you.
          </p>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-stretch">
          <div className="w-full md:w-1/3 border-r-0 md:border-r border-gray-300 last:border-r-0 py-4">
            <StepCard number={1} title="Submit project details" description="Submit any relevant materials about your project through the form below. The more details we get the more accurate quotations will be." />
          </div>
          <div className="w-full md:w-1/3 border-r-0 md:border-r border-gray-300 last:border-r-0 py-4">
            <StepCard number={2} title="Our team will review" description="After submitting project details, our team will internally review them. We may contact you with questions." />
          </div>
          <div className="w-full md:w-1/3 py-4">
            <StepCard number={3} title="Receive your quote" description="You'll usually receive the quote within 1-3 business days. More complex projects may require more time, in which case you'll be notified." />
          </div>
        </div>
      </div>

      <div className="mb-12 max-w-5xl">
        <div className="flex flex-col md:flex-row gap-12 mb-8 items-start">
          <div className="flex-1 max-w-[400px]">
            <label className="text-sm font-bold text-gray-600 mb-2 block">Project title <span className="text-red-500">*</span></label>
            <input
              type="text"
              className={`w-full border ${projectTitleError ? "border-red-500" : "border-gray-400"} rounded-[4px] px-3 py-2 text-sm focus:outline-none focus:ring-1 ${projectTitleError ? "focus:ring-red-500" : "focus:ring-gray-400"} h-[42px]`}
              value={projectTitle}
              onChange={(e) => { setProjectTitle(e.target.value); if (projectTitleError) setProjectTitleError(""); }}
            />
            {projectTitleError && <p className="text-red-500 text-xs mt-1">{projectTitleError}</p>}
          </div>

          <div className="flex-1 w-full">
            <div className="flex items-baseline gap-4 mb-2">
              <label className="text-sm font-bold text-gray-600 whitespace-nowrap">Attach files</label>
              <span className="text-gray-400 text-[11px]">Drag & drop any images or documents that might be helpful in explaining your project here.</span>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,application/pdf" multiple />
            
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-primary-300 hover:bg-primary-500 text-white text-xs font-medium px-6 py-2.5 rounded-[4px] transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              Attach
            </button>

            {files.length > 0 && (
              <div className="mt-4 grid grid-cols-1 gap-3">
                {files.map((fileItem) => {
                  const isImage = fileItem.type.startsWith("image/");
                  return (
                    <div key={fileItem.id} className={`flex items-center p-3 bg-white rounded-lg border shadow-sm transition-colors group ${fileItem.status === "error" ? "border-red-300 bg-red-50" : "border-gray-200 hover:border-primary-300"}`}>
                      <div className="h-10 w-10 flex-shrink-0 rounded-md bg-gray-100 flex items-center justify-center overflow-hidden mr-3 border border-gray-100 relative">
                        {isImage && fileItem.url ? (
                          <img src={fileItem.url} alt={fileItem.name} className={`h-full w-full object-cover ${fileItem.status === "uploading" ? "opacity-50" : ""}`} />
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        )}
                        {fileItem.status === "uploading" && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="text-sm font-medium text-gray-700 truncate" title={fileItem.name}>{fileItem.name}</p>
                        <p className="text-xs text-gray-500">
                          {fileItem.status === "uploading" ? (
                            <span className="inline-flex items-center">
                              Uploading
                              <span className="inline-flex items-center ml-1 gap-0.5" style={{ transform: "translateY(-1px)" }}>
                                <span className="w-1 h-1 bg-current rounded-full animate-bounce"></span>
                                <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
                                <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></span>
                              </span>
                            </span>
                          ) : fileItem.status === "error" ? "Upload Failed" : "Ready"}
                        </p>
                      </div>
                      <button onClick={() => setFiles((prev) => prev.filter((f) => f.id !== fileItem.id))} className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100" title="Remove file">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mb-8 w-full">
          <label className="text-sm font-bold text-gray-600 mb-2 block">Project description <span className="text-red-500">*</span></label>
          <textarea
            className={`w-full border ${projectDescriptionError ? "border-red-500" : "border-gray-400"} rounded-[4px] px-3 py-2 text-sm focus:outline-none focus:ring-1 ${projectDescriptionError ? "focus:ring-red-500" : "focus:ring-gray-400"} h-32 resize-none`}
            value={projectDescription}
            onChange={(e) => { setProjectDescription(e.target.value); if (projectDescriptionError) setProjectDescriptionError(""); }}
          />
          {projectDescriptionError && <p className="text-red-500 text-xs mt-1">{projectDescriptionError}</p>}
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || files.some((f) => f.status === "uploading") || requiresVerification}
            className={`bg-primary-300 hover:bg-primary-500 text-white font-medium py-2.5 px-6 rounded-[4px] text-sm w-[300px] flex justify-center items-center ${isSubmitting || files.some((f) => f.status === "uploading") || requiresVerification ? "opacity-75 cursor-not-allowed" : "shadow-md hover:shadow-lg transition-all active:scale-[0.98]"}`}
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
            ) : requiresVerification ? "Verification Required" : "Request a quote for this project"}
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center mt-12 pt-8">
        <h3 className="text-gray-500 font-bold mb-6 text-[18px]">Find all of your custom quotes on the My Quotes page</h3>
        <button onClick={() => router.push("/dashboard/my-quotes")} className="px-12 py-2.5 bg-primary-300 hover:bg-primary-500 rounded-[4px] text-sm text-white font-bold transition-all shadow-sm active:scale-95">
          My Quotes
        </button>
      </div>
    </main>
  );
}
