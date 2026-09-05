"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAnalysis } from "@/context/AnalysisContext";
import { projectService } from "@/lib/projectService";
import { mediaService } from "@/lib/mediaService";
import { authService } from "@/lib/authService";
import { packagesService } from "@/lib/packagesService";
import { downloadFile, isImageUrl } from "@/lib/utils";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";
import AuthPromptModal from "@/components/common/AuthPromptModal";
import { io, Socket } from "socket.io-client";

export default function AnalysisDetailsPage() {
  const { analysis, refreshAnalysis } = useAnalysis();
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [availablePackages, setAvailablePackages] = useState<any[]>([]);
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    action: "accept" | "decline" | "request_modification" | null;
    proposalId: string | null;
    title: string;
    description: string;
    placeholder: string;
    required: boolean;
  }>({
    isOpen: false,
    action: null,
    proposalId: null,
    title: "",
    description: "",
    placeholder: "",
    required: false,
  });

  const [actionComment, setActionComment] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentUser(authService.getUser());

    const fetchAllPackages = async () => {
      try {
        const [pkgRes, bundleRes, catRes] = await Promise.all([
          packagesService.getAllPackages({ page: 1, limit: 100 }),
          packagesService.getAllPackages({ categorycode: "BUNDLES", page: 1, limit: 100 }),
          packagesService.listCategories({ page: 1, limit: 100 }).catch(() => null),
        ]);
        const pkgs = Array.isArray(pkgRes?.data)
          ? pkgRes.data
          : (pkgRes?.data?.packages || pkgRes?.packages || []);
        const bundles = Array.isArray(bundleRes?.data)
          ? bundleRes.data
          : (bundleRes?.data?.packages || bundleRes?.packages || []);
        setAvailablePackages([...pkgs, ...bundles]);

        const cats = Array.isArray(catRes?.data)
          ? catRes.data
          : (catRes?.data?.categories || catRes?.categories || []);
        setAvailableCategories(cats);
      } catch (err) {
        console.error("Error fetching packages for analyses details:", err);
      }
    };
    fetchAllPackages();
  }, []);

  // Real-time socket for project/analysis messages
  useEffect(() => {
    let activeSocket: Socket | null = null;
    let isCancelled = false;

    const aId = analysis?._id ? analysis._id.toString() : (analysis?.id ? analysis.id.toString() : "");
    if (!aId) return;

    const connectSocket = async () => {
      let token = authService.getAccessToken();
      if (!token) {
        token = await authService.refreshToken();
      }

      if (isCancelled) return;

      const user = authService.getUser();
      const uId = user?.id || user?._id;

      const socketUrl =
        process.env.NEXT_PUBLIC_SOCKET_URL ||
        process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
        "http://localhost:5001";

      const authPayload: Record<string, any> = {};
      const queryPayload: Record<string, any> = {};

      if (token) {
        authPayload.token = token;
        queryPayload.token = token;
      }
      if (uId) {
        authPayload.userId = uId;
        queryPayload.userId = uId;
      }

      const sock: Socket = io(socketUrl, {
        path: "/socket.io",
        transports: ["websocket", "polling"],
        auth: authPayload,
        query: queryPayload,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
      });

      if (isCancelled) {
        sock.disconnect();
        return;
      }

      activeSocket = sock;

      sock.on("connect", () => {
        sock.emit("joinProject", aId);
        sock.emit("joinProject", { projectId: aId });
      });

      const handleMessageUpdate = (data: any) => {
        const incomingId = data?.projectId || data?.project?._id || data?.project?.id;
        if (!incomingId || String(incomingId) === String(aId)) {
          refreshAnalysis();
        }
      };

      sock.on("projectMessage", handleMessageUpdate);
      sock.on("projectUpdated", handleMessageUpdate);
      sock.on("newMessage", handleMessageUpdate);
      sock.on("notification", (notif: any) => {
        const pId = notif?.data?.projectId || notif?.projectId;
        if (!pId || String(pId) === String(aId)) {
          refreshAnalysis();
        }
      });
    };

    connectSocket();

    return () => {
      isCancelled = true;
      if (activeSocket) {
        try {
          activeSocket.emit("leaveProject", aId);
          activeSocket.disconnect();
        } catch {}
      }
    };
  }, [analysis?._id, analysis?.id, refreshAnalysis]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#messages") {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [analysis?.messages]);

  if (!analysis) return null;

  const formatDateTime = (date: string | Date) => {
    if (!date) return "";
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map((file) => ({
        id: Math.random().toString(36).slice(2, 11),
        file,
        status: "uploading",
        name: file.name,
        type: file.type,
      }));

      setAttachments((prev) => [...prev, ...newFiles]);
      if (fileInputRef.current) fileInputRef.current.value = "";

      for (const att of newFiles) {
        try {
          const aId = analysis._id || analysis.id;
          const res = await mediaService.uploadImage({
            file: att.file,
            folder: `analysis-attachments/${aId}`,
          });

          const url = res.data?.secure_url || res.data?.url || res.secure_url || "";
          updateAttachment(att.id, { status: "done", url });
        } catch (error) {
          console.error("Upload failed for file:", att.name, error);
          updateAttachment(att.id, { status: "error" });
        }
      }
    }
  };

  const updateAttachment = (id: string, updates: any) => {
    setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    if (attachments.some((a) => a.status === "uploading")) return;

    const uploadedUrls = attachments.filter((a) => a.status === "done" && a.url).map((a) => a.url);

    if (messageText.trim() || uploadedUrls.length > 0) {
      setIsSending(true);
      try {
        const aId = analysis._id || analysis.id;
        const res = await projectService.addMessage(aId, messageText, false, uploadedUrls);
        if (res && (res.isSuccessful || res.success || res.statusCode === 200 || res.statusCode === 201 || res.data)) {
          setMessageText("");
          setAttachments([]);
          refreshAnalysis();
        } else {
          console.error("Failed to send message, response:", res);
        }
      } catch (error) {
        console.error("Failed to send message:", error);
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleAcceptProposal = async (proposalId: string) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    setIsActionLoading(true);
    try {
      const username = currentUser?.fullName || currentUser?.username || "User";
      const avatar = currentUser?.avatar;
      const aId = analysis._id || analysis.id;
      const res = await projectService.acceptProposal(aId, proposalId, username, avatar);
      if (res && (res.isSuccessful || res.success || res.statusCode === 200 || res.statusCode === 201 || res.data)) {
        refreshAnalysis();
      }
    } catch (error) {
      console.error("Failed to accept proposal:", error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleActionSubmit = async () => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    if (actionModal.proposalId && actionModal.action && (!actionModal.required || actionComment.trim())) {
      setIsActionLoading(true);
      try {
        let res;
        const username = currentUser?.fullName || currentUser?.username || "User";
        const avatar = currentUser?.avatar;
        const aId = analysis._id || analysis.id;

        if (actionModal.action === "decline") {
          res = await projectService.declineProposal(aId, actionModal.proposalId, actionComment || "", username, avatar);
        } else if (actionModal.action === "request_modification") {
          res = await projectService.requestProposalModification(aId, actionModal.proposalId, actionComment, username, avatar);
        }

        if (res && (res.isSuccessful || res.success || res.statusCode === 200 || res.statusCode === 201 || res.data)) {
          setActionModal({ ...actionModal, isOpen: false });
          setActionComment("");
          refreshAnalysis();
        }
      } catch (error) {
        console.error(`Failed to handle ${actionModal.action}:`, error);
      } finally {
        setIsActionLoading(false);
      }
    }
  };

  const isUploading = attachments.some((a) => a.status === "uploading");
  const analysisNumber = analysis.projectNumber || `#INV-${analysis._id?.slice(-8).toUpperCase() || "2026-157"}`;
  const statusDisplay = (analysis.status === "active" ? "IN PROGRESS" : analysis.status || "IN PROGRESS").toUpperCase();

  const submittedDateStr = formatDateTime(analysis.createdAt || analysis.startDate);
  const deliveryDueStr = analysis.deadline ? formatDateTime(analysis.deadline) : "";

  const managers = (Array.isArray(analysis.assignedManagers) && analysis.assignedManagers.length > 0)
    ? analysis.assignedManagers
    : (analysis.projectManager ? [analysis.projectManager] : []);
  const manager = managers[0];
  const managerName = manager?.fullName || "Not assigned yet";
  const managerAvatar = manager?.avatar;

  return (
    <div className="flex flex-col gap-8 w-full font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (col-span-2) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Analysis Details Card */}
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-4 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
              <span className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-wider">
                Submitted - {submittedDateStr || "Sep 4, 9:03 PM"}
              </span>
              <span className="w-fit px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold border uppercase tracking-wider bg-blue-100 text-blue-600 border border-blue-200">
                {statusDisplay}
              </span>
            </div>

            <div className="border-t border-gray-200 mb-6 sm:mb-8"></div>

            <div className="pb-4 sm:pb-6 flex flex-col sm:flex-row justify-between items-start gap-2">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-600">Analysis Details</h2>
              </div>
              <span className="text-[10px] sm:text-xs text-gray-400 font-medium whitespace-nowrap pt-2 sm:pt-0">
                Analysis {analysisNumber.startsWith("#") ? analysisNumber : `#${analysisNumber}`}
              </span>
            </div>

            <div className="border border-gray-400 rounded-lg overflow-x-auto mb-6">
              <table className="w-full min-w-[500px] sm:min-w-0">
                <thead>
                  <tr className="border-b border-gray-400">
                    <th className="px-3 sm:px-6 py-4 text-left text-xs sm:text-sm font-bold text-gray-600 bg-white w-1/2">
                      Item
                    </th>
                    <th className="px-3 sm:px-6 py-4 text-center text-xs sm:text-sm font-bold text-gray-600 bg-white">
                      Duration
                    </th>
                    <th className="px-3 sm:px-6 py-4 text-right text-xs sm:text-sm font-bold text-gray-600 bg-white">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-500 align-top">
                      <div className="font-medium text-gray-700 mb-1">
                        {analysis.title || "Free Website Analysis"}
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-400">
                        {analysis.description ||
                          "Our standard free analysis offer covering brand, UI/UX, functionalities, AI potentiality, tech stack, speed, and SEO."}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-600 font-medium text-center align-top whitespace-nowrap">
                      {analysis.totalDuration || "5 Days"}
                    </td>
                    <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-right align-top">
                      {analysis.isFree || !analysis.price ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-green-100 text-green-700 border border-green-200">
                          Free
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-green-100 text-green-700 border border-green-200">
                          ${Number(analysis.price).toFixed(2)}
                        </span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section Divider Banner */}
          <div className="relative py-6 flex items-center justify-center w-full my-2">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="px-4 text-xs sm:text-sm font-medium text-gray-500 text-center whitespace-normal sm:whitespace-nowrap">
              Analysis Initiated {deliveryDueStr ? `| Delivery due on ${deliveryDueStr}` : ""}
            </span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          {/* Messages & Delivery History if any */}
          {analysis.messages && analysis.messages.length > 0 && (
            <div className="flex flex-col gap-6 w-full mb-4">
              {analysis.messages.map((msg: any, idx: number) => {
                const msgId = msg.id || `msg-${idx}`;

                if (msg.type === "system_notification") {
                  const title = msg.content?.systemText || msg.message || "System Notification";
                  const text = msg.content?.text || "";
                  return (
                    <div key={msgId} className="text-center py-6 px-4 bg-white/70 rounded-xl border border-gray-200">
                      <h3 className="text-xl font-bold text-gray-700 mb-1">{title}</h3>
                      <p className="text-sm font-medium text-gray-500">{text}</p>
                    </div>
                  );
                }

                if (msg.type === "quote_proposal") {
                  const content = msg.content || {};
                  const items = content.deliverableItems || content.items || [];
                  const isAccepted = content.status === "accepted";
                  const isClient = msg.sender === "client" || msg.role === "client";
                  const clientName =
                    currentUser?.fullName ||
                    (currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName || ""}`.trim() : "") ||
                    currentUser?.username;
                  const senderName = msg.username || (isClient ? (clientName || "You") : (analysis.projectManager?.fullName || "Staff"));
                  const senderAvatar = msg.userAvatar || (isClient ? currentUser?.avatar : (analysis.projectManager?.avatar || undefined));
                  const senderInitial = (senderName || "A").charAt(0).toUpperCase();
                  const messageBody = msg.message || content.text || content.projectDescription || "";
                  const attachmentList = (msg.attachments && msg.attachments.length > 0) ? msg.attachments : (content?.attachedFiles || (msg as any).attachedFiles || []);

                  return (
                    <div key={msgId} className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden w-full">
                      <div className="p-4 sm:p-6 md:p-8">
                        {/* Header: Avatar, Name, Timestamp */}
                        <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
                          <div className="flex items-center gap-4">
                            {senderAvatar ? (
                              <img
                                src={senderAvatar}
                                alt={senderName}
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover shadow-sm"
                              />
                            ) : (
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-sm bg-gray-800">
                                {senderInitial}
                              </div>
                            )}
                            <div>
                              <h4 className="font-bold text-gray-800 text-base sm:text-lg">{senderName}</h4>
                              {content.status && content.status !== "pending" && (
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border mt-1 ${
                                    content.status === "accepted"
                                      ? "border-green-300 bg-green-50 text-green-700"
                                      : content.status === "declined"
                                      ? "border-red-300 bg-red-50 text-red-700"
                                      : "border-blue-300 bg-blue-50 text-blue-700"
                                  }`}
                                >
                                  {content.status}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] sm:text-sm text-gray-500 font-bold uppercase tracking-wide">
                            {formatDateTime(msg.createdAt)}
                          </span>
                        </div>

                        {/* Message text */}
                        {messageBody && (
                          <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap pl-0 md:pl-[64px] mb-6">
                            {messageBody}
                          </div>
                        )}

                        {/* Attachments if any (comes first before Recommended Solutions) */}
                        {attachmentList.length > 0 && (
                          <div className="pl-0 md:pl-[64px] mb-6">
                            <h5 className="text-sm font-bold text-gray-700 mb-3">Attached Files</h5>
                            <div className="border-t border-gray-200 mb-4" />
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full">
                              {attachmentList.map((att: any, aIdx: number) => {
                                const url = typeof att === "string" ? att : att.url;
                                const filename = (typeof att === "string" ? decodeURIComponent(url.split("/").pop() || "Attachment") : att.filename || att.name || "Attachment");
                                const safeUrl = url.startsWith("http:") ? url.replace("http:", "https:") : url;
                                const isImg = isImageUrl(url);
                                const isSvg = url.toLowerCase().includes(".svg");
                                const isPdf = url.toLowerCase().includes(".pdf");

                                return (
                                  <a
                                    key={aIdx}
                                    href={safeUrl}
                                    onClick={(e) => downloadFile(e, safeUrl, filename)}
                                    download={filename}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group block border border-gray-300 rounded-lg w-full h-44 bg-white hover:shadow-md transition-all text-center no-underline overflow-hidden flex flex-col"
                                  >
                                    <div className="flex-grow flex items-center justify-center bg-white relative overflow-hidden">
                                      {isImg ? (
                                        <img
                                          src={safeUrl}
                                          alt={filename}
                                          className={
                                            isSvg
                                              ? "w-full h-full object-contain p-2.5 group-hover:scale-105 transition-transform duration-300"
                                              : "w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                          }
                                          onError={(e) => {
                                            const target = e.currentTarget;
                                            if (target.src.startsWith("http:")) {
                                              target.src = target.src.replace("http:", "https:");
                                            }
                                          }}
                                        />
                                      ) : isPdf ? (
                                        <div className="flex flex-col items-center gap-1">
                                          <svg className="w-12 h-12 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M11.363 2c4.155 0 2.637 6 2.637 6s6-1.518 6 2.638c0 4.155-3.345 7.518-7.5 7.518s-7.5-3.363-7.5-7.518c0-4.155 3.345-7.518 7.5-7.518zm1.5 7h-3v1h3v-1zm0 2h-3v1h3v-1zm0 2h-3v1h3v-1z" />
                                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 4h7v5h5v11H6V4z" />
                                          </svg>
                                          <span className="text-[10px] font-bold text-red-600 uppercase">PDF</span>
                                        </div>
                                      ) : (
                                        <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                      )}
                                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-10">
                                        <div className="bg-white/95 p-2.5 rounded-full shadow-md flex items-center justify-center">
                                          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                          </svg>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="bg-gray-50 px-3 py-2 border-t border-gray-200 flex items-center justify-center h-10 min-h-[40px]">
                                      <span className="text-[10px] font-medium text-gray-600 truncate px-2" title={filename}>{filename}</span>
                                    </div>
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Recommended Solutions */}
                        {items.length > 0 && (
                          <div className="pl-0 md:pl-[64px] mb-6">
                            <h5 className="text-sm font-bold text-gray-700 mb-3">Recommended Solutions</h5>
                            <div className="border-t border-gray-200 mb-4"></div>
                            <div
                              className="flex flex-nowrap overflow-x-auto pb-4 gap-4 scrollbar-hide"
                              style={{ cursor: "grab" }}
                            >
                              {items.map((item: any, sIdx: number) => {
                                const match = availablePackages.find(
                                  (p: any) =>
                                    (p._id && (String(p._id) === String(item._id || item.id || item.packageId))) ||
                                    (p.name && (p.name.trim().toLowerCase() === (item.name || item.title || item.description || "").trim().toLowerCase())) ||
                                    (p.title && (p.title.trim().toLowerCase() === (item.name || item.title || item.description || "").trim().toLowerCase()))
                                );

                                const normName = (item.name || item.title || match?.name || match?.title || "").toLowerCase();

                                let rawImage =
                                  item.imageUrl ||
                                  item.thumbnailUrl ||
                                  item.mediumUrl ||
                                  item.coverImage ||
                                  item.image ||
                                  match?.imageUrl ||
                                  match?.thumbnailUrl ||
                                  match?.mediumUrl ||
                                  match?.coverImage ||
                                  match?.image;

                                if (!rawImage) {
                                  if (normName.includes("shopping") || normName.includes("e-commerce") || normName.includes("ecommerce")) {
                                    rawImage = "https://res.cloudinary.com/dgg6e3flf/image/upload/v1785191252/packages/shopping-ecommerce-ads-management-packages.webp";
                                  } else if (normName.includes("audit") || normName.includes("paid ads")) {
                                    rawImage = "https://res.cloudinary.com/dgg6e3flf/image/upload/v1785191377/packages/paid-ads-audit-strategy-setup-packages.webp";
                                  } else if (normName.includes("graphic") || normName.includes("brand")) {
                                    rawImage = "https://res.cloudinary.com/dzllquuof/image/upload/v1766925547/Website/Services/q9cdia9ugzrbwqcoshcx.png";
                                  } else if (normName.includes("development") || normName.includes("website dev")) {
                                    rawImage = "https://res.cloudinary.com/dzllquuof/image/upload/v1766925656/Website/Services/eka2bc78jzyqc29qgtql.png";
                                  } else if (normName.includes("maintenance")) {
                                    rawImage = "https://res.cloudinary.com/dzllquuof/image/upload/v1766925669/Website/Services/o8hx0iuppsqf1jirki0q.png";
                                  } else if (normName.includes("seo") || normName.includes("search engine")) {
                                    rawImage = "https://res.cloudinary.com/dzllquuof/image/upload/v1766925617/Website/Services/cfbweuiwymvpzjpcbz6p.png";
                                  } else if (normName.includes("social media") || normName.includes("smm")) {
                                    rawImage = "https://res.cloudinary.com/dzllquuof/image/upload/v1766925642/Website/Services/ldi5mje9jw6igxajabmx.png";
                                  }
                                }

                                const itemImage = rawImage
                                  ? (rawImage.startsWith("http:") ? rawImage.replace("http:", "https:") : rawImage)
                                  : "https://res.cloudinary.com/dgg6e3flf/image/upload/v1785191377/packages/paid-ads-audit-strategy-setup-packages.webp";

                                const isBundle = match?.isBundle || item.isBundle || match?.categorycode?.toUpperCase() === 'BUNDLES';
                                const pkgId = match?._id || match?.id || item._id || item.id || item.packageId || item.package || "6a67dbe0f4538bf364e54f88";
                                const pkgHref = `/dashboard/new-project/${isBundle ? 'bundles' : 'packages'}/${pkgId}`;

                                const categoryMap: Record<string, string> = {
                                  // Short auto-generated codes (from initials)
                                  "PAM": "Paid Ads Marketing",
                                  "GDB": "Graphic Design & Branding",
                                  "GD": "Graphic Design & Branding",
                                  "WD": "Websites Development",
                                  "WDE": "Websites Development",
                                  "WM": "Website Maintenance",
                                  "SMM": "Social Media Marketing",
                                  "SEO": "SEO",
                                  "BUN": "Bundles",
                                  // Full codes with underscores
                                  "PAID_ADS": "Paid Ads Marketing",
                                  "PAID_ADS_MARKETING": "Paid Ads Marketing",
                                  "PAIDADS": "Paid Ads Marketing",
                                  "PAID ADS MARKETING": "Paid Ads Marketing",
                                  "PAID ADS": "Paid Ads Marketing",
                                  "GRAPHIC_DESIGN": "Graphic Design & Branding",
                                  "GRAPHIC_DESIGN_BRANDING": "Graphic Design & Branding",
                                  "GRAPHIC DESIGN & BRANDING": "Graphic Design & Branding",
                                  "GRAPHIC DESIGN": "Graphic Design & Branding",
                                  "WEBSITES_DEVELOPMENT": "Websites Development",
                                  "WEBSITE_DEVELOPMENT": "Websites Development",
                                  "WEBSITES DEVELOPMENT": "Websites Development",
                                  "WEBSITE MAINTENANCE": "Website Maintenance",
                                  "WEBSITE_MAINTENANCE": "Website Maintenance",
                                  "SOCIAL_MEDIA_MARKETING": "Social Media Marketing",
                                  "SOCIAL MEDIA MARKETING": "Social Media Marketing",
                                  "BUNDLES": "Bundles",
                                  "BUNDLE": "Bundles",
                                  "ANALYSIS": "Analysis",
                                };
                                // Also try stripping auto-generated numeric suffix (e.g. "PAM-001" → "PAM")
                                const stripSuffix = (code: string) => code.replace(/-\d+$/, '').toUpperCase().trim();

                                let resolvedCategory = "";
                                if (match?.category && typeof match.category === 'object' && match.category.name) {
                                  resolvedCategory = match.category.name;
                                } else if (match?.categoryName) {
                                  resolvedCategory = match.categoryName;
                                } else if (item.categoryName) {
                                  resolvedCategory = item.categoryName;
                                } else if (match?.category && typeof match.category === 'string' && !match.category.match(/^[0-9a-fA-F]{24}$/)) {
                                  resolvedCategory = match.category;
                                } else if (item.category && typeof item.category === 'string' && !item.category.match(/^[0-9a-fA-F]{24}$/)) {
                                  resolvedCategory = item.category;
                                }

                                if (!resolvedCategory || resolvedCategory.match(/^[0-9a-fA-F]{24}$/)) {
                                  const catId = match?.category || item.category || match?.categoryId || item.categoryId;
                                  const catCode = match?.categorycode || item.categorycode;
                                  const found = availableCategories.find(c => c._id === catId || (c.categorycode && c.categorycode === catCode) || (c.slug && c.slug === catCode));
                                  if (found?.name) {
                                    resolvedCategory = found.name;
                                  }
                                }

                                const upperCat = (resolvedCategory || match?.categorycode || item.categorycode || "").toUpperCase().trim();
                                const strippedCat = stripSuffix(match?.categorycode || item.categorycode || upperCat);
                                if (categoryMap[upperCat]) {
                                  resolvedCategory = categoryMap[upperCat];
                                } else if (categoryMap[strippedCat]) {
                                  resolvedCategory = categoryMap[strippedCat];
                                } else if (!resolvedCategory || resolvedCategory.includes("_") || resolvedCategory.match(/^[A-Z]+-\d+$/i)) {
                                  if (normName.includes("ads") || normName.includes("shopping") || normName.includes("e-commerce")) {
                                    resolvedCategory = "Paid Ads Marketing";
                                  } else if (normName.includes("graphic") || normName.includes("brand") || normName.includes("logo")) {
                                    resolvedCategory = "Graphic Design & Branding";
                                  } else if (normName.includes("development") || normName.includes("website dev")) {
                                    resolvedCategory = "Websites Development";
                                  } else if (normName.includes("maintenance")) {
                                    resolvedCategory = "Website Maintenance";
                                  } else if (normName.includes("seo") || normName.includes("search engine")) {
                                    resolvedCategory = "SEO";
                                  } else if (normName.includes("social media") || normName.includes("smm")) {
                                    resolvedCategory = "Social Media Marketing";
                                  } else if (isBundle || upperCat.includes("BUNDLE")) {
                                    resolvedCategory = "Bundles";
                                  } else {
                                    resolvedCategory = resolvedCategory || "Service Package";
                                  }
                                }

                                const itemName = item.name || item.title || match?.name || match?.title || "Package Solution";
                                let itemDescription = match?.description || item.description || item.subtitle || item.details || "";
                                if (!itemDescription) {
                                  if (normName.includes("audit") || normName.includes("paid ads")) {
                                    itemDescription = "Audit of existing ad accounts, conversion tracking setup, and a complete strategy roadmap.";
                                  } else if (normName.includes("shopping") || normName.includes("ecommerce") || normName.includes("e-commerce")) {
                                    itemDescription = "End-to-end management of Google Shopping, Meta Product Ads, and e-commerce campaigns.";
                                  } else if (normName.includes("graphic") || normName.includes("brand") || normName.includes("logo")) {
                                    itemDescription = "Professional branding, visual assets, logo design, and graphic materials.";
                                  } else if (normName.includes("development") || normName.includes("website dev")) {
                                    itemDescription = "Custom modern web development with responsive design and high performance.";
                                  } else if (normName.includes("maintenance")) {
                                    itemDescription = "Ongoing security updates, bug fixes, performance monitoring, and backups.";
                                  } else if (normName.includes("seo") || normName.includes("search engine")) {
                                    itemDescription = "Complete search engine optimization to boost organic visibility and rankings.";
                                  } else if (normName.includes("social media") || normName.includes("smm")) {
                                    itemDescription = "Content creation, campaign management, and audience growth across social channels.";
                                  } else if (normName.includes("analysis")) {
                                    itemDescription = "Our standard free analysis offer covering brand, UI/UX, functionalities, AI potentiality, tech stack.";
                                  } else if (normName.includes("checking")) {
                                    itemDescription = "An offer to check the completed work of any other web professionals, including your own in-house team.";
                                  } else {
                                    itemDescription = "Comprehensive package solution tailored for your business needs.";
                                  }
                                }

                                const isMonthlyProduct = Boolean(
                                  match?.paymentType?.toLowerCase() === 'monthly' ||
                                  match?.billingType?.toLowerCase() === 'monthly' ||
                                  match?.isMonthly === true ||
                                  item?.isMonthly === true ||
                                  item?.paymentType?.toLowerCase() === 'monthly' ||
                                  item?.billingType?.toLowerCase() === 'monthly' ||
                                  (Array.isArray(match?.columns) && match.columns.some((c: any) => 
                                    c.billingType?.toLowerCase() === 'monthly' || 
                                    c.paymentType?.toLowerCase() === 'monthly' || 
                                    String(c.period || '').toLowerCase().includes('month') ||
                                    String(c.billingLabel || '').toLowerCase().includes('month')
                                  )) ||
                                  String(item.duration || '').toLowerCase().includes('month') ||
                                  String(item.priceText || '').toLowerCase().includes('/month') ||
                                  String(item.priceText || '').toLowerCase().includes('month') ||
                                  String(match?.amount || '').toLowerCase().includes('/month') ||
                                  ((itemName.toLowerCase().includes('management') || normName.includes('management')) && !itemName.toLowerCase().includes('audit')) ||
                                  itemName.toLowerCase().includes('maintenance') ||
                                  itemName.toLowerCase().includes('monthly') ||
                                  itemName.toLowerCase().includes('retainer')
                                );

                                const suffix = isMonthlyProduct ? '/month' : '';

                                let priceText = "";
                                if (match?.minPrice !== undefined && match?.maxPrice !== undefined && (match.minPrice > 0 || match.maxPrice > 0)) {
                                  if (match.minPrice === match.maxPrice) {
                                    priceText = `$${match.minPrice}${suffix}`;
                                  } else {
                                    priceText = `$${match.minPrice} - $${match.maxPrice}${suffix}`;
                                  }
                                } else if (item.priceText) {
                                  let cleanPrice = item.priceText.replace(/\$\s+/g, '$').trim();
                                  if (isMonthlyProduct && !cleanPrice.toLowerCase().includes('/month') && !cleanPrice.toLowerCase().includes('month')) {
                                    cleanPrice = `${cleanPrice}/month`;
                                  }
                                  priceText = cleanPrice;
                                } else {
                                  const amount = item.cost || item.amount || item.price || match?.amount || match?.price || 0;
                                  priceText = `$${amount}${suffix}`;
                                }

                                const isPkgSvg = itemImage ? itemImage.toLowerCase().includes(".svg") : false;

                                return (
                                  <a
                                    key={sIdx}
                                    href={pkgHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all group w-full max-w-[240px] shrink-0"
                                  >
                                    <div className="h-32 bg-gray-50 relative overflow-hidden flex items-center justify-center">
                                      <img
                                        alt={itemName}
                                        className={
                                          isPkgSvg
                                            ? "w-full h-full object-contain p-2.5 transition-transform group-hover:scale-105"
                                            : "w-full h-full object-cover transition-transform group-hover:scale-105"
                                        }
                                        src={itemImage}
                                        onError={(e) => {
                                          const target = e.currentTarget;
                                          if (target.src.startsWith("http:")) {
                                            target.src = target.src.replace("http:", "https:");
                                          }
                                        }}
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
                                    </div>

                                    <div className="p-4 flex flex-col flex-1 bg-white">
                                      <div
                                        className="bg-[#EBEBEB] text-[#8C8C8C] text-[8.5px] sm:text-[9px] font-extrabold px-2.5 py-0.5 rounded-full inline-flex items-center w-fit mb-2 tracking-wide uppercase font-sans shrink-0"
                                        title={resolvedCategory}
                                      >
                                        {resolvedCategory}
                                      </div>

                                      <h4 className="font-bold text-gray-700 text-sm leading-snug mb-1 group-hover:text-blue-600 transition-colors line-clamp-2">
                                        {itemName}
                                      </h4>

                                      {itemDescription && (
                                        <p className="text-[11px] text-gray-400 font-medium leading-relaxed mb-4 line-clamp-2">
                                          {itemDescription}
                                        </p>
                                      )}

                                      <div className="mt-auto pt-2">
                                        <span className="text-gray-500 font-extrabold text-xs">
                                          {priceText}
                                        </span>
                                      </div>
                                    </div>
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {!isAccepted && !actionModal.isOpen && (
                          <div className="flex flex-wrap gap-4 mt-6 pl-0 md:pl-[64px]">
                            <button
                              onClick={() => {
                                if (!currentUser) {
                                  setShowAuthModal(true);
                                  return;
                                }
                                handleAcceptProposal(msg.id);
                              }}
                              disabled={isActionLoading}
                              className="px-8 py-3 bg-[#327334] hover:bg-[#2a5f2b] text-white text-xs font-bold rounded-md shadow-sm transition-colors cursor-pointer"
                            >
                              Accept Offer
                            </button>
                            <button
                              onClick={() => {
                                if (!currentUser) {
                                  setShowAuthModal(true);
                                  return;
                                }
                                setActionModal({
                                  isOpen: true,
                                  action: "request_modification",
                                  proposalId: msg.id,
                                  title: "Request Modifications",
                                  description: "Please describe what changes you would like to request.",
                                  placeholder: "Type requested modifications...",
                                  required: true,
                                });
                              }}
                              disabled={isActionLoading}
                              className="px-8 py-3 bg-[#1C446F] hover:bg-[#163659] text-white text-xs font-bold rounded-md shadow-sm transition-colors cursor-pointer"
                            >
                              Request Modifications
                            </button>
                            <button
                              onClick={() => {
                                if (!currentUser) {
                                  setShowAuthModal(true);
                                  return;
                                }
                                setActionModal({
                                  isOpen: true,
                                  action: "decline",
                                  proposalId: msg.id,
                                  title: "Decline Offer",
                                  description: "Are you sure you want to decline this offer?",
                                  placeholder: "Reason (optional)...",
                                  required: false,
                                });
                              }}
                              disabled={isActionLoading}
                              className="px-8 py-3 bg-[#7D1A1A] hover:bg-[#651515] text-white text-xs font-bold rounded-md shadow-sm transition-colors cursor-pointer"
                            >
                              Decline Offer
                            </button>
                          </div>
                        )}

                        {actionModal.isOpen && actionModal.proposalId === msg.id && (
                          <div className="mt-6 p-6 bg-gray-50 rounded-xl border border-gray-300">
                            <h4 className="font-bold text-gray-800 mb-2">{actionModal.title}</h4>
                            <textarea
                              className="w-full min-h-[100px] p-3 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:border-[#4343F0]"
                              placeholder={actionModal.placeholder}
                              value={actionComment}
                              onChange={(e) => setActionComment(e.target.value)}
                            />
                            <div className="flex justify-end gap-3 mt-4">
                              <button
                                onClick={() => setActionModal({ ...actionModal, isOpen: false })}
                                className="px-5 py-2 bg-gray-200 text-gray-700 text-xs font-bold rounded hover:bg-gray-300 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleActionSubmit}
                                disabled={isActionLoading || (actionModal.required && !actionComment.trim())}
                                className="px-6 py-2 bg-[#4343F0] text-white text-xs font-bold rounded hover:bg-[#3232b7] disabled:opacity-50 cursor-pointer"
                              >
                                Submit
                              </button>
                            </div>
                          </div>
                        )}
                        </div>
                      </div>
                    );
                }

                const isClient = msg.sender === "client" || msg.role === "client" || (currentUser?._id && msg.userId === currentUser._id) || (currentUser?.id && msg.userId === currentUser.id);
                const clientName = currentUser?.fullName || (currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : '') || currentUser?.username;
                const senderName = msg.username || (isClient ? (clientName || "You") : "Analysis Team");
                const senderAvatar = msg.userAvatar || (isClient ? currentUser?.avatar : undefined);
                const rawAttachments = msg.attachments || msg.content?.attachedFiles || [];
                const attachmentList = Array.isArray(rawAttachments) ? rawAttachments : [];

                return (
                  <div key={msgId} className="bg-white rounded-xl shadow-sm border border-gray-300 p-6 md:p-8">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        {senderAvatar ? (
                          <img src={senderAvatar} alt={senderName} className="w-12 h-12 rounded-full object-cover shadow-sm" />
                        ) : (
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm ${isClient ? 'bg-blue-900' : 'bg-gray-800'}`}>
                            {(senderName || "U")[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-gray-800 text-base sm:text-lg">{senderName}</h4>
                          {msg.isFinalDelivery && (
                            <span className="inline-block px-2.5 py-0.5 bg-green-100 text-green-800 text-[10px] font-bold rounded-full uppercase mt-1">
                              Final Delivery Report
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
                        {formatDateTime(msg.createdAt || msg.timestamp)}
                      </span>
                    </div>

                    <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap pl-0 sm:pl-16 mb-6">
                      {msg.message || msg.content?.text}
                    </div>

                    {attachmentList.length > 0 && (
                      <div className="pl-0 sm:pl-16 mb-6">
                        <h5 className="text-sm font-bold text-gray-700 mb-3">
                          {isClient ? "Attached Files" : "Delivery Attachments"}
                        </h5>
                        <div className="border-t border-gray-200 mb-4" />
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full">
                          {attachmentList.map((att: any, attIdx: number) => {
                            const url = typeof att === "string" ? att : (att.url || att.secure_url);
                            const name = typeof att === "string" ? decodeURIComponent(url.split("/").pop() || "file") : (att.name || att.filename || decodeURIComponent((url || "").split("/").pop() || "file"));
                            if (!url) return null;
                            const safeUrl = url.startsWith("http:") ? url.replace("http:", "https:") : url;
                            const isImg = isImageUrl(url);
                            const isSvg = url.toLowerCase().includes(".svg");
                            const isPdf = url.toLowerCase().includes(".pdf");

                            return (
                              <a
                                key={url + attIdx}
                                href={safeUrl}
                                onClick={(e) => downloadFile(e, safeUrl, name)}
                                download={name}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group block border border-gray-300 rounded-lg w-full h-44 bg-white hover:shadow-md transition-all text-center no-underline overflow-hidden flex flex-col"
                              >
                                <div className="flex-grow flex items-center justify-center bg-white relative overflow-hidden">
                                  {isImg ? (
                                    <img
                                      src={safeUrl}
                                      alt={name}
                                      className={
                                        isSvg
                                          ? "w-full h-full object-contain p-2.5 group-hover:scale-105 transition-transform duration-300"
                                          : "w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      }
                                      onError={(e) => {
                                        const target = e.currentTarget;
                                        if (target.src.startsWith("http:")) {
                                          target.src = target.src.replace("http:", "https:");
                                        }
                                      }}
                                    />
                                  ) : isPdf ? (
                                    <div className="flex flex-col items-center gap-1">
                                      <svg className="w-12 h-12 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M11.363 2c4.155 0 2.637 6 2.637 6s6-1.518 6 2.638c0 4.155-3.345 7.518-7.5 7.518s-7.5-3.363-7.5-7.518c0-4.155 3.345-7.518 7.5-7.518zm1.5 7h-3v1h3v-1zm0 2h-3v1h3v-1zm0 2h-3v1h3v-1z" />
                                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 4h7v5h5v11H6V4z" />
                                      </svg>
                                      <span className="text-[10px] font-bold text-red-600 uppercase">PDF</span>
                                    </div>
                                  ) : (
                                    <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  )}
                                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-10">
                                    <div className="bg-white/95 p-2.5 rounded-full shadow-md flex items-center justify-center">
                                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                      </svg>
                                    </div>
                                  </div>
                                </div>
                                <div className="bg-gray-50 px-3 py-2 border-t border-gray-200 flex items-center justify-center h-10 min-h-[40px]">
                                  <span className="text-[10px] font-medium text-gray-600 truncate px-2" title={name}>{name}</span>
                                </div>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div ref={messagesEndRef} className="h-4 w-full shrink-0" />

          {/* New Message Box Form */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden w-full">
            <form onSubmit={handleSendMessage}>
              <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-900 flex items-center justify-center text-white font-bold text-base shadow-sm ring-2 ring-white">
                    {currentUser?.avatar ? (
                      <img src={currentUser.avatar} alt="User" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      (currentUser?.fullName || currentUser?.username || "U")[0]?.toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-base">
                      {currentUser?.fullName || currentUser?.username || "User"}
                    </h3>
                    <p className="text-xs text-gray-500">New Message</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 font-medium"></span>
              </div>

              <div className="p-6 pb-2">
                <textarea
                  className="w-full min-h-[120px] text-gray-700 text-sm leading-relaxed resize-none focus:outline-none placeholder-gray-400 bg-transparent cursor-pointer"
                  placeholder={
                    currentUser
                      ? "Type your message or submit requested details..."
                      : "Please log in or register to message our team..."
                  }
                  value={messageText}
                  onChange={(e) => {
                    if (!currentUser) {
                      setShowAuthModal(true);
                      return;
                    }
                    setMessageText(e.target.value);
                  }}
                  onClick={() => {
                    if (!currentUser) {
                      setShowAuthModal(true);
                    }
                  }}
                  onFocus={() => {
                    if (!currentUser) {
                      setShowAuthModal(true);
                    }
                  }}
                  readOnly={!currentUser}
                />
              </div>

              {attachments.length > 0 && (
                <div className="px-6 pb-2">
                  <div className="flex flex-wrap gap-3">
                    {attachments.map((att) => {
                      const isImg = att.type?.startsWith("image/") || (att.file && att.file.type?.startsWith("image/")) || isImageUrl(att.url);
                      return (
                        <div
                          key={att.id}
                          className={`relative group border border-gray-200 rounded-lg p-2 w-28 bg-white shadow-sm flex flex-col items-center ${att.status === "uploading" ? "opacity-70" : ""} ${att.status === "error" ? "border-red-400 bg-red-50" : ""}`}
                        >
                          <div className="mb-2 h-16 w-full flex items-center justify-center bg-gray-100 rounded overflow-hidden relative">
                            {att.status === "uploading" && (
                              <div className="absolute inset-0 z-10 bg-black/10 flex items-center justify-center">
                                <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                              </div>
                            )}
                            {isImg ? (
                              <img src={att.url || (att.file ? URL.createObjectURL(att.file) : "")} className="h-full w-full object-cover" alt="preview" />
                            ) : (
                              <svg className="text-gray-400 w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            )}
                          </div>
                          <span className="text-[10px] font-medium text-gray-600 truncate w-full text-center">
                            {att.name}
                          </span>
                          <div className="text-[10px] text-gray-400 capitalize">
                            {att.status === "uploading" ? "Uploading" : att.status === "done" ? "Ready" : att.status}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(att.id)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="px-6 pb-6 pt-2 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => {
                    if (!currentUser) {
                      setShowAuthModal(true);
                      return;
                    }
                    fileInputRef.current?.click();
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors px-4 py-2.5 rounded-md border-2 border-blue-600 hover:bg-blue-50 shadow-sm cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                  Attach Files
                </button>
                <input ref={fileInputRef} hidden multiple type="file" onChange={handleFileUpload} />

                <div className="flex gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentUser) {
                        setShowAuthModal(true);
                        return;
                      }
                      setMessageText("");
                      setAttachments([]);
                    }}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-[#800020] hover:bg-[#600018] text-white font-bold text-sm rounded-md transition-colors shadow-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type={currentUser ? "submit" : "button"}
                    onClick={(e) => {
                      if (!currentUser) {
                        e.preventDefault();
                        setShowAuthModal(true);
                      }
                    }}
                    disabled={
                      currentUser &&
                      (isSending ||
                        isUploading ||
                        (!messageText.trim() && attachments.filter((a) => a.status === "done").length === 0))
                    }
                    className="flex-1 sm:flex-none px-8 py-2.5 bg-[#4343F0] hover:bg-[#3333D0] text-white rounded-[8px] text-sm font-bold transition-all disabled:opacity-50 cursor-pointer shadow-md"
                  >
                    {isSending ? "Sending..." : "Send Message"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column / Sidebar (col-span-1) */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-6 sm:p-8">
            {managers.length <= 1 ? (
              <div className="text-center">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full mx-auto mb-4 flex items-center justify-center shadow-md overflow-hidden bg-gray-100 border border-gray-200">
                  {managerAvatar ? (
                    <img src={managerAvatar} alt={managerName} className="w-full h-full object-cover" />
                  ) : manager ? (
                    <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-3xl font-bold">
                      {managerName[0]}
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-3xl font-bold">
                      ?
                    </div>
                  )}
                </div>
                <h4 className="text-lg font-bold text-gray-800 mb-1">{managerName}</h4>
                <p className="text-sm text-gray-500 mb-4 font-medium uppercase tracking-wider text-[10px]">
                  Project Manager
                </p>
              </div>
            ) : (
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 text-center">
                  Project Managers ({managers.length})
                </h3>
                <div className="space-y-3">
                  {managers.map((m: any, idx: number) => {
                    const name = m?.fullName || "Project Manager";
                    const avatar = m?.avatar;
                    return (
                      <div key={m._id || m.id || idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm overflow-hidden bg-gray-200 shrink-0">
                          {avatar ? (
                            <img src={avatar} alt={name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold text-sm">
                              {name[0] || "M"}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-gray-800 truncate">{name}</h4>
                          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Project Manager</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Auth Prompt Modal */}
      <AuthPromptModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Join the Conversation"
        description="Please log in or register to message our team and upload files for this analysis."
        redirectUrl={analysis?._id ? `/dashboard/my-analyses/${analysis._id}/details` : undefined}
      />

      {/* Support & Newsletter Section */}
      <div className="w-full mt-10">
        <SupportNewsletter />
      </div>

    </div>
  );
}
