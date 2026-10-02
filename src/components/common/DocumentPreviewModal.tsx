"use client";

import React, { useEffect, useState } from "react";
import { downloadFile, isImageUrl } from "@/lib/utils";

export interface PreviewableFile {
  url: string;
  name?: string;
  title?: string;
  size?: number;
  mimeType?: string;
}

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: PreviewableFile | null;
}

function ensureHttps(url: string) {
  if (!url) return "";
  if (url.includes("localhost") || url.includes("127.0.0.1")) return url;
  return url.startsWith("http://") ? "https://" + url.slice(7) : url;
}

function getFileType(url: string = "", name: string = "", mimeType: string = "") {
  const cleanUrl = url.split("?")[0].toLowerCase();
  const cleanName = name.split("?")[0].toLowerCase();
  const cleanMime = mimeType.toLowerCase();

  if (
    cleanUrl.endsWith(".pdf") ||
    cleanName.endsWith(".pdf") ||
    cleanMime.includes("pdf")
  ) {
    return "pdf";
  }

  if (
    isImageUrl(url) ||
    cleanName.match(/\.(jpeg|jpg|gif|png|svg|webp|avif|ico)$/i) ||
    cleanMime.startsWith("image/")
  ) {
    return "image";
  }

  if (
    cleanUrl.match(/\.(mp4|webm|mov|avi)$/i) ||
    cleanName.match(/\.(mp4|webm|mov|avi)$/i) ||
    cleanMime.startsWith("video/")
  ) {
    return "video";
  }

  if (
    cleanUrl.match(/\.(mp3|wav|ogg)$/i) ||
    cleanName.match(/\.(mp3|wav|ogg)$/i) ||
    cleanMime.startsWith("audio/")
  ) {
    return "audio";
  }

  return "document";
}

export default function DocumentPreviewModal({
  isOpen,
  onClose,
  file,
}: DocumentPreviewModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    setIframeLoaded(false);
    setIsDownloading(false);
  }, [file?.url]);

  if (!isOpen || !file || !file.url) return null;

  const safeUrl = ensureHttps(file.url);
  const fileName = file.name || file.title || decodeURIComponent(safeUrl.split("/").pop()?.split("?")[0] || "Document");
  const fileType = getFileType(safeUrl, fileName, file.mimeType);

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDownloading(true);
    try {
      await downloadFile(e, safeUrl, fileName);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${fileName}`}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl h-[92vh] max-h-[900px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-gray-200 bg-gray-50/90 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
            <span className="text-xl shrink-0" aria-hidden="true">
              {fileType === "pdf" ? "📄" : fileType === "image" ? "🖼️" : fileType === "video" ? "🎬" : "📎"}
            </span>
            <div className="min-w-0">
              <h3
                className="text-sm sm:text-base font-bold text-gray-800 truncate"
                title={fileName}
              >
                {fileName}
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-gray-400 font-medium">
                <span className="uppercase tracking-wider font-semibold text-[#4343F0]">
                  {fileType.toUpperCase()}
                </span>
                <span>• Preview</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg shadow-2xs transition-colors"
              title="Open in new window"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span className="hidden sm:inline">Open in Tab</span>
            </a>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#4343F0] hover:bg-[#3232b7] rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-60"
              title="Download file"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>{isDownloading ? "Downloading..." : "Download"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg text-lg leading-none transition-colors cursor-pointer ml-1"
              title="Close (Esc)"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Preview Content Area */}
        <div className="flex-1 bg-gray-100 relative overflow-hidden flex items-center justify-center p-2 sm:p-4">
          {fileType === "pdf" ? (
            <div className="w-full h-full relative bg-white rounded-lg shadow-inner overflow-hidden flex flex-col">
              {!iframeLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
                  <div className="w-8 h-8 border-3 border-[#4343F0] border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-xs font-semibold text-gray-500">Loading PDF document preview...</p>
                </div>
              )}
              <iframe
                src={`${safeUrl}#toolbar=1&navpanes=0`}
                className="w-full h-full border-0"
                title={fileName}
                onLoad={() => setIframeLoaded(true)}
              />
            </div>
          ) : fileType === "image" ? (
            <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
              <img
                src={safeUrl}
                alt={fileName}
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-md bg-white"
              />
            </div>
          ) : fileType === "video" ? (
            <div className="w-full h-full flex items-center justify-center bg-black rounded-lg overflow-hidden">
              <video
                src={safeUrl}
                controls
                autoPlay
                className="max-w-full max-h-[80vh] rounded-lg"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          ) : fileType === "audio" ? (
            <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-lg text-center">
              <div className="text-4xl mb-3">🎵</div>
              <h4 className="font-bold text-gray-800 text-sm mb-4 truncate">{fileName}</h4>
              <audio src={safeUrl} controls className="w-full">
                Your browser does not support the audio tag.
              </audio>
            </div>
          ) : (
            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg text-center border border-gray-200">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4 text-3xl">
                📄
              </div>
              <h4 className="font-bold text-gray-900 text-base mb-1 truncate" title={fileName}>
                {fileName}
              </h4>
              <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                Direct in-browser preview is not supported for this file format. You can download the file or open it in a new tab.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="px-5 py-2.5 bg-[#4343F0] hover:bg-[#3232b7] text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  {isDownloading ? "Downloading..." : "Download File"}
                </button>
                <a
                  href={safeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Open in New Tab
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
