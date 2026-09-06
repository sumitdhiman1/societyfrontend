"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useQuote } from "../layout";
import { quoteService } from "@/lib/quoteService";
import { mediaService } from "@/lib/mediaService";
import { authService } from "@/lib/authService";
import { downloadFile, isImageUrl, getSafeUrl } from "@/lib/utils";

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
          className="w-full h-full object-cover"
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
  if (source === "delivery") return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-400 text-amber-900 border border-amber-500 ml-2 uppercase tracking-tighter">Delivery</span>;
  if (source === "chat") return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100 ml-2">Chat</span>;
  return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-600 border border-green-100 ml-2">Uploaded</span>;
}

function ImageModal({ file, onClose }: { file: any; onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!file) return null;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-100">
          <span className="font-medium text-xs sm:text-sm text-[#363636] truncate max-w-[200px] sm:max-w-[400px]">{file.name}</span>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none ml-4 transition-colors">✕</button>
        </div>
        <div className="p-4 flex items-center justify-center max-h-[80vh] overflow-auto">
          <img src={ensureHttps(file.url)} alt={file.name} className="max-w-full max-h-[70vh] object-contain rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default function QuoteFilesPage() {
  const { quote } = useQuote();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [previewFile, setPreviewFile] = useState<any>(null);

  const loadFiles = useCallback(async () => {
    if (quote?._id) {
      setIsLoading(true);
      try {
        const res = await quoteService.getQuoteFiles(quote._id);
        setUploadedFiles(res?.data || []);
      } catch (e) {
        setUploadedFiles([]);
      } finally {
        setIsLoading(false);
      }
    }
  }, [quote?._id]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const chatFiles: any[] = [];
  const processedUrls = new Set<string>();

  (quote?.messages || quote?.conversations || []).forEach((msg: any) => {
    const rawAttached = msg.content?.attachedFiles || msg.attachments || msg.attachedFiles || msg.content?.attachedFilesUrl || msg.attachedFilesUrl || [];
    (Array.isArray(rawAttached) ? rawAttached : []).forEach((file: any) => {
      const fileUrl = typeof file === 'string' ? file : file?.url;
      if (!fileUrl) return;
      const url = ensureHttps(fileUrl);
      if (processedUrls.has(url)) return;
      processedUrls.add(url);

      const rawName = typeof file === 'string' ? '' : file.filename || file.name;
      const filename = rawName ? decodeURIComponent(rawName) : url.split("/").pop()?.split("?")[0] || "attachment";
      const cleanUrl = url.split("?")[0].toLowerCase();
      const isImg = file.type === "image" || cleanUrl.match(/\.(jpeg|jpg|gif|png|svg|webp|avif)$/i);
      const isDoc = file.type === "document" || cleanUrl.endsWith(".pdf") || cleanUrl.match(/\.(pdf|doc|docx|txt|xls|xlsx)$/i);
      const isVid = file.type === "video" || cleanUrl.match(/\.(mp4|webm|mov|avi)$/i);

      const mimeType = isImg ? "image/png" 
        : isDoc ? "application/pdf"
        : isVid ? "video/mp4" : "application/octet-stream";
      
      chatFiles.push({
        _id: `chat-${url}`,
        url,
        name: filename,
        size: file.size || 0,
        mimeType,
        category: getCategory(mimeType, filename),
        uploadedAt: msg.createdAt || msg.sentAt || msg.timestamp || "",
        source: msg.type === "quote_proposal" ? "delivery" : "chat",
        canDelete: false
      });
    });
  });

  const allFiles = [
    ...uploadedFiles.map(f => ({
      _id: f._id,
      url: ensureHttps(f.url),
      name: f.name,
      size: f.size,
      mimeType: f.mimeType,
      category: f.category || getCategory(f.mimeType, f.name),
      uploadedAt: f.uploadedAt,
      source: "uploaded",
      canDelete: true
    })),
    ...chatFiles
  ];

  const filteredFiles = activeCategory === "all" ? allFiles : allFiles.filter(f => f.category === activeCategory);

  const formatSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return "—";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(1))} ${["B", "KB", "MB", "GB"][i]}`;
  };

  const handleUploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (!quote?._id || fileArray.length === 0) return;

    const user = authService.getUser();
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
          folder: `quotes/${quote._id}/files` 
        });
        const url = res?.data?.secure_url || res?.data?.url || res?.secure_url || res?.url;
        if (!url) throw new Error(res?.message || "No URL returned from upload");
        
        await quoteService.addQuoteFile(quote._id, {
          url,
          name: file.name,
          size: file.size,
          mimeType: file.type || "application/octet-stream",
          category: getCategory(file.type, file.name)
        });
        successCount++;
      } catch (e: any) {
        console.error("Upload failed for", file.name, e);
        toast.error(`Upload failed for ${file.name}: ${e?.message || "Error"}`);
      }
    }

    await loadFiles();
    setIsUploading(false);
    if (successCount > 0) {
      toast.success(`${successCount} file(s) added successfully.`);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteFile = async (fileId: string) => {
    if (quote?._id) {
      setDeletingId(fileId);
      try {
        await quoteService.deleteQuoteFile(quote._id, fileId);
        setUploadedFiles(prev => prev.filter(f => f._id !== fileId));
        toast.success("File deleted successfully");
      } catch (e) {
        toast.error("Could not delete the file. Please try again.");
      } finally {
        setDeletingId(null);
      }
    }
  };

  if (!quote) return null;

  return (
    <div className="flex flex-col gap-10">
      <ImageModal file={previewFile} onClose={() => setPreviewFile(null)} />
      <input type="file" ref={fileInputRef} className="hidden" multiple onChange={e => { if (e.target.files?.length) handleUploadFiles(e.target.files); }} />
      
      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6">
        <div className="space-y-4 lg:col-span-1">
          <div className="border border-gray-200 rounded-xl p-4 sm:p-5 bg-white shadow-sm">
            <h3 className="text-xs sm:text-sm font-bold text-[#363636] uppercase tracking-wider mb-3">Filter by Type</h3>
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-hide">
              {filterCategories.map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setActiveCategory(value)}
                  className={`flex-shrink-0 lg:w-full rounded-lg px-3 py-2 text-sm flex justify-between items-center transition-all ${activeCategory === value ? "bg-[#3232b7] text-white font-semibold shadow-sm" : "text-[#6B7280] hover:bg-gray-100"}`}
                >
                  <span>{label}</span>
                  <span className={`text-xs font-mono rounded-full px-2 py-0.5 ${activeCategory === value ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                    {value === "all" ? allFiles.length : allFiles.filter(f => f.category === value).length}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="border border-gray-200 rounded-xl p-4 sm:p-5 bg-white shadow-sm">
            <h3 className="text-xs sm:text-sm font-bold text-[#363636] uppercase tracking-wider mb-3">Sources</h3>
            <div className="flex lg:flex-col gap-4 lg:gap-2.5 text-[10px] sm:text-xs text-[#6B7280]">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-600 border border-green-100">Uploaded</span>
                <span className="hidden sm:inline">User uploaded</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">Chat</span>
                <span className="hidden sm:inline">Shared in chat</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-400 text-amber-900 border border-amber-500 uppercase tracking-tighter">Delivery</span>
                <span className="hidden sm:inline">Proposal assets</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-5">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#363636]">Upload Files</h3>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Share assets related to this quote</p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full sm:w-auto bg-[#3232b7] hover:bg-[#2626a0] text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 shadow-sm"
              >
                {isUploading ? "Uploading..." : "Upload Files"}
              </button>
            </div>
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.length) handleUploadFiles(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full border-2 border-dashed rounded-xl h-[120px] flex flex-col items-center justify-center text-sm cursor-pointer transition-all ${isDragging ? "border-[#3232b7] bg-blue-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-400"}`}
            >
              <div className="text-2xl mb-2">☁️</div>
              <p className="text-xs sm:text-sm text-center">
                <span className="font-medium text-[#363636]">Drop files here</span> or <span className="text-[#3232b7] underline">browse</span>
              </p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[#363636]">All Files</h3>
                <span className="text-xs text-gray-400">({filteredFiles.length})</span>
              </div>
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                <button onClick={() => setViewMode("list")} className={`px-3 py-1.5 text-[10px] sm:text-xs font-medium transition-colors ${viewMode === "list" ? "bg-[#3232b7] text-white" : "text-gray-500 hover:bg-gray-50"}`}>☰ List</button>
                <button onClick={() => setViewMode("grid")} className={`px-3 py-1.5 text-[10px] sm:text-xs font-medium transition-colors ${viewMode === "grid" ? "bg-[#3232b7] text-white" : "text-gray-500 hover:bg-gray-50"}`}>⊞ Grid</button>
              </div>
            </div>

            {isLoading ? (
              <div className="py-16 text-center text-gray-400">Loading...</div>
            ) : filteredFiles.length === 0 ? (
              <div className="py-16 text-center">
                <div className="text-5xl mb-3">📂</div>
                <p className="text-gray-500 font-medium">No files found</p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredFiles.map(file => (
                  <div key={file._id} className="group relative rounded-xl overflow-hidden bg-gray-100 border border-gray-200 aspect-square cursor-pointer hover:border-[#3232b7] transition-all" onClick={() => isImage(file.mimeType, file.url, file.name) && setPreviewFile(file)}>
                    {isImage(file.mimeType, file.url, file.name) ? (
                      <img
                        src={getSafeUrl(file.url)}
                        alt={file.name}
                        className={`w-full h-full ${file.url?.toLowerCase().includes(".svg") ? "object-contain p-2" : "object-cover"}`}
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (target.src.startsWith("http:") && !target.src.includes("localhost") && !target.src.includes("127.0.0.1")) {
                            target.src = target.src.replace("http:", "https:");
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                        <FileIcon mimeType={file.mimeType} url={file.url} filename={file.name} />
                        <p className="text-[10px] text-gray-500 mt-2 truncate w-full">{file.name}</p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); downloadFile(e as any, file.url, file.name); }} className="bg-white p-2 rounded-lg text-gray-700">↓</button>
                      {file.canDelete && <button onClick={(e) => { e.stopPropagation(); handleDeleteFile(file._id); }} className="bg-red-500 p-2 rounded-lg text-white">✕</button>}
                    </div>
                    <div className="absolute top-2 right-2">
                      <SourceBadge source={file.source} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredFiles.map(file => (
                  <div key={file._id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group">
                    <div onClick={() => isImage(file.mimeType, file.url, file.name) && setPreviewFile(file)} className={isImage(file.mimeType, file.url, file.name) ? "cursor-pointer" : ""}>
                      <FileIcon mimeType={file.mimeType} url={file.url} filename={file.name} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#363636] truncate">{file.name}</span>
                        <SourceBadge source={file.source} />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {formatSize(file.size)} · {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => downloadFile(e as any, file.url, file.name)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-white transition-colors">Download</button>
                      {file.canDelete && (
                        <button onClick={() => handleDeleteFile(file._id)} disabled={deletingId === file._id} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                          {deletingId === file._id ? "…" : "✕"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
