"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQuote } from "../layout";
import { authService } from "@/lib/authService";
import { quoteService } from "@/lib/quoteService";
import { projectService } from "@/lib/projectService";
import { mediaService } from "@/lib/mediaService";
import { packagesService } from "@/lib/packagesService";
import { downloadFile, isImageUrl, getSafeUrl } from "@/lib/utils";
import AuthPromptModal from "@/components/common/AuthPromptModal";
import { io, Socket } from "socket.io-client";

// Helper components
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

const PackageCard = ({
  packageId,
  title,
  price,
  imageUrl,
  category,
  description,
  link,
}: any) => {
  const safeImg = imageUrl ? getSafeUrl(imageUrl) : null;
  const isSvg = safeImg ? safeImg.toLowerCase().includes(".svg") : false;

  const displayPrice =
    typeof price === "number"
      ? `$${price.toLocaleString("en-US")}`
      : price
      ? String(price).startsWith("$") || String(price).startsWith("€")
        ? String(price)
        : `$ ${price}`
      : "";

  return (
    <a
      href={link || `/dashboard/new-project/packages/${packageId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all group w-full sm:w-[260px] md:w-[280px] shrink-0 no-underline text-left"
    >
      <div className="h-36 sm:h-40 bg-gray-100 relative overflow-hidden flex items-center justify-center">
        {safeImg ? (
          <img
            src={safeImg}
            alt={title}
            className={`w-full h-full transition-transform duration-300 group-hover:scale-105 ${
              isSvg ? "object-contain p-2.5" : "object-cover"
            }`}
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src.startsWith("http:") && !target.src.includes("localhost") && !target.src.includes("127.0.0.1")) {
                target.src = target.src.replace("http:", "https:");
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
      </div>

      <div className="p-4 flex flex-col flex-1 bg-white">
        {category && (
          <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider w-fit mb-2">
            {category}
          </span>
        )}
        <h4 className="font-bold text-gray-800 text-sm leading-snug mb-1.5 group-hover:text-blue-600 transition-colors line-clamp-2">
          {title}
        </h4>
        {description && (
          <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">
            {description}
          </p>
        )}
        <div className="mt-auto pt-2 flex items-center justify-between border-t border-gray-100">
          <span className="font-bold text-gray-800 text-xs sm:text-sm">
            {displayPrice}
          </span>
          <span className="text-[10px] text-blue-600 font-semibold group-hover:underline flex items-center gap-1">
            View Details →
          </span>
        </div>
      </div>
    </a>
  );
};

const toIdString = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed && trimmed !== "[object Object]" ? trimmed : "";
  }
  if (typeof value === "object") {
    if (typeof value.toHexString === "function") return value.toHexString();
    if (value._id) return toIdString(value._id);
    if (typeof value.toString === "function") {
      const str = value.toString();
      if (str && str !== "[object Object]") return str;
    }
    if (typeof value.id === "string") return toIdString(value.id);
  }
  return "";
};

const projectIdFromResponse = (res: any, quoteId: string): string => {
  const payload = res?.data?.data || res?.data || res;
  const candidates = [
    payload?._id,
    payload?.id,
    payload?.projectId,
    payload?.project?._id,
    payload?.project?.id,
  ];
  for (const c of candidates) {
    const id = toIdString(c);
    if (id && id !== quoteId) return id;
  }
  return "";
};

const extractProjectId = (quoteObj: any, msgObj?: any, contentObj?: any): string => {
  const quoteId = toIdString(quoteObj?._id || quoteObj?.id || quoteObj?.quoteId);
  const candidates = [
    contentObj?.projectId,
    msgObj?.content?.projectId,
    msgObj?.projectId,
    quoteObj?.projectId,
    quoteObj?.project?._id,
    quoteObj?.project?.id,
    quoteObj?.project,
  ];
  if (Array.isArray(quoteObj?.messages)) {
    for (const msg of quoteObj.messages) {
      candidates.push(msg?.content?.projectId, msg?.projectId);
    }
  }
  for (const c of candidates) {
    const id = toIdString(c);
    if (id && id !== quoteId) return id;
  }
  return "";
};

export default function QuoteDetailsPage() {
  const { quote, setQuote, refreshQuote } = useQuote();
  const router = useRouter();

  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isOpeningProject, setIsOpeningProject] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [attachments, setAttachments] = useState<
    Array<{ id: string; name: string; status: "uploading" | "done" | "error"; url?: string; file?: File }>
  >([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const u = authService.getUser();
    if (u) setUser(u);
  }, []);

  // Real-time socket connection
  useEffect(() => {
    let activeSocket: Socket | null = null;
    let isCancelled = false;

    const qId = quote?._id ? quote._id.toString() : (quote?.id ? quote.id.toString() : "");
    if (!qId) return;

    const connectSocket = async () => {
      let token = authService.getAccessToken();
      if (!token) {
        token = await authService.refreshToken();
      }

      if (isCancelled) return;

      const currentUserObj = authService.getUser();
      const uId = currentUserObj?.id || currentUserObj?._id;

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
        sock.emit("joinProject", qId);
        sock.emit("joinProject", { projectId: qId });
        sock.emit("joinQuote", qId);
      });

      const handleMessageUpdate = (data: any) => {
        const incomingId = data?.projectId || data?.quoteId || data?.project?._id || data?.quote?._id;
        if (!incomingId || String(incomingId) === String(qId)) {
          refreshQuote(true);
        }
      };

      sock.on("quoteMessage", handleMessageUpdate);
      sock.on("quote_message", handleMessageUpdate);
      sock.on("quoteUpdated", handleMessageUpdate);
      sock.on("projectMessage", handleMessageUpdate);
      sock.on("newMessage", handleMessageUpdate);
      sock.on("notification", (notif: any) => {
        const pId = notif?.data?.quoteId || notif?.data?.projectId || notif?.quoteId || notif?.projectId;
        if (!pId || String(pId) === String(qId)) {
          refreshQuote(true);
        }
      });
    };

    connectSocket();

    return () => {
      isCancelled = true;
      if (activeSocket) {
        try {
          activeSocket.emit("leaveProject", qId);
          activeSocket.disconnect();
        } catch {}
      }
    };
  }, [quote?._id, quote?.id, refreshQuote]);

  if (!quote) return null;

  // Format Helpers
  const currency = (quote.currency || "eur").toUpperCase();
  const formatCurrency = (amt: any) => {
    const num = Number(amt || 0);
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    } catch {
      return `€${num.toFixed(2)}`;
    }
  };

  const formatDateTime = (date: string | Date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatQuoteDate = (date: string | Date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const month = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
    const day = d.getDate();
    const time = d
      .toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
      .toUpperCase();
    return `${month} ${day}, ${time}`;
  };

  const formatMessageTime = (date: string | Date) => {
    return formatQuoteDate(date);
  };

  const getStatusBadgeClass = (status: string) => {
    const s = (status || "PENDING").toUpperCase();
    switch (s) {
      case "SENT":
      case "SUBMITTED":
      case "PENDING":
      case "REQUESTED":
      case "OFFER_SENT":
      case "PROPOSAL_SENT":
      case "REVIEW":
      case "UNDER_REVIEW":
      case "IN_REVIEW":
        return "bg-[#DBEAFE] text-[#1D4ED8]";
      case "APPROVED":
      case "ACCEPTED":
      case "COMPLETED":
        return "bg-[#DCFCE7] text-[#15803D]";
      case "DECLINED":
      case "REJECTED":
      case "CANCELLED":
        return "bg-[#FEE2E2] text-[#B91C1C]";
      default:
        return "bg-[#DBEAFE] text-[#1D4ED8]";
    }
  };

  const formatDuration = (val: any) => {
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
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    e.target.value = "";

    const newItems = files.map((file) => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      status: "uploading" as const,
      file,
      url: "",
    }));

    setAttachments((prev) => [...prev, ...newItems]);

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

  const resolveCreatedProjectId = async (quoteObj: any, msg?: any, content?: any): Promise<string> => {
    const quoteId = toIdString(quoteObj?._id || quote?._id);
    let projectId = extractProjectId(quoteObj || quote, msg, content);
    if (projectId) return projectId;

    if (quoteId) {
      try {
        const latest = await quoteService.getQuoteById(quoteId);
        const latestQuote = latest?.data?.data || latest?.data;
        if (latestQuote) {
          setQuote(latestQuote);
          projectId = extractProjectId(latestQuote, msg, content);
          if (projectId) return projectId;
        }
      } catch (e) {
        console.error("Failed to refresh quote for project redirect:", e);
      }

      try {
        const projectRes = await projectService.getProjectById(quoteId);
        projectId = projectIdFromResponse(projectRes, quoteId);
        if (projectId) return projectId;
      } catch (e) {
        console.error("Failed to resolve project by quote id:", e);
      }
    }
    return "";
  };

  const goToCreatedProject = async (msg?: any, content?: any) => {
    if (isOpeningProject) return;
    setIsOpeningProject(true);
    try {
      const projectId = await resolveCreatedProjectId(quote, msg, content);
      if (projectId) {
        router.push(`/dashboard/my-projects/${projectId}/details`);
        return;
      }
      toast.error("Project is not ready yet. Please try again.");
    } finally {
      setIsOpeningProject(false);
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
        messageInputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
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

  // Manager resolution
  const manager = quote.assignedManager || (quote.assignedManagers && quote.assignedManagers[0]);
  const managerName = manager?.fullName;
  const managerInitial = managerName ? managerName.charAt(0).toUpperCase() : "M";

  // Client resolution
  const clientName = user?.fullName || quote.user?.fullName || quote.clientName || quote.userName || "Client";
  const clientAvatar = user?.avatar || quote.user?.avatar || quote.clientAvatar;
  const clientInitials = clientName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "SS";

  const quoteNumber = quote.quoteNumber || (quote._id ? `INV-2026-${quote._id.slice(-3).toUpperCase()}` : "INV-2026-015");
  const quoteStatus = (quote.status || "PENDING").toUpperCase();
  const submittedTimestamp = formatQuoteDate(quote.createdAt || quote.dateSubmitted || new Date());

  // Find initial request message
  const requestMsg = (quote.messages || quote.conversations || []).find(
    (m: any) => m.type === "quote_request" || m.type === "initial_request" || m.role === "client"
  );

  const rawAttached =
    (Array.isArray(quote.attachedFilesUrl) && quote.attachedFilesUrl.length > 0 && quote.attachedFilesUrl) ||
    (Array.isArray(quote.attachedFiles) && quote.attachedFiles.length > 0 && quote.attachedFiles) ||
    (Array.isArray(requestMsg?.content?.attachedFiles) && requestMsg.content.attachedFiles.length > 0 && requestMsg.content.attachedFiles) ||
    (Array.isArray(requestMsg?.content?.attachedFilesUrl) && requestMsg.content.attachedFilesUrl.length > 0 && requestMsg.content.attachedFilesUrl) ||
    (Array.isArray(quote.messages?.[0]?.content?.attachedFiles) && quote.messages[0].content.attachedFiles.length > 0 && quote.messages[0].content.attachedFiles) ||
    (Array.isArray(quote.files) && quote.files.length > 0 && quote.files) ||
    (Array.isArray(quote.attachments) && quote.attachments.length > 0 && quote.attachments) ||
    [];

  const quoteAttachedFiles: any[] = Array.isArray(rawAttached) ? rawAttached : [];

  const userInitial = (user?.fullName || clientName || "S").charAt(0).toUpperCase();
  const nowFormatted = formatDateTime(new Date());

  // Messages list excluding the initial quote request if it's already shown in the top card
  const allMessages = (quote.messages && quote.messages.length > 0)
    ? quote.messages.filter((m: any, idx: number) => !(idx === 0 && (m.type === "quote_request" || m.type === "initial_request")))
    : (quote.conversations && quote.conversations.length > 0)
    ? quote.conversations.filter((m: any, idx: number) => !(idx === 0 && (m.type === "quote_request" || m.type === "initial_request")))
    : [];

  return (
    <div className="flex flex-col gap-8 w-full font-sans max-w-[1440px] mx-auto">
      {/* Top Header Title & Description */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
          {quote.projectTitle || "website ff"}
        </h1>
        <p className="text-sm text-gray-500 font-normal leading-relaxed">
          {quote.projectDescription || "Thank you for submitting your request! Our team is reviewing and will provide a custom quote shortly."}
        </p>
      </div>

      {/* Top 2 Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Card: Quote Request Summary Card (col-span-2) */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col justify-between">
          <div>
            {/* Top Row: Client Info + Status Badge + Date */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
              <div className="flex items-center gap-3.5">
                {clientAvatar ? (
                  <img src={clientAvatar} alt={clientName} className="w-11 h-11 rounded-full object-cover shadow-sm" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-[#18233A] text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                    {clientInitials}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base">{clientName}</h3>
                  <p className="text-xs text-gray-400 font-medium">Quote #{quoteNumber}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${getStatusBadgeClass(quoteStatus)}`}>
                  {quoteStatus}
                </span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {submittedTimestamp}
                </span>
              </div>
            </div>

            {/* Details Section */}
            <div className="space-y-4 pt-2">
              <div>
                <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  PROJECT TITLE
                </span>
                <h4 className="font-bold text-gray-900 text-base sm:text-lg">{quote.projectTitle || "website ff"}</h4>
              </div>

              <div className="border-t border-gray-100 my-5" />

              <div>
                <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  PROJECT DESCRIPTION
                </span>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-normal">
                  {quote.projectDescription || "Thank you for submitting your request! Our team is reviewing and will provide a custom quote shortly."}
                </p>
              </div>

              {quoteAttachedFiles.length > 0 && (
                <>
                  <div className="border-t border-gray-100 my-5" />
                  <div>
                    <span className="text-xs sm:text-[13px] font-bold text-gray-900 block mb-3.5">
                      Attached Files
                    </span>
                    <div className="flex items-center gap-4 overflow-x-auto pb-1 scrollbar-hide">
                      {quoteAttachedFiles.map((fileItem: any, idx: number) => {
                        const url = typeof fileItem === "string" ? fileItem : (fileItem.url || fileItem.path || fileItem.secure_url || "");
                        const rawName = typeof fileItem === "string" ? fileItem.split("/").pop() || `File-${idx + 1}` : (fileItem.filename || fileItem.name || fileItem.fileName || url.split("/").pop() || `File-${idx + 1}`);
                        const fileName = decodeURIComponent(rawName.split("?")[0]);
                        const safeUrl = getSafeUrl(url);
                        const isImg = isImageUrl(safeUrl) || /\.(svg|png|jpg|jpeg|webp|gif|bmp|ico|avif)$/i.test(fileName) || isImageUrl(fileName);

                        return (
                          <a
                            key={idx}
                            href={safeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-[140px] h-[140px] sm:w-[150px] sm:h-[150px] bg-white border border-gray-200 rounded-[10px] overflow-hidden flex flex-col hover:border-gray-300 hover:shadow-sm transition-all flex-shrink-0 group relative"
                          >
                            <div className="flex-1 w-full bg-white flex items-center justify-center p-3 overflow-hidden relative">
                              {isImg ? (
                                <img
                                  src={safeUrl}
                                  alt={fileName}
                                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    if (target.src.startsWith("http:") && !target.src.includes("localhost") && !target.src.includes("127.0.0.1")) {
                                      target.src = target.src.replace("http:", "https:");
                                    }
                                  }}
                                />
                              ) : (
                                <svg
                                  className="w-10 h-10 text-gray-400 group-hover:text-gray-600 transition-colors"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.5"
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                              )}

                              {/* Hover download / view icon */}
                              <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                <div className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-blue-600">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                            <div className="bg-[#F8FAFC] border-t border-gray-100 px-2 py-2 text-center w-full">
                              <span className="text-[10px] sm:text-[11px] text-gray-500 font-normal truncate block w-full" title={fileName}>
                                {fileName}
                              </span>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Card: Project Manager Card (col-span-1) */}
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col items-center justify-center text-center self-start h-auto min-h-[220px]">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full mx-auto mb-4 flex items-center justify-center shadow-inner overflow-hidden bg-gradient-to-b from-[#C4CAD4] to-[#94A3B8] flex-shrink-0">
            {manager?.avatar ? (
              <img src={manager.avatar} alt={managerName} className="w-full h-full object-cover" />
            ) : null}
          </div>
          <h4 className="font-bold text-gray-900 text-sm sm:text-base mb-1">
            {manager ? managerName : "Not assigned yet"}
          </h4>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">PROJECT MANAGER</p>
        </div>
      </div>

      {/* Center Section Divider */}
      <div className="relative py-4 flex items-center justify-center w-full my-2">
        <div className="flex-grow border-t border-gray-200"></div>
        <span className="px-4 text-xs font-semibold text-gray-400 bg-white">
          Quote Request Submitted
        </span>
        <div className="flex-grow border-t border-gray-200"></div>
      </div>

      {/* Messages and Proposals Feed */}
      <div className="flex flex-col gap-6 w-full">
        {allMessages.map((msg: any, i: number) => {
          const msgId = msg.id || msg._id || `msg-${i}`;
          const isLast = i === allMessages.length - 1;
          const msgDate = msg.timestamp || msg.createdAt || msg.sentAt;

          // System Notification
          if (msg.type === "system_notification" || msg.isSystemMessage) {
            const title = msg.content?.systemText || msg.systemText || msg.message || "System Notification";
            const text = msg.content?.text || msg.text || "";
            // If a quote_proposal card is already displaying the Project Created or Offer header, skip system notification
            const hasAcceptedProposal = allMessages.some((m: any) => m.type === "quote_proposal" && (m.content?.status === "accepted" || quote.status?.toLowerCase() === "approved"));
            if (
              title.toLowerCase().includes("offer") ||
              title.toLowerCase().includes("proposal") ||
              text.toLowerCase().includes("sent you a new offer") ||
              text.toLowerCase().includes("prepared a custom proposal") ||
              (hasAcceptedProposal && (title.toLowerCase().includes("project created") || text.toLowerCase().includes("active project")))
            ) {
              return null;
            }

            // Standalone Project Created notification banner
            if (
              title.toLowerCase().includes("project created") ||
              text.toLowerCase().includes("converted into an active project") ||
              text.toLowerCase().includes("active project")
            ) {
              return (
                <div key={msgId} className="text-center my-8 py-2 w-full" ref={isLast ? messagesEndRef : null}>
                  <h2 className="text-2xl sm:text-[28px] md:text-3xl font-extrabold text-[#111827] mb-2 tracking-tight">
                    Project Created
                  </h2>
                  <p className="text-xs sm:text-sm font-medium text-gray-500 mb-5 max-w-lg mx-auto leading-relaxed">
                    Great news! Your quote has been converted into an active project.
                  </p>
                  <button
                    type="button"
                    onClick={() => goToCreatedProject(msg, msg.content)}
                    disabled={isOpeningProject}
                    className="inline-flex items-center justify-center gap-1.5 bg-[#4343F0] hover:bg-[#3232b7] text-white text-xs sm:text-sm font-bold py-2.5 px-6 rounded-[6px] shadow-sm transition-all active:scale-95 cursor-pointer mx-auto disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isOpeningProject ? (
                      <LoadingDots text="Opening" />
                    ) : (
                      <>
                        View Project
                        <svg className="w-3.5 h-3.5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              );
            }

            return (
              <div key={msgId} className="text-center py-6 px-4 bg-white/70 rounded-xl border border-gray-200" ref={isLast ? messagesEndRef : null}>
                <h3 className="text-lg font-bold text-gray-700 mb-1">{title}</h3>
                <p className="text-sm font-medium text-gray-500">{text}</p>
              </div>
            );
          }

          // Quote Proposal / Offer Message
          if (msg.type === "quote_proposal") {
            const content = msg.content || {};
            const propItems =
              content.lineItems && content.lineItems.length > 0
                ? content.lineItems
                : content.deliverableItems && content.deliverableItems.length > 0
                ? content.deliverableItems
                : [];
            const senderName = msg.username || msg.senderName || managerName;
            const proposalDesc = content.projectDescription || content.text || msg.message || "";
            const totalDuration = content.totalDuration || quote.totalDuration || "-";
            const totalCost = content.totalCost ?? quote.totalCost ?? 0;

            // Check if there is a later proposal message (making this one superseded)
            const hasLaterProposal = allMessages.slice(i + 1).some((m: any) => m.type === "quote_proposal");
            const isSuperseded = hasLaterProposal || content.status === "superseded";
            const isAccepted = content.status === "accepted" || quote.status?.toLowerCase() === "approved";
            const isDeclined = content.status === "declined" || content.status === "rejected" || quote.status?.toLowerCase() === "rejected";
            const canAct = !isSuperseded && !isAccepted && !isDeclined;

            return (
              <div key={msgId} ref={isLast ? messagesEndRef : null} className="w-full">
                {/* Header above offer card - only when offer is pending */}
                {!isSuperseded && !isAccepted && !isDeclined && (
                  <div className="text-center my-8">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111827] mb-2">
                      You Received an Offer
                    </h2>
                    <p className="text-sm font-medium text-gray-500">
                      Weve prepared a custom proposal for your project.
                    </p>
                  </div>
                )}

                {/* Proposal Card */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 md:p-10 shadow-sm">
                  {/* Card Top Row: Title on Left, From on Right */}
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Project Proposal</h3>
                      {isSuperseded ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold border border-gray-300 text-gray-500 bg-white">
                          Superseded
                        </span>
                      ) : isDeclined ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold border border-red-300 bg-red-50 text-red-700">
                          Declined
                        </span>
                      ) : null}
                    </div>
                    {senderName && (
                      <span className="text-xs sm:text-sm text-gray-400 font-normal">
                        From: {senderName}
                      </span>
                    )}
                  </div>

                  {/* Proposal Description */}
                  {proposalDesc && (
                    <p className="text-xs sm:text-sm text-gray-500 mb-6 font-normal leading-relaxed">
                      {proposalDesc}
                    </p>
                  )}

                  {/* Line Items Table */}
                  {propItems.length > 0 && (
                    <div className="border border-gray-200 rounded-xl overflow-x-auto mb-6">
                      <table className="w-full min-w-[500px] sm:min-w-0">
                        <thead>
                          <tr className="border-b border-gray-200 bg-white">
                            <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-700 w-1/2">Item</th>
                            <th className="px-6 py-3.5 text-center text-xs font-bold text-gray-700">Duration</th>
                            <th className="px-6 py-3.5 text-right text-xs font-bold text-gray-700">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {propItems.map((item: any, idx: number) => (
                            <tr key={idx} className="border-b border-gray-100 last:border-0">
                              <td className="px-6 py-4 text-xs font-semibold text-gray-800 align-middle">
                                <div>{item.description || item.name || item.title}</div>
                                {item.details && <div className="text-[10px] text-gray-400 font-normal mt-0.5">{item.details}</div>}
                              </td>
                              <td className="px-6 py-4 text-xs text-gray-600 font-medium text-center align-middle whitespace-nowrap">
                                {formatDuration(item.duration)}
                              </td>
                              <td className="px-6 py-4 text-xs text-gray-900 font-bold text-right align-middle">
                                {formatCurrency(item.amount ?? item.cost ?? 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Total Duration & Cost */}
                  <div className="flex justify-end gap-12 sm:gap-16 text-xs mb-2">
                    <div className="text-center">
                      <div className="text-gray-400 font-bold text-[11px] uppercase tracking-wider mb-1">Total Duration</div>
                      <div className="text-gray-800 font-bold text-sm sm:text-base">{formatDuration(totalDuration)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-400 font-bold text-[11px] uppercase tracking-wider mb-1">Total Cost</div>
                      <div className="text-gray-900 font-extrabold text-sm sm:text-base">{formatCurrency(totalCost)}</div>
                    </div>
                  </div>

                  {/* Action Buttons (Accept, Request Modifications, Decline) */}
                  {canAct && (
                    <div className="flex flex-col sm:flex-row gap-3 justify-between w-full pt-6 mt-6 border-t border-gray-100">
                      <button
                        onClick={handleAcceptQuote}
                        disabled={isAccepting || isDeclining}
                        className="flex-1 bg-[#2E7D32] hover:bg-[#256628] text-white font-bold text-xs sm:text-sm py-3.5 px-6 rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer text-center"
                      >
                        {isAccepting ? <LoadingDots text="Accepting" /> : "Accept Proposal"}
                      </button>
                      <button
                        onClick={handleRequestModification}
                        disabled={isAccepting || isDeclining}
                        className="flex-1 bg-[#1A365D] hover:bg-[#132846] text-white font-bold text-xs sm:text-sm py-3.5 px-6 rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer text-center"
                      >
                        Request Modifications
                      </button>
                      <button
                        onClick={() => setShowDeclineModal(true)}
                        disabled={isAccepting || isDeclining}
                        className="flex-1 bg-[#7A1C1C] hover:bg-[#631616] text-white font-bold text-xs sm:text-sm py-3.5 px-6 rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer text-center"
                      >
                        Decline Proposal
                      </button>
                    </div>
                  )}
                </div>

                {/* Project Created section below the accepted proposal card */}
                {isAccepted && !isSuperseded && (
                  <div className="text-center my-12 py-2 w-full">
                    <h2 className="text-2xl sm:text-[28px] md:text-3xl font-extrabold text-[#111827] mb-2 tracking-tight">
                      Project Created
                    </h2>
                    <p className="text-xs sm:text-sm font-normal text-gray-500 mb-6 max-w-lg mx-auto leading-relaxed">
                      Great news! Your quote has been converted into an active project.
                    </p>
                    <button
                      type="button"
                      onClick={() => goToCreatedProject(msg, content)}
                      disabled={isOpeningProject}
                      className="inline-flex items-center justify-center gap-1.5 bg-[#4343F0] hover:bg-[#3232b7] text-white text-xs sm:text-sm font-bold py-2.5 px-6 rounded-[6px] shadow-sm transition-all active:scale-95 cursor-pointer mx-auto disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isOpeningProject ? (
                        <LoadingDots text="Opening" />
                      ) : (
                        <>
                          View Project
                          <svg className="w-3.5 h-3.5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          }

          // Regular User / Staff Message
          const isMe = msg.userId === user?._id || msg.senderId === user?._id || msg.role === "client" || msg.senderRole === "client" || msg.sender === "client";
          const senderName = isMe ? (user?.fullName || "You") : (msg.username || msg.senderName || managerName);
          const senderAvatar = isMe ? user?.avatar : (msg.userAvatar || msg.senderAvatar || manager?.avatar);
          const senderInitial = (senderName || "U").charAt(0).toUpperCase();
          const msgText = msg.content?.text || msg.content?.projectDescription || msg.text || msg.message || "";
          const rawAttachments = msg.content?.attachedFiles || msg.attachments || msg.attachedFiles || msg.content?.attachedFilesUrl || msg.attachedFilesUrl || [];
          const attachmentList = (Array.isArray(rawAttachments) ? rawAttachments : []).map((file: any) =>
            typeof file === "string"
              ? { url: file, filename: file.split("/").pop()?.split("?")[0] || "File" }
              : { url: file.url, filename: file.filename || file.name || (file.url ? file.url.split("/").pop()?.split("?")[0] : "File") }
          ).filter((f: any) => Boolean(f.url));

          return (
            <div key={msgId} ref={isLast ? messagesEndRef : null} className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {senderAvatar ? (
                    <img src={senderAvatar} alt={senderName} className="w-10 h-10 rounded-full object-cover shadow-sm" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#18233A] text-white font-bold flex items-center justify-center text-sm shadow-sm">
                      {senderInitial}
                    </div>
                  )}
                  <h4 className="font-bold text-gray-900 text-sm sm:text-base">{senderName}</h4>
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wide">
                  {formatMessageTime(msgDate)}
                </span>
              </div>

              {msgText && (
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                  {msgText}
                </p>
              )}

              {/* Attachments if any */}
              {attachmentList.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Attached Files</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full">
                    {attachmentList.map((file: any, j: number) => {
                      const url = file.url;
                      const filename = file.filename || "file";
                      const safeUrl = getSafeUrl(url);
                      const isImg = isImageUrl(url);
                      const isSvg = url.toLowerCase().includes(".svg");
                      const isPdf = url.toLowerCase().includes(".pdf");

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
                                  if (target.src.startsWith("http:") && !target.src.includes("localhost") && !target.src.includes("127.0.0.1")) {
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

              {/* Recommended Solutions if any */}
              {((msg.recommendedSolutions && msg.recommendedSolutions.length > 0) ||
                (msg.content?.recommendedSolutions && msg.content.recommendedSolutions.length > 0)) && (
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <h5 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
                    Recommended Solutions
                  </h5>
                  <div className="flex flex-wrap sm:flex-nowrap sm:overflow-x-auto pb-2 gap-4 scrollbar-hide">
                    {(msg.recommendedSolutions || msg.content?.recommendedSolutions).map((sol: any, j: number) => (
                      <PackageCard
                        key={(sol.packageId || sol._id || j) + "-" + j}
                        packageId={sol.packageId || sol._id || sol.id}
                        title={sol.title || sol.name}
                        price={sol.price || sol.amount}
                        imageUrl={sol.imageUrl || sol.mediumUrl || sol.thumbnailUrl}
                        category={sol.category || sol.categorycode}
                        description={sol.description}
                        link={sol.link || `/dashboard/new-project/packages/${sol.packageId || sol._id || sol.id}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New Message / Reply Box */}
      <div ref={messageInputRef} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mt-2">
        {/* Box Top Header */}
        <div className="p-6 pb-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            {user?.avatar ? (
              <img src={user.avatar} alt="You" className="w-10 h-10 rounded-full object-cover shadow-sm" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#183B7B] text-white font-bold flex items-center justify-center text-sm shadow-sm">
                {userInitial}
              </div>
            )}
            <div>
              <h4 className="font-bold text-gray-900 text-sm">{user?.fullName || clientName || "saurav singh"}</h4>
              <p className="text-xs text-gray-400 font-medium">New Message</p>
            </div>
          </div>
          <span className="text-xs text-gray-400 font-medium">{nowFormatted}</span>
        </div>

        {/* Textarea */}
        <div className="p-6">
          <textarea
            className="w-full text-sm text-gray-800 placeholder-gray-400 border-0 focus:outline-none min-h-[100px] resize-none bg-transparent cursor-pointer"
            placeholder={user ? "Type a message..." : "Please log in or register to message our team..."}
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
          />

          {/* Attachments Preview Grid */}
          {attachments.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-3">
              {attachments.map((att) => {
                const isImg = (att.url ? isImageUrl(att.url) : false) || att.file?.type?.startsWith("image/") || /\.(svg|png|jpg|jpeg|webp|gif|bmp|ico|avif)$/i.test(att.name);
                const displayUrl = getSafeUrl(att.url || (att.file ? URL.createObjectURL(att.file) : ""));
                return (
                  <div
                    key={att.id}
                    className="w-24 h-24 sm:w-28 sm:h-28 border border-gray-200 rounded-xl p-2 flex flex-col items-center justify-between bg-white relative group shadow-sm hover:border-gray-300 transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow cursor-pointer hover:bg-red-600"
                      title="Remove file"
                    >
                      ×
                    </button>
                    <div className="w-full flex-1 flex items-center justify-center overflow-hidden">
                      {isImg && displayUrl ? (
                        <img
                          src={displayUrl}
                          alt={att.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (target.src.startsWith("http:") && !target.src.includes("localhost") && !target.src.includes("127.0.0.1")) {
                              target.src = target.src.replace("http:", "https:");
                            }
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="w-full text-center mt-1">
                      <p className="text-[11px] font-medium text-gray-700 truncate w-full" title={att.name}>
                        {att.name}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium capitalize">
                        {att.status === "done" ? "Ready" : att.status === "uploading" ? "Uploading..." : "Failed"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
          <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
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
                className="w-full sm:w-auto flex items-center justify-center gap-2 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold text-xs py-2 px-4 rounded-lg transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
                Attach Files
                {attachments.length > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-[#4343F0] text-white text-[11px] font-bold rounded-full ml-1">
                    {attachments.length}
                  </span>
                )}
              </button>
            </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                setMessageText("");
                setAttachments([]);
              }}
              className="flex-1 sm:flex-none bg-[#7A1C1C] hover:bg-[#631616] text-white font-bold text-xs py-2.5 px-6 rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => {
                if (!user) {
                  e.preventDefault();
                  setShowAuthModal(true);
                  return;
                }
                handleSendMessage();
              }}
              disabled={
                user &&
                (isSending ||
                  (!messageText.trim() && attachments.length === 0) ||
                  attachments.some((a) => a.status === "uploading"))
              }
              className="flex-1 sm:flex-none bg-[#7B8BF5] hover:bg-[#5356ff] text-white font-bold text-xs py-2.5 px-7 rounded-lg transition-colors cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isSending ? <LoadingDots text="Sending" /> : "Send Message"}
            </button>
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
