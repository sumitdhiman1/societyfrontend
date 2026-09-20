"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAnalysis } from "@/context/AnalysisContext";
import { analysesService } from "@/lib/analysesService";
import { requestAnalysisService } from "@/lib/requestAnalysisService";
import { mediaService } from "@/lib/mediaService";
import { authService } from "@/lib/authService";
import { packagesService } from "@/lib/packagesService";
import { downloadFile, isImageUrl, getSafeUrl } from "@/lib/utils";
import LoadingDots from "@/components/common/LoadingDots";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";
import AuthPromptModal from "@/components/common/AuthPromptModal";
import RecommendedSolutions, { PackageCard } from "@/components/common/RecommendedSolutions";
import DeadlineTooltip from "@/components/common/DeadlineTooltip";
import { downloadProjectDetailsPDF, printProjectDetails } from "@/lib/generateProjectDetailsPDF";
import { getProjectEstimatedDeadline } from "@/lib/calculatorUtils";
import { useCurrency } from "@/context/CurrencyContext";
import { formatPriceWithCurrency } from "@/lib/currencyUtils";
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
    return "Analysis manager assigned";
  }
  if (lower.startsWith("add-on proposal accepted") || lower.includes("proposal accepted") || lower.includes("offer was accepted")) {
    return "Add-on proposal accepted";
  }
  if (lower.startsWith("proposal declined") || lower.startsWith("add-on proposal declined") || lower.includes("offer was declined")) {
    return "Proposal declined";
  }
  if (lower.startsWith("modification requested") || lower.includes("requested modification")) {
    return "Modification requested";
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
    .replace(/Great! The add-on services have been successfully added to your project\. Your project timeline and cost have been updated accordingly\. You can view the updated details anytime\./gi, "Great! The add-on services have been successfully added to your analysis. Your analysis timeline and cost have been updated accordingly. You can view the updated details anytime.")
    .replace(/Great! The add-on services have been successfully added to your analysis project\. Timeline and cost have been updated accordingly\./gi, "Great! The add-on services have been successfully added to your analysis. Your analysis timeline and cost have been updated accordingly. You can view the updated details anytime.")
    .replace(/added to your analysis project/gi, "added to your analysis")
    .replace(/added to your project/gi, "added to your analysis")
    .replace(/your project timeline/gi, "your analysis timeline")
    .replace(/for this project moving forward/gi, "for this analysis moving forward")
    .replace(/as project manager/gi, "as analysis manager")
    .replace(/project manager/gi, "analysis manager")
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



export default function AnalysisDetailsPage() {
  const params = useParams();
  const { analysis, refreshAnalysis } = useAnalysis();
  const { currency: contextCurrency, conversionRate } = useCurrency();
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [availablePackages, setAvailablePackages] = useState<any[]>([]);
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const actionLoadingRef = useRef(false);

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

  const formatCurrency = (amt: any, customSourceCurrency?: string) => {
    const val = Number(amt);
    if (isNaN(val)) return "$0.00";
    const srcCurrency = (customSourceCurrency || analysis?.currency || "USD").toUpperCase();
    const targetCurrency = (currentUser?.currency || currentUser?.preferredCurrency || contextCurrency || "USD").toUpperCase();
    return formatPriceWithCurrency(val, targetCurrency, srcCurrency, conversionRate);
  };

  const formatSubmittedDate = (date: any) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const month = d.toLocaleString("en-US", { month: "short" });
    const day = d.getDate();
    const time = d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${month} ${day}, ${time}`;
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
    if (actionLoadingRef.current || isActionLoading) return;
    actionLoadingRef.current = true;
    setIsActionLoading(true);
    try {
      const user = currentUser || authService.getUser() || {};
      const username = user?.fullName || user?.username || "User";
      const avatar = user?.avatar;
      const resolvedId = Array.isArray(params?.id) ? params.id[0] : params?.id;
      const aId = resolvedId || analysis?._id || analysis?.id;
      const res: any = await analysesService.acceptProposal(String(aId), String(proposalId), username, avatar);
      if (res && (res.statusCode === 200 || res.statusCode === 201 || res.isSuccessful || res.data || res.success)) {
        toast.success("Offer accepted successfully!");
        refreshAnalysis();
      } else {
        toast.error(res?.message || "Failed to accept offer");
      }
    } catch (error: any) {
      console.error("Failed to accept proposal:", error);
      toast.error(error?.message || "Failed to accept offer");
    } finally {
      actionLoadingRef.current = false;
      setIsActionLoading(false);
    }
  };

  const handleActionSubmit = async () => {
    if (actionLoadingRef.current || isActionLoading) return;
    if (actionModal.proposalId && actionModal.action && (!actionModal.required || actionComment.trim())) {
      actionLoadingRef.current = true;
      setIsActionLoading(true);
      try {
        let res: any;
        const user = currentUser || authService.getUser() || {};
        const username = user?.fullName || user?.username || "User";
        const avatar = user?.avatar;
        const resolvedId = Array.isArray(params?.id) ? params.id[0] : params?.id;
        const aId = resolvedId || analysis?._id || analysis?.id;

        if (actionModal.action === "decline") {
          res = await analysesService.declineProposal(String(aId), String(actionModal.proposalId), actionComment || "", username, avatar);
        } else if (actionModal.action === "request_modification") {
          res = await analysesService.requestProposalModification(String(aId), String(actionModal.proposalId), actionComment, username, avatar);
        }

        if (res && (res.statusCode === 200 || res.statusCode === 201 || res.isSuccessful || res.data || res.success)) {
          toast.success(actionModal.action === "decline" ? "Offer declined successfully" : "Modification request sent");
          setActionModal({ ...actionModal, isOpen: false, proposalId: null });
          setActionComment("");
          refreshAnalysis();
        } else {
          toast.error(res?.message || `Failed to ${actionModal.action === "decline" ? "decline" : "modify"} offer`);
        }
      } catch (error: any) {
        console.error(`Failed to handle ${actionModal.action}:`, error);
        toast.error(error?.message || `Failed to ${actionModal.action === "decline" ? "decline" : "modify"} offer`);
      } finally {
        actionLoadingRef.current = false;
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

  const seenAddonKeys = new Set<string>();
  const uniqueAnalysisAddons = (analysis?.addons || []).filter((addon: any) => {
    const key = String(addon.proposalMessageId || addon._id || (Array.isArray(addon.deliverableItems) ? addon.deliverableItems.map((i: any) => `${i.description}-${i.amount}-${i.duration}`).join('|') : '')).trim();
    if (!key) return true;
    if (seenAddonKeys.has(key)) return false;
    seenAddonKeys.add(key);
    return true;
  });

  const addonItemsFromAddons = uniqueAnalysisAddons.flatMap((addon: any) =>
    (addon.deliverableItems || []).map((d: any) => ({
      description: d.description || d.title || d.name || 'Add-on deliverable',
      amount: Number(d.amount ?? d.cost ?? 0),
      duration: d.duration ? `${d.duration}` : '-',
      unit: d.unit || 'Days',
      details: d.details || '',
    }))
  );

  const seenMsgIds = new Set<string>();
  const addonItemsFromMessages = (analysis?.messages || [])
    .filter((m: any) => {
      const isQuote = m.type === 'quote_proposal' || m.content?.type === 'quote_proposal';
      const isAccepted = m.content?.status === 'accepted' || m.status === 'accepted';
      if (!isQuote || !isAccepted) return false;
      const mId = String(m.id || m._id || m.content?.id || '').trim();
      if (mId && seenMsgIds.has(mId)) return false;
      if (mId) seenMsgIds.add(mId);
      return true;
    })
    .flatMap((m: any) => {
      const deliverables = m.content?.deliverableItems || m.deliverableItems || [];
      return deliverables.map((d: any) => ({
        description: d.description || d.title || d.name || 'Add-on deliverable',
        amount: Number(d.amount ?? d.cost ?? 0),
        duration: d.duration ? `${d.duration}` : '-',
        unit: 'Days',
        details: '',
      }));
    });

  const rawAddonItems = addonItemsFromAddons.length > 0 ? addonItemsFromAddons : addonItemsFromMessages;
  const seenItemKeys = new Set<string>();
  const allAddonDeliverables = rawAddonItems.filter((item: any) => {
    const key = `${String(item.description || '').trim().toLowerCase()}-${Number(item.amount || 0)}-${String(item.duration || '').trim().toLowerCase()}`;
    if (seenItemKeys.has(key)) return false;
    seenItemKeys.add(key);
    return true;
  });

  const addonsTotal = allAddonDeliverables.reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0);

  const pureInitialBase =
    (Number(analysis.package?.amount) > 0 ? Number(analysis.package?.amount) : 0) ||
    (Number(analysis.package?.price) > 0 ? Number(analysis.package?.price) : 0) ||
    (Array.isArray(analysis.deliverableItems) && analysis.deliverableItems.length > 0
      ? analysis.deliverableItems.reduce((s: number, i: any) => s + (Number(i.amount ?? i.cost) || 0), 0)
      : 0);

  const rawSubtotal =
    (Number(analysis.subtotal) > 0 ? Number(analysis.subtotal) : 0) ||
    (Number(analysis.baseAmount) > 0 ? Number(analysis.baseAmount) : 0) ||
    (Number(analysis.price) > 0 ? Number(analysis.price) : 0) ||
    0;

  const baseAmount = pureInitialBase > 0
    ? pureInitialBase + addonsTotal
    : (rawSubtotal >= addonsTotal ? rawSubtotal : rawSubtotal + addonsTotal);

  const rawTotalCost =
    (Number(analysis.totalCost) > 0 ? Number(analysis.totalCost) : 0) ||
    (Number(analysis.totalPrice) > 0 ? Number(analysis.totalPrice) : 0) ||
    (Number(analysis.amount) > 0 ? Number(analysis.amount) : 0) ||
    (Number(analysis.price) > 0 ? Number(analysis.price) : 0) ||
    baseAmount;

  const vatRate = Number(
    analysis.vatRate ??
    analysis.vatPercentage ??
    (analysis.taxPercentage != null ? analysis.taxPercentage : 0)
  );
  const rawVatAmount = Number(analysis.vatAmount ?? analysis.tax ?? 0);

  const vatAmount =
    rawVatAmount > 0
      ? rawVatAmount
      : vatRate > 0
        ? Math.round((baseAmount * (vatRate / 100)) * 100) / 100
        : 0;

  const totalCost = baseAmount + vatAmount;

  const isFreeAnalysis = Boolean(
    analysis.isFree === true ||
    (analysis.isFree === undefined && baseAmount <= 0 && totalCost <= 0 && (!analysis.amountPaid || Number(analysis.amountPaid) <= 0))
  );

  const [matchedProduct, setMatchedProduct] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    const loadMatchedProduct = async () => {
      try {
        const res: any = await requestAnalysisService.getProducts(true);
        const list = Array.isArray(res?.data) ? res.data : res?.data?.data || (Array.isArray(res) ? res : []);
        const targetId = analysis.productId || analysis.analysisProductId || analysis.product?._id || analysis.product?.id;
        const targetTitle = (analysis.title || "").toLowerCase().trim();
        const found = list.find((p: any) =>
          (targetId && (p._id === targetId || p.id === targetId)) ||
          (p.title && targetTitle && p.title.toLowerCase().trim() === targetTitle) ||
          (targetTitle.includes("check") && (p.title || "").toLowerCase().includes("check"))
        );
        if (isMounted && found) {
          setMatchedProduct(found);
        }
      } catch (e) {
        console.error("Failed to load matching analysis product:", e);
      }
    };
    if (analysis) {
      loadMatchedProduct();
    }
    return () => {
      isMounted = false;
    };
  }, [analysis?._id, analysis?.title]);

  const rawTitle = analysis.title || "Free Website Analysis";
  const cleanItemTitle = rawTitle.includes(" - ") ? rawTitle.split(" - ")[0] : rawTitle;

  const isGenericDesc = (desc?: string) => {
    if (!desc) return true;
    return (
      desc.startsWith("Our standard free analysis offer covering brand, UI/UX") ||
      desc.startsWith("Comprehensive Website Review, Detailed PDF Report")
    );
  };

  const cleanItemDescription =
    (analysis.deliverableItems?.[0]?.details && !isGenericDesc(analysis.deliverableItems?.[0]?.details))
      ? analysis.deliverableItems?.[0]?.details
      : (matchedProduct?.shortDescription ||
        matchedProduct?.description ||
        matchedProduct?.longDescription ||
        analysis.shortDescription ||
        analysis.product?.shortDescription ||
        analysis.product?.description ||
        (analysis.description && !analysis.description.startsWith("Analysis for ") ? analysis.description : "") ||
        (cleanItemTitle.toLowerCase().includes("check")
          ? "An offer to check the completed work of any other web professionals, including your own in-house staff and/or partners. Fully custom and manual checking by our quality assurance team. Serves as a third, objective perspective on the quality of work completed."
          : "Our classic analysis offer covering branding, UI/UX, functionalities, AI potentiality, tech stack, speed, and SEO. A manual review using a custom process created by Society Web Solutions, checking every important part of your website. Delivered as a custom PDF report within 5 days."));

  const rawUrls = (analysis.targetWebsiteUrl || analysis.websiteUrl || "").trim();
  const submittedUrls = rawUrls
    ? rawUrls
      .split(/[\n,]+/)
      .map((u: string) => u.trim())
      .filter(Boolean)
    : [];

  const submittedAdditionalComments = (analysis.additionalComments || analysis.metadata?.additionalComments || "").trim();

  const submittedScopeOfWork = (analysis.scopeOfWork || analysis.metadata?.scopeOfWork || "").trim();
  const submittedWhoCompletedWork = (analysis.whoCompletedWork || analysis.metadata?.whoCompletedWork || "").trim();
  const submittedAgreementDetails = (analysis.agreementDetails || analysis.metadata?.agreementDetails || "").trim();
  const submittedLoginsDetails = (analysis.loginsDetails || analysis.metadata?.loginsDetails || "").trim();

  const knownMetaKeys = new Set([
    "additionalComments",
    "scopeOfWork",
    "whoCompletedWork",
    "agreementDetails",
    "loginsDetails",
    "targetWebsiteUrl",
    "websiteUrl",
  ]);
  const extraMetadata =
    analysis.metadata && typeof analysis.metadata === "object"
      ? Object.entries(analysis.metadata).filter(
        ([k, v]) => !knownMetaKeys.has(k) && v && typeof v !== "object"
      )
      : [];

  const hasSubmittedRequirements =
    submittedUrls.length > 0 ||
    !!submittedAdditionalComments ||
    !!submittedScopeOfWork ||
    !!submittedWhoCompletedWork ||
    !!submittedAgreementDetails ||
    !!submittedLoginsDetails ||
    extraMetadata.length > 0;

  const getStatusBadgeStyle = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "active" || s === "in_progress") {
      return "bg-[#E1FCEF] text-[#14804A] border-[#E1FCEF]";
    }
    if (s === "completed") {
      return "bg-[#EBF5FF] text-[#2563EB] border-[#EBF5FF]";
    }
    if (s === "paused") {
      return "bg-[#FEF3C7] text-[#D97706] border-[#FEF3C7]";
    }
    if (s === "canceled" || s === "cancelled") {
      return "bg-[#FEE2E2] text-[#B91C1C] border-[#FEE2E2]";
    }
    return "bg-[#E1FCEF] text-[#14804A] border-[#E1FCEF]";
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 w-full font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 detail-top-2-col-grid">
        {/* Left Column (col-span-2) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Analysis Details Card */}
          <div className="bg-white border border-gray-300 rounded-[12px] shadow-sm p-4 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
              <span className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-wider">
                Submitted - {submittedDateStr || "Sep 4, 9:03 PM"}
              </span>
              <span className={`w-fit px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold border uppercase tracking-wider ${getStatusBadgeStyle(analysis.status)}`}>
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
                        {cleanItemTitle}
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-400">
                        {cleanItemDescription}
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

                  {/* Add-ons section if exists */}
                  {allAddonDeliverables.length > 0 && (
                    <React.Fragment>
                      <tr className="bg-gray-800">
                        <td colSpan={3} className="px-6 py-2.5 text-xs font-bold text-white tracking-wider">
                          Add-On Tasks
                        </td>
                      </tr>
                      {allAddonDeliverables.map((item: any, iIdx: number) => (
                        <tr
                          key={`addon-task-${iIdx}`}
                          className={iIdx === allAddonDeliverables.length - 1 ? "" : "border-b border-gray-400"}
                        >
                          <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-500 align-top">
                            <div className="font-medium text-gray-700 mb-1">{item.description}</div>
                            {item.details && <div className="text-[10px] sm:text-xs text-gray-400">{item.details}</div>}
                          </td>
                          <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-600 font-medium text-center align-top whitespace-nowrap">
                            {item.duration} {item.unit || "Days"}
                          </td>
                          <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-800 text-right font-bold align-top">
                            {formatCurrency(item.amount ?? 0)}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals Summary (Only for Paid Analysis) */}
            {!isFreeAnalysis && (
              <div className="flex flex-row justify-end gap-6 sm:gap-12 text-xs sm:text-sm mb-4">
                {vatRate > 0 && vatAmount > 0 && (
                  <div className="text-center">
                    <div className="text-gray-500 font-bold mb-1 sm:mb-2">Base Amount</div>
                    <div className="font-semibold text-gray-800">{formatCurrency(baseAmount)}</div>
                  </div>
                )}
                {vatRate > 0 && vatAmount > 0 && (
                  <div className="text-center">
                    <div className="text-gray-500 font-bold mb-1 sm:mb-2">VAT ({vatRate}%)</div>
                    <div className="font-semibold text-gray-800">{formatCurrency(vatAmount)}</div>
                  </div>
                )}
                <div className="text-center">
                  <div className="font-bold mb-1 sm:mb-2 text-gray-800">Total Amount</div>
                  <div className="font-bold text-gray-900">{formatCurrency(totalCost)}</div>
                </div>
              </div>
            )}

            {/* Bottom Card Row: Estimated Deadline & Action Buttons (Only for Paid Analysis) */}
            {!isFreeAnalysis && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-200 mb-6">
                <div>
                  <div className="text-xs text-gray-500 flex flex-wrap items-center gap-2">
                    <span className="font-bold text-gray-800 mr-2">Estimated Deadline:</span>
                    <span>
                      {getProjectEstimatedDeadline(analysis)
                        ? formatSubmittedDate(getProjectEstimatedDeadline(analysis))
                        : analysis.deadline
                          ? formatSubmittedDate(analysis.deadline)
                          : "Ongoing"}
                    </span>
                    <DeadlineTooltip position="center" />
                  </div>
                </div>

                <div className="flex flex-row gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    disabled={isDownloadingPdf}
                    onClick={async (e) => {
                      e.preventDefault();
                      if (isDownloadingPdf) return;
                      setIsDownloadingPdf(true);
                      try {
                        await downloadProjectDetailsPDF(analysis);
                      } catch (err) {
                        console.error("Failed to download PDF", err);
                        toast.error("Failed to download PDF. Please try again.");
                      } finally {
                        setIsDownloadingPdf(false);
                      }
                    }}
                    className="flex-1 sm:flex-initial px-6 py-2 bg-[#4343F0] hover:bg-[#3232b7] text-white text-[10px] sm:text-xs font-bold rounded shadow-sm transition-colors cursor-pointer whitespace-nowrap disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    {isDownloadingPdf ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Downloading...</span>
                      </>
                    ) : (
                      "Download Project (.PDF)"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      printProjectDetails(analysis);
                    }}
                    className="flex-1 sm:flex-initial px-6 py-2 bg-[#4343F0] hover:bg-[#3232b7] text-white text-[10px] sm:text-xs font-bold rounded shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Print Details
                  </button>
                </div>
              </div>
            )}

            {/* Submitted Information & Requirements */}
            {hasSubmittedRequirements && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">
                  Submitted Information &amp; Requirements
                </h3>
                <div className="flex flex-col gap-4 text-xs sm:text-sm">
                  {submittedUrls.length > 0 && (
                    <div className="w-full bg-gray-50 p-3 rounded border border-gray-200">
                      <span className="block font-bold text-gray-700 text-xs uppercase mb-1">
                        URL(s) to check
                      </span>
                      <div className="flex flex-col gap-1.5">
                        {submittedUrls.map((u: string, idx: number) => {
                          const href = u.startsWith("http://") || u.startsWith("https://") ? u : `https://${u}`;
                          const text = u.replace(/^https?:\/\//, "").replace(/\/$/, "");
                          return (
                            <a
                              key={idx}
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 font-semibold hover:underline break-all text-xs sm:text-sm block"
                            >
                              {text}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {submittedAdditionalComments && (
                    <div className="w-full bg-gray-50 p-3 rounded border border-gray-200">
                      <span className="block font-bold text-gray-700 text-xs uppercase mb-1">
                        Provide any additional required information
                      </span>
                      <p className="text-gray-800 font-medium whitespace-pre-wrap">
                        {submittedAdditionalComments}
                      </p>
                    </div>
                  )}

                  {submittedScopeOfWork && (
                    <div className="w-full bg-gray-50 p-3 rounded border border-gray-200">
                      <span className="block font-bold text-gray-700 text-xs uppercase mb-1">
                        What specifically do you want us to look at?
                      </span>
                      <p className="text-gray-800 font-medium whitespace-pre-wrap">
                        {submittedScopeOfWork}
                      </p>
                    </div>
                  )}

                  {submittedWhoCompletedWork && (
                    <div className="w-full bg-gray-50 p-3 rounded border border-gray-200">
                      <span className="block font-bold text-gray-700 text-xs uppercase mb-1">
                        Who was the work completed by?
                      </span>
                      <p className="text-gray-800 font-medium whitespace-pre-wrap">
                        {submittedWhoCompletedWork}
                      </p>
                    </div>
                  )}

                  {submittedAgreementDetails && (
                    <div className="w-full bg-gray-50 p-3 rounded border border-gray-200">
                      <span className="block font-bold text-gray-700 text-xs uppercase mb-1">
                        What was the agreement for this work?
                      </span>
                      <p className="text-gray-800 font-medium whitespace-pre-wrap">
                        {submittedAgreementDetails}
                      </p>
                    </div>
                  )}

                  {submittedLoginsDetails && (
                    <div className="w-full bg-gray-50 p-3 rounded border border-gray-200">
                      <span className="block font-bold text-gray-700 text-xs uppercase mb-1">
                        Please share required access with our email
                      </span>
                      <p className="text-gray-800 font-medium whitespace-pre-wrap font-mono">
                        {submittedLoginsDetails}
                      </p>
                    </div>
                  )}

                  {extraMetadata.map(([k, v]: [string, any], idx: number) => (
                    <div key={idx} className="w-full bg-gray-50 p-3 rounded border border-gray-200">
                      <span className="block font-bold text-gray-700 text-xs uppercase mb-1">
                        {k.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()}
                      </span>
                      <p className="text-gray-800 font-medium whitespace-pre-wrap">
                        {String(v)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                  <div className="w-full h-full bg-gradient-to-b from-gray-100 to-gray-200 flex items-center justify-center text-gray-400">
                    <svg className="w-12 h-12 sm:w-14 sm:h-14 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12 4a4 4 0 100 8 4 4 0 000-8zm-2 9a6 6 0 00-6 6v1a1 1 0 001 1h14a1 1 0 001-1v-1a6 6 0 00-6-6h-4z" clipRule="evenodd" />
                    </svg>
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

      {/* Section Divider Banner: Analysis Initiated */}
      <div className="relative py-0 my-0 flex items-center justify-center w-full">
        <div className="flex-grow border-t border-gray-300"></div>
        <span className="px-4 text-xs sm:text-sm font-medium text-gray-500 text-center whitespace-normal sm:whitespace-nowrap">
          Analysis Initiated {deliveryDueStr ? `| Delivery due on ${deliveryDueStr}` : ""}
        </span>
        <div className="flex-grow border-t border-gray-300"></div>
      </div>

      {/* Messages & Delivery History if any */}
      {analysis.messages && analysis.messages.length > 0 && (
        <div className="flex flex-col gap-6 w-full recieved-offer-heading-wrap mb-0 md:mb-4">
          {analysis.messages.map((msg: any, idx: number) => {
            const msgId = msg.id || msg._id || `msg-${idx}`;
            const textContent = `${msg.message || ""} ${msg.content?.text || ""} ${msg.text || ""}`.toLowerCase();
            if (textContent.includes("declined the add-on proposal")) {
              return null;
            }

            if (msg.type === "system_notification" || msg.isSystemMessage) {
              const rawTitle = msg.content?.systemText || msg.systemText || msg.message || "System Notification";
              const title = formatStatusTitle(rawTitle);
              const text = msg.content?.text || msg.text || "";
              const attachments = msg.attachments || [];

              const lowerTitle = title.toLowerCase();
              const lowerText = text.toLowerCase();

              if (
                lowerTitle === "you received an offer" ||
                lowerTitle.includes("sent you a new offer") ||
                lowerTitle.includes("prepared a custom proposal") ||
                lowerText.includes("sent you a new offer") ||
                lowerText.includes("prepared a custom proposal")
              ) {
                return null;
              }

              const isDuplicate =
                text.trim().toLowerCase() === title.trim().toLowerCase() ||
                text.trim().toLowerCase().startsWith("analysis status updated to active") ||
                text.trim().toLowerCase().startsWith("project status updated to active");
              const displayText = isDuplicate ? "" : text;

              return (
                <div key={msgId} className="text-center py-2 px-4 my-0 recieved-offer-heading pb-0 md:pb-8">
                  <h3 className="text-xl sm:text-2xl font-bold text-[#0D1939] tracking-tight mb-1">
                    {title}
                  </h3>
                  {displayText ? (
                    <div className="text-sm font-medium text-gray-500 leading-relaxed max-w-xl mx-auto">
                      {renderStatusMessageText(displayText, attachments)}
                    </div>
                  ) : null}
                </div>
              );
            }

            // Check for Payment Request in this message
            const isPaymentRequest =
              msg.type === "payment_request" ||
              msg.content?.type === "payment_request" ||
              (msg.content?.systemText?.toLowerCase().includes("payment request") ||
                msg.message?.toLowerCase().includes("payment request"));

            if (isPaymentRequest) {
              const content = typeof msg.content === 'object' && msg.content !== null ? msg.content : {};
              let rawAmount =
                content.amount ??
                msg.amount ??
                content.total ??
                content.price ??
                content.invoice?.amount ??
                content.invoice?.totalAmount;

              if (rawAmount === undefined || rawAmount === null || rawAmount === "" || Number(rawAmount) === 0) {
                const textSearch = `${content.text || ''} ${content.systemText || ''} ${msg.message || ''} ${msg.text || ''}`;
                const match =
                  textSearch.match(/(?:due:\s*\$|request:\s*|\$|amount:\s*|payment:\s*)(\d+(?:\.\d+)?)/i) ||
                  textSearch.match(/\$(\d+(?:\.\d+)?)/) ||
                  textSearch.match(/(\d+(?:\.\d+)?)\s*(?:USD|EUR|GBP|\$)/i) ||
                  textSearch.match(/(\d+(?:\.\d+)?)/);
                if (match && match[1]) {
                  rawAmount = Number(match[1]);
                } else if (analysis?.amountDue) {
                  rawAmount = analysis.amountDue;
                }
              }

              const amount = Number(rawAmount || 0);
              const currency = (content.currency || msg.currency || analysis?.currency || "USD").toUpperCase();

              let description =
                content.description ||
                msg.description ||
                content.note ||
                content.message;

              if (!description && content.text) {
                const t = content.text;
                if (
                  !t.toLowerCase().includes("payment is requested") &&
                  !t.toLowerCase().includes("remaining amount due") &&
                  !t.toLowerCase().includes("payment request:")
                ) {
                  description = t;
                }
              }

              const aId = analysis._id || analysis.id;
              const invId = content.invoiceId || msg.invoiceId;
              const invNum = content.invoiceNumber || msg.invoiceNumber;
              const currentMsgId = msg.id || msg._id || msgId;

              const isPaid = Boolean(content.isPaid || msg.isPaid || content.status === 'paid' || msg.status === 'paid');

              const payParams = new URLSearchParams();
              if (amount > 0) payParams.set("amount", String(amount));
              if (invId) payParams.set("invoiceId", String(invId));
              if (invNum) payParams.set("invoiceNumber", String(invNum));
              if (currentMsgId) payParams.set("messageId", String(currentMsgId));
              if (description) payParams.set("description", String(description));
              const payUrl = `/dashboard/my-analyses/${aId}/payments?${payParams.toString()}`;

              return (
                <div
                  key={msgId}
                  className="w-full bg-[#F4F8FF] border border-[#DCE8FE] rounded-2xl p-5 sm:p-6 my-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center shrink-0">
                      <svg className="w-6 h-6 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <rect x="2" y="7" width="14" height="11" rx="2.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="6.5" cy="12.5" r="1.5" strokeWidth="2" />
                        <path d="M7 4h11.5A2.5 2.5 0 0121 6.5V14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1E3A8A] text-base mb-0.5">Payment Request</h4>
                      {description ? (
                        <p className="text-xs sm:text-sm text-[#3B82F6] font-medium mb-1.5">{description}</p>
                      ) : null}
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl sm:text-2xl font-black text-[#1E3A8A]">{currency === "EUR" ? "€" : "$"}{amount.toFixed(0)}</span>
                        <span className="text-[11px] font-bold text-[#3B82F6] uppercase">{currency}</span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {isPaid ? (
                      <button
                        type="button"
                        disabled
                        className="inline-flex items-center justify-center gap-1.5 w-full sm:w-auto px-8 py-2.5 bg-green-50 text-green-700 font-bold text-sm rounded-xl border border-green-200 cursor-not-allowed select-none"
                      >
                        <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Paid</span>
                      </button>
                    ) : (
                      <Link
                        href={payUrl}
                        className="inline-block w-full sm:w-auto px-8 py-2.5 bg-[#4343F0] hover:bg-[#3232b7] text-white font-bold text-sm rounded-xl shadow-md shadow-[#4343F0]/20 transition-all text-center cursor-pointer"
                      >
                        Pay Now
                      </Link>
                    )}
                  </div>
                </div>
              );
            }

            const content = msg.content || {};
            const deliverableItems = (content.deliverableItems && content.deliverableItems.length > 0 ? content.deliverableItems : null) ||
              (content.lineItems && content.lineItems.length > 0 ? content.lineItems : null) ||
              (Array.isArray(content.items) && content.items.length > 0 ? content.items : null);

            const solutionItems = (content.recommendedSolutions && content.recommendedSolutions.length > 0 ? content.recommendedSolutions : null) ||
              (msg.recommendedSolutions && msg.recommendedSolutions.length > 0 ? msg.recommendedSolutions : null);

            const isDeliverablesProposal = Boolean(deliverableItems && deliverableItems.length > 0);
            const hasProposalCost = Number(content.total || content.totalCost || 0) > 0;
            const hasRecs = Boolean(solutionItems && solutionItems.length > 0);

            if ((msg.type === "quote_proposal" || content.type === "quote_proposal") && (isDeliverablesProposal || hasProposalCost || !hasRecs)) {
              const items = isDeliverablesProposal ? deliverableItems : (solutionItems || []);
              const itemManager = analysis.assignedManagers?.[0] || analysis.projectManager || {};
              const itemManagerName = itemManager.fullName || (itemManager.firstName ? `${itemManager.firstName} ${itemManager.lastName || ''}`.trim() : '') || "Ragnar (Rick) Ridamäe";
              const itemManagerAvatar = itemManager.avatar || managerAvatar;

              const isExplicitAdmin =
                msg.sender === "admin" ||
                msg.role === "admin" ||
                msg.role === "ADMIN" ||
                msg.role === "SUPER_ADMIN" ||
                msg.role === "PM" ||
                msg.role === "STAFF" ||
                Boolean(msg.isFinalDelivery) ||
                msg.type === "final_delivery" ||
                msg.type === "quote_proposal" ||
                Boolean(msg.content?.isFinalDelivery);

              const isClient = !isExplicitAdmin && (msg.sender === "client" || msg.role === "client");
              const clientName =
                currentUser?.fullName ||
                (currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName || ""}`.trim() : "") ||
                currentUser?.username;
              const senderName = isClient
                ? (msg.username && msg.username !== "Staff" && msg.username !== "Analysis Team" && msg.username !== "Client" ? msg.username : clientName || "You")
                : (msg.username && msg.username !== "Staff" && msg.username !== "Client" && msg.username !== "Analysis Team" ? msg.username : itemManagerName);
              const senderAvatar = isClient ? (msg.userAvatar || currentUser?.avatar) : (msg.userAvatar || itemManagerAvatar);
              const senderInitial = (senderName || "A").charAt(0).toUpperCase();
              const messageBody = msg.message || content.text || content.projectDescription || content.description || "";
              const attachmentList = (msg.attachments && msg.attachments.length > 0) ? msg.attachments : (content?.attachedFiles || (msg as any).attachedFiles || []);

              const actions = (content.actionsAvailable && content.actionsAvailable.length > 0)
                ? content.actionsAvailable
                : ["accept", "request_modification", "decline"];

              const subsequentMessages = (analysis.messages || []).slice(idx + 1);
              const nextProposalIdx = subsequentMessages.findIndex((m: any) => m.type === "quote_proposal" || m.content?.type === "quote_proposal");
              const relevantSubsequent = nextProposalIdx !== -1 ? subsequentMessages.slice(0, nextProposalIdx) : subsequentMessages;

              const wasAcceptedAfterThis = relevantSubsequent.some((m: any) => {
                const text = `${m.message || ""} ${m.content?.systemText || ""} ${m.content?.text || ""}`.toLowerCase();
                return (
                  (m.type === "system_notification" || m.isSystem || m.type === "quote_action") &&
                  (text.includes("accepted") || text.includes("add-on proposal accepted") || text.includes("offer was accepted"))
                );
              });

              const wasDeclinedAfterThis = relevantSubsequent.some((m: any) => {
                const text = `${m.message || ""} ${m.content?.systemText || ""} ${m.content?.text || ""}`.toLowerCase();
                return (
                  (m.type === "system_notification" || m.isSystem || m.type === "quote_action") &&
                  (text.includes("declined") || text.includes("proposal declined") || text.includes("offer was declined"))
                );
              });

              const wasModRequestedAfterThis = relevantSubsequent.some((m: any) => {
                const text = `${m.message || ""} ${m.content?.systemText || ""} ${m.content?.text || ""}`.toLowerCase();
                return (
                  (m.type === "system_notification" || m.isSystem || m.type === "quote_action") &&
                  (text.includes("modification") || text.includes("requested modification"))
                );
              });

              const hasLaterProposal = subsequentMessages.some(
                (m: any) => m.type === "quote_proposal" || m.content?.type === "quote_proposal"
              );

              const isAccepted = content.status === "accepted" || wasAcceptedAfterThis;
              const isDeclined = content.status === "declined" || wasDeclinedAfterThis;
              const isModRequested = content.status === "modification_requested" || wasModRequestedAfterThis;

              const hasExplicitlyNoActions = Array.isArray(content.actionsAvailable) && content.actionsAvailable.length === 0;
              const isPending = !isAccepted && !isDeclined && !isModRequested && !hasLaterProposal && !hasExplicitlyNoActions;
              const canAct = isPending;

              const targetProposalId = msg._id ? String(msg._id) : (msg.id ? String(msg.id) : (content?.id ? String(content.id) : String(msgId)));

              const baseAmount = items.reduce((sum: number, it: any) => sum + (Number(it.amount ?? it.cost) || 0), 0) || Number(content.total || content.totalCost || 0);
              const vatRate = content.vatRate ?? 0;
              const vatAmount = content.vatAmount ?? ((baseAmount * vatRate) / 100);
              const totalCost = Number(content.total ?? content.totalCost ?? (baseAmount + vatAmount));

              const calculatedDurationDays = items.reduce((sum: number, it: any) => {
                const dur = String(it.duration || "").toLowerCase();
                const match = dur.match(/(\d+(\.\d+)?)/);
                const val = match ? parseFloat(match[0]) : 0;
                if (dur.includes("week")) return sum + val * 7;
                if (dur.includes("month")) return sum + val * 30;
                return sum + val;
              }, 0);
              const rawDuration = content.totalDuration || content.duration || (calculatedDurationDays > 0 ? `${calculatedDurationDays} Day${calculatedDurationDays > 1 ? "s" : ""}` : "");
              const formatOfferDuration = (val: any) => {
                if (!val) return "";
                const str = String(val).trim();
                const num = parseInt(str, 10);
                if (!isNaN(num) && !str.toLowerCase().includes("day") && !str.toLowerCase().includes("week") && !str.toLowerCase().includes("month")) {
                  return `${num} Day${num !== 1 ? "s" : ""}`;
                }
                return str;
              };
              const totalOfferDuration = formatOfferDuration(rawDuration);

              const cleanExpires = (val: any) => {
                if (!val || val === "Not specified" || val === "N/A" || val === "-") return "N/A";
                const rawStr = String(val).trim();
                const strippedStr = rawStr.replace(/^(submitted\s*(on|-)?|expires\s*(on|-)?)\s*/i, "").trim();
                const d = new Date(strippedStr);
                if (!isNaN(d.getTime())) {
                  return formatSubmittedDate(d);
                }
                return strippedStr || rawStr;
              };
              const expiresStr = cleanExpires(content.expires);

              const isLast = idx === (analysis.messages?.length || 0) - 1;

              if (isDeliverablesProposal) {
                return (
                  <div key={msgId} ref={isLast ? messagesEndRef : null} className="w-full my-4">
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-xs p-6 sm:p-8 md:p-10">
                      {/* Top Meta: Submitted date & Add-On Offer badge on left; Expires / resolution date on right */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs sm:text-sm text-gray-500 font-medium">
                            Submitted - {formatSubmittedDate(msg.createdAt || msg.timestamp)}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold border ${isAccepted ? "border-green-400 text-green-600 bg-green-50" :
                            isDeclined ? "border-red-400 text-red-600 bg-red-50" :
                              isModRequested ? "border-orange-400 text-orange-600 bg-orange-50" :
                                "border-blue-400 text-blue-600 bg-blue-50/60"
                            }`}>
                            {isAccepted ? "Accepted" :
                              isDeclined ? "Declined" :
                                isModRequested ? "Modification Requested" : "Add-On Offer"}
                          </span>
                        </div>
                        {content.status && content.status !== "pending" ? (
                          <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                            {isAccepted && content.acceptedAt ? `Accepted on ${formatSubmittedDate(content.acceptedAt)}` :
                              isDeclined && content.declinedAt ? `Declined on ${formatSubmittedDate(content.declinedAt)}` :
                                isModRequested && content.modificationRequestedAt ? `Requested on ${formatSubmittedDate(content.modificationRequestedAt)}` : ""}
                          </span>
                        ) : expiresStr && expiresStr !== "N/A" ? (
                          <span className="text-xs sm:text-sm text-gray-500 font-medium">
                            Expires on {expiresStr}
                          </span>
                        ) : null}
                      </div>

                      <div className="border-t border-gray-200 mb-6 sm:mb-8" />

                      {/* Header: Title and From */}
                      <div className="pb-4 sm:pb-6 flex flex-col sm:flex-row justify-between items-start gap-2">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Add-on proposal</h2>
                        <span className="text-xs sm:text-sm text-gray-400 font-medium">From: {senderName}</span>
                      </div>

                      {messageBody && (
                        <div className="mb-6 text-sm text-gray-600 leading-relaxed font-medium">
                          {messageBody}
                        </div>
                      )}

                      {/* Attachments if any */}
                      {attachmentList.length > 0 && (
                        <div className="mb-6">
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

                      {/* Deliverables Table */}
                      <div className="border border-gray-300 rounded-xl overflow-hidden mb-6">
                        <table className="w-full min-w-[500px] sm:min-w-0">
                          <thead>
                            <tr className="border-b border-gray-300 bg-white">
                              <th className="px-6 py-4 text-left text-xs sm:text-sm font-bold text-gray-700 bg-white w-1/2">Item</th>
                              <th className="px-6 py-4 text-center text-xs sm:text-sm font-bold text-gray-700 bg-white">Duration</th>
                              <th className="px-6 py-4 text-right text-xs sm:text-sm font-bold text-gray-700 bg-white">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item: any, sIdx: number) => (
                              <tr key={sIdx} className={sIdx < items.length - 1 ? "border-b border-gray-200" : ""}>
                                <td className="px-6 py-5 text-xs sm:text-sm text-gray-700 align-middle">
                                  <div className="font-semibold text-gray-800">{item.description || item.name || item.title || item.item}</div>
                                  {item.details && <div className="text-[11px] text-gray-400 mt-0.5">{item.details}</div>}
                                </td>
                                <td className="px-6 py-5 text-xs sm:text-sm text-gray-600 font-medium text-center align-middle whitespace-nowrap">
                                  {item.duration ? `${item.duration} Days` : "-"}
                                </td>
                                <td className="px-6 py-5 text-xs sm:text-sm text-gray-900 text-right font-bold align-middle">
                                  {formatCurrency(item.amount ?? item.cost ?? 0)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Totals & Duration Row */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pt-2 pb-2">
                        <div>
                          {totalOfferDuration ? (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-800 font-bold text-sm">Total Duration:</span>
                              <span className="font-extrabold text-gray-900 text-sm sm:text-base">{totalOfferDuration}</span>
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-col items-end gap-2 text-xs sm:text-sm min-w-[220px]">
                          {vatRate > 0 && vatAmount > 0 && (
                            <div className="flex justify-between w-full gap-8">
                              <span className="text-gray-500 font-medium">Base Amount:</span>
                              <span className="font-bold text-gray-700">{formatCurrency(baseAmount)}</span>
                            </div>
                          )}
                          {vatRate > 0 && vatAmount > 0 && (
                            <div className="flex justify-between w-full gap-8">
                              <span className="text-gray-500 font-medium">VAT ({vatRate}%):</span>
                              <span className="font-bold text-gray-700">{formatCurrency(vatAmount)}</span>
                            </div>
                          )}
                          {vatRate > 0 && vatAmount > 0 && (
                            <div className="border-t border-gray-200 w-full my-1" />
                          )}
                          <div className="flex justify-between w-full gap-8">
                            <span className="text-gray-800 font-bold text-sm">Total Cost:</span>
                            <span className="font-extrabold text-gray-900 text-sm sm:text-base">{formatCurrency(totalCost)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Informational Acceptance Note */}
                      <div className="mt-4 p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs sm:text-sm text-blue-800 font-medium leading-relaxed">
                        Upon acceptance of the offer, the total timeline and cost above will be added to the overall project timeline and cost.
                      </div>

                      {/* Action Buttons (Accept, Request Modifications, Decline) */}
                      {canAct && !actionModal.isOpen && (
                        <>
                          <div className="border-t border-gray-200 mt-8 mb-6" />
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
                            <div className="w-full sm:w-auto flex justify-start">
                              {actions.includes("accept") && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (targetProposalId) handleAcceptProposal(targetProposalId);
                                  }}
                                  disabled={isActionLoading}
                                  className="w-full sm:w-auto min-w-[160px] bg-[#317336] hover:bg-[#285d2c] text-white text-sm font-bold py-3 px-8 rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer text-center"
                                >
                                  Accept Offer
                                </button>
                              )}
                            </div>
                            <div className="w-full sm:w-auto flex justify-center">
                              {actions.includes("request_modification") && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setActionComment("");
                                    setActionModal({
                                      isOpen: true,
                                      action: "request_modification",
                                      proposalId: targetProposalId,
                                      title: "Request Modifications",
                                      description: "Please describe the modifications you would like for this offer.",
                                      placeholder: "Describe your requested changes...",
                                      required: true,
                                    });
                                  }}
                                  disabled={isActionLoading}
                                  className="w-full sm:w-auto min-w-[190px] bg-[#3B4BEF] hover:bg-[#2F3EC4] text-white text-sm font-bold py-3 px-8 rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer text-center"
                                >
                                  Request Modifications
                                </button>
                              )}
                            </div>
                            <div className="w-full sm:w-auto flex justify-end">
                              {actions.includes("decline") && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setActionComment("");
                                    setActionModal({
                                      isOpen: true,
                                      action: "decline",
                                      proposalId: targetProposalId,
                                      title: "Decline Add-On Offer",
                                      description: "Are you sure you want to decline this offer? You can provide a reason below.",
                                      placeholder: "Reason for declining (optional)...",
                                      required: false,
                                    });
                                  }}
                                  disabled={isActionLoading}
                                  className="w-full sm:w-auto min-w-[160px] bg-[#7A1C1C] hover:bg-[#631616] text-white text-sm font-bold py-3 px-8 rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer text-center"
                                >
                                  Decline Offer
                                </button>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Inline Action Modal for Proposal */}
                      {actionModal.isOpen && (actionModal.proposalId === targetProposalId || actionModal.proposalId === String(msg._id) || actionModal.proposalId === String(msg.id)) && (
                        <div className="w-full mt-6 animate-in fade-in slide-in-from-top-4 duration-300">
                          <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
                            {/* Header: User avatar, Name, Subtitle, Date */}
                            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 bg-white">
                              <div className="flex items-center gap-3.5">
                                {currentUser?.avatar ? (
                                  <img
                                    src={currentUser.avatar}
                                    alt="User"
                                    className="w-11 h-11 rounded-full object-cover shadow-xs ring-1 ring-gray-200"
                                  />
                                ) : (
                                  <div className="w-11 h-11 rounded-full bg-[#183B7E] flex items-center justify-center text-white font-bold text-base shadow-xs">
                                    {(currentUser?.fullName || currentUser?.username || "U").charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-tight">
                                    {currentUser?.fullName || currentUser?.username || "User"}
                                  </h3>
                                  <p className="text-xs text-gray-500 mt-0.5 font-normal">
                                    {actionModal.title}
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs text-gray-400 font-medium">
                                {formatSubmittedDate(new Date())}
                              </span>
                            </div>

                            {/* Body: Description prompt & borderless textarea */}
                            <div className="p-6">
                              {actionModal.description && (
                                <p className="text-gray-700 text-xs sm:text-sm mb-4 font-semibold">
                                  {actionModal.description}
                                </p>
                              )}
                              <textarea
                                className="w-full min-h-[120px] text-gray-700 text-xs sm:text-sm leading-relaxed resize-none focus:outline-none placeholder-gray-400 bg-transparent"
                                placeholder={actionModal.placeholder}
                                value={actionComment}
                                onChange={(e) => setActionComment(e.target.value)}
                                autoFocus
                              />
                            </div>

                            {/* Footer Buttons: Cancel & Decline Offer / Send Request */}
                            <div className="px-6 pb-6 pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
                              <div className="flex gap-3 w-full sm:w-auto">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setActionModal({ ...actionModal, isOpen: false, proposalId: null });
                                    setActionComment("");
                                  }}
                                  className="flex-1 sm:flex-none px-6 py-2.5 bg-[#7A1C1C] hover:bg-[#631616] text-white font-bold text-xs sm:text-sm rounded-lg transition-colors shadow-xs cursor-pointer text-center"
                                  disabled={isActionLoading}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleActionSubmit();
                                  }}
                                  disabled={isActionLoading || (actionModal.required && !actionComment.trim())}
                                  className={`flex-1 sm:flex-none px-6 py-2.5 text-white rounded-lg text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer text-center ${isActionLoading
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : actionModal.action === "decline"
                                      ? "bg-[#C5221F] hover:bg-[#A91D1A]"
                                      : "bg-[#3B4BEF] hover:bg-[#2F3EC4]"
                                    }`}
                                >
                                  {isActionLoading
                                    ? "Processing..."
                                    : actionModal.action === "decline"
                                      ? "Decline Offer"
                                      : "Send Request"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div key={msgId} className="w-full">
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

                      {/* Attachments if any */}
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
                      {solutionItems && solutionItems.length > 0 && (
                        <div className="pl-0 md:pl-[64px] mb-6">
                          <RecommendedSolutions solutions={solutionItems} availablePackages={availablePackages} />
                        </div>
                      )}

                      {/* Inline Action Modal for Proposal */}
                      {actionModal.isOpen && (actionModal.proposalId === msg.id || actionModal.proposalId === targetProposalId) && (
                        <div className="w-full mt-6 animate-in fade-in slide-in-from-top-4 duration-300">
                          <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
                            {/* Header: User avatar, Name, Subtitle, Date */}
                            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 bg-white">
                              <div className="flex items-center gap-3.5">
                                {currentUser?.avatar ? (
                                  <img
                                    src={currentUser.avatar}
                                    alt="User"
                                    className="w-11 h-11 rounded-full object-cover shadow-xs ring-1 ring-gray-200"
                                  />
                                ) : (
                                  <div className="w-11 h-11 rounded-full bg-[#183B7E] flex items-center justify-center text-white font-bold text-base shadow-xs">
                                    {(currentUser?.fullName || currentUser?.username || "U").charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-tight">
                                    {currentUser?.fullName || currentUser?.username || "User"}
                                  </h3>
                                  <p className="text-xs text-gray-500 mt-0.5 font-normal">
                                    {actionModal.title}
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs text-gray-400 font-medium">
                                {formatSubmittedDate(new Date())}
                              </span>
                            </div>

                            {/* Body: Description prompt & borderless textarea */}
                            <div className="p-6">
                              {actionModal.description && (
                                <p className="text-gray-700 text-xs sm:text-sm mb-4 font-semibold">
                                  {actionModal.description}
                                </p>
                              )}
                              <textarea
                                className="w-full min-h-[120px] text-gray-700 text-xs sm:text-sm leading-relaxed resize-none focus:outline-none placeholder-gray-400 bg-transparent"
                                placeholder={actionModal.placeholder}
                                value={actionComment}
                                onChange={(e) => setActionComment(e.target.value)}
                                autoFocus
                              />
                            </div>

                            {/* Footer Buttons: Cancel & Decline Offer / Send Request */}
                            <div className="px-6 pb-6 pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
                              <div className="flex gap-3 w-full sm:w-auto">
                                <button
                                  type="button"
                                  onClick={() => setActionModal({ ...actionModal, isOpen: false })}
                                  className="flex-1 sm:flex-none px-6 py-2.5 bg-[#7A1C1C] hover:bg-[#631616] text-white font-bold text-xs sm:text-sm rounded-lg transition-colors shadow-xs cursor-pointer text-center"
                                  disabled={isActionLoading}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={handleActionSubmit}
                                  disabled={isActionLoading || (actionModal.required && !actionComment.trim())}
                                  className={`flex-1 sm:flex-none px-6 py-2.5 text-white rounded-lg text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer text-center ${isActionLoading
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : actionModal.action === "decline"
                                      ? "bg-[#C5221F] hover:bg-[#A91D1A]"
                                      : "bg-[#3B4BEF] hover:bg-[#2F3EC4]"
                                    }`}
                                >
                                  {isActionLoading
                                    ? "Processing..."
                                    : actionModal.action === "decline"
                                      ? "Decline Offer"
                                      : "Send Request"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            const fallbackManager = analysis.assignedManagers?.[0] || analysis.projectManager || {};
            const fallbackManagerName = fallbackManager.fullName || (fallbackManager.firstName ? `${fallbackManager.firstName} ${fallbackManager.lastName || ''}`.trim() : '') || "Ragnar (Rick) Ridamäe";
            const fallbackManagerAvatar = fallbackManager.avatar;

            const isExplicitAdmin =
              msg.sender === "admin" ||
              msg.role === "admin" ||
              msg.role === "ADMIN" ||
              msg.role === "SUPER_ADMIN" ||
              msg.role === "PM" ||
              msg.role === "STAFF" ||
              Boolean(msg.isFinalDelivery) ||
              msg.type === "final_delivery" ||
              msg.type === "quote_proposal" ||
              Boolean(msg.content?.isFinalDelivery);

            const isClient = !isExplicitAdmin && (msg.sender === "client" || msg.role === "client");
            const clientName =
              currentUser?.fullName ||
              (currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : '') ||
              currentUser?.username;
            const senderName = isClient
              ? (msg.username && msg.username !== "Staff" && msg.username !== "Analysis Team" && msg.username !== "Client" ? msg.username : clientName || "You")
              : (msg.username && msg.username !== "Staff" && msg.username !== "Client" && msg.username !== "Analysis Team" ? msg.username : fallbackManagerName);
            const senderAvatar = isClient ? (msg.userAvatar || currentUser?.avatar) : (msg.userAvatar || fallbackManagerAvatar);
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
                        Attached Files
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
                        <RecommendedSolutions solutions={recs} availablePackages={availablePackages} />
                      </div>
                    );
                  })()}
                </div>

                {isDeliveryMsg && !hasSubsequentCompletionMsg && (
                  <div className="text-center py-2 px-4 my-0">
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
          <div className="text-center py-2 px-4 my-0">
            <h3 className="text-xl sm:text-2xl font-bold text-[#0D1939] tracking-tight mb-1">
              Analysis completed!
            </h3>
            <div className="text-sm font-medium text-gray-500 leading-relaxed max-w-xl mx-auto">
              This analysis has been completed.
            </div>
          </div>
        )}

      <div ref={messagesEndRef} className="h-4 w-full shrink-0 hidden md:block" />

      {/* New Message Box Form */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden w-full detail-message-box-main">
        <form onSubmit={handleSendMessage}>
          <div className="flex items-center justify-between p-4 sm:p-6 pb-4 border-b border-gray-100 bg-gray-50/50">
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

          <div className="p-4 sm:p-6 pb-2">
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

          <div className="px-3.5 sm:px-6 py-3 sm:py-3.5 border-t border-gray-100 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                if (!requireAuth()) return;
                fileInputRef.current?.click();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg border border-blue-600 hover:bg-blue-50 shadow-sm cursor-pointer shrink-0"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
              <span className="hidden min-[380px]:inline">Attach Files</span>
              <span className="min-[380px]:hidden">Attach</span>
              {attachments.length > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 bg-[#4343F0] text-white text-[10px] font-bold rounded-full ml-0.5">
                  {attachments.length}
                </span>
              )}
            </button>
            <input ref={fileInputRef} hidden multiple type="file" accept="*/*" onChange={handleFileUpload} />

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (!requireAuth()) return;
                  setMessageText("");
                  setAttachments([]);
                }}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#7A1C1C] hover:bg-[#631616] text-white font-bold text-xs rounded-lg transition-colors shadow-sm cursor-pointer whitespace-nowrap"
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
                      attachments.filter((a) => a.status === "done" || !a.status).length === 0))
                }
                className={`px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition-all shadow-sm whitespace-nowrap ${
                  isLoggedIn &&
                  (isSending ||
                    isUploading ||
                    (!messageText.trim() && attachments.filter((a) => a.status === "done" || !a.status).length === 0))
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
        <SupportNewsletter noPadding gridClassName="mt-0 md:mt-12" />
      </div>

    </div>
  );
}
