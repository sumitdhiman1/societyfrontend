"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useAnalysis } from "@/context/AnalysisContext";
import { projectService } from "@/lib/projectService";
import { mediaService } from "@/lib/mediaService";
import { authService } from "@/lib/authService";
import { downloadFile, isImageUrl } from "@/lib/utils";
import AuthPromptModal from "@/components/common/AuthPromptModal";

function ensureHttps(url: string) {
  if (!url) return "";
  if (url.includes("localhost") || url.includes("127.0.0.1")) return url;
  return url.startsWith("http://") ? "https://" + url.slice(7) : url;
}

function isImage(mimeType?: string, url?: string, filename?: string) {
  if (mimeType && mimeType.startsWith("image/")) return true;
  if (url && isImageUrl(url)) return true;
  const str = (filename || "").split("?")[0].toLowerCase();
  return !!str.match(/\.(jpeg|jpg|gif|png|svg|webp|avif)$/i);
}

function getCategory(mimeType?: string, filename?: string) {
  const mime = (mimeType || "").toLowerCase();
  const name = (filename || "").toLowerCase();
  if (mime.startsWith("image/") || name.match(/\.(jpeg|jpg|gif|png|svg|webp|avif)$/i)) return "image";
  if (mime.startsWith("video/") || name.match(/\.(mp4|webm|mov|avi)$/i)) return "video";
  if (
    mime === "application/pdf" ||
    mime.includes("word") ||
    mime.includes("spreadsheet") ||
    mime.includes("presentation") ||
    mime.includes("text") ||
    name.match(/\.(pdf|doc|docx|txt|xls|xlsx|ppt|pptx|csv)$/i)
  ) {
    return "document";
  }
  return "other";
}

const filterCategories = [
  { label: "All Files", value: "all" },
  { label: "Documents", value: "document" },
  { label: "Images", value: "image" },
  { label: "Video", value: "video" },
  { label: "Other", value: "other" },
];

function FileIcon({ mimeType, url, filename }: { mimeType: string; url: string; filename?: string }) {
  const [imgError, setImgError] = useState(false);
  const isImg = isImage(mimeType, url, filename);

  if (isImg && !imgError && url) {
    return (
      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
        <img
          src={ensureHttps(url)}
          alt={filename || ""}
          className={`w-full h-full ${url?.toLowerCase().includes(".svg") ? "object-contain p-1" : "object-cover"}`}
          onError={() => setImgError(true)}
        />
      </div>
    );
  }
  const cleanStr = (url || filename || mimeType || "").toLowerCase();
  if (mimeType === "application/pdf" || cleanStr.includes("word") || cleanStr.includes("document") || cleanStr.endsWith(".pdf")) {
    return <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0 text-xl">📄</div>;
  }
  if (mimeType?.startsWith("video/") || cleanStr.match(/\.(mp4|webm|mov|avi)$/i)) {
    return <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0 text-xl">🎬</div>;
  }
  return <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 text-xl">📎</div>;
}

function SourceBadge({ source }: { source: string }) {
  if (source === "delivery") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#4343F0] text-white uppercase tracking-wider">
        Delivery
      </span>
    );
  }
  if (source === "chat") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
        Chat
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-600 border border-green-100">
      Uploaded
    </span>
  );
}

