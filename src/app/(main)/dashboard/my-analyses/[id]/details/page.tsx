"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAnalysis } from "@/context/AnalysisContext";
import { analysesService } from "@/lib/analysesService";
import { mediaService } from "@/lib/mediaService";
import { authService } from "@/lib/authService";
import { packagesService } from "@/lib/packagesService";
import { downloadFile, isImageUrl, getSafeUrl } from "@/lib/utils";
import LoadingDots from "@/components/common/LoadingDots";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";
import AuthPromptModal from "@/components/common/AuthPromptModal";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

const formatStatusTitle = (rawTitle: string): string => {
  if (!rawTitle) return "System notification";
  let clean = rawTitle
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}⏸▶️💳🛠️🎉✅🔄👤🚀📌🔔]/gu, "")
    .trim();

  const lower = clean.toLowerCase();
  if (lower === "action required: payment" || lower === "payment required" || lower === "project paused" || lower === "analysis paused" || lower.includes("paused")) {
    return "Analysis paused";
  }
  if (lower.startsWith("project status updated to active") || lower.startsWith("analysis status updated to active") || lower === "active" || lower === "project resumed" || lower === "analysis resumed" || lower.includes("resumed")) {
    return "Analysis resumed";
  }
  if (lower === "project completed" || lower === "analysis completed" || lower === "order completed!" || lower === "order completed" || lower.includes("completed")) {
    return "Analysis completed!";
  }
  if (lower === "project manager assigned" || lower === "analysis manager assigned" || lower === "manager assigned" || lower.includes("manager assigned")) {
    return "Manager assigned";
  }
  if (lower.includes("project")) {
    clean = clean.replace(/projects/gi, "analyses").replace(/project/gi, "analysis");
  }
  if (clean.length > 0) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return clean;
};

const sanitizeAnalysisText = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/for this project moving forward/gi, "for this analysis moving forward")
    .replace(/as project manager/gi, "as manager")
    .replace(/project manager/gi, "manager")
    .replace(/We've received your payment of ([\d.]+)\s+([A-Z]{3})\.?\s+for\s+"[^"]*"\.?/gi, "We've received your payment of $1 $2.")
    .replace(/Your project financials have been updated/gi, "Your analysis financials have been updated")
    .replace(/This project has been temporarily paused/gi, "This analysis has been temporarily paused")
    .replace(/This project is currently paused/gi, "This analysis is currently paused")
    .replace(/activate your project/gi, "activate your analysis")
    .replace(/Your project has been resumed/gi, "Your analysis has been resumed")
    .replace(/This order has been completed/gi, "This analysis has been completed")
    .replace(/this order/gi, "this analysis")
    .replace(/the order/gi, "the analysis")
    .replace(/this project/gi, "this analysis")
    .replace(/your project/gi, "your analysis")
    .replace(/the project/gi, "the analysis")
    .replace(/projects/gi, "analyses")
    .replace(/project/gi, "analysis");
};

