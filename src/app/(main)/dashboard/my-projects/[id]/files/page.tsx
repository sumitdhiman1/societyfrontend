"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { projectService } from "@/lib/projectService";
import { mediaService } from "@/lib/mediaService";
import { downloadFile, isImageUrl } from "@/lib/utils";

export default function ProjectFilesPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [files, setFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ id: string; name: string; status: string; progress?: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const res = await projectService.getProjectFiles(projectId);
      if (res?.data) {
        setFiles(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch files:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchFiles();
    }
  }, [projectId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setIsUploading(true);

      const newStatus = selectedFiles.map(f => ({
        id: Math.random().toString(36).slice(2, 11),
        name: f.name,
        status: "uploading"
      }));
      setUploadStatus(prev => [...prev, ...newStatus]);

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const statusItem = newStatus[i];

        try {
          const res = await mediaService.uploadImage({
            file,
            folder: `project-files/${projectId}`
          });

          const fileData = {
            name: file.name,
            url: res.data?.secure_url || res.data?.url || res.secure_url || "",
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toISOString()
          };

          await projectService.addProjectFile(projectId, fileData);
          setUploadStatus(prev => prev.map(s => s.id === statusItem.id ? { ...s, status: "done" } : s));
        } catch (error) {
          console.error("Upload failed for:", file.name, error);
          setUploadStatus(prev => prev.map(s => s.id === statusItem.id ? { ...s, status: "error" } : s));
        }
      }

      setIsUploading(false);
      fetchFiles();
      // Clear status after 3 seconds
      setTimeout(() => {
        setUploadStatus([]);
      }, 3000);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (confirm("Are you sure you want to delete this file?")) {
      try {
        await projectService.deleteProjectFile(projectId, fileId);
        fetchFiles();
      } catch (error) {
        console.error("Failed to delete file:", error);
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type?.startsWith("image/")) return "🖼️";
    if (type?.includes("pdf")) return "📄";
    if (type?.includes("zip") || type?.includes("rar")) return "📦";
    return "📁";
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
        <h2 className="text-lg font-bold text-gray-800">Project Files</h2>
        <div className="flex gap-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            multiple
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-[#5356ff] hover:bg-[#3232b7] text-white text-sm font-bold py-2 px-4 rounded transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Upload Files
          </button>
        </div>
      </div>

      {uploadStatus.length > 0 && (
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-100 space-y-2">
          {uploadStatus.map(s => (
            <div key={s.id} className="flex items-center justify-between text-xs font-medium">
              <span className="text-blue-700 truncate max-w-[200px]">{s.name}</span>
              <span className={`px-2 py-0.5 rounded-full ${s.status === "uploading" ? "bg-blue-100 text-blue-600 animate-pulse" :
                  s.status === "done" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                }`}>
                {s.status === "uploading" ? "Uploading..." : s.status === "done" ? "Completed" : "Failed"}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">File Name</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Size</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Date Uploaded</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5356ff]"></div>
                    <span className="text-gray-400 text-sm font-medium">Loading files...</span>
                  </div>
                </td>
              </tr>
            ) : files.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic text-sm font-medium">
                  No files uploaded yet.
                </td>
              </tr>
            ) : (
              files.map((file) => (
                <tr key={file._id || file.id || file.projectId} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {isImageUrl(file.url) || file.type?.startsWith("image/") ? (
                        <img
                          src={file.url?.startsWith("http:") ? file.url.replace("http:", "https:") : file.url}
                          alt={file.name}
                          className={`w-10 h-10 rounded-lg border border-gray-200 shrink-0 ${file.url?.toLowerCase().includes(".svg") ? "object-contain p-1" : "object-cover"}`}
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (target.src.startsWith("http:")) target.src = target.src.replace("http:", "https:");
                          }}
                        />
                      ) : (
                        <span className="text-xl shrink-0" aria-hidden="true">{getFileIcon(file.type)}</span>
                      )}
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-bold text-gray-700 truncate max-w-[200px] sm:max-w-md" title={file.name}>
                          {file.name}
                        </span>
                        <span className="text-[10px] text-gray-400 uppercase font-bold">{file.type?.split("/")[1] || "file"}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                    {formatSize(file.size)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                    {new Date(file.uploadedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <a
                        href={file.url}
                        onClick={(e) => downloadFile(e, file.url, file.name)}
                        className="p-2 text-gray-400 hover:text-[#5356ff] hover:bg-blue-50 rounded-lg transition-all"
                        title="Download"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                      <button
                        onClick={() => handleDeleteFile(file._id || file.id || file.projectId)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
