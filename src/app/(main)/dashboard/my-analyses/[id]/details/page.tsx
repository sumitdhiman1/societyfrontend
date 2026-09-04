"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAnalysis } from "@/context/AnalysisContext";
import { projectService } from "@/lib/projectService";
import { mediaService } from "@/lib/mediaService";
import { authService } from "@/lib/authService";
import { downloadFile } from "@/lib/utils";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";
import { useRouter } from "next/navigation";

export default function AnalysisDetailsPage() {
  const { analysis, refreshAnalysis } = useAnalysis();
  const router = useRouter();
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
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
  }, []);

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
    if (attachments.some((a) => a.status === "uploading")) return;

    const uploadedUrls = attachments.filter((a) => a.status === "done" && a.url).map((a) => a.url);

    if (messageText.trim() || uploadedUrls.length > 0) {
      setIsSending(true);
      try {
        const aId = analysis._id || analysis.id;
        const res = await projectService.addMessage(aId, messageText, false, uploadedUrls);
        if (res && (res.statusCode === 200 || res.statusCode === 201)) {
          setMessageText("");
          setAttachments([]);
          refreshAnalysis();
        }
      } catch (error) {
        console.error("Failed to send message:", error);
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleAcceptProposal = async (proposalId: string) => {
    setIsActionLoading(true);
    try {
      const username = currentUser?.fullName || currentUser?.username || "User";
      const avatar = currentUser?.avatar;
      const aId = analysis._id || analysis.id;
      const res = await projectService.acceptProposal(aId, proposalId, username, avatar);
      if (res && (res.statusCode === 200 || res.statusCode === 201)) {
        refreshAnalysis();
      }
    } catch (error) {
      console.error("Failed to accept proposal:", error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleActionSubmit = async () => {
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

        if (res && (res.statusCode === 200 || res.statusCode === 201)) {
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

  const manager = analysis.assignedManagers?.[0] || analysis.projectManager;
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

                  return (
                    <div key={msgId} className="bg-white border border-gray-300 rounded-xl shadow-sm p-6 md:p-8">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                        <span className="text-xs text-gray-500 font-bold">Proposal - {formatDateTime(msg.createdAt)}</span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                            content.status === "accepted"
                              ? "border-green-300 bg-green-50 text-green-700"
                              : content.status === "declined"
                              ? "border-red-300 bg-red-50 text-red-700"
                              : "border-blue-300 bg-blue-50 text-blue-700"
                          }`}
                        >
                          {content.status || "Proposal"}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-gray-800 mb-4">{content.title || "Custom Proposal"}</h3>
                      {content.description && <p className="text-sm text-gray-600 mb-6">{content.description}</p>}

                      {items.length > 0 && (
                        <div className="border border-gray-200 rounded-lg overflow-x-auto mb-6">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase">
                              <tr>
                                <th className="px-6 py-3">Item</th>
                                <th className="px-6 py-3 text-center">Duration</th>
                                <th className="px-6 py-3 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {items.map((item: any, sIdx: number) => (
                                <tr key={sIdx}>
                                  <td className="px-6 py-4 font-medium text-gray-800">{item.description}</td>
                                  <td className="px-6 py-4 text-center text-gray-600">{item.duration}</td>
                                  <td className="px-6 py-4 text-right font-bold text-gray-800">${Number(item.amount || 0).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {!isAccepted && !actionModal.isOpen && (
                        <div className="flex flex-wrap gap-4 mt-6">
                          <button
                            onClick={() => handleAcceptProposal(msg.id)}
                            disabled={isActionLoading}
                            className="px-8 py-3 bg-[#327334] hover:bg-[#2a5f2b] text-white text-xs font-bold rounded-md shadow-sm transition-colors cursor-pointer"
                          >
                            Accept Offer
                          </button>
                          <button
                            onClick={() =>
                              setActionModal({
                                isOpen: true,
                                action: "request_modification",
                                proposalId: msg.id,
                                title: "Request Modifications",
                                description: "Please describe what changes you would like to request.",
                                placeholder: "Type requested modifications...",
                                required: true,
                              })
                            }
                            disabled={isActionLoading}
                            className="px-8 py-3 bg-[#1C446F] hover:bg-[#163659] text-white text-xs font-bold rounded-md shadow-sm transition-colors cursor-pointer"
                          >
                            Request Modifications
                          </button>
                          <button
                            onClick={() =>
                              setActionModal({
                                isOpen: true,
                                action: "decline",
                                proposalId: msg.id,
                                title: "Decline Offer",
                                description: "Are you sure you want to decline this offer?",
                                placeholder: "Reason (optional)...",
                                required: false,
                              })
                            }
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
                  );
                }

                const isClient = msg.sender === "client" || msg.role === "client";
                const senderName = msg.username || (isClient ? "You" : "Analysis Team");
                const senderAvatar = msg.userAvatar;
                const attachmentList = msg.attachments || [];

                return (
                  <div key={msgId} className="bg-white rounded-xl shadow-sm border border-gray-300 p-6 md:p-8">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        {senderAvatar ? (
                          <img src={senderAvatar} alt={senderName} className="w-12 h-12 rounded-full object-cover shadow-sm" />
                        ) : (
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm bg-gray-800">
                            {senderName[0]}
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
                        {formatDateTime(msg.createdAt)}
                      </span>
                    </div>

                    <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap pl-0 sm:pl-16 mb-6">
                      {msg.message}
                    </div>

                    {attachmentList.length > 0 && (
                      <div className="pl-0 sm:pl-16 mb-6">
                        <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                          {isClient ? "Attached Files" : "Delivery Attachments"}
                        </h5>
                        <div className="flex flex-wrap gap-4">
                          {attachmentList.map((att: any, attIdx: number) => {
                            const url = typeof att === "string" ? att : att.url;
                            const name = typeof att === "string" ? decodeURIComponent(url.split("/").pop() || "file") : att.name || "file";
                            const isPdf = url.toLowerCase().includes(".pdf");

                            return (
                              <a
                                key={url + attIdx}
                                href={url}
                                onClick={(e) => downloadFile(e, url, name)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="border border-gray-300 rounded-lg p-3 w-48 bg-gray-50 hover:bg-white hover:shadow-md transition-all flex flex-col items-center text-center gap-2 group cursor-pointer"
                              >
                                <div className="w-10 h-10 flex items-center justify-center rounded bg-white shadow-xs">
                                  {isPdf ? (
                                    <span className="text-xs font-bold text-red-600">PDF</span>
                                  ) : (
                                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  )}
                                </div>
                                <span className="text-xs font-semibold text-gray-700 truncate w-full group-hover:text-[#4343F0]">{name}</span>
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

          <div ref={messagesEndRef} />

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
                  className="w-full min-h-[120px] text-gray-700 text-sm leading-relaxed resize-none focus:outline-none placeholder-gray-400 bg-transparent cursor-text"
                  placeholder={
                    currentUser
                      ? "Type your message or submit requested details..."
                      : "Please log in or register to message our team..."
                  }
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onClick={() => {
                    if (!currentUser && analysis?._id) {
                      router.push(`/register?redirect=/dashboard/my-analyses/${analysis._id}/details`);
                    }
                  }}
                  disabled={!currentUser}
                />
              </div>

              {attachments.length > 0 && (
                <div className="px-6 pb-2">
                  <div className="flex flex-wrap gap-3">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="relative border border-gray-200 rounded-lg p-2 w-28 bg-white shadow-sm flex flex-col items-center"
                      >
                        <span className="text-xs font-semibold text-gray-700 truncate w-full text-center">
                          {att.name}
                        </span>
                        <span className="text-[10px] text-gray-400 capitalize">{att.status}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(att.id)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-600 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="px-6 pb-6 pt-2 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
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
                      setMessageText("");
                      setAttachments([]);
                    }}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-[#800020] hover:bg-[#600018] text-white font-bold text-sm rounded-md transition-colors shadow-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isSending ||
                      isUploading ||
                      (!messageText.trim() && attachments.filter((a) => a.status === "done").length === 0)
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
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-8">
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
          </div>
        </div>
      </div>

      {/* Support & Newsletter Section */}
      <div className="w-full mt-10">
        <SupportNewsletter />
      </div>
    </div>
  );
}
