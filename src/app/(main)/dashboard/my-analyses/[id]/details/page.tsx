"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAnalysis } from "@/context/AnalysisContext";
import { requestAnalysisService } from "@/lib/requestAnalysisService";
import { projectService } from "@/lib/projectService";
import { mediaService } from "@/lib/mediaService";
import { authService } from "@/lib/authService";
import { downloadFile } from "@/lib/utils";
import Link from "next/link";
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

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

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

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
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

  const handleSendMessage = async () => {
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

  const handleRename = async () => {
    const aId = analysis._id || analysis.id;
    if (!aId || !newTitle.trim() || newTitle.trim() === analysis.title) {
      setIsEditingTitle(false);
      return;
    }

    setIsRenaming(true);
    try {
      const res = await requestAnalysisService.renameProject(aId, newTitle.trim());
      if (res && (res.statusCode === 200 || res.statusCode === 201 || res.isSuccessful)) {
        refreshAnalysis();
      }
    } catch (error) {
      console.error("Failed to rename analysis:", error);
    } finally {
      setIsRenaming(false);
      setIsEditingTitle(false);
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
  const analysisNumber = analysis.projectNumber || `#ANL-${analysis._id?.slice(-8).toUpperCase() || "XXXXXXXX"}`;
  const statusDisplay = (analysis.status === "active" ? "IN PROGRESS" : analysis.status || "IN PROGRESS").toUpperCase();

  return (
    <div className="flex flex-col gap-10 font-sans">
      {/* Top Section: Details Card (col-span-2) + Project Manager Sidebar (col-span-1) */}
      <div className="lg:grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Title and Inline Editing */}
          <div className="flex items-center gap-3 group">
            {isEditingTitle ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  ref={titleInputRef}
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename();
                    if (e.key === "Escape") setIsEditingTitle(false);
                  }}
                  className="text-xl sm:text-2xl font-bold text-gray-800 bg-transparent border-b-2 border-[#5356ff] focus:outline-none flex-1 py-1"
                  disabled={isRenaming}
                />
                <button
                  onClick={handleRename}
                  disabled={isRenaming}
                  className="px-3 py-1.5 bg-[#5356ff] text-white text-xs font-bold rounded transition-colors hover:bg-[#3232b7] disabled:opacity-50"
                >
                  {isRenaming ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setIsEditingTitle(false)}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-bold rounded transition-colors hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{analysis.title}</h1>
                <button
                  onClick={() => {
                    setNewTitle(analysis.title);
                    setIsEditingTitle(true);
                    setTimeout(() => titleInputRef.current?.focus(), 50);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                  title="Edit analysis title"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Analysis Details Card */}
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-4 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <span className="text-xs text-gray-500 font-bold">
                Submitted - {analysis.createdAt ? formatDate(analysis.createdAt) : "Recently"}
              </span>
              <span
                className={`w-fit px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                  statusDisplay === "COMPLETED"
                    ? "border-green-300 bg-green-50 text-green-700"
                    : statusDisplay === "PAUSED"
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : statusDisplay === "CANCELED"
                    ? "border-gray-300 bg-gray-100 text-gray-600"
                    : "border-blue-300 bg-blue-50 text-blue-700"
                }`}
              >
                {statusDisplay}
              </span>
            </div>

            <div className="border-t border-gray-200 mb-6" />

            <div className="pb-4 flex flex-col sm:flex-row justify-between items-start gap-2">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                  {analysis.title}
                </h2>
                <div className="flex gap-2 mt-1">
                  <span className="px-2.5 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded uppercase border border-purple-200">
                    Analysis
                  </span>
                  {analysis.isFree && (
                    <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded uppercase border border-green-200">
                      Free Offer
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs text-gray-500 font-bold whitespace-nowrap">
                Analysis {analysisNumber}
              </span>
            </div>

            {/* Custom Form Information Fields */}
            <div className="my-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-5 rounded-lg border border-gray-200">
              {analysis.targetWebsiteUrl && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Target Website</span>
                  <p>
                    <a
                      href={analysis.targetWebsiteUrl.startsWith("http") ? analysis.targetWebsiteUrl : `https://${analysis.targetWebsiteUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-[#5356ff] hover:underline break-all"
                    >
                      {analysis.targetWebsiteUrl}
                    </a>
                  </p>
                </div>
              )}

              {analysis.whoCompletedWork && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Who Completed Work</span>
                  <p className="text-sm font-semibold text-gray-700">{analysis.whoCompletedWork}</p>
                </div>
              )}

              {analysis.agreementDetails && (
                <div className="space-y-1 md:col-span-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Agreement Details</span>
                  <p className="text-sm text-gray-700 font-medium">{analysis.agreementDetails}</p>
                </div>
              )}

              {analysis.scopeOfWork && (
                <div className="space-y-1 md:col-span-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Scope of Work</span>
                  <p className="text-sm text-gray-700 font-medium">{analysis.scopeOfWork}</p>
                </div>
              )}

              {analysis.loginsDetails && (
                <div className="space-y-1 md:col-span-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Logins / Access Details</span>
                  <p className="text-sm text-gray-700 font-medium bg-white p-2.5 rounded border border-gray-200 font-mono text-xs">
                    {analysis.loginsDetails}
                  </p>
                </div>
              )}

              {analysis.resultsPdfUrl && (
                <div className="col-span-1 md:col-span-2 mt-2">
                  <a
                    href={analysis.resultsPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-700 rounded-md border border-red-200 hover:bg-red-100 transition-colors text-xs font-bold"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
                    </svg>
                    Download Completed Analysis Report (.PDF)
                  </a>
                </div>
              )}
            </div>

            {analysis.description && (
              <div className="mb-6 text-sm text-gray-600 leading-relaxed font-normal">
                {analysis.description}
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-gray-200">
              <span className="text-xs text-gray-400 font-bold">Total Cost: {analysis.isFree ? "Free ($0.00)" : `$${(analysis.price || 0).toFixed(2)}`}</span>
              <div className="flex flex-col xs:flex-row gap-3 w-full sm:w-auto">
                <button
                  onClick={() => window.print()}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#163659] hover:bg-[#112b4a] text-white text-xs font-bold rounded shadow-sm transition-colors"
                >
                  Print Details
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Project Manager */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-8 sticky top-24">
            <div className="text-center">
              {(() => {
                const manager = analysis.assignedManagers?.[0] || analysis.projectManager;
                const name = manager?.fullName || "Assigned Specialist";
                const avatar = manager?.avatar;
                return (
                  <>
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full mx-auto mb-4 flex items-center justify-center shadow-md overflow-hidden bg-gray-100 border border-gray-200">
                      {avatar ? (
                        <img src={avatar} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-3xl font-bold">
                          {name[0]}
                        </div>
                      )}
                    </div>
                    <h4 className="text-lg font-bold text-gray-800 mb-1">{name}</h4>
                    <p className="text-xs text-gray-500 mb-4 font-semibold uppercase tracking-wider">Analysis Lead</p>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Status</div>
                      <div className="text-xs font-semibold text-gray-600">Reviewing & Preparing Report</div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Styled Section Divider: Matches Adobe XD design */}
      <div className="relative my-4 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t-2 border-gray-200" />
        </div>
        <div className="relative bg-[#F8F9FD] px-8 text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wider rounded-full py-1">
          Analysis Started - {analysis.createdAt ? formatDate(analysis.createdAt) : "Recently"}
        </div>
      </div>

      {/* Full-Width Section Below Divider (Spans 100% of Container) */}
      <div className="w-full space-y-8">
        {/* Paused Request Banners */}
        {analysis.status === "paused" && (
          <div className="space-y-4">
            {analysis.pauseReason === "payment_overdue" ? (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">⚠️</span>
                  <div>
                    <h4 className="font-bold text-amber-900 text-base">Payment Requested</h4>
                    <p className="text-amber-800 text-sm mt-1">
                      A payment has been requested. This analysis has been paused until the requested payment has been made.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/dashboard/my-analyses/${analysis._id}/payments`)}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-sm whitespace-nowrap"
                >
                  Make a Payment Now
                </button>
              </div>
            ) : analysis.pauseReason === "approval_pending" ? (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">ℹ️</span>
                  <div>
                    <h4 className="font-bold text-blue-900 text-base">Approval Requested</h4>
                    <p className="text-blue-800 text-sm mt-1">
                      Our team has requested your approval to proceed. Please review and respond below.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6 flex items-center gap-4 shadow-sm">
                <span className="text-3xl">⏸</span>
                <div>
                  <h4 className="font-bold text-amber-900 text-base">Information Required</h4>
                  <p className="text-amber-800 text-sm mt-1">
                    This order is paused awaiting additional information. Please reply using the message box below to resume.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Messages & Delivery History */}
        {analysis.messages && analysis.messages.length > 0 && (
          <div className="flex flex-col gap-6 w-full">
            {analysis.messages.map((msg: any, idx: number) => {
              const msgId = msg.id || `msg-${idx}`;

              // System Notifications
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

              // Proposals / Add-ons / Requests
              if (msg.type === "quote_proposal") {
                const content = msg.content || {};
                const items = content.deliverableItems || content.items || [];
                const actions = content.actionsAvailable || ["accept", "request_modification", "decline"];
                const isAccepted = content.status === "accepted";

                return (
                  <div key={msgId} className="bg-white border border-gray-300 rounded-xl shadow-sm p-6 md:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                      <span className="text-xs text-gray-500 font-bold">Proposal - {formatDate(msg.createdAt)}</span>
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
                          className="px-8 py-3 bg-[#327334] hover:bg-[#2a5f2b] text-white text-xs font-bold rounded-md shadow-sm transition-colors"
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
                          className="px-8 py-3 bg-[#1C446F] hover:bg-[#163659] text-white text-xs font-bold rounded-md shadow-sm transition-colors"
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
                          className="px-8 py-3 bg-[#7D1A1A] hover:bg-[#651515] text-white text-xs font-bold rounded-md shadow-sm transition-colors"
                        >
                          Decline Offer
                        </button>
                      </div>
                    )}

                    {actionModal.isOpen && actionModal.proposalId === msg.id && (
                      <div className="mt-6 p-6 bg-gray-50 rounded-xl border border-gray-300">
                        <h4 className="font-bold text-gray-800 mb-2">{actionModal.title}</h4>
                        <textarea
                          className="w-full min-h-[100px] p-3 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:border-[#5356ff]"
                          placeholder={actionModal.placeholder}
                          value={actionComment}
                          onChange={(e) => setActionComment(e.target.value)}
                        />
                        <div className="flex justify-end gap-3 mt-4">
                          <button
                            onClick={() => setActionModal({ ...actionModal, isOpen: false })}
                            className="px-5 py-2 bg-gray-200 text-gray-700 text-xs font-bold rounded hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleActionSubmit}
                            disabled={isActionLoading || (actionModal.required && !actionComment.trim())}
                            className="px-6 py-2 bg-[#5356ff] text-white text-xs font-bold rounded hover:bg-[#3232b7] disabled:opacity-50"
                          >
                            Submit
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // Regular / Final Delivery Messages
              const isClient = msg.sender === "client" || msg.role === "client";
              const senderName = msg.username || (isClient ? "You" : "Analysis Team");
              const senderAvatar = msg.userAvatar;
              const attachmentList = msg.attachments || [];
              const recommendedSolutions = msg.recommendedSolutions || [];

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
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {formatDate(msg.createdAt)}
                    </span>
                  </div>

                  <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap pl-0 sm:pl-16 mb-6">
                    {msg.message}
                  </div>

                  {/* Attachments Section */}
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
                              className="border border-gray-300 rounded-lg p-3 w-48 bg-gray-50 hover:bg-white hover:shadow-md transition-all flex flex-col items-center text-center gap-2 group"
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
                              <span className="text-xs font-semibold text-gray-700 truncate w-full group-hover:text-[#5356ff]">{name}</span>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recommended Solutions Section */}
                  {recommendedSolutions.length > 0 && (
                    <div className="pl-0 sm:pl-16 pt-6 border-t border-gray-200">
                      <h5 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span>✨</span> Recommended Solutions
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {recommendedSolutions.map((rec: any, recIdx: number) => {
                          const targetUrl = rec.link || (rec.packageId ? `/dashboard/new-project/packages/${rec.packageId}` : "/dashboard/new-project/packages");
                          return (
                            <div
                              key={recIdx}
                              className="bg-[#F8F9FE] border border-blue-100 rounded-xl p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
                            >
                              <div>
                                <h6 className="font-bold text-gray-900 text-sm mb-1">{rec.title}</h6>
                                <p className="text-xs text-gray-500 mb-4 line-clamp-2">{rec.description || "Tailored solution recommended for your site."}</p>
                                {rec.price !== undefined && (
                                  <div className="text-base font-extrabold text-[#5356ff] mb-4">
                                    ${Number(rec.price).toFixed(2)}
                                  </div>
                                )}
                              </div>
                              <a
                                href={targetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-2 bg-[#5356ff] hover:bg-[#3232b7] text-white text-xs font-bold text-center rounded-lg transition-colors shadow-sm inline-block"
                              >
                                View Package Solution ↗
                              </a>
                            </div>
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

        {/* Full-Width New Message Box */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-4">
              {currentUser?.avatar ? (
                <img src={currentUser.avatar} alt="You" className="w-10 h-10 rounded-full object-cover shadow-sm" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#163659] flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  {(currentUser?.fullName || currentUser?.username || "Y")[0].toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="font-bold text-gray-800 text-sm">{currentUser?.fullName || currentUser?.username || "You"}</h3>
                <p className="text-xs text-gray-500">Send a message to your analysis team</p>
              </div>
            </div>
            <span className="text-xs text-gray-400 font-medium">
              {new Date().toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}
            </span>
          </div>

          <div className="p-6">
            <textarea
              className="w-full min-h-[120px] text-gray-700 text-sm leading-relaxed resize-none focus:outline-none placeholder-gray-400 bg-transparent"
              placeholder="Type your message or submit requested details..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
            />
          </div>

          {attachments.length > 0 && (
            <div className="px-6 pb-2">
              <div className="flex flex-wrap gap-3">
                {attachments.map((att) => (
                  <div key={att.id} className="relative border border-gray-200 rounded-lg p-2 w-28 bg-white shadow-sm flex flex-col items-center">
                    <span className="text-xs font-semibold text-gray-700 truncate w-full text-center">{att.name}</span>
                    <span className="text-[10px] text-gray-400 capitalize">{att.status}</span>
                    <button
                      onClick={() => removeAttachment(att.id)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-600"
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
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 text-xs font-bold text-[#5356ff] hover:text-[#3232b7] px-4 py-2.5 rounded-md border border-[#5356ff]/30 hover:bg-blue-50 transition-colors"
              type="button"
              disabled={isSending}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              Attach Files
            </button>
            <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />

            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={() => {
                  setMessageText("");
                  setAttachments([]);
                }}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs rounded-md transition-colors"
                disabled={isSending}
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                disabled={isSending || isUploading || (!messageText.trim() && attachments.filter((a) => a.status === "done").length === 0)}
                className="flex-1 sm:flex-none px-8 py-2.5 bg-[#5356ff] hover:bg-[#3232b7] text-white rounded-md text-xs font-bold transition-all shadow-md disabled:opacity-50"
              >
                {isSending ? "Sending..." : isUploading ? "Uploading..." : "Send Message"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
