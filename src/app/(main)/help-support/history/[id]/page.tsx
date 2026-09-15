"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supportService } from "@/lib/supportService";
import { authService } from "@/lib/authService";
import { mediaService } from "@/lib/mediaService";
import { downloadFile, isImageUrl } from "@/lib/utils";
import StatusPopup from "@/components/common/StatusPopup";
import { useSupportTicketLive } from "@/hooks/useSupportTicketLive";

export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = params?.id as string;

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chat message state
  const [replyText, setReplyText] = useState("");
  const [replyAttachments, setReplyAttachments] = useState<File[]>([]);
  const [sendingReply, setSendingReply] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [popup, setPopup] = useState({
    isOpen: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });

  const formatDateTime = (dateStr?: string | Date) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const fetchTicket = useCallback(async () => {
    if (!ticketId) return;

    if (!authService.isAuthenticated()) {
      setLoading(false);
      setError("Please log in to view this support ticket.");
      return;
    }

    try {
      const res: any = await supportService.getTicketById(ticketId);
      if (res?.data) {
        setTicket(res.data);
      } else if (res?.ticket) {
        setTicket(res.ticket);
      } else {
        throw new Error("Ticket not found");
      }
    } catch (err: any) {
      console.error("Failed to fetch ticket:", err);
      setError(err?.response?.data?.message || err?.message || "Failed to load support ticket.");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    setLoading(true);
    fetchTicket();
  }, [ticketId, fetchTicket]);

  useSupportTicketLive(ticketId, fetchTicket);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setReplyAttachments((prev) => [...prev, ...Array.from(e.target.files || [])]);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sendingReply) return;

    const trimmed = replyText.trim();
    if (!trimmed && replyAttachments.length === 0) {
      return;
    }

    setSendingReply(true);

    try {
      const attachmentUrls: string[] = [];
      if (replyAttachments.length > 0) {
        for (const file of replyAttachments) {
          try {
            const uploadRes: any = await mediaService.uploadImage({ file, folder: "support_tickets" });
            const fileUrl = uploadRes?.data?.url || uploadRes?.url || uploadRes?.data?.secure_url || uploadRes?.data?.Location;
            if (fileUrl) {
              attachmentUrls.push(fileUrl);
            }
          } catch (uploadErr) {
            console.warn("Failed to upload attachment:", file.name, uploadErr);
          }
        }
      }

      await supportService.replyToTicket(ticketId, {
        message: trimmed,
        attachmentUrls,
      });

      setReplyText("");
      setReplyAttachments([]);
      await fetchTicket();

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err: any) {
      console.error("Failed to send message:", err);
      setPopup({
        isOpen: true,
        type: "error",
        title: "Failed to send",
        message: err?.response?.data?.message || err?.message || "Failed to send message.",
      });
    } finally {
      setSendingReply(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!ticket?._id) return;
    try {
      await supportService.closeTicket(ticket._id);
      setPopup({
        isOpen: true,
        type: "success",
        title: "Ticket Closed",
        message: "Your support ticket has been closed.",
      });
      await fetchTicket();
    } catch (err: any) {
      console.error("Failed to close ticket:", err);
      setPopup({
        isOpen: true,
        type: "error",
        title: "Error",
        message: err?.response?.data?.message || err?.message || "Failed to close ticket.",
      });
    }
  };

  const handleReopenTicket = async () => {
    if (!ticket?._id) return;
    try {
      await supportService.reopenTicket(ticket._id);
      setPopup({
        isOpen: true,
        type: "success",
        title: "Ticket Reopened",
        message: "Your support ticket has been reopened.",
      });
      await fetchTicket();
    } catch (err: any) {
      console.error("Failed to reopen ticket:", err);
      setPopup({
        isOpen: true,
        type: "error",
        title: "Error",
        message: err?.response?.data?.message || err?.message || "Failed to reopen ticket.",
      });
    }
  };

  const isClosed = ticket?.status === "closed" || ticket?.status === "resolved";

  const renderAttachments = (attachments: any[]) => {
    if (!attachments || attachments.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-3 mt-2">
        {attachments.map((att: any, attIdx: number) => {
          const url = typeof att === "string" ? att : att?.url || "";
          if (!url) return null;
          const fileType = typeof att === "object" ? att?.fileType : "";

          const isImg =
            fileType?.startsWith("image") ||
            url.match(/\.(jpg|jpeg|png|gif|webp|svg|avif|bmp|ico)$/i) ||
            url.includes("/image/upload/") ||
            isImageUrl(url);

          const isPdf =
            fileType?.toLowerCase().includes("pdf") ||
            url.toLowerCase().includes(".pdf") ||
            url.toLowerCase().includes("/raw/");

          let filename = typeof att === "object" && att?.filename ? att.filename : "";
          if (!filename || filename.startsWith("support-attachments/") || filename.includes("/")) {
            const parts = url.split("/");
            filename = parts[parts.length - 1]?.split("?")[0] || "attachment";
          }
          if (!filename.includes(".") && filename.length >= 15 && isPdf) {
            filename += ".pdf";
          }

          const displayFilename =
            filename.length > 30 ? filename.substring(0, 27) + "..." : filename;

          let extBadge = "FILE";
          if (filename.includes(".")) {
            const ext = filename.split(".").pop()?.toUpperCase();
            if (ext && ext.length <= 4) extBadge = ext;
          }
          if (isPdf) extBadge = "PDF";

          const dlUrl = url.includes("cloudinary.com")
            ? url.replace("/upload/", "/upload/fl_attachment/")
            : url;

          if (isImg) {
            return (
              <a
                key={attIdx}
                href={dlUrl}
                onClick={(e) => downloadFile(e, dlUrl, filename)}
                download={filename}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden border border-gray-200 bg-white hover:shadow-lg transition-all p-2.5"
                title={`Download ${filename}`}
              >
                <img
                  src={url}
                  alt={filename}
                  className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                  <div className="bg-white/20 backdrop-blur-md rounded-full p-2 lg:p-3 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all shadow-lg">
                    <svg
                      className="w-4 h-4 lg:w-6 lg:h-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[8px] lg:text-[9px] text-white text-center font-bold tracking-wider uppercase">
                    Download
                  </p>
                </div>
              </a>
            );
          }

          return (
            <a
              key={attIdx}
              href={dlUrl}
              onClick={(e) => downloadFile(e, dlUrl, filename)}
              download={filename}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 sm:gap-3 md:gap-4 p-2.5 sm:p-3 md:p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-[#4343F0] hover:shadow-md transition-all group max-w-full w-full sm:w-auto sm:min-w-[260px] lg:min-w-[320px] relative overflow-hidden"
            >
              {isPdf && (
                <div className="absolute top-0 right-0 w-12 h-12 lg:w-16 lg:h-16 bg-red-50/50 rounded-bl-full -mr-6 -mt-6 lg:-mr-8 lg:-mt-8 transition-all group-hover:bg-red-100/50" />
              )}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 z-10">
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-xl flex-shrink-0 flex flex-col items-center justify-center transition-all shadow-sm ${
                    isPdf
                      ? "bg-red-50 text-red-600 border border-red-100"
                      : "bg-blue-50 text-blue-600 border border-blue-100"
                  } group-hover:scale-105`}
                >
                  {isPdf ? (
                    <>
                      <svg
                        className="w-4 h-4 md:w-6 md:h-6 lg:w-7 lg:h-7 mb-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="text-[7px] md:text-[9px] lg:text-[10px] font-black tracking-widest -mt-0.5 md:-mt-1 uppercase">
                        PDF
                      </span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4 md:w-6 md:h-6 lg:w-7 lg:h-7 mb-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span className="text-[7px] md:text-[9px] lg:text-[10px] font-black tracking-widest -mt-0.5 md:-mt-1 uppercase">
                        {extBadge}
                      </span>
                    </>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-bold text-[#404040] truncate transition-colors group-hover:text-[#4343F0]">
                    {displayFilename}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-[9px] lg:text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        isPdf
                          ? "bg-red-100 text-red-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {isPdf ? "PDF" : "File"}
                    </span>
                    <span className="text-[9px] lg:text-[10px] text-gray-400 font-medium hidden sm:inline">
                      Click to download
                    </span>
                  </div>
                </div>
              </div>
              <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 rounded-full bg-gray-50 flex-shrink-0 flex items-center justify-center text-gray-400 group-hover:bg-[#4343F0] group-hover:text-white transition-all shadow-inner z-10">
                <svg
                  className="w-4 h-4 lg:w-5 lg:h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </div>
            </a>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans">
      <StatusPopup
        isOpen={popup.isOpen}
        onClose={() => setPopup({ ...popup, isOpen: false })}
        type={popup.type}
        title={popup.title}
        message={popup.message}
      />

      {loading ? (
        <div className="flex-grow flex justify-center items-center py-32">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4343F0]"></div>
        </div>
      ) : error || !ticket ? (
        <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 sm:px-8 lg:px-[54px] py-16">
          <div className="border border-[#B0B0B0] rounded-[12px] p-8 text-center max-w-lg mx-auto">
            <h2 className="text-xl font-bold text-[#404040] mb-2">{error || "Ticket Not Found"}</h2>
            <p className="text-sm text-gray-500 mb-6">We could not find the support ticket you are looking for.</p>
            <Link
              href="/help-support/history"
              className="inline-block bg-[#4343F0] hover:bg-[#3232b7] text-white font-bold py-2.5 px-6 rounded text-sm transition-colors"
            >
              Go back to My Support History
            </Link>
          </div>
        </main>
      ) : (
        <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 sm:px-8 lg:px-[54px] py-8 sm:py-12 md:py-16">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
            {/* Left Column (65%) */}
            <div className="w-full lg:w-[65%] flex flex-col gap-6 sm:gap-8">
              {/* Ticket Details & Messages */}
              <div className="border border-[#B0B0B0] rounded-[12px] p-4 sm:p-6 md:p-8">
                <h1 className="text-xl sm:text-2xl font-bold text-[#404040] mb-3 sm:mb-4">
                  {ticket.subject}
                </h1>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm font-medium text-[#808080]">
                  <span className="break-words">
                    Chat {ticket.ticketNumber || ticket._id?.slice(-8)?.toUpperCase()} - {formatDateTime(ticket.createdAt)}
                  </span>
                  <span
                    className={`px-3 sm:px-4 py-1 border rounded-md text-xs font-bold uppercase tracking-wider shrink-0 ${
                      ticket.status === "open"
                        ? "border-green-500 text-green-500"
                        : ticket.status === "in_progress"
                        ? "border-amber-500 text-amber-500"
                        : "border-gray-400 text-gray-500"
                    }`}
                  >
                    {ticket.status || "open"}
                  </span>
                </div>

                <div className="mt-6 sm:mt-8 space-y-6 sm:space-y-8">
                  {ticket.messages && ticket.messages.length > 0 ? (
                    ticket.messages.map((msg: any, idx: number) => {
                      const isUser = msg.sender === "user";
                      return (
                        <div key={idx} className="flex flex-col gap-3 group/msg">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <h4 className="font-bold text-[#404040] text-sm sm:text-base">
                              {isUser ? "You" : ticket.assignedAgent?.fullName || "Support Agent"}
                            </h4>
                            <div className="w-1 h-1 rounded-full bg-gray-300 hidden sm:block"></div>
                            <span className="text-[10px] sm:text-[11px] text-gray-400 font-medium uppercase tracking-wider">
                              {formatDateTime(msg.createdAt)}
                            </span>
                          </div>
                          <div className="text-[#646464] text-sm leading-relaxed whitespace-pre-wrap pl-0">
                            {msg.text || msg.message}
                          </div>

                          {renderAttachments(msg.attachments)}
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col gap-3 group/msg">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <h4 className="font-bold text-[#404040] text-sm sm:text-base">You</h4>
                        <div className="w-1 h-1 rounded-full bg-gray-300 hidden sm:block"></div>
                        <span className="text-[10px] sm:text-[11px] text-gray-400 font-medium uppercase tracking-wider">
                          {formatDateTime(ticket.createdAt)}
                        </span>
                      </div>
                      <div className="text-[#646464] text-sm leading-relaxed whitespace-pre-wrap pl-0">
                        {ticket.description || "Support ticket created."}
                      </div>
                      {renderAttachments(ticket.attachments)}
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Send a message */}
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#404040] mb-3 sm:mb-4">
                  Send a message
                </h3>
                <div className="border border-[#B0B0B0] rounded-[12px] p-3 sm:p-4 bg-white">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={isClosed || sendingReply}
                    className="w-full h-32 resize-none outline-none text-sm text-[#404040] placeholder-gray-400 disabled:bg-gray-50"
                    placeholder={
                      isClosed
                        ? "This ticket is closed. Reopen ticket to send messages."
                        : "Type your message here..."
                    }
                  ></textarea>

                  {/* Attachment preview pills */}
                  {replyAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 my-2 pt-2 border-t border-gray-100">
                      {replyAttachments.map((file, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-[#F1F3F5] text-xs text-[#404040] font-medium"
                        >
                          <span className="max-w-[200px] truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setReplyAttachments(replyAttachments.filter((_, idx) => idx !== i))
                            }
                            className="text-red-500 hover:text-red-700 font-bold transition-colors cursor-pointer flex items-center justify-center p-0.5"
                            aria-label={`Remove ${file.name}`}
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                    <div>
                      <input
                        ref={fileInputRef}
                        className="hidden"
                        multiple
                        type="file"
                        accept="image/*,.pdf,.doc,.docx"
                        onChange={handleFileChange}
                        disabled={isClosed || sendingReply}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isClosed || sendingReply}
                        className="flex items-center gap-2 text-sm font-bold text-[#646464] hover:text-black transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                        </svg>
                        Attach
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleSendReply}
                      disabled={isClosed || sendingReply || (!replyText.trim() && replyAttachments.length === 0)}
                      className="bg-[#4343F0] hover:bg-[#3232b7] text-white font-bold py-2 px-6 sm:px-8 rounded text-sm transition-colors uppercase disabled:opacity-50 cursor-pointer"
                    >
                      {sendingReply ? "Sending..." : "Send"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (35%) */}
            <div className="w-full lg:w-[35%] flex flex-col gap-6">
              {/* Agent card */}
              <div className="border border-[#B0B0B0] rounded-[12px] p-4 sm:p-6 md:p-8 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-gray-200 mb-4 overflow-hidden">
                  {ticket.assignedAgent?.avatar ? (
                    <img
                      src={ticket.assignedAgent.avatar}
                      alt={ticket.assignedAgent.fullName || "Support Agent"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-500">
                      <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
                      </svg>
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold text-[#404040]">
                  {ticket.assignedAgent?.fullName || "Pending Assignment"}
                </h3>
                <p className="text-sm text-[#808080] mb-4">
                  {ticket.assignedAgent?.role || "Customer Experience Specialist"}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-4">
                <Link
                  className="w-full bg-[#4343F0] hover:bg-[#3232b7] text-white font-bold py-3 px-4 rounded border border-transparent text-center text-sm transition-colors block cursor-pointer"
                  href="/help-support/history"
                >
                  Go back to My Support History
                </Link>

                {isClosed ? (
                  <button
                    type="button"
                    onClick={handleReopenTicket}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-4 rounded border border-transparent text-sm transition-colors cursor-pointer"
                  >
                    Reopen ticket
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCloseTicket}
                    className="w-full bg-[#741b10] hover:bg-[#5a150c] text-white font-bold py-3 px-4 rounded border border-transparent text-sm transition-colors cursor-pointer"
                  >
                    Close ticket
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
