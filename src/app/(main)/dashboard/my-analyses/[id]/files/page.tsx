"use client";

import React, { useMemo } from "react";
import { useAnalysis } from "@/context/AnalysisContext";
import { downloadFile, isImageUrl } from "@/lib/utils";

export default function AnalysisFilesPage() {
  const { analysis } = useAnalysis();

  if (!analysis) return null;

  // Extract final delivery files and regular files
  const { deliveryFiles, regularFiles } = useMemo(() => {
    const delivery: any[] = [];
    const regular: any[] = [];

    if (analysis.resultsPdfUrl) {
      delivery.push({
        url: analysis.resultsPdfUrl,
        name: "Final_Analysis_Report.pdf",
        date: analysis.updatedAt || analysis.createdAt,
        type: "pdf",
      });
    }

    if (analysis.messages && Array.isArray(analysis.messages)) {
      analysis.messages.forEach((msg: any) => {
        const atts = msg.attachments || [];
        atts.forEach((att: any) => {
          const url = typeof att === "string" ? att : att.url;
          const name = typeof att === "string" ? decodeURIComponent(url.split("/").pop() || "file") : att.name || "file";
          const fileObj = {
            url,
            name,
            date: msg.createdAt,
            sender: msg.sender || msg.username || "Team",
            isFinal: !!msg.isFinalDelivery,
          };

          if (msg.isFinalDelivery) {
            delivery.push(fileObj);
          } else {
            regular.push(fileObj);
          }
        });
      });
    }

    if (analysis.files && Array.isArray(analysis.files)) {
      analysis.files.forEach((f: any) => {
        regular.push({
          url: f.url,
          name: f.name || "Attachment",
          date: f.uploadedAt || analysis.createdAt,
          sender: "Client",
          isFinal: false,
        });
      });
    }

    return { deliveryFiles: delivery, regularFiles: regular };
  }, [analysis]);

  return (
    <div className="space-y-10 font-sans">
      {/* Final Delivery Files (Read-Only) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Final Delivery Files</h3>
            <p className="text-xs text-gray-500 mt-0.5">Completed reports and deliverables submitted by our analysis team.</p>
          </div>
          <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
            Official Deliverables
          </span>
        </div>

        {deliveryFiles.length === 0 ? (
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center text-sm text-gray-500">
            No final delivery files have been posted yet. Your team will deliver the final analysis report once completed.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {deliveryFiles.map((file, idx) => {
              const safeUrl = file.url.startsWith("http:") ? file.url.replace("http:", "https:") : file.url;
              const isImg = isImageUrl(file.url);
              const isSvg = file.url.toLowerCase().includes(".svg");
              const isPdf = file.name.toLowerCase().includes(".pdf");
              return (
                <div
                  key={idx}
                  className="bg-white border-2 border-green-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center shrink-0 overflow-hidden">
                      {isImg ? (
                        <img
                          src={safeUrl}
                          alt={file.name}
                          className={isSvg ? "w-full h-full object-contain p-1" : "w-full h-full object-cover"}
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (target.src.startsWith("http:")) target.src = target.src.replace("http:", "https:");
                          }}
                        />
                      ) : isPdf ? (
                        <span className="text-xs font-black text-red-600">PDF</span>
                      ) : (
                        <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="text-sm font-bold text-gray-800 truncate" title={file.name}>
                        {file.name}
                      </h4>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Delivered on {new Date(file.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <a
                    href={safeUrl}
                    onClick={(e) => downloadFile(e, safeUrl, file.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 w-full py-2 bg-[#163659] hover:bg-[#112b4a] text-white text-xs font-bold text-center rounded-lg transition-colors inline-block"
                  >
                    Download File
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Message Attachments & Client Uploads */}
      <div>
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-800">Message Attachments & Shared Files</h3>
          <p className="text-xs text-gray-500 mt-0.5">Files and media shared throughout regular messaging.</p>
        </div>

        {regularFiles.length === 0 ? (
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center text-sm text-gray-500">
            No regular files or message attachments uploaded yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {regularFiles.map((file, idx) => {
              const safeUrl = file.url.startsWith("http:") ? file.url.replace("http:", "https:") : file.url;
              const isImg = isImageUrl(file.url);
              const isSvg = file.url.toLowerCase().includes(".svg");
              const isPdf = file.name.toLowerCase().includes(".pdf");
              return (
                <div
                  key={idx}
                  className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 overflow-hidden">
                      {isImg ? (
                        <img
                          src={safeUrl}
                          alt={file.name}
                          className={isSvg ? "w-full h-full object-contain p-1" : "w-full h-full object-cover"}
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (target.src.startsWith("http:")) target.src = target.src.replace("http:", "https:");
                          }}
                        />
                      ) : isPdf ? (
                        <span className="text-xs font-black text-red-600">PDF</span>
                      ) : (
                        <svg className="w-5 h-5 text-[#5356ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <h5 className="text-xs font-bold text-gray-800 truncate" title={file.name}>
                        {file.name}
                      </h5>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        From {file.sender} • {new Date(file.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <a
                    href={file.url}
                    onClick={(e) => downloadFile(e, file.url, file.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 w-full py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold text-center rounded transition-colors inline-block"
                  >
                    Download
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