const renderStatusMessageText = (rawText: string, attachments?: any[]) => {
  if (!rawText) return null;
  const text = sanitizeAnalysisText(rawText);

  const pdfAttachment = attachments?.find((a: any) => {
    const u = typeof a === "string" ? a : a?.url || "";
    return u.toLowerCase().endsWith(".pdf") || a?.type === "pdf";
  });
  const pdfUrl = typeof pdfAttachment === "string" ? pdfAttachment : pdfAttachment?.url;

  const renderPdfButton = () => {
    if (!pdfUrl) return null;
    return (
      <span className="block mt-3">
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#5356ff]/10 hover:bg-[#5356ff]/20 text-[#5356ff] text-xs font-bold rounded-lg border border-[#5356ff]/30 transition-colors"
        >
          📄 View / Download Analysis Report (PDF)
        </a>
      </span>
    );
  };

  // 1. Markdown link: [Label](url)
  const markdownRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/;
  if (markdownRegex.test(text)) {
    const parts: Array<{ type: "text" | "link"; label?: string; href?: string; content?: string }> = [];
    const globalMdRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g;
    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = globalMdRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", content: text.substring(lastIndex, match.index) });
      }
      const label = match[1];
      let href = match[2];
      if (href.includes("/help-support/contact-us")) {
        href = "/help-support/contact-us";
      }
      parts.push({ type: "link", label, href });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push({ type: "text", content: text.substring(lastIndex) });
    }

    return (
      <span>
        {parts.map((part, idx) => {
          if (part.type === "link" && part.href) {
            const isInternal = part.href.startsWith("/");
            return isInternal ? (
              <Link
                key={idx}
                href={part.href}
                className="text-[#5356ff] underline hover:text-[#3232b7] font-semibold transition-colors"
              >
                {part.label}
              </Link>
            ) : (
              <a
                key={idx}
                href={part.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#5356ff] underline hover:text-[#3232b7] font-semibold transition-colors"
              >
                {part.label}
              </a>
            );
          }
          return <span key={idx}>{part.content}</span>;
        })}
        {renderPdfButton()}
      </span>
    );
  }

  // Payment confirmations may include a website URL in the title — keep it as
  // plain text so it is not rendered as a clickable link.
  const isPaymentReceived = /we've received your payment/i.test(text);

  // 3. Raw URL
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  if (!isPaymentReceived && urlRegex.test(text)) {
    const parts = text.split(urlRegex);
    return (
      <span>
        {parts.map((part, i) =>
          urlRegex.test(part) ? (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#5356ff] underline hover:text-[#3232b7] font-semibold transition-colors"
            >
              {part}
            </a>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
        {renderPdfButton()}
      </span>
    );
  }

  return (
    <span>
      {text}
      {renderPdfButton()}
    </span>
  );
};

// Helper components
const categoryMap: Record<string, string> = {
  // Short auto-generated codes (from initials)
  PAM: "Paid Ads Marketing",
  GDB: "Graphic Design & Branding",
  GD: "Graphic Design & Branding",
  WD: "Websites Development",
  WDE: "Websites Development",
  WM: "Website Maintenance",
  SMM: "Social Media Marketing",
  SEO: "SEO",
  BUN: "Bundles",
  // Full codes with underscores
  PAID_ADS: "Paid Ads Marketing",
  PAID_ADS_MARKETING: "Paid Ads Marketing",
  PAIDADS: "Paid Ads Marketing",
  "PAID ADS MARKETING": "Paid Ads Marketing",
  "PAID ADS": "Paid Ads Marketing",
  GRAPHIC_DESIGN: "Graphic Design & Branding",
  GRAPHIC_DESIGN_BRANDING: "Graphic Design & Branding",
  "GRAPHIC DESIGN & BRANDING": "Graphic Design & Branding",
  "GRAPHIC DESIGN": "Graphic Design & Branding",
  WEBSITES_DEVELOPMENT: "Websites Development",
  WEBSITE_DEVELOPMENT: "Websites Development",
  "WEBSITES DEVELOPMENT": "Websites Development",
  "WEBSITE MAINTENANCE": "Website Maintenance",
  WEBSITE_MAINTENANCE: "Website Maintenance",
  SOCIAL_MEDIA_MARKETING: "Social Media Marketing",
  "SOCIAL MEDIA MARKETING": "Social Media Marketing",
  BUNDLES: "Bundles",
  BUNDLE: "Bundles",
  ANALYSIS: "Analysis",
};

const formatCategoryName = (cat: any, title?: string): string => {
  if (!cat && !title) return "";
  let raw = "";
  if (cat && typeof cat === "object") {
    raw = cat.name || cat.title || cat.categorycode || cat.code || "";
  } else if (cat) {
    raw = String(cat).trim();
  }

  // If raw is an ObjectId or empty, fallback to title matching
  if (!raw || raw.match(/^[0-9a-fA-F]{24}$/)) {
    if (title) {
      const norm = title.toLowerCase();
      if (norm.includes("ads") || norm.includes("shopping") || norm.includes("audit")) return "Paid Ads Marketing";
      if (norm.includes("graphic") || norm.includes("brand") || norm.includes("logo")) return "Graphic Design & Branding";
      if (norm.includes("development") || norm.includes("website dev")) return "Websites Development";
      if (norm.includes("maintenance")) return "Website Maintenance";
      if (norm.includes("seo") || norm.includes("search engine")) return "SEO";
      if (norm.includes("social media") || norm.includes("smm")) return "Social Media Marketing";
    }
    return "";
  }

  const upper = raw.toUpperCase().trim();
  const stripped = upper.replace(/-\d+$/, "").trim();

  if (categoryMap[upper]) return categoryMap[upper];
  if (categoryMap[stripped]) return categoryMap[stripped];

  if (upper.includes("_")) {
    const spaced = upper.replace(/_/g, " ");
    if (categoryMap[spaced]) return categoryMap[spaced];
    return spaced
      .toLowerCase()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  return raw;
};

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

  const resolvedCat = formatCategoryName(category, title);

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
            className={`w-full h-full transition-transform duration-300 group-hover:scale-105 ${isSvg ? "object-contain p-2.5" : "object-cover"
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
        {resolvedCat && (
          <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider w-fit mb-2">
            {resolvedCat}
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
        </div>
      </div>
    </a>
  );
};

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

  const requireAuth = () => {
    if (!authService.isAuthenticated()) {
      setShowAuthModal(true);
      return null;
    }
    const current = currentUser || authService.getUser() || {};
    if (!currentUser && authService.getUser()) setCurrentUser(authService.getUser());
    return current;
  };

  const isLoggedIn = Boolean(currentUser) || authService.isAuthenticated();

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

  const refreshAnalysisRef = useRef(refreshAnalysis);
  refreshAnalysisRef.current = refreshAnalysis;

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
      const uId = user?.id || user?._id || authService.getUserId();

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
          refreshAnalysisRef.current();
        }
      };

      sock.on("projectMessage", handleMessageUpdate);
      sock.on("projectUpdated", handleMessageUpdate);
      sock.on("newMessage", handleMessageUpdate);
      sock.on("notification", (notif: any) => {
        const pId = notif?.data?.projectId || notif?.projectId;
        if (!pId || String(pId) === String(aId)) {
          refreshAnalysisRef.current();
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
        } catch { }
      }
    };
  }, [analysis?._id, analysis?.id]);

  const scrollToBottomMessages = React.useCallback((behavior: ScrollBehavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: "center" });
    } else {
      const el = document.getElementById("messages");
      if (el) el.scrollIntoView({ behavior, block: "start" });
    }
  }, []);

  useEffect(() => {
    const handleScrollIfHash = (smooth = true) => {
      if (typeof window === "undefined") return;
      if (window.location.hash === "#messages") {
        const behavior: ScrollBehavior = smooth ? "smooth" : "auto";
        requestAnimationFrame(() => {
          scrollToBottomMessages(behavior);
        });
        const t1 = setTimeout(() => scrollToBottomMessages(behavior), 100);
        const t2 = setTimeout(() => scrollToBottomMessages(behavior), 300);
        const t3 = setTimeout(() => scrollToBottomMessages(behavior), 600);
        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
          clearTimeout(t3);
        };
      }
    };

    const cleanup = handleScrollIfHash(true);

    const onHashChange = () => {
      handleScrollIfHash(true);
    };

    const onCustomNavigate = () => {
      handleScrollIfHash(true);
    };

    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("navigate-to-messages", onCustomNavigate);

    return () => {
      if (cleanup) cleanup();
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("navigate-to-messages", onCustomNavigate);
    };
  }, [analysis?._id, analysis?.messages?.length, scrollToBottomMessages]);

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

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = "";

      const user = authService.getUser();
      if (user && user.isEmailVerified === false) {
        toast.error(
          "To protect your data, file uploads are restricted for unverified accounts. Please verify your email."
        );
        return;
      }

      const validFiles: File[] = [];
      const oversizedFiles: string[] = [];

      files.forEach((file) => {
        if (file.size > MAX_FILE_SIZE) {
          oversizedFiles.push(`${file.name} (${formatFileSize(file.size)})`);
        } else {
          validFiles.push(file);
        }
      });

      if (oversizedFiles.length > 0) {
        toast.error("File size limit exceeded (Max 10 MB)", {
          description: `The following file(s) exceed 10 MB: ${oversizedFiles.join(", ")}`,
          duration: 10000,
        });
      }

      if (validFiles.length === 0) return;

      const newFiles = validFiles.map((file) => ({
        id: Math.random().toString(36).slice(2, 11),
        file,
        status: "uploading",
        name: file.name,
        type: file.type,
      }));

      setAttachments((prev) => [...prev, ...newFiles]);

      for (const att of newFiles) {
        try {
          const aId = analysis._id || analysis.id;
          const res = await mediaService.uploadImage({
            file: att.file,
            folder: `analysis-attachments/${aId}`,
          });

          const url = res.data?.secure_url || res.data?.url || res.secure_url || "";
          if (!url) throw new Error("Failed to get URL");
          updateAttachment(att.id, { status: "done", url });
        } catch (error) {
          console.error("Upload failed for file:", att.name, error);
          toast.error(`Upload failed for ${att.name}`);
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
    const actingUser = requireAuth();
    if (!actingUser) return;
    if (attachments.some((a) => a.status === "uploading")) {
      toast.info("Please wait for file upload to complete before sending.");
      return;
    }

    const user = authService.getUser();
    if (attachments.length > 0 && user && user.isEmailVerified === false) {
      toast.error(
        "To protect your data, file uploads are restricted for unverified accounts. Please verify your email."
      );
      return;
    }

    const failedAttachments = attachments.filter((a) => a.status === "error");
    if (failedAttachments.length > 0) {
      toast.error("Some file uploads failed. Please remove them before sending.");
      return;
    }

    const uploadedUrls = attachments.filter((a) => a.status === "done" && a.url).map((a) => a.url);

    if (messageText.trim() || uploadedUrls.length > 0) {
      setIsSending(true);
      try {
        const aId = analysis._id || analysis.id;
        const res = await analysesService.addMessage(
          aId,
          messageText,
          false,
          uploadedUrls
        );
        if (res && (res.isSuccessful || res.success || res.statusCode === 200 || res.statusCode === 201 || res.data)) {
          setMessageText("");
          setAttachments([]);
          refreshAnalysis();
        } else {
          console.error("Failed to send message, response:", res);
          toast.error("Failed to send message");
        }
      } catch (error) {
        console.error("Failed to send message:", error);
        toast.error("Failed to send message");
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleAcceptProposal = async (proposalId: string) => {
    const actingUser = requireAuth();
    if (!actingUser) return;
    setIsActionLoading(true);
    try {
      const username = actingUser?.fullName || actingUser?.username || currentUser?.fullName || "User";
      const avatar = actingUser?.avatar || currentUser?.avatar;
      const aId = analysis._id || analysis.id;
      const res = await analysesService.acceptProposal(aId, proposalId, username, avatar);
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
    const actingUser = requireAuth();
    if (!actingUser) return;
    if (actionModal.proposalId && actionModal.action && (!actionModal.required || actionComment.trim())) {
      setIsActionLoading(true);
      try {
        let res;
        const username = currentUser?.fullName || currentUser?.username || "User";
        const avatar = currentUser?.avatar;
        const aId = analysis._id || analysis.id;

        if (actionModal.action === "decline") {
          res = await analysesService.declineProposal(aId, actionModal.proposalId, actionComment || "", username, avatar);
        } else if (actionModal.action === "request_modification") {
          res = await analysesService.requestProposalModification(aId, actionModal.proposalId, actionComment, username, avatar);
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

  const manager = (Array.isArray(analysis.assignedManagers) && analysis.assignedManagers.length > 0)
    ? analysis.assignedManagers[0]
    : analysis.projectManager;
  const managerName = manager?.fullName || "Not assigned yet";
  const managerAvatar = manager?.avatar;

  return (
    <div className="flex flex-col gap-8 w-full font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (col-span-2) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Analysis Details Card */}
          <div className="bg-white border border-gray-300 rounded-[12px] shadow-sm p-4 sm:p-6 md:p-8">
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

            <div className="border border-gray-400 rounded-[12px] overflow-hidden overflow-x-auto mb-6">
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
        </div>

        {/* Right Column / Sidebar (col-span-1) */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-300 rounded-[12px] shadow-sm p-6 sm:p-8">
            <div className="text-center">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full mx-auto mb-4 flex items-center justify-center shadow-md overflow-hidden bg-gray-100 border border-gray-200">
                {managerAvatar ? (
                  <img src={managerAvatar} alt={managerName} className="w-full h-full object-cover" />
                ) : manager ? (
                  <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-3xl font-bold">
                    {managerName[0] || "M"}
                  </div>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-3xl font-bold">
                    ?
                  </div>
                )}
              </div>
              <h4 className="text-lg font-bold text-gray-800 mb-1">{managerName}</h4>
              <p className="text-sm text-gray-500 mb-4 font-medium uppercase tracking-wider text-[10px]">
                Manager
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section Divider Banner: Analysis Initiated */}
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
            const msgId = msg.id || msg._id || `msg-${idx}`;

            if (msg.type === "system_notification" || msg.isSystemMessage) {
              const rawTitle = msg.content?.systemText || msg.systemText || msg.message || "System Notification";
              const title = formatStatusTitle(rawTitle);
              const text = msg.content?.text || msg.text || "";
              const attachments = msg.attachments || [];

              if (
                title.toLowerCase().includes("offer") ||
                title.toLowerCase().includes("proposal") ||
                text.toLowerCase().includes("sent you a new offer") ||
                text.toLowerCase().includes("prepared a custom proposal")
              ) {
                return null;
              }

              return (
                <div key={msgId} className="text-center py-6 px-4 my-2">
                  <h3 className="text-xl sm:text-2xl font-bold text-[#0D1939] tracking-tight mb-1">
                    {title}
                  </h3>
                  <div className="text-sm font-medium text-gray-500 leading-relaxed max-w-xl mx-auto">
                    {renderStatusMessageText(text, attachments)}
                  </div>
                </div>
              );
            }

            if (msg.type === "quote_proposal") {
              const content = msg.content || {};
              const items =
                (content.recommendedSolutions && content.recommendedSolutions.length > 0 ? content.recommendedSolutions : null) ||
                (msg.recommendedSolutions && msg.recommendedSolutions.length > 0 ? msg.recommendedSolutions : null) ||
                (content.deliverableItems && content.deliverableItems.length > 0 ? content.deliverableItems : null) ||
                (content.lineItems && content.lineItems.length > 0 ? content.lineItems : null) ||
                (Array.isArray(content.items) && content.items.length > 0 ? content.items : null) ||
                [];
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
                <div key={msgId} className="w-full">
                  {/* Header above offer card */}
                  {Boolean(content.lineItems && content.lineItems.length > 0) && (
                    <div className="text-center py-6 px-4 my-2">
                      <h3 className="text-xl sm:text-2xl font-bold text-[#0D1939] tracking-tight mb-1">
                        You Received an Offer
                      </h3>
                      <p className="text-sm font-medium text-gray-500 leading-relaxed max-w-xl mx-auto">
                        We’ve prepared a custom proposal for your project.
                      </p>
                    </div>
                  )}

                  <div className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden w-full">
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
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border mt-1 ${content.status === "accepted"
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
                              const safeUrl = getSafeUrl(url);
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

                      {/* Recommended Solutions */}
                      {items.length > 0 && (
                        <div className="pl-0 md:pl-[64px] mb-6">
                          <h5 className="text-xs sm:text-sm font-bold text-gray-700 capitalize tracking-wider mb-3">
                            Recommended Solutions
                          </h5>
                          <div className="border-t border-gray-200 mb-4" />
                          <div className="flex flex-wrap sm:flex-nowrap sm:overflow-x-auto pb-2 gap-4 scrollbar-hide">
                            {items.map((sol: any, sIdx: number) => (
                              <PackageCard
                                key={(sol.packageId || sol._id || sol.id || sIdx) + "-" + sIdx}
                                packageId={sol.packageId || sol._id || sol.id}
                                title={sol.title || sol.name}
                                price={sol.price || sol.cost || sol.amount || sol.priceText}
                                imageUrl={sol.imageUrl || sol.mediumUrl || sol.thumbnailUrl || sol.image}
                                category={sol.category || sol.categorycode}
                                description={sol.description}
                                link={sol.link || `/dashboard/new-project/packages/${sol.packageId || sol._id || sol.id}`}
                              />
                            ))}
                          </div>
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
                </div>
              );
            }

            const isClient = msg.sender === "client" || msg.role === "client" || (currentUser?._id && msg.userId === currentUser._id) || (currentUser?.id && msg.userId === currentUser.id);
            const clientName = currentUser?.fullName || (currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : '') || currentUser?.username;
            const senderName = msg.username || (isClient ? (clientName || "You") : "Analysis Team");
            const senderAvatar = msg.userAvatar || (isClient ? currentUser?.avatar : undefined);
            const rawAttachments = msg.attachments || msg.content?.attachedFiles || msg.attachedFiles || (msg.content as any)?.attachedFilesUrl || msg.attachedFilesUrl || [];
            const attachmentList = Array.isArray(rawAttachments) ? rawAttachments : [];

            const isDeliveryMsg = Boolean(
              msg.isFinalDelivery ||
              msg.type === "final_delivery" ||
              msg.type === "delivery" ||
              msg.content?.isFinalDelivery ||
              msg.content?.type === "final_delivery"
            );

            const hasSubsequentCompletionMsg = (analysis.messages || []).slice(idx + 1).some(
              (m: any) =>
                (m.type === "system_notification" || m.isSystem) &&
                (m.message?.toLowerCase().includes("completed") ||
                  m.content?.systemText?.toLowerCase().includes("completed") ||
                  m.content?.text?.toLowerCase().includes("completed"))
            );

            return (
              <React.Fragment key={msgId}>
                <div className="w-full bg-white rounded-xl shadow-sm border border-gray-300 p-6 md:p-8">
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
                          const url = typeof att === "string" ? att : (att.url || att.secure_url || att.path);
                          const name = typeof att === "string" ? decodeURIComponent(url.split("/").pop() || "file") : (att.name || att.filename || decodeURIComponent((url || "").split("/").pop() || "file"));
                          if (!url) return null;
                          const safeUrl = getSafeUrl(url);
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
                                <span className="text-[10px] font-medium text-gray-600 truncate px-2" title={name}>{name}</span>
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* Recommended Solutions if any */}
                  {(() => {
                    const recs =
                      (msg.recommendedSolutions && msg.recommendedSolutions.length > 0 ? msg.recommendedSolutions : null) ||
                      (msg.content?.recommendedSolutions && msg.content.recommendedSolutions.length > 0 ? msg.content.recommendedSolutions : null) ||
                      (msg.content?.deliverableItems && msg.content.deliverableItems.length > 0 ? msg.content.deliverableItems : null) ||
                      (msg.content?.lineItems && msg.content.lineItems.length > 0 ? msg.content.lineItems : null) ||
                      [];
                    if (recs.length === 0) return null;
                    return (
                      <div className="pl-0 sm:pl-16 mb-6">
                        <h5 className="text-xs sm:text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">
                          Recommended Solutions
                        </h5>
                        <div className="border-t border-gray-200 mb-4" />
                        <div className="flex flex-wrap sm:flex-nowrap sm:overflow-x-auto pb-2 gap-4 scrollbar-hide">
                          {recs.map((sol: any, j: number) => (
                            <PackageCard
                              key={(sol.packageId || sol._id || j) + "-" + j}
                              packageId={sol.packageId || sol._id || sol.id}
                              title={sol.title || sol.name}
                              price={sol.price || sol.cost || sol.amount || sol.priceText}
                              imageUrl={sol.imageUrl || sol.mediumUrl || sol.thumbnailUrl || sol.image}
                              category={sol.category || sol.categorycode}
                              description={sol.description}
                              link={sol.link || `/dashboard/new-project/packages/${sol.packageId || sol._id || sol.id}`}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {isDeliveryMsg && !hasSubsequentCompletionMsg && (
                  <div className="text-center py-6 px-4 my-2">
                    <h3 className="text-xl sm:text-2xl font-bold text-[#0D1939] tracking-tight mb-1">
                      Analysis completed!
                    </h3>
                    <div className="text-sm font-medium text-gray-500 leading-relaxed max-w-xl mx-auto">
                      This analysis has been completed.
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Fallback Banner if analysis status is completed and no message rendered completion */}
      {analysis.status === "completed" && !(analysis.messages || []).some((m: any) =>
        m.isFinalDelivery ||
        m.type === "final_delivery" ||
        m.content?.isFinalDelivery ||
        m.content?.type === "final_delivery" ||
        ((m.type === "system_notification" || m.isSystem) &&
          (m.message?.toLowerCase().includes("completed") ||
            m.content?.systemText?.toLowerCase().includes("completed") ||
            m.content?.text?.toLowerCase().includes("completed")))
      ) && (
          <div className="text-center py-6 px-4 my-2">
            <h3 className="text-xl sm:text-2xl font-bold text-[#0D1939] tracking-tight mb-1">
              Analysis completed!
            </h3>
            <div className="text-sm font-medium text-gray-500 leading-relaxed max-w-xl mx-auto">
              This analysis has been completed.
            </div>
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
                isLoggedIn
                  ? "Type your message or submit requested details..."
                  : "Please log in or register to message our team..."
              }
              value={messageText}
              onChange={(e) => {
                if (!requireAuth()) return;
                setMessageText(e.target.value);
              }}
              onClick={() => {
                requireAuth();
              }}
              onFocus={() => {
                requireAuth();
              }}
              readOnly={!isLoggedIn}
            />
          </div>

          {attachments.length > 0 && (
            <div className="px-6 pb-3">
              <div className="flex flex-wrap gap-3">
                {attachments.map((att) => {
                  const isImg = isImageUrl(att.url) || att.type?.startsWith("image/") || (att.file && att.file.type?.startsWith("image/")) || /\.(svg|png|jpg|jpeg|webp|gif|bmp|ico|avif)$/i.test(att.name);
                  const displayUrl = getSafeUrl(att.url || (att.file ? URL.createObjectURL(att.file) : ""));
                  return (
                    <div
                      key={att.id}
                      className={`relative group border border-gray-200 rounded-xl p-2 w-24 h-24 sm:w-28 sm:h-28 bg-white shadow-sm flex flex-col items-center justify-between hover:border-gray-300 transition-all ${att.status === "uploading" ? "opacity-70" : ""
                        } ${att.status === "error" ? "border-red-400 bg-red-50" : ""}`}
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
                        {att.status === "uploading" ? (
                          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        ) : isImg && displayUrl ? (
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
                        <p className="text-[10px] text-gray-400 font-medium truncate">
                          {(att.size || att.file?.size) ? `${formatFileSize(att.size || att.file?.size)} · ` : ""}
                          {att.status === "uploading" ? "Uploading..." : att.status === "done" ? "Ready" : att.status}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="px-6 pb-6 pt-2 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  if (!requireAuth()) return;
                  fileInputRef.current?.click();
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors px-4 py-2 rounded-lg border-2 border-blue-600 hover:bg-blue-50 shadow-sm cursor-pointer"
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
            <input ref={fileInputRef} hidden multiple type="file" accept="*/*" onChange={handleFileUpload} />

            <div className="flex gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  if (!requireAuth()) return;
                  setMessageText("");
                  setAttachments([]);
                }}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-[#7A1C1C] hover:bg-[#631616] text-white font-bold text-xs rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type={isLoggedIn ? "submit" : "button"}
                onClick={(e) => {
                  if (!requireAuth()) {
                    e.preventDefault();
                  }
                }}
                disabled={
                  isLoggedIn &&
                  (isSending ||
                    isUploading ||
                    (!messageText.trim() &&
                      attachments.filter((a) => a.status === "done").length === 0))
                }
                className={`flex-1 sm:flex-none px-7 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm ${isLoggedIn &&
                  (isSending ||
                    isUploading ||
                    (!messageText.trim() && attachments.filter((a) => a.status === "done").length === 0))
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                  : "bg-[#4343F0] hover:bg-[#3232b7] text-white cursor-pointer active:scale-95"
                  }`}
              >
                {isSending ? <LoadingDots text="Sending" /> : isUploading ? "Uploading..." : "Send Message"}
              </button>
            </div>
          </div>
        </form>
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
      <div className="w-full">
        <SupportNewsletter noPadding />
      </div>

    </div>
  );
}