function ImageModal({ file, onClose }: { file: any; onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!file) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-100">
          <span className="font-medium text-xs sm:text-sm text-[#363636] truncate max-w-[200px] sm:max-w-[400px]">
            {file.name}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none ml-4 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
        <div className="p-4 flex items-center justify-center max-h-[80vh] overflow-auto">
          <img
            src={ensureHttps(file.url)}
            alt={file.name}
            className="max-w-full max-h-[70vh] object-contain rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}

export default function AnalysisFilesPage() {
  const { analysis, refreshAnalysis } = useAnalysis();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [previewFile, setPreviewFile] = useState<any>(null);

  const analysisId = analysis?._id ? analysis._id.toString() : (analysis?.id ? analysis.id.toString() : "");

  const loadFiles = useCallback(async () => {
    if (analysisId) {
      setIsLoading(true);
      try {
        const res = await projectService.getProjectFiles(analysisId);
        const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.files) ? res.data.files : []);
        setUploadedFiles(data || []);
      } catch (e) {
        // Fallback to analysis.files if direct endpoint fails or user is guest
        setUploadedFiles(Array.isArray(analysis?.files) ? analysis.files : []);
      } finally {
        setIsLoading(false);
      }
    }
  }, [analysisId, analysis?.files]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const processedUrls = new Set<string>();
  const derivedFiles: any[] = [];

  // 1. Final Delivery / Results PDF
  if (analysis?.resultsPdfUrl) {
    const url = ensureHttps(analysis.resultsPdfUrl);
    if (!processedUrls.has(url)) {
      processedUrls.add(url);
      derivedFiles.push({
        _id: `delivery-${url}`,
        url,
        name: "Final_Analysis_Report.pdf",
        size: 0,
        mimeType: "application/pdf",
        category: "document",
        uploadedAt: analysis.updatedAt || analysis.createdAt || "",
        source: "delivery",
        canDelete: false,
      });
    }
  }

  // 2. Message Attachments & Chat Files
  if (analysis?.messages && Array.isArray(analysis.messages)) {
    analysis.messages.forEach((msg: any) => {
      const rawAttached =
        msg.attachments ||
        msg.content?.attachedFiles ||
        msg.attachedFiles ||
        msg.content?.attachedFilesUrl ||
        msg.attachedFilesUrl ||
        [];

      (Array.isArray(rawAttached) ? rawAttached : []).forEach((file: any) => {
        const fileUrl = typeof file === "string" ? file : file?.url;
        if (!fileUrl) return;
        const url = ensureHttps(fileUrl);
        if (processedUrls.has(url)) return;
        processedUrls.add(url);

        const rawName = typeof file === "string" ? "" : file.filename || file.name;
        const filename = rawName
          ? decodeURIComponent(rawName)
          : decodeURIComponent(url.split("/").pop()?.split("?")[0] || "attachment");
        const cleanUrl = url.split("?")[0].toLowerCase();
        const isImg = file.type === "image" || cleanUrl.match(/\.(jpeg|jpg|gif|png|svg|webp|avif)$/i);
        const isDoc = file.type === "document" || cleanUrl.endsWith(".pdf") || cleanUrl.match(/\.(pdf|doc|docx|txt|xls|xlsx|csv)$/i);
        const isVid = file.type === "video" || cleanUrl.match(/\.(mp4|webm|mov|avi)$/i);

        const mimeType = isImg
          ? "image/png"
          : isDoc
          ? "application/pdf"
          : isVid
          ? "video/mp4"
          : file.type || "application/octet-stream";

        const isDelivery = !!msg.isFinalDelivery || msg.type === "final_delivery" || msg.type === "delivery";

        derivedFiles.push({
          _id: `msg-${url}`,
          url,
          name: filename,
          size: file.size || 0,
          mimeType,
          category: getCategory(mimeType, filename),
          uploadedAt: msg.createdAt || msg.sentAt || msg.timestamp || "",
          source: isDelivery ? "delivery" : "chat",
          canDelete: false,
        });
      });
    });
  }

  // 3. Initial Attached Files from Analysis Request (if any)
  const initialFiles =
    (Array.isArray(analysis?.attachedFilesUrl) && analysis.attachedFilesUrl) ||
    (Array.isArray(analysis?.attachedFiles) && analysis.attachedFiles) ||
    [];

  initialFiles.forEach((file: any, idx: number) => {
    const fileUrl = typeof file === "string" ? file : file?.url;
    if (!fileUrl) return;
    const url = ensureHttps(fileUrl);
    if (processedUrls.has(url)) return;
    processedUrls.add(url);

    const rawName = typeof file === "string" ? "" : file.filename || file.name;
    const filename = rawName
      ? decodeURIComponent(rawName)
      : decodeURIComponent(url.split("/").pop()?.split("?")[0] || `Request-Attachment-${idx + 1}`);

    derivedFiles.push({
      _id: `initial-${url}`,
      url,
      name: filename,
      size: file.size || 0,
      mimeType: file.type || (isImageUrl(url) ? "image/png" : "application/octet-stream"),
      category: getCategory(file.type, filename),
      uploadedAt: analysis.createdAt || "",
      source: "uploaded",
      canDelete: false,
    });
  });

  // 4. Directly Uploaded Project Files
  const userUploadedList = (uploadedFiles || []).map((f: any) => {
    const url = ensureHttps(f.url);
    if (url) processedUrls.add(url);
    return {
      _id: f._id || f.id || `uploaded-${url}`,
      url,
      name: f.name || decodeURIComponent(url.split("/").pop()?.split("?")[0] || "File"),
      size: f.size || 0,
      mimeType: f.type || f.mimeType || (isImageUrl(url) ? "image/png" : "application/octet-stream"),
      category: f.category || getCategory(f.type || f.mimeType, f.name),
      uploadedAt: f.uploadedAt || f.createdAt || "",
      source: "uploaded",
      canDelete: true,
    };
  });

  const allFiles = [...userUploadedList, ...derivedFiles.filter((f) => !userUploadedList.some((u) => u.url === f.url))];

  const filteredFiles = activeCategory === "all" ? allFiles : allFiles.filter((f) => f.category === activeCategory);

  const formatSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return "—";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(1))} ${["B", "KB", "MB", "GB"][i]}`;
  };

  const formatFileDate = (dateStr: string | Date) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleTriggerUpload = () => {
    const user = authService.getUser();
    if (!user && !authService.isAuthenticated()) {
      setShowAuthModal(true);
      return;
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleUploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (!analysisId || fileArray.length === 0) return;

    const user = authService.getUser();
    if (!user && !authService.isAuthenticated()) {
      setShowAuthModal(true);
      return;
    }

    if (user && user.isEmailVerified === false) {
      toast.error("To protect your data, file uploads are restricted for unverified accounts. Please verify your email.");
      return;
    }

    setIsUploading(true);
    let successCount = 0;

    for (const file of fileArray) {
      try {
        const res: any = await mediaService.uploadImage({
          file,
          folder: `project-files/${analysisId}`,
        });
        const url = res?.data?.secure_url || res?.data?.url || res?.secure_url || res?.url;
        if (!url) throw new Error(res?.message || "No URL returned from upload");

        const newUploadedRecord = {
          _id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          url,
          name: file.name,
          size: file.size,
          mimeType: file.type || "application/octet-stream",
          type: file.type || "application/octet-stream",
          category: getCategory(file.type, file.name),
          uploadedAt: new Date().toISOString(),
        };

        await projectService.addProjectFile(analysisId, {
          url,
          name: file.name,
          size: file.size,
          mimeType: file.type || "application/octet-stream",
          type: file.type || "application/octet-stream",
          category: getCategory(file.type, file.name),
        });
        
        setUploadedFiles((prev) => [newUploadedRecord, ...prev]);
        successCount++;
      } catch (e: any) {
        console.error("Upload failed for", file.name, e);
        toast.error(`Upload failed for ${file.name}: ${e?.message || "Error"}`);
      }
    }

    await loadFiles();
    refreshAnalysis();
    setIsUploading(false);
    if (successCount > 0) {
      toast.success(`${successCount} file(s) added successfully.`);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteFile = async (fileId: string) => {
    if (analysisId) {
      setDeletingId(fileId);
      try {
        await projectService.deleteProjectFile(analysisId, fileId);
        setUploadedFiles((prev) => prev.filter((f) => (f._id || f.id) !== fileId));
        refreshAnalysis();
        toast.success("File deleted successfully");
      } catch (e) {
        toast.error("Could not delete the file. Please try again.");
      } finally {
        setDeletingId(null);
      }
    }
  };

  if (!analysis) return null;

  return (
    <div className="flex flex-col gap-10 font-sans">
      <AuthPromptModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Join the Conversation"
        description="Please log in or register to message our team and upload files for this analysis."
      />
      <ImageModal file={previewFile} onClose={() => setPreviewFile(null)} />
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        onClick={(e) => {
          (e.target as HTMLInputElement).value = "";
        }}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleUploadFiles(e.target.files);
          }
        }}
      />

      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6">
        {/* Left Column: Filter & Sources */}
        <div className="space-y-4 lg:col-span-1">
          {/* Filter by Type */}
          <div className="border border-gray-200 rounded-xl p-4 sm:p-5 bg-white shadow-xs">
            <h3 className="text-xs sm:text-sm font-bold text-[#363636] uppercase tracking-wider mb-3">
              Filter by Type
            </h3>
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-hide">
              {filterCategories.map(({ label, value }) => {
                const count = value === "all" ? allFiles.length : allFiles.filter((f) => f.category === value).length;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setActiveCategory(value)}
                    className={`flex-shrink-0 lg:w-full rounded-lg px-3 py-2 text-sm flex justify-between items-center transition-all cursor-pointer ${
                      activeCategory === value
                        ? "bg-[#4343F0] text-white font-semibold shadow-sm"
                        : "text-[#6B7280] hover:bg-gray-100"
                    }`}
                  >
                    <span>{label}</span>
                    <span
                      className={`text-xs font-mono rounded-full px-2 py-0.5 ${
                        activeCategory === value ? "bg-white/20 text-white font-bold" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sources */}
          <div className="border border-gray-200 rounded-xl p-4 sm:p-5 bg-white shadow-xs">
            <h3 className="text-xs sm:text-sm font-bold text-[#363636] uppercase tracking-wider mb-3">
              Sources
            </h3>
            <div className="flex lg:flex-col gap-4 lg:gap-3 text-xs text-[#6B7280]">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-600 border border-green-100">
                  Uploaded
                </span>
                <span className="text-gray-600">You uploaded directly</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
                  Chat
                </span>
                <span className="text-gray-600">Shared in messages</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#4343F0] text-white uppercase tracking-wider">
                  Delivery
                </span>
                <span className="text-gray-600">Final analysis outputs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Upload Box & Files List */}
        <div className="lg:col-span-3 space-y-6">
          {/* Upload Files Box */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-5">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#363636]">Upload Files</h3>
                <p className="text-xs text-gray-400 mt-0.5">Any file type • Multiple files at once</p>
              </div>
              <button
                type="button"
                onClick={handleTriggerUpload}
                disabled={isUploading}
                className="w-full sm:w-auto bg-[#4343F0] hover:bg-[#3232b7] text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 shadow-sm cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>Upload Files</span>
                  </>
                )}
              </button>
            </div>

            {/* Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.length) handleUploadFiles(e.dataTransfer.files);
              }}
              onClick={handleTriggerUpload}
              className={`w-full border-2 border-dashed rounded-xl h-[130px] flex flex-col items-center justify-center text-sm cursor-pointer transition-all ${
                isDragging
                  ? "border-[#4343F0] bg-blue-50/50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/40 text-gray-400"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center mb-1.5 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-xs sm:text-sm text-center">
                <span className="font-medium text-[#363636]">Drop files here</span> or{" "}
                <span className="text-[#4343F0] underline font-medium">browse</span>
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">Images, PDFs, videos, documents and more</p>
            </div>
          </div>

          {/* Files List / Grid Box */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[#363636]">Files</h3>
                <span className="text-xs text-gray-400">({filteredFiles.length})</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                      viewMode === "list" ? "bg-[#4343F0] text-white" : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <span>=</span> List
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                      viewMode === "grid" ? "bg-[#4343F0] text-white" : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <span>::</span> Grid
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleTriggerUpload}
                  disabled={isUploading}
                  className="hidden sm:inline-flex items-center gap-1.5 bg-[#4343F0] hover:bg-[#3232b7] text-white text-xs font-semibold py-1.5 px-3.5 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-60"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {isUploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="py-16 text-center text-gray-400 text-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4343F0] mx-auto mb-2"></div>
                Loading files...
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3 text-gray-300">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium text-sm">No files found</p>
                <p className="text-xs text-gray-400 mt-1">Upload a file or share assets in messages</p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredFiles.map((file) => (
                  <div
                    key={file._id}
                    className="group relative rounded-xl overflow-hidden bg-gray-100 border border-gray-200 aspect-square cursor-pointer hover:border-[#4343F0] transition-all"
                    onClick={() => isImage(file.mimeType, file.url, file.name) && setPreviewFile(file)}
                  >
                    {isImage(file.mimeType, file.url, file.name) ? (
                      <img
                        src={ensureHttps(file.url)}
                        alt={file.name}
                        className={`w-full h-full ${
                          file.url?.toLowerCase().includes(".svg") ? "object-contain p-2" : "object-cover"
                        }`}
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (target.src.startsWith("http:")) target.src = target.src.replace("http:", "https:");
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-white">
                        <FileIcon mimeType={file.mimeType} url={file.url} filename={file.name} />
                        <p className="text-xs text-gray-700 font-medium mt-2 truncate w-full" title={file.name}>
                          {file.name}
                        </p>
                        <span className="text-[10px] text-gray-400 mt-0.5">{formatSize(file.size)}</span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadFile(e as any, file.url, file.name);
                        }}
                        className="bg-white p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors shadow-sm cursor-pointer"
                        title="Download file"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                      {file.canDelete && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(file._id);
                          }}
                          className="bg-red-500 hover:bg-red-600 p-2 rounded-lg text-white transition-colors shadow-sm cursor-pointer"
                          title="Delete file"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <div className="absolute top-2 right-2 z-10">
                      <SourceBadge source={file.source} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredFiles.map((file) => {
                  const dateFormatted = formatFileDate(file.uploadedAt);
                  return (
                    <div
                      key={file._id}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/70 transition-colors group"
                    >
                      <div
                        onClick={() => isImage(file.mimeType, file.url, file.name) && setPreviewFile(file)}
                        className={isImage(file.mimeType, file.url, file.name) ? "cursor-pointer" : ""}
                      >
                        <FileIcon mimeType={file.mimeType} url={file.url} filename={file.name} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#363636] truncate">{file.name}</span>
                          <SourceBadge source={file.source} />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 font-normal">
                          {dateFormatted ? `— ${dateFormatted}` : ""}
                          {file.size > 0 ? ` · ${formatSize(file.size)}` : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => downloadFile(e as any, file.url, file.name)}
                          className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-white hover:border-gray-300 transition-colors shadow-2xs cursor-pointer"
                        >
                          Download
                        </button>
                        {file.canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(file._id)}
                            disabled={deletingId === file._id}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete file"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
