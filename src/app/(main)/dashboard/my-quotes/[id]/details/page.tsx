"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQuote } from "../layout";
import { authService } from "@/lib/authService";
import { quoteService } from "@/lib/quoteService";
import { mediaService } from "@/lib/mediaService";
import { downloadFile, isImageUrl } from "@/lib/utils";
import AuthPromptModal from "@/components/common/AuthPromptModal";

// Helper components
const TooltipIcon = () => (
  <span className="inline-flex items-center justify-center w-4 h-4 ml-1 text-[10px] font-bold text-white bg-gray-400 rounded-full cursor-help hover:bg-gray-500" title="Time spent waiting for client replies does not count towards project deadlines.">
    ?
  </span>
);

const LoadingDots = ({ text = "Sending" }) => (
  <span className="inline-flex items-center">
    {text}
    <span style={{ transform: "translateY(-1px)" }} className="inline-flex items-center ml-0.5">
      <span style={{ animation: "blink 1.4s infinite both" }} className="inline-block">.</span>
      <span style={{ animation: "blink 1.4s infinite both", animationDelay: "0.2s" }} className="inline-block">.</span>
      <span style={{ animation: "blink 1.4s infinite both", animationDelay: "0.4s" }} className="inline-block">.</span>
    </span>
    <style>{`@keyframes blink { 0% { opacity: .2; } 20% { opacity: 1; } to { opacity: .2; } }`}</style>
  </span>
);

