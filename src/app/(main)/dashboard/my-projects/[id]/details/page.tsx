"use client";

import React, { useState, useEffect, useRef } from "react";
import { useProject } from "@/context/ProjectContext";
import { projectService } from "@/lib/projectService";
import { mediaService } from "@/lib/mediaService";
import { authService } from "@/lib/authService";
import { downloadFile, isImageUrl } from "@/lib/utils";
import { downloadProjectDetailsPDF, printProjectDetails } from "@/lib/generateProjectDetailsPDF";
import LoadingDots from "@/components/common/LoadingDots";
import AuthPromptModal from "@/components/common/AuthPromptModal";

export default function ProjectDetailsPage() {
  const { project, refreshProject } = useProject();
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
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
    required: false
  });

  const [actionComment, setActionComment] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const [isRestarting, setIsRestarting] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentUser(authService.getUser());
  }, []);

  useEffect(() => {
    const projectId = project?._id || project?.id || project?.projectId || project?.project_id || project?.orderId || project?.uuid || project?.uid || project?.project?._id || project?.project?.id;
    if (projectId) {
      projectService.markMessagesAsRead(projectId).catch(err => {
        console.error("Failed to mark messages as read:", err);
      });
    }
  }, [project?._id, project?.id, project?.projectId, project?.status]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#messages") {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [project?.messages]);

  if (!project) return null;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map(file => ({
        id: Math.random().toString(36).slice(2, 11),
        file,
        status: "uploading",
        name: file.name,
        type: file.type
      }));

      setAttachments(prev => [...prev, ...newFiles]);
      if (fileInputRef.current) fileInputRef.current.value = "";

      for (const att of newFiles) {
        try {
          const pId = project._id || project.id || project.projectId || project.project_id || project.orderId || project.uuid || project.uid || project.project?._id || project.project?.id;
          const res = await mediaService.uploadImage({
            file: att.file,
            folder: `project-attachments/${pId}`
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
    setAttachments(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSendMessage = async () => {
    if (attachments.some(a => a.status === "uploading")) return;

    const uploadedUrls = attachments.filter(a => a.status === "done" && a.url).map(a => a.url);

    if (messageText.trim() || uploadedUrls.length > 0) {
      setIsSending(true);
      try {
        const pId = project._id || project.id || project.projectId || project.project_id || project.orderId || project.uuid || project.uid || project.project?._id || project.project?.id;
        const res = await projectService.addMessage(pId, messageText, false, uploadedUrls);
        if (res && (res.statusCode === 200 || res.statusCode === 201)) {
          setMessageText("");
          setAttachments([]);
          refreshProject();
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
      const pId = project._id || project.id || project.projectId || project.project_id || project.orderId || project.uuid || project.uid || project.project?._id || project.project?.id;
      const res = await projectService.acceptProposal(pId, proposalId, username, avatar);
      if (res && (res.statusCode === 200 || res.statusCode === 201)) {
        refreshProject();
      }
    } catch (error) {
      console.error("Failed to accept proposal:", error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRestartProject = async () => {
    const pId = project?._id || project?.id || project?.projectId || project?.project_id || project?.orderId || project?.uuid || project?.uid || project?.project?._id || project?.project?.id;
    if (pId) {
      setIsRestarting(true);
      try {
        const res = await projectService.restartMonthlyProject(pId);
        if (res && (res.statusCode === 200 || res.statusCode === 201)) {
          refreshProject();
        }
      } catch (error) {
        console.error("Failed to restart project:", error);
      } finally {
        setIsRestarting(false);
      }
    }
  };

  const handleActionSubmit = async () => {
    if (actionModal.proposalId && actionModal.action && (!actionModal.required || actionComment.trim())) {
      setIsActionLoading(true);
      try {
        let res;
        const username = currentUser?.fullName || currentUser?.username || "User";
        const avatar = currentUser?.avatar;
        const pId = project._id || project.id || project.projectId || project.project_id || project.orderId || project.uuid || project.uid || project.project?._id || project.project?.id;

        if (actionModal.action === "decline") {
          res = await projectService.declineProposal(pId, actionModal.proposalId, actionComment || "", username, avatar);
        } else if (actionModal.action === "request_modification") {
          res = await projectService.requestProposalModification(pId, actionModal.proposalId, actionComment, username, avatar);
        }

        if (res && (res.statusCode === 200 || res.statusCode === 201)) {
          setActionModal({ ...actionModal, isOpen: false });
          setActionComment("");
          refreshProject();
        }
      } catch (error) {
        console.error(`Failed to handle ${actionModal.action}:`, error);
      } finally {
        setIsActionLoading(false);
      }
    }
  };

  const handleRename = async () => {
    const pId = project?._id || project?.id || project?.projectId || project?.project_id || project?.orderId || project?.uuid || project?.uid || project?.project?._id || project?.project?.id;
    if (!pId || !newTitle.trim() || newTitle.trim() === project.title) {
      setIsEditingTitle(false);
      return;
    }

    setIsRenaming(true);
    try {
      const res = await projectService.renameProject(pId, newTitle.trim());
      if (res && (res.statusCode === 200 || res.statusCode === 201)) {
        refreshProject();
      }
    } catch (error) {
      console.error("Failed to rename project:", error);
    } finally {
      setIsRenaming(false);
      setIsEditingTitle(false);
    }
  };

  const isUploading = attachments.some(a => a.status === "uploading");

  return (
    <div className="flex flex-col gap-12">
      {/* Paused/Completed Status Banners */}
      {project.status === "paused" && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <span className="text-2xl" aria-hidden="true">⏸</span>
          <div className="flex-1">
            <h4 className="font-bold text-amber-800 text-sm">Project Paused</h4>
            <p className="text-amber-700 text-xs mt-0.5">
              This project is currently paused. The estimated deadline does not count while paused.
              {project.pauseReason && (
                <span className="ml-1 capitalize">
                  Reason: {project.pauseReason.replace(/_/g, " ")}.
                </span>
              )}{" "}
              Your project manager will resume work once the pending item is resolved.
            </p>
          </div>
        </div>
      )}

      {project.status === "completed" && project.billingType === "monthly" && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <span className="text-2xl" aria-hidden="true">🔄</span>
          <div className="flex-1">
            <h4 className="font-bold text-blue-800 text-sm">Monthly Project Ended</h4>
            <p className="text-blue-700 text-xs mt-0.5">
              This monthly project has been completed. You can restart it to begin a new billing cycle.
            </p>
          </div>
          <button
            onClick={handleRestartProject}
            disabled={isRestarting}
            className="shrink-0 px-4 py-2 bg-[#5356ff] hover:bg-[#3232b7] text-white text-xs font-bold rounded shadow-sm transition-colors disabled:opacity-50"
          >
            {isRestarting ? "Restarting..." : "Restart Project"}
          </button>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Project Title and Renaming */}
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
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{project.title}</h1>
                <button
                  onClick={() => {
                    setNewTitle(project.title);
                    setIsEditingTitle(true);
                    setTimeout(() => titleInputRef.current?.focus(), 50);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                  title="Edit project title"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Project Details Card */}
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-4 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
              <span className="text-[10px] sm:text-xs text-gray-500 font-bold">
                Submitted - {formatDate(project.createdAt)}
              </span>
              <span className="w-fit px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold border border-gray-400 text-gray-500 uppercase">
                {project.status}
              </span>
            </div>

            <div className="border-t border-gray-200 mb-6 sm:mb-8" />

            <div className="pb-4 sm:pb-6 flex flex-col sm:flex-row justify-between items-start gap-2">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-600">
                  {project.type === "analysis" ? "Analysis Report Details" :
                    project.type === "bundle" ? `Bundle Project (${project.billingType === "fixed" ? "Setup Phase" : "Maintenance Phase"})` :
                      project.type === "custom" ? "Custom Project Details" : "Package Details"}
                </h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  {project.type === "bundle" && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded uppercase border border-purple-200">Bundle</span>}
                  {project.type === "analysis" && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded uppercase border border-amber-200">Analysis</span>}
                  {project.type === "custom" && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase border border-blue-200">Custom Quote</span>}
                  {project.type === "package" && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase border border-green-200">Standard Package</span>}
                </div>
              </div>
              <span className="text-[10px] sm:text-xs text-gray-400 font-medium whitespace-nowrap">
                Project #{project.projectNumber || ((project._id || project.id || project.projectId || project.project_id || project.orderId || project.uuid || project.uid || project.project?._id || project.project?.id || "XXXXXXXX").slice(-8).toUpperCase())}
              </span>
            </div>

            {/* Analysis Specific Info */}
            {project.type === "analysis" && (
              <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                {project.targetWebsiteUrl && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Target Website</span>
                    <a href={project.targetWebsiteUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline break-all">
                      {project.targetWebsiteUrl}
                    </a>
                  </div>
                )}
                {project.whoCompletedWork && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Completed By</span>
                    <p className="text-sm font-bold text-gray-700">{project.whoCompletedWork}</p>
                  </div>
                )}
                {project.resultsPdfUrl && (
                  <div className="col-span-1 md:col-span-2 mt-2">
                    <a href={project.resultsPdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded border border-red-200 hover:bg-red-100 transition-colors text-xs font-bold">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
                      </svg>
                      Download Analysis PDF
                    </a>
                  </div>
                )}
              </div>
            )}

            <div className="mb-10 text-sm text-gray-500 leading-relaxed font-medium">
              {project.description}
            </div>

            {/* Deliverables Table */}
            <div className="border border-gray-400 rounded-lg overflow-x-auto mb-6">
              <table className="w-full min-w-[500px] sm:min-w-0">
                <thead>
                  <tr className="border-b border-gray-400">
                    <th className="px-3 sm:px-6 py-4 text-left text-xs sm:text-sm font-bold text-gray-600 bg-white w-1/2">Item</th>
                    <th className="px-3 sm:px-6 py-4 text-center text-xs sm:text-sm font-bold text-gray-600 bg-white">Duration</th>
                    <th className="px-3 sm:px-6 py-4 text-right text-xs sm:text-sm font-bold text-gray-600 bg-white">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {project.deliverableItems && project.deliverableItems.length > 0 ? (
                    project.deliverableItems.map((item: any, idx: number) => (
                      <tr key={item.description + idx} className={idx < project.deliverableItems.length - 1 ? "border-b border-gray-400" : ""}>
                        <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-500 align-top">
                          <div className="font-medium text-gray-700 mb-1">{item.description}</div>
                          {item.details && <div className="text-[10px] sm:text-xs text-gray-400">{item.details}</div>}
                        </td>
                        <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-600 font-medium text-center align-top whitespace-nowrap">
                          {item.duration}
                        </td>
                        <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-600 text-right font-bold align-top">
                          ${(item.amount ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-500 font-medium">{project.title}</td>
                      <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-600 text-center">-</td>
                      <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-600 text-right font-bold">
                        ${(project.price ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                  {/* Add-ons section if exists */}
                  {project.addons && project.addons.length > 0 && (
                    <React.Fragment>
                      <tr className="bg-gray-800">
                        <td colSpan={3} className="px-6 py-3 text-xs font-bold text-white tracking-wider">Add-On Tasks</td>
                      </tr>
                      {project.addons.map((addon: any, aIdx: number) => (
                        addon.deliverableItems.map((item: any, iIdx: number) => (
                          <tr key={`addon-${aIdx}-${iIdx}`} className={(aIdx === project.addons.length - 1 && iIdx === addon.deliverableItems.length - 1) ? "" : "border-b border-gray-400"}>
                            <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-500 align-top">
                              <div className="font-medium text-gray-700 mb-1">{item.description}</div>
                              {item.details && <div className="text-[10px] sm:text-xs text-gray-400">{item.details}</div>}
                            </td>
                            <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-600 font-medium text-center align-top whitespace-nowrap">
                              {item.duration} {item.unit || "Days"}
                            </td>
                            <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-600 text-right font-bold align-top">
                              ${(item.amount ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))
                      ))}
                    </React.Fragment>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-row justify-end gap-6 sm:gap-16 text-xs sm:text-sm mb-12">
              <div className="text-center">
                <div className="text-gray-500 font-bold mb-1 sm:mb-2">Total Duration</div>
                <div className="font-medium text-gray-600">{project.totalDuration || "-"}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-500 font-bold mb-1 sm:mb-2">Total Cost</div>
                <div className="font-medium text-gray-600">${(project.price ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <span className="text-sm text-gray-500 font-bold"></span>
              <div className="flex flex-col xs:flex-row gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    if (project.resultsPdfUrl || project.pdfUrl) {
                      downloadFile(e as any, project.resultsPdfUrl || project.pdfUrl, "Project_Document.pdf");
                    } else {
                      await downloadProjectDetailsPDF(project);
                    }
                  }}
                  className="w-full sm:w-auto px-6 py-2 bg-[#163659] hover:bg-[#112b4a] text-white text-[10px] sm:text-xs font-bold rounded shadow-sm transition-colors cursor-pointer"
                >
                  Download Project (.PDF)
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    printProjectDetails(project);
                  }}
                  className="w-full sm:w-auto px-6 py-2 bg-[#5356ff] hover:bg-[#3232b7] text-white text-[10px] sm:text-xs font-bold rounded shadow-sm transition-colors cursor-pointer"
                >
                  Print Details
                </button>
              </div>
            </div>
          </div>

          {/* Messages History */}
          {project.messages && project.messages.length > 0 && (
            <div className="flex flex-col gap-6 w-full">
              {project.messages.map((msg: any, idx: number) => {
                const msgId = msg.id || `msg-${idx}`;

                // System Notifications
                if (msg.type === "system_notification") {
                  const title = msg.content?.systemText || msg.message || "System Notification";
                  const text = msg.content?.text || "";
                  return (
                    <div key={msgId} className="text-center py-6 sm:py-10 px-4">
                      <h3 className="text-xl sm:text-3xl font-bold text-gray-600 mb-2 sm:mb-3">{title}</h3>
                      <p className="text-sm sm:text-xl font-medium text-gray-500">{text}</p>
                    </div>
                  );
                }

                // Quote Proposals (Add-ons)
                if (msg.type === "quote_proposal") {
                  const content = msg.content || {};
                  const items = content.deliverableItems || content.items || [];
                  const actions = content.actionsAvailable || [];
                  const isLatest = project.messages.map((m: any, i: number) => m.type === "quote_proposal" ? i : -1).findLast((i: number) => i !== -1) === idx;
                  const canAct = isLatest && actions.length > 0;
                  const isAcceptedBySystem = project.messages?.some((m: any) => m.type === "system_notification" && (m.content?.systemText?.includes("Add-on Proposal Accepted") || m.message?.includes("Add-on Proposal Accepted")));
                  const isAccepted = content.status === "accepted" || isAcceptedBySystem;

                  return (
                    <div key={msgId}>
                      <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-4 sm:p-6 md:p-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-[10px] sm:text-xs text-gray-500 font-bold">Submitted - {formatDate(msg.createdAt)}</span>
                            <span className={`px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold border ${content.status === "accepted" ? "border-green-400 text-green-600 bg-green-50" :
                                content.status === "declined" ? "border-red-400 text-red-600 bg-red-50" :
                                  content.status === "modification_requested" ? "border-orange-400 text-orange-600 bg-orange-50" :
                                    "border-blue-400 text-blue-600 bg-blue-50"
                              }`}>
                              {content.status === "accepted" ? "Accepted" :
                                content.status === "declined" ? "Declined" :
                                  content.status === "modification_requested" ? "Modification Requested" : "Add-On Offer"}
                            </span>
                          </div>
                          {content.status && content.status !== "pending" && (
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                              {content.status === "accepted" && content.acceptedAt ? `Accepted on ${formatDate(content.acceptedAt)}` :
                                content.status === "declined" && content.declinedAt ? `Declined on ${formatDate(content.declinedAt)}` :
                                  content.status === "modification_requested" && content.modificationRequestedAt ? `Requested on ${formatDate(content.modificationRequestedAt)}` : ""}
                            </span>
                          )}
                        </div>

                        <div className="border-t border-gray-200 mb-6 sm:mb-8" />

                        <div className="pb-4 sm:pb-6 flex flex-col sm:flex-row justify-between items-start gap-2">
                          <h2 className="text-xl sm:text-2xl font-bold text-gray-600">Add-On Proposal</h2>
                          <span className="text-[10px] sm:text-xs text-gray-400 font-medium">From: {msg.username || "Project Manager"}</span>
                        </div>

                        {content.description && <div className="mb-6 text-sm text-gray-500 leading-relaxed font-medium">{content.description}</div>}

                        {/* Attachments if any (comes first before Recommended Solutions) */}
                        {((msg.attachments && msg.attachments.length > 0) || (content.attachedFiles && content.attachedFiles.length > 0)) && (
                          <div className="mb-6">
                            <h5 className="text-sm font-bold text-gray-700 mb-3">Attached Files</h5>
                            <div className="border-t border-gray-200 mb-4" />
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full">
                              {(msg.attachments || content.attachedFiles).map((att: any, aIdx: number) => {
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

                        {items.length > 0 && (
                          <div className="mb-6">
                            <h5 className="text-sm font-bold text-gray-700 mb-3">Recommended Solutions</h5>
                            <div className="border-t border-gray-200 mb-4"></div>
                            <div className="flex flex-nowrap overflow-x-auto pb-4 gap-4 scrollbar-hide" style={{ cursor: "grab" }}>
                              {items.map((item: any, sIdx: number) => {
                                const itemName = item.name || item.title || item.description || "Package Solution";
                                let rawImage = item.imageUrl || item.thumbnailUrl || item.mediumUrl || item.coverImage || item.image;
                                if (!rawImage) {
                                  const normName = itemName.toLowerCase();
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
                                const itemImage = rawImage ? (rawImage.startsWith("http:") ? rawImage.replace("http:", "https:") : rawImage) : null;
                                const isPkgSvg = itemImage ? itemImage.toLowerCase().includes(".svg") : false;
                                const pkgId = item._id || item.id || item.packageId || item.package;
                                const pkgHref = pkgId ? `/dashboard/new-project/packages/${pkgId}` : "#";

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
                                // Strip auto-generated numeric suffix (e.g. "PAM-001" → "PAM")
                                const stripSuffix = (code: string) => code.replace(/-\d+$/, '').toUpperCase().trim();

                                let resolvedCategory = "";
                                if (item.category && typeof item.category === 'object' && item.category.name) {
                                  resolvedCategory = item.category.name;
                                } else if (item.categoryName) {
                                  resolvedCategory = item.categoryName;
                                } else if (item.category && typeof item.category === 'string' && !item.category.match(/^[0-9a-fA-F]{24}$/)) {
                                  resolvedCategory = item.category;
                                }

                                const upperCat = (resolvedCategory || item.categorycode || "").toUpperCase().trim();
                                const strippedCat = stripSuffix(item.categorycode || upperCat);
                                if (categoryMap[upperCat]) {
                                  resolvedCategory = categoryMap[upperCat];
                                } else if (categoryMap[strippedCat]) {
                                  resolvedCategory = categoryMap[strippedCat];
                                } else if (!resolvedCategory || resolvedCategory.includes("_") || resolvedCategory.match(/^[A-Z]+-\d+$/i)) {
                                  const normName = (item.name || item.title || "").toLowerCase();
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
                                  } else if (item.isBundle || upperCat.includes("BUNDLE")) {
                                    resolvedCategory = "Bundles";
                                  } else {
                                    resolvedCategory = resolvedCategory || "Service Package";
                                  }
                                }

                                 let itemDescription = item.description || item.details || "";
                                 if (!itemDescription) {
                                   const normName = (item.name || item.title || "").toLowerCase();
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
                                 const itemPrice = item.cost || item.amount || item.price || 0;

                                 const isMonthlyProduct = Boolean(
                                   item.isMonthly === true ||
                                   item.paymentType?.toLowerCase() === 'monthly' ||
                                   item.billingType?.toLowerCase() === 'monthly' ||
                                   String(item.duration || '').toLowerCase().includes('month') ||
                                   String(item.priceText || '').toLowerCase().includes('/month') ||
                                   String(item.priceText || '').toLowerCase().includes('month') ||
                                   (itemName.toLowerCase().includes('management') && !itemName.toLowerCase().includes('audit')) ||
                                   itemName.toLowerCase().includes('maintenance') ||
                                   itemName.toLowerCase().includes('monthly') ||
                                   itemName.toLowerCase().includes('retainer')
                                 );
                                 const suffix = isMonthlyProduct ? '/month' : '';

                                 let priceText = item.priceText ? item.priceText.replace(/\$\s+/g, '$').trim() : `$${itemPrice}${suffix}`;
                                 if (isMonthlyProduct && item.priceText && !item.priceText.toLowerCase().includes('month')) {
                                   priceText = `${priceText.replace(/\$\s+/g, '$').trim()}/month`;
                                 }

                                return (
                                  <a
                                    key={sIdx}
                                    href={pkgHref}
                                    target={pkgId ? "_blank" : undefined}
                                    rel="noopener noreferrer"
                                    className="flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all group w-full max-w-[240px] shrink-0"
                                  >
                                    <div className="h-32 bg-gray-50 relative overflow-hidden flex items-center justify-center">
                                      {itemImage ? (
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
                                      ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50/70 text-[#4343F0] p-2">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                          </svg>
                                        </div>
                                      )}
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
                                    </div>
                                    <div className="p-4 flex flex-col flex-1 bg-white">
                                      <div className="bg-[#EBEBEB] text-[#8C8C8C] text-[8.5px] sm:text-[9px] font-extrabold px-2.5 py-0.5 rounded-full inline-flex items-center w-fit mb-2 tracking-wide uppercase font-sans shrink-0" title={resolvedCategory}>
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
                                        <span className="text-gray-500 font-extrabold text-xs">{priceText}</span>
                                      </div>
                                    </div>
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="border border-gray-400 rounded-lg overflow-x-auto mb-6">
                          <table className="w-full min-w-[500px] sm:min-w-0">
                            <thead>
                              <tr className="border-b border-gray-400">
                                <th className="px-3 sm:px-6 py-4 text-left text-xs sm:text-sm font-bold text-gray-600 bg-white w-1/2">Item</th>
                                <th className="px-3 sm:px-6 py-4 text-center text-xs sm:text-sm font-bold text-gray-600 bg-white">Duration</th>
                                <th className="px-3 sm:px-6 py-4 text-right text-xs sm:text-sm font-bold text-gray-600 bg-white">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((item: any, sIdx: number) => (
                                <tr key={item.description + sIdx} className={sIdx < items.length - 1 ? "border-b border-gray-400" : ""}>
                                  <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-500 align-top">
                                    <div className="font-medium text-gray-700 mb-1">{item.description}</div>
                                    {item.details && <div className="text-[10px] sm:text-xs text-gray-400">{item.details}</div>}
                                  </td>
                                  <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-600 font-medium text-center align-top whitespace-nowrap">{item.duration} Days</td>
                                  <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-600 text-right font-bold align-top">${item.amount?.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex flex-row justify-end gap-6 sm:gap-16 text-xs sm:text-sm mb-12">
                          {content.duration && (
                            <div className="text-center">
                              <div className="text-gray-500 font-bold mb-1 sm:mb-2">Total Duration</div>
                              <div className="font-medium text-gray-600">{content.duration}</div>
                            </div>
                          )}
                          <div className="text-center">
                            <div className="text-gray-500 font-bold mb-1 sm:mb-2">Total Cost</div>
                            <div className="font-medium text-gray-600">${(content.total ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-[10px] sm:text-sm text-gray-500 font-bold">Expires {content.expires ? formatDate(content.expires) : "N/A"}</span>
                        </div>
                      </div>

                      {canAct && !actionModal.isOpen && (
                        <div className={`flex flex-col sm:flex-row gap-4 w-full mt-6 ${isAccepted ? "justify-center" : "justify-between"}`}>
                          {actions.includes("accept") && !isAccepted && (
                            <button
                              onClick={() => msg.id && handleAcceptProposal(msg.id)}
                              disabled={isActionLoading}
                              className="bg-[#327334] hover:bg-[#2a5f2b] text-white text-sm font-bold py-3.5 px-14 rounded-md transition-colors shadow-sm disabled:opacity-50"
                            >
                              Accept Offer
                            </button>
                          )}
                          {actions.includes("request_modification") && (
                            <button
                              onClick={() => msg.id && setActionModal({
                                isOpen: true,
                                action: "request_modification",
                                proposalId: msg.id,
                                title: "Request Modifications",
                                description: "Please describe the modifications you would like for this offer.",
                                placeholder: "Describe your requested changes...",
                                required: true
                              })}
                              disabled={isActionLoading}
                              className="bg-[#1C446F] hover:bg-[#163659] text-white text-sm font-bold py-3.5 px-14 rounded-md transition-colors shadow-sm disabled:opacity-50"
                            >
                              Request Modifications
                            </button>
                          )}
                          {actions.includes("decline") && !isAccepted && (
                            <button
                              onClick={() => msg.id && setActionModal({
                                isOpen: true,
                                action: "decline",
                                proposalId: msg.id,
                                title: "Decline Add-On Offer",
                                description: "Are you sure you want to decline this offer? You can provide a reason below.",
                                placeholder: "Reason for declining (optional)...",
                                required: false
                              })}
                              disabled={isActionLoading}
                              className="bg-[#7D1A1A] hover:bg-[#651515] text-white text-sm font-bold py-3.5 px-14 rounded-md transition-colors shadow-sm disabled:opacity-50"
                            >
                              Decline Offer
                            </button>
                          )}
                        </div>
                      )}

                      {/* Inline Action Modal for Proposal */}
                      {actionModal.isOpen && actionModal.proposalId === msg.id && (
                        <div className="w-full mt-6 animate-in fade-in slide-in-from-top-4 duration-300">
                          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 bg-gray-50/50">
                              <div className="flex items-center gap-4">
                                {currentUser?.avatar ? (
                                  <img src={currentUser.avatar} alt="User" className="w-12 h-12 rounded-full object-cover shadow-sm ring-2 ring-white" />
                                ) : (
                                  <div className="w-12 h-12 rounded-full bg-blue-900 flex items-center justify-center text-white font-bold text-base shadow-sm ring-2 ring-white">
                                    {(currentUser?.fullName || currentUser?.username || "U").charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <h3 className="font-bold text-gray-800 text-base">{currentUser?.fullName || currentUser?.username || "User"}</h3>
                                  <p className="text-xs text-gray-500">{actionModal.title}</p>
                                </div>
                              </div>
                              <span className="text-xs text-gray-400 font-medium">{new Date().toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}</span>
                            </div>
                            <div className="p-6">
                              {actionModal.description && <p className="text-gray-600 text-sm mb-3 font-medium">{actionModal.description}</p>}
                              <textarea
                                className="w-full min-h-[120px] text-gray-700 text-sm leading-relaxed resize-none focus:outline-none placeholder-gray-400 bg-transparent"
                                placeholder={actionModal.placeholder}
                                value={actionComment}
                                onChange={(e) => setActionComment(e.target.value)}
                                autoFocus
                              />
                            </div>
                            <div className="px-6 pb-6 pt-2 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-end gap-3">
                              <div className="flex gap-3 w-full sm:w-auto">
                                <button
                                  onClick={() => setActionModal({ ...actionModal, isOpen: false })}
                                  className="flex-1 sm:flex-none px-6 py-2.5 bg-[#800020] hover:bg-[#600018] text-white font-bold text-sm rounded-md transition-colors shadow-sm"
                                  disabled={isActionLoading}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleActionSubmit}
                                  disabled={isActionLoading || (actionModal.required && !actionComment.trim())}
                                  className={`flex-1 sm:flex-none px-6 py-2.5 text-white rounded-md text-sm font-bold transition-all shadow-sm ${isActionLoading ? "bg-gray-400 cursor-not-allowed" :
                                      actionModal.action === "decline" ? "bg-red-700 hover:bg-red-800" : "bg-blue-800 hover:bg-blue-900"
                                    }`}
                                >
                                  {isActionLoading ? "Processing..." : actionModal.action === "decline" ? "Decline Offer" : "Send Request"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                // Regular Messages
                const isClient = msg.sender === "client" || msg.role === "client" || msg.role === "CLIENT";
                const manager = project.assignedManagers?.[0] || project.projectManager || {};
                const senderName = msg.username || (isClient ? project.client?.fullName || "Client" : manager?.fullName || "Project Manager");
                const senderAvatar = msg.userAvatar || (isClient ? project.client?.avatar : manager?.avatar);
                const initial = senderName.charAt(0).toUpperCase();
                const attachmentList = msg.attachments || [];
                const hasAttachments = attachmentList.length > 0;
                const isLast = idx === project.messages.length - 1;

                return (
                  <div key={msgId} ref={isLast ? messagesEndRef : null} className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden">
                    <div className="p-4 sm:p-6 md:p-8">
                      <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
                        <div className="flex items-center gap-4">
                          {senderAvatar ? (
                            <img src={senderAvatar} alt={senderName} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover shadow-sm bg-gray-100" />
                          ) : (
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-sm bg-gray-800">
                              {initial}
                            </div>
                          )}
                          <div>
                            <h4 className="font-bold text-gray-800 text-base sm:text-lg">{senderName}</h4>
                          </div>
                        </div>
                        <span className="text-[10px] sm:text-sm text-gray-500 font-bold uppercase tracking-wide whitespace-nowrap">
                          {new Date(msg.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} - {formatDate(msg.createdAt)}
                        </span>
                      </div>
                      <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap pl-0 md:pl-[64px] mb-6">
                        {msg.message}
                      </div>

                      {hasAttachments && (
                        <div className="pl-0 md:pl-[64px]">
                          <h5 className="text-sm font-bold text-gray-700 mb-3">
                            {isClient ? "Attached Files" : "Delivered Files"}
                          </h5>
                          <div className="border-t border-gray-200 mb-4" />
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full">
                            {attachmentList.map((att: any, attIdx: number) => {
                              const url = typeof att === "string" ? att : att.url;
                              const name = typeof att === "string" ? decodeURIComponent(url.split("/").pop() || "file") : att.filename || att.name || "file";
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
                  </div>
                );
              })}
            </div>
          )}

          {/* New Message Box */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mt-6">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-4">
                {currentUser?.avatar ? (
                  <img src={currentUser.avatar} alt="You" className="w-12 h-12 rounded-full object-cover shadow-sm ring-2 ring-white" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-blue-900 flex items-center justify-center text-white font-bold text-base shadow-sm ring-2 ring-white">
                    {(currentUser?.fullName || currentUser?.username || "Y").charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-gray-800 text-base">{currentUser?.fullName || currentUser?.username || "You"}</h3>
                  <p className="text-xs text-gray-500">New Message</p>
                </div>
              </div>
              <span className="text-xs text-gray-400 font-medium">{new Date().toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}</span>
            </div>
            <div className="p-6">
              <textarea
                className="w-full min-h-[120px] text-gray-700 text-sm leading-relaxed resize-none focus:outline-none placeholder-gray-400 bg-transparent cursor-pointer"
                placeholder={currentUser ? "Type a message..." : "Please log in or register to message our team..."}
                value={messageText}
                onChange={(e) => {
                  if (!currentUser) {
                    setShowAuthModal(true);
                    return;
                  }
                  setMessageText(e.target.value);
                }}
                onClick={() => {
                  if (!currentUser) setShowAuthModal(true);
                }}
                onFocus={() => {
                  if (!currentUser) setShowAuthModal(true);
                }}
                readOnly={!currentUser}
              />
            </div>

            {attachments.length > 0 && (
              <div className="px-6 pb-2">
                <div className="flex flex-wrap gap-3">
                  {attachments.map((att) => {
                    const isImg = att.type.startsWith("image/");
                    return (
                      <div key={att.id} className={`relative group border border-gray-200 rounded-lg p-2 w-28 bg-white shadow-sm flex flex-col items-center ${att.status === "uploading" ? "opacity-70" : ""} ${att.status === "error" ? "border-red-400 bg-red-50" : ""}`}>
                        <div className="mb-2 h-16 w-full flex items-center justify-center bg-gray-100 rounded overflow-hidden relative">
                          {att.status === "uploading" && (
                            <div className="absolute inset-0 z-10 bg-black/10 flex items-center justify-center">
                              <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                            </div>
                          )}
                          {isImg ? (
                            <img src={att.url || URL.createObjectURL(att.file)} className="h-full w-full object-cover" alt="preview" />
                          ) : (
                            <svg className="text-gray-400 w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                        </div>
                        <span className="text-[10px] font-medium text-gray-600 truncate w-full text-center">{att.name}</span>
                        <div className="text-[10px] text-gray-400 capitalize">
                          {att.status === "uploading" ? "Uploading" : att.status === "done" ? "Ready" : att.status}
                        </div>
                        <button
                          onClick={() => removeAttachment(att.id)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
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
                onClick={() => {
                  if (!currentUser) {
                    setShowAuthModal(true);
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors px-4 py-2.5 rounded-md border-2 border-blue-600 hover:bg-blue-50 shadow-sm cursor-pointer"
                type="button"
                disabled={isSending}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                Attach Files
              </button>
              <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />

              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  onClick={() => {
                    if (!currentUser) {
                      setShowAuthModal(true);
                      return;
                    }
                    setMessageText("");
                    setAttachments([]);
                  }}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-[#800020] hover:bg-[#600018] text-white font-bold text-sm rounded-md transition-colors shadow-sm cursor-pointer"
                  disabled={isSending}
                >
                  Cancel
                </button>
                <button
                  onClick={(e) => {
                    if (!currentUser) {
                      e.preventDefault();
                      setShowAuthModal(true);
                      return;
                    }
                    handleSendMessage();
                  }}
                  disabled={currentUser && (isSending || isUploading || (!messageText.trim() && attachments.filter(a => a.status === "done").length === 0))}
                  className={`flex-1 sm:flex-none px-6 py-2.5 text-white rounded-md text-sm font-bold transition-all shadow-sm cursor-pointer ${isSending || isUploading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-800 hover:bg-blue-900"
                    }`}
                >
                  {isSending ? "Sending..." : isUploading ? "Uploading..." : "Send Message"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Project Manager */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-8 sticky top-24">
            <div className="text-center">
              {(() => {
                const manager = project.assignedManagers?.[0] || project.projectManager;
                const name = manager?.fullName || "Unassigned";
                const avatar = manager?.avatar;
                return (
                  <>
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full mx-auto mb-4 flex items-center justify-center shadow-md overflow-hidden bg-gray-100 border border-gray-200">
                      {avatar ? (
                        <img src={avatar} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-3xl font-bold">
                          {name === "Unassigned" ? "?" : name[0]}
                        </div>
                      )}
                    </div>
                    <h4 className="text-lg font-bold text-gray-800 mb-1">{name}</h4>
                    <p className="text-sm text-gray-500 mb-4 font-medium uppercase tracking-wider text-[10px]">Project Manager</p>

                    {name !== "Unassigned" && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Status</div>
                        <div className="text-xs font-semibold text-gray-600">Online & Active</div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Auth Prompt Modal */}
      <AuthPromptModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Join the Conversation"
        description="Please log in or register to message our team and upload files for this project."
        redirectUrl={project?._id ? `/dashboard/my-projects/${project._id}/details` : undefined}
      />
    </div>
  );
}