const PackageCard = ({ packageId, title, price, imageUrl, link }: any) => {
  const safeImg = imageUrl ? (imageUrl.startsWith("http:") ? imageUrl.replace("http:", "https:") : imageUrl) : null;
  const isSvg = safeImg ? safeImg.toLowerCase().includes(".svg") : false;

  return (
    <a href={link || `/dashboard/new-project/packages/${packageId}`} target="_blank" rel="noopener noreferrer" className="flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow group w-full max-w-[240px] shrink-0">
      <div className="h-32 bg-gray-50 relative overflow-hidden flex items-center justify-center">
        {safeImg ? (
          <img
            src={safeImg}
            alt={title}
            className={`w-full h-full transition-transform group-hover:scale-105 ${isSvg ? "object-contain p-2.5" : "object-cover"}`}
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src.startsWith("http:")) {
                target.src = target.src.replace("http:", "https:");
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-200">
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
      </div>
      <div className="p-4 flex flex-col flex-1 bg-white">
        <h4 className="font-bold text-gray-700 text-[13px] leading-tight line-clamp-2 min-h-[32px] mb-2 group-hover:text-blue-600 transition-colors">{title}</h4>
        <div className="mt-auto flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter leading-none mb-0.5">Starting at</span>
            <span className="text-blue-600 font-black text-base leading-none">${Number(price || 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}</span>
          </div>
          <div className="bg-gray-100 p-1.5 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
        </div>
      </div>
    </a>
  );
};

function formatDate(date: string) {
  return date ? new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A";
}

function formatDuration(val: any) {
  if (!val) return "-";
  const str = String(val).trim();
  if (
    str.toLowerCase().includes("day") ||
    str.toLowerCase().includes("week") ||
    str.toLowerCase().includes("month") ||
    str.toLowerCase().includes("hr") ||
    str.toLowerCase().includes("hour")
  ) {
    return str;
  }
  return `${str} Days`;
}

export default function QuoteDetailsPage() {
  const { quote, setQuote, refreshQuote } = useQuote();
  const router = useRouter();

  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [currentTimeSet, setCurrentTimeSet] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [attachments, setAttachments] = useState<Array<{ id: string; name: string; status: "uploading" | "done" | "error"; url?: string }>>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentTimeSet(true);
    const u = authService.getUser();
    if (u) setUser(u);
  }, []);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      const payload = e?.detail;
      const targetId = payload?.quoteId || payload?.data?.quoteId || payload?.id;
      if (!targetId || targetId === quote?._id) {
        refreshQuote(true);
      }
    };
    window.addEventListener("quote_message", handleUpdate);
    window.addEventListener("quote_updated", handleUpdate);
    return () => {
      window.removeEventListener("quote_message", handleUpdate);
      window.removeEventListener("quote_updated", handleUpdate);
    };
  }, [quote?._id, refreshQuote]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    e.target.value = "";

    const newItems = files.map((file) => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      status: "uploading" as const,
      file,
    }));

    setAttachments((prev) => [...prev, ...newItems.map(({ file, ...rest }) => rest)]);

    for (const item of newItems) {
      try {
        const res: any = await mediaService.uploadImage({
          file: item.file,
          folder: `quotes/${quote?._id}/messages`,
        });
        const url = res.data?.secure_url || res.data?.url || res.secure_url || "";
        setAttachments((prev) => prev.map((a) => (a.id === item.id ? { ...a, status: "done", url } : a)));
      } catch (error) {
        console.error("Upload failed for file:", item.name, error);
        setAttachments((prev) => prev.map((a) => (a.id === item.id ? { ...a, status: "error" } : a)));
      }
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSendMessage = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (attachments.some((a) => a.status === "uploading")) return;

    const uploadedUrls = attachments.filter((a) => a.status === "done" && a.url).map((a) => a.url);

    if ((messageText.trim() || uploadedUrls.length > 0) && quote) {
      setIsSending(true);
      try {
        const res = await quoteService.updateQuote(quote._id, {
          action: "message",
          userComments: messageText.trim(),
          attachedFilesUrl: uploadedUrls.length > 0 ? uploadedUrls : undefined,
          username: user?.fullName,
          userAvatar: user?.avatar,
        });
        if (res.isSuccessful || res.statusCode === 200) {
          setMessageText("");
          setAttachments([]);
          if (res.data) {
            setQuote(res.data);
          } else {
            refreshQuote(true);
          }
        }
      } catch (e) {
        console.error("Failed to send message:", e);
        toast.error("Failed to send message");
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleAcceptQuote = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (quote) {
      setIsAccepting(true);
      try {
        const res = await quoteService.updateQuote(quote._id, {
          action: "accept",
          username: user?.fullName,
          userAvatar: user?.avatar,
        });
        if (res.isSuccessful || res.statusCode === 200) {
          toast.success("Proposal accepted successfully!");
          if (res.data) setQuote(res.data);
          else refreshQuote(true);
        }
      } catch (e) {
        console.error("Failed to accept quote:", e);
        toast.error("Failed to accept proposal");
      } finally {
        setIsAccepting(false);
      }
    }
  };

  const handleDeclineQuote = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!quote) return;

    setIsDeclining(true);
    try {
      const res = await quoteService.updateQuote(quote._id, {
        action: "deny",
        rejectionReason: declineReason.trim() || undefined,
        username: user?.fullName,
        userAvatar: user?.avatar,
      });

      if (res.isSuccessful || res.statusCode === 200) {
        toast.success("Proposal declined");
        setShowDeclineModal(false);
        setDeclineReason("");
        if (res.data) setQuote(res.data);
        else refreshQuote(true);
      } else {
        toast.error(res.message || "Failed to decline proposal");
      }
    } catch (e: any) {
      console.error("Failed to decline proposal:", e);
      toast.error(e?.message || "Failed to decline proposal");
    } finally {
      setIsDeclining(false);
    }
  };

  const handleRequestModification = async () => {
    if (!messageText.trim() || !quote) {
      if (messageInputRef.current) {
        messageInputRef.current.scrollIntoView({ behavior: "smooth" });
        const textarea = messageInputRef.current.querySelector("textarea");
        if (textarea) textarea.focus();
      }
      return;
    }

    setIsSending(true);
    try {
      const res = await quoteService.updateQuote(quote._id, {
        action: "request_modification",
        userComments: messageText.trim(),
        username: user?.fullName,
        userAvatar: user?.avatar,
      });
      if (res.isSuccessful || res.statusCode === 200) {
        setMessageText("");
        if (res.data) setQuote(res.data);
        else refreshQuote(true);
        toast.success("Modification request sent");
      }
    } catch (e) {
      console.error("Failed to send modification request:", e);
      toast.error("Failed to send modification request");
    } finally {
      setIsSending(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (quote) {
      try {
        await quoteService.downloadQuotePDF(quote);
      } catch (e) {
        console.error("Failed to download PDF:", e);
        toast.error("Failed to download PDF");
      }
    }
  };

  if (!quote) return null;

  const manager = quote.assignedManager || (quote.assignedManagers && quote.assignedManagers[0]);
  const displayItems =
    quote.lineItems && quote.lineItems.length > 0
      ? quote.lineItems
      : quote.deliverableItems && quote.deliverableItems.length > 0
      ? quote.deliverableItems
      : [];

  const isProposalActive =
    quote.status.toLowerCase() === "sent" ||
    (quote.status.toLowerCase() === "pending" && quote.totalCost && quote.totalCost > 0);

  return (
    <div className="flex flex-col gap-10">
      <div className="lg:grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{quote.projectTitle}</h1>
          </div>

          {quote.status.toLowerCase() !== "approved" && (
            <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-4 sm:p-6 md:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
                <span className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-tight">
                  Submitted - {formatDate(quote.dateSubmitted || quote.createdAt)}
                </span>
                <span className="w-fit px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold border border-gray-400 text-gray-500 uppercase">
                  {quote.status}
                </span>
              </div>
              <div className="border-t border-gray-200 mb-6 sm:mb-8" />
              <div className="pb-4 sm:pb-6 flex flex-col sm:flex-row justify-between items-start gap-2">
                <div className="flex flex-col gap-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-600">Project Details</h2>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase border border-blue-200 w-fit mt-1">
                    {quote.serviceType || "Custom Project"}
                  </span>
                </div>
                <span className="text-[10px] sm:text-xs text-gray-400 font-medium whitespace-nowrap">
                  Project #{quote.quoteNumber}
                </span>
              </div>
              <div className="mb-10 text-sm text-gray-500 leading-relaxed font-medium">
                {quote.projectDescription}
              </div>
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
                    {displayItems.length > 0 ? (
                      displayItems.map((item: any, i: number) => (
                        <tr key={i} className="border-b border-gray-400 last:border-0">
                          <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-500 align-top">
                            <div className="font-medium text-gray-700 mb-1">{item.description || item.name}</div>
                            {item.details && <div className="text-[10px] sm:text-xs text-gray-400">{item.details}</div>}
                          </td>
                          <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-600 font-medium text-center align-top whitespace-nowrap">
                            {formatDuration(item.duration)}
                          </td>
                          <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-600 text-right font-bold align-top">
                            ${Number(item?.amount || item?.cost || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-b border-gray-400 last:border-0">
                        <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-500 align-top">
                          <div className="font-medium text-gray-700 mb-1">{quote.projectTitle}</div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-600 font-medium text-center align-top whitespace-nowrap">
                          {quote.totalDuration ? formatDuration(quote.totalDuration) : "-"}
                        </td>
                        <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-600 text-right font-bold align-top">
                          ${Number(quote?.totalCost || quote?.estimatedPrice || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-row justify-end gap-6 sm:gap-16 text-xs sm:text-sm mb-12">
                <div className="text-center">
                  <div className="text-gray-500 font-bold mb-1 sm:mb-2 flex items-center justify-center gap-1">
                    Total Duration <TooltipIcon />
                  </div>
                  <div className="font-medium text-gray-600">{quote.totalDuration ? formatDuration(quote.totalDuration) : "-"}</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-500 font-bold mb-1 sm:mb-2">Total Cost</div>
                  <div className="font-medium text-gray-600">
                    ${Number(quote?.totalCost || quote?.estimatedPrice || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <span className="text-[10px] sm:text-sm text-gray-500 font-bold uppercase tracking-wider">
                  Expires {quote.expirationDate ? formatDate(quote.expirationDate) : "N/A"}
                </span>
                <div className="flex gap-3 w-full sm:w-auto">
                  <button onClick={handleDownloadPDF} className="flex-1 sm:flex-none px-6 py-2 bg-[#163659] text-white text-[10px] sm:text-xs font-bold rounded shadow-sm hover:bg-[#0a2036] transition-colors cursor-pointer">
                    Download PDF
                  </button>
                  <button onClick={() => window.print()} className="flex-1 sm:flex-none px-6 py-2 bg-[#4343F0] text-white text-[10px] sm:text-xs font-bold rounded shadow-sm hover:bg-[#3232b7] transition-colors cursor-pointer">
                    Print
                  </button>
                </div>
              </div>
            </div>
          )}

          {quote.status.toLowerCase() === "pending" && (!quote.totalCost || quote.totalCost === 0) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-bold text-blue-900">Quote Request Submitted</h3>
              </div>
              <p className="text-sm text-blue-700 font-medium">
                Your quote request has been received. Our team is reviewing your requirements and will send you a detailed quote with pricing soon.
              </p>
            </div>
          )}

          {isProposalActive && (
            <div className="flex flex-col sm:flex-row gap-3 justify-between w-full">
              <button
                onClick={handleAcceptQuote}
                disabled={isAccepting || isDeclining}
                className="flex-1 bg-[#327334] hover:bg-[#285c29] text-white text-xs sm:text-sm font-bold py-3.5 px-6 rounded-md shadow-sm transition-all disabled:opacity-50 cursor-pointer text-center"
              >
                {isAccepting ? <LoadingDots text="Accepting" /> : "Accept Proposal"}
              </button>
              <button
                onClick={handleRequestModification}
                disabled={isAccepting || isDeclining}
                className="flex-1 bg-[#1C446F] hover:bg-[#153455] text-white text-xs sm:text-sm font-bold py-3.5 px-6 rounded-md shadow-sm transition-all disabled:opacity-50 cursor-pointer text-center"
              >
                Request Modifications
              </button>
              <button
                onClick={() => setShowDeclineModal(true)}
                disabled={isAccepting || isDeclining}
                className="flex-1 bg-[#7D1A1A] hover:bg-[#651515] text-white text-xs sm:text-sm font-bold py-3.5 px-6 rounded-md shadow-sm transition-all disabled:opacity-50 cursor-pointer text-center"
              >
                Decline Proposal
              </button>
            </div>
          )}

          <div ref={messageInputRef} className="flex flex-col gap-6 w-full pt-4">
            {((quote.messages && quote.messages.length > 0) || (quote.conversations && quote.conversations.length > 0)) && (
              <div className="flex flex-col gap-6 w-full">
                {(quote.messages || quote.conversations || []).map((msg: any, i: number) => {
                  if (!msg) return null;
                  const isLast = i === (quote.messages || quote.conversations || []).length - 1;

                  if (msg.type === "system_notification" || msg.isSystemMessage) {
                    const title = msg.content?.systemText || msg.systemText || "System Notification";
                    const text = msg.content?.text || msg.text || "";
                    return (
                      <div key={msg.id || msg._id || `msg-${i}`} className="text-center py-10" ref={isLast ? messagesEndRef : null}>
                        <h3 className="text-3xl font-bold text-gray-600 mb-3">{title}</h3>
                        <p className="text-gray-400 font-medium text-sm">{text}</p>
                      </div>
                    );
                  }

                  if (msg.type === "quote_proposal") {
                    const content = msg.content || {};
                    const propItems =
                      content.lineItems && content.lineItems.length > 0
                        ? content.lineItems
                        : content.deliverableItems && content.deliverableItems.length > 0
                        ? content.deliverableItems
                        : [];
                    const senderName = msg.username || msg.senderName || manager?.fullName || "Project Manager";
                    const msgDate = msg.timestamp || msg.createdAt || msg.sentAt;
                    const isAccepted = quote.status.toLowerCase() === "approved";
                    const isDeclined = quote.status.toLowerCase() === "rejected";
                    const canAct = !isAccepted && !isDeclined;

                    return (
                      <div key={msg.id || msg._id || `msg-${i}`} ref={isLast ? messagesEndRef : null} className="bg-white border border-gray-300 rounded-xl shadow-sm p-4 sm:p-6 md:p-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-tight">
                              Submitted - {formatDate(msgDate)}
                            </span>
                            <span
                              className={`px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold border ${
                                isAccepted
                                  ? "border-green-400 bg-green-50 text-green-700"
                                  : isDeclined
                                  ? "border-red-400 bg-red-50 text-red-700"
                                  : "border-blue-400 bg-blue-50 text-blue-600"
                              }`}
                            >
                              {isAccepted ? "Accepted" : isDeclined ? "Declined" : "Offer Sent"}
                            </span>
                          </div>
                          <span className="text-[10px] sm:text-xs text-gray-400 font-medium">
                            From: {senderName}
                          </span>
                        </div>

                        <div className="border-t border-gray-200 mb-6" />

                        <h2 className="text-xl sm:text-2xl font-bold text-gray-700 mb-2">Project Proposal</h2>
                        {content.projectDescription && (
                          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                            {content.projectDescription}
                          </p>
                        )}

                        {propItems.length > 0 && (
                          <div className="border border-gray-300 rounded-lg overflow-x-auto mb-6">
                            <table className="w-full min-w-[500px] sm:min-w-0">
                              <thead>
                                <tr className="border-b border-gray-300 bg-gray-50/50">
                                  <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-bold text-gray-600 w-1/2">Item</th>
                                  <th className="px-4 sm:px-6 py-3 text-center text-xs sm:text-sm font-bold text-gray-600">Duration</th>
                                  <th className="px-4 sm:px-6 py-3 text-right text-xs sm:text-sm font-bold text-gray-600">Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {propItems.map((item: any, idx: number) => (
                                  <tr key={idx} className="border-b border-gray-200 last:border-0">
                                    <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-700 font-medium align-top">
                                      <div>{item.description || item.name}</div>
                                      {item.details && <div className="text-[10px] text-gray-400 mt-0.5">{item.details}</div>}
                                    </td>
                                    <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600 font-medium text-center align-top whitespace-nowrap">
                                      {formatDuration(item.duration)}
                                    </td>
                                    <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-800 text-right font-bold align-top">
                                      ${Number(item?.amount || item?.cost || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        <div className="flex flex-row justify-end gap-6 sm:gap-16 text-xs sm:text-sm mb-8">
                          <div className="text-center">
                            <div className="text-gray-500 font-bold mb-1">Total Duration</div>
                            <div className="font-medium text-gray-700">
                              {content.totalDuration ? formatDuration(content.totalDuration) : "-"}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-500 font-bold mb-1">Total Cost</div>
                            <div className="font-medium text-gray-800">
                              ${Number(content.totalCost ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>

                        {canAct && (
                          <div className="flex flex-col sm:flex-row gap-3 justify-between w-full pt-4 border-t border-gray-100">
                            <button
                              onClick={handleAcceptQuote}
                              disabled={isAccepting || isDeclining}
                              className="flex-1 bg-[#327334] hover:bg-[#285c29] text-white text-xs sm:text-sm font-bold py-3 px-6 rounded-md shadow-sm transition-all disabled:opacity-50 cursor-pointer text-center"
                            >
                              {isAccepting ? <LoadingDots text="Accepting" /> : "Accept Proposal"}
                            </button>
                            <button
                              onClick={handleRequestModification}
                              disabled={isAccepting || isDeclining}
                              className="flex-1 bg-[#1C446F] hover:bg-[#153455] text-white text-xs sm:text-sm font-bold py-3 px-6 rounded-md shadow-sm transition-all disabled:opacity-50 cursor-pointer text-center"
                            >
                              Request Modifications
                            </button>
                            <button
                              onClick={() => setShowDeclineModal(true)}
                              disabled={isAccepting || isDeclining}
                              className="flex-1 bg-[#7D1A1A] hover:bg-[#651515] text-white text-xs sm:text-sm font-bold py-3 px-6 rounded-md shadow-sm transition-all disabled:opacity-50 cursor-pointer text-center"
                            >
                              Decline Proposal
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (msg.type === "system_notification" || msg.isSystemMessage) {
                    const title = msg.content?.systemText || msg.systemText || "System Notification";
                    const text = msg.content?.text || msg.text || "";
                    return (
                      <div key={msg.id || msg._id || `msg-${i}`} className="text-center py-10" ref={isLast ? messagesEndRef : null}>
                        <h3 className="text-3xl font-bold text-gray-600 mb-3">{title}</h3>
                        <p className="text-gray-400 font-medium text-sm">{text}</p>
                      </div>
                    );
                  }

                  const isMe = msg.userId === user?._id || msg.senderId === user?._id || msg.role === "client" || msg.senderRole === "client" || msg.sender === "client";
                  const senderName = isMe ? "You" : msg.username || msg.senderName || manager?.fullName || "Manager";
                  const avatar = isMe ? user?.avatar : msg.userAvatar || msg.senderAvatar || manager?.avatar;
                  const initial = senderName.charAt(0).toUpperCase();

                  const msgDate = msg.timestamp || msg.createdAt || msg.sentAt;
                  const msgText = msg.content?.text || msg.content?.projectDescription || msg.text || msg.message;
                  const timeFormatted = msgDate ? new Date(msgDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
                  const dateFormatted = msgDate ? formatDate(msgDate) : "";
                  const dateDisplay = timeFormatted && dateFormatted && dateFormatted !== "N/A"
                    ? `${timeFormatted} - ${dateFormatted}`
                    : dateFormatted !== "N/A"
                      ? dateFormatted
                      : "";

                  const rawAttached = msg.content?.attachedFiles || msg.attachments || msg.attachedFiles || msg.content?.attachedFilesUrl || msg.attachedFilesUrl || [];
                  const attachedFiles = (Array.isArray(rawAttached) ? rawAttached : []).map((file: any) =>
                    typeof file === 'string'
                      ? { url: file, filename: file.split('/').pop()?.split('?')[0] || 'File' }
                      : { url: file.url, filename: file.filename || file.name || (file.url ? file.url.split('/').pop()?.split('?')[0] : 'File') }
                  ).filter((f: any) => Boolean(f.url));

                  return (
                    <div key={msg.id || msg._id || `msg-${i}`} ref={isLast ? messagesEndRef : null} className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden transition-all duration-300 hover:shadow-md">
                      <div className="p-4 sm:p-6 md:p-8">
                        <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
                          <div className="flex items-center gap-4">
                            {avatar ? (
                              <img src={avatar} alt={senderName} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover shadow-sm bg-gray-100" />
                            ) : (
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-sm bg-gray-800">
                                {initial}
                              </div>
                            )}
                            <div>
                              <h4 className="font-bold text-gray-800 text-base sm:text-lg">{senderName}</h4>
                            </div>
                          </div>
                          {dateDisplay && (
                            <span className="text-[10px] sm:text-sm text-gray-500 font-bold uppercase tracking-wide whitespace-nowrap">
                              {dateDisplay}
                            </span>
                          )}
                        </div>
                        {msgText && msgText.trim() && (
                          <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap pl-0 md:pl-[64px] mb-6">
                            {msgText}
                          </div>
                        )}
                        {attachedFiles.length > 0 && (
                          <div className="pl-0 md:pl-[64px] mb-6">
                            <h5 className="text-sm font-bold text-gray-700 mb-3">Attached Files</h5>
                            <div className="border-t border-gray-200 mb-4" />
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full">
                              {attachedFiles.map((file: any, j: number) => {
                                const url = file.url;
                                const filename = file.filename || file.name || "file";
                                const safeUrl = url.startsWith("http:") ? url.replace("http:", "https:") : url;
                                const isImage = isImageUrl(url);
                                const isSvg = url.toLowerCase().includes(".svg");
                                const isPdf = url.toLowerCase().includes(".pdf") || (url || "").split("?")[0].toLowerCase().endsWith(".pdf");
                                return (
                                  <a
                                    key={j}
                                    href={safeUrl}
                                    onClick={(e) => downloadFile(e as any, safeUrl, filename)}
                                    download={filename}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group block border border-gray-300 rounded-lg w-full h-44 bg-white hover:shadow-md transition-all text-center no-underline overflow-hidden flex flex-col"
                                  >
                                    <div className="flex-grow flex items-center justify-center bg-white relative overflow-hidden">
                                      {isImage ? (
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
                                          <span className="text-3xl">📄</span>
                                          <span className="text-[10px] font-bold text-red-600 uppercase">PDF</span>
                                        </div>
                                      ) : (
                                        <span className="text-3xl">📎</span>
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
                        {msg.recommendedSolutions && msg.recommendedSolutions.length > 0 && (
                          <div className="pl-0 md:pl-[64px]">
                            <h5 className="text-sm font-bold text-gray-700 mb-3">Recommended Solutions</h5>
                            <div className="border-t border-gray-200 mb-4" />
                            <div className="flex flex-nowrap overflow-x-auto pb-4 gap-4 scrollbar-hide">
                              {msg.recommendedSolutions.map((sol: any, j: number) => (
                                <PackageCard key={sol.packageId + j} packageId={sol.packageId} title={sol.title} price={sol.price || 0} imageUrl={sol.mediumUrl || sol.imageUrl} link={sol.link} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mt-6">
              <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-4">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="You" className="w-12 h-12 rounded-full object-cover shadow-sm ring-2 ring-white" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-900 flex items-center justify-center text-white font-bold text-base shadow-sm ring-2 ring-white">
                      {user?.fullName?.charAt(0) || "Y"}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-gray-800 text-base">{user?.fullName || "You"}</h3>
                    <p className="text-xs text-gray-500">New Message</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 font-medium">
                  {currentTimeSet ? new Date().toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" }) : ""}
                </span>
              </div>
              <div className="p-6">
                <textarea
                  className="w-full min-h-[120px] text-gray-700 text-sm leading-relaxed resize-none focus:outline-none placeholder-gray-400 bg-transparent cursor-pointer"
                  placeholder={user ? "Type a message or request modifications..." : "Please log in or register to message our team..."}
                  value={messageText}
                  onChange={(e) => {
                    if (!user) {
                      setShowAuthModal(true);
                      return;
                    }
                    setMessageText(e.target.value);
                  }}
                  onClick={() => {
                    if (!user) setShowAuthModal(true);
                  }}
                  onFocus={() => {
                    if (!user) setShowAuthModal(true);
                  }}
                  readOnly={!user}
                />
              </div>

              {attachments.length > 0 && (
                <div className="px-6 pb-4 flex flex-wrap gap-2">
                  {attachments.map((file) => (
                    <div key={file.id} className="flex items-center gap-2 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-900">
                      <span>📎</span>
                      <span className="truncate max-w-[160px]">{file.name}</span>
                      {file.status === "uploading" ? (
                        <span className="text-[10px] text-blue-500 italic">uploading...</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeAttachment(file.id)}
                          className="text-red-400 hover:text-red-600 font-bold ml-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="px-6 pb-6 pt-2 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) {
                        setShowAuthModal(true);
                        return;
                      }
                      fileInputRef.current?.click();
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    <span>📎</span>
                    Attach Files
                  </button>
                </div>

                <div className="flex gap-3 w-full sm:w-auto">
                  <button
                    onClick={(e) => {
                      if (!user) {
                        e.preventDefault();
                        setShowAuthModal(true);
                        return;
                      }
                      handleSendMessage();
                    }}
                    disabled={user && (isSending || (!messageText.trim() && attachments.length === 0) || attachments.some((a) => a.status === "uploading"))}
                    className="flex-1 sm:flex-none px-10 py-2.5 bg-blue-800 hover:bg-blue-900 text-white rounded-md text-sm font-bold transition-all disabled:bg-gray-400 cursor-pointer"
                  >
                    {isSending ? <LoadingDots text="Sending" /> : "Send Message"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-8 sticky top-28">
            <div className="text-center">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full mx-auto mb-4 flex items-center justify-center shadow-md overflow-hidden bg-gray-100 border border-gray-200">
                {manager?.avatar ? (
                  <img src={manager.avatar} alt={manager.fullName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-3xl font-bold">
                    {manager?.fullName ? manager.fullName[0] : "?"}
                  </div>
                )}
              </div>
              <h4 className="text-lg font-bold text-gray-800 mb-1">{manager?.fullName || "Not assigned yet"}</h4>
              <p className="text-sm text-gray-500 mb-4 font-medium uppercase tracking-wider text-[10px]">Project Manager</p>
            </div>
          </div>
        </div>
      </div>

      {/* Decline Proposal Modal */}
      {showDeclineModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => !isDeclining && setShowDeclineModal(false)}
        >
          <div
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-800 mb-2">Decline Proposal</h3>
            <p className="text-xs text-gray-500 mb-4">
              Are you sure you want to decline this proposal? You can optionally provide feedback to our team below.
            </p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Reason for declining (optional)..."
              className="w-full h-24 p-3 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 mb-5"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={isDeclining}
                onClick={() => setShowDeclineModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeclining}
                onClick={handleDeclineQuote}
                className="px-5 py-2 bg-[#7D1A1A] hover:bg-[#651515] text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-60 cursor-pointer"
              >
                {isDeclining ? <LoadingDots text="Declining" /> : "Decline Proposal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Prompt Modal */}
      <AuthPromptModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Join the Conversation"
        description="Please log in or register to message our team and collaborate on this quote."
        redirectUrl={quote?._id ? `/dashboard/my-quotes/${quote._id}/details` : undefined}
      />
    </div>
  );
}
