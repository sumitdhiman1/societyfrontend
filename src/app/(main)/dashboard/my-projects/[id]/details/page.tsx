"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useProject } from "@/context/ProjectContext";
import { projectService } from "@/lib/projectService";
import { mediaService } from "@/lib/mediaService";
import { authService } from "@/lib/authService";
import { downloadFile, isImageUrl, getSafeUrl } from "@/lib/utils";
import { downloadProjectDetailsPDF, printProjectDetails } from "@/lib/generateProjectDetailsPDF";
import { downloadCalculatorProjectPDF, printCalculatorProjectPDF } from "@/lib/generateCalculatorProjectPDF";
import LoadingDots from "@/components/common/LoadingDots";
import AuthPromptModal from "@/components/common/AuthPromptModal";
import DeadlineTooltip from "@/components/common/DeadlineTooltip";
import RecommendedSolutions from "@/components/common/RecommendedSolutions";
import CalculatorSpecsCard from "@/components/common/CalculatorSpecsCard";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";
import { getMainCalculatorCategory, getProjectEstimatedDeadline, isCalculatorProject } from "@/lib/calculatorUtils";
import { capitalizeCurrencyInText, formatPriceWithCurrency, convertCurrencyAmount } from "@/lib/currencyUtils";
import { useCurrency } from "@/context/CurrencyContext";
import { useTimezone } from "@/context/TimezoneContext";
import { toast } from "sonner";
import { paymentService } from "@/lib/paymentService";
import { quoteService } from "@/lib/quoteService";

const renderStatusMessageText = (rawText: string, attachments?: any[]) => {
  const text = capitalizeCurrencyInText(rawText);
  if (!text) return null;

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

  // 2. Contact phrase regex without markdown
  const contactRegex = /(click here to contact us for further assistance\.?|click here to contact us\.?|contact us for further assistance\.?|contact us\.?)/i;
  if (contactRegex.test(text)) {
    const parts = text.split(contactRegex);
    return (
      <span>
        {parts.map((part, i) =>
          contactRegex.test(part) ? (
            <Link
              key={i}
              href="/help-support/contact-us"
              className="text-[#5356ff] underline hover:text-[#3232b7] font-semibold transition-colors"
            >
              {part}
            </Link>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
        {renderPdfButton()}
      </span>
    );
  }

  // 3. Raw URL
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  if (urlRegex.test(text)) {
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

const asId = (val: any): string => {
  if (val == null || val === "") return "";
  if (typeof val === "object") return String(val._id || val.id || "");
  return String(val);
};

function isExactPaymentRequestPaid(msg: any, project: any, payments: any[]): boolean {
  const content = typeof msg?.content === "object" && msg.content ? msg.content : {};
  const invId = asId(content.invoiceId || msg.invoiceId);
  const invNum = String(content.invoiceNumber || msg.invoiceNumber || "").trim();
  const msgIds = [asId(msg._id), asId(msg.id), asId(content.messageId)].filter(Boolean);

  if (!invId && !invNum && msgIds.length === 0) return false;

  const matchesTarget = (target: { messageId?: any; invoiceId?: any; invoiceNumber?: any }) => {
    const tMsgId = asId(target.messageId);
    const tInvId = asId(target.invoiceId);
    const tInvNum = String(target.invoiceNumber || "").trim();
    return Boolean(
      (tMsgId && msgIds.includes(tMsgId)) ||
      (invId && tInvId && invId === tInvId) ||
      (invNum && tInvNum && invNum === tInvNum)
    );
  };

  if ((project.invoices || []).some((inv: any) =>
    String(inv.status || "").toLowerCase() === "paid" &&
    matchesTarget({ invoiceId: inv._id || inv.id, invoiceNumber: inv.invoiceNumber })
  )) {
    return true;
  }

  if ((project.messages || []).some((m: any) => {
    const c = m.content || {};
    const type = String(m.type || c.type || "").toLowerCase();
    const text = `${m.message || ""} ${c.text || ""} ${c.systemText || ""}`.toLowerCase();
    const isReceipt = type === "payment_received" || type === "payment_receipt" || text.includes("payment received") || text.includes("payment confirmed");
    return isReceipt && matchesTarget({
      messageId: c.messageId || m.messageId,
      invoiceId: c.invoiceId || m.invoiceId,
      invoiceNumber: c.invoiceNumber || m.invoiceNumber,
    });
  })) {
    return true;
  }

  return (payments || []).some((p: any) => {
    if (!["succeeded", "paid", "completed"].includes(String(p.status || "").toLowerCase())) return false;
    const meta = p.metadata || {};
    return matchesTarget({
      messageId: meta.messageId,
      invoiceId: meta.invoiceId || meta.invoice_id,
      invoiceNumber: meta.invoiceNumber,
    });
  });
}

export default function ProjectDetailsPage() {
  const { project, setProject, refreshProject } = useProject();
  const { currency: contextCurrency, conversionRate } = useCurrency();
  const {
    formatSubmittedDate: formatSubmittedDateTz,
    formatMessageTimestamp: formatMessageTimestampTz,
    formatDateTime: formatDateTimeTz,
  } = useTimezone();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(() => {
    if (typeof window !== "undefined") {
      return authService.getUser();
    }
    return null;
  });

  useEffect(() => {
    const user = authService.getUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isTogglingRenewal, setIsTogglingRenewal] = useState(false);
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
  const actionLoadingRef = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLDivElement>(null);

  const [isRestarting, setIsRestarting] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [projectPayments, setProjectPayments] = useState<any[]>([]);
  const [fetchedQuote, setFetchedQuote] = useState<any>(null);

  useEffect(() => {
    const rawQuoteId = typeof project?.quoteId === "string" ? project.quoteId : project?.quoteId?._id;
    if (rawQuoteId && !fetchedQuote && (!project?.quoteId || typeof project?.quoteId === "string" || !project?.quoteId?.requirements)) {
      quoteService
        .getQuoteById(rawQuoteId)
        .then((res) => {
          if (res?.data) {
            setFetchedQuote(res.data);
          }
        })
        .catch((err) => {
          console.warn("Could not fetch quote for verification:", err);
        });
    }
  }, [project?.quoteId, project?.calculatorSpecs, project?.isCalculator, fetchedQuote]);

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

  const syncFinancialsAndProject = React.useCallback(async (silent = true) => {
    try {
      const refreshed = await refreshProject(silent);
      const targetId =
        refreshed?._id ||
        refreshed?.id ||
        project?._id ||
        project?.id ||
        project?.projectId;
      if (targetId) {
        const res = await paymentService.getTransactionsByProject(String(targetId));
        const rows = Array.isArray(res?.data) ? res.data : [];
        setProjectPayments(rows);
      }
    } catch (e) {
      console.warn("Failed syncFinancialsAndProject:", e);
    }
  }, [refreshProject, project?._id, project?.id, project?.projectId]);

  useEffect(() => {
    setCurrentUser(authService.getUser());
    syncFinancialsAndProject(true);
    const t1 = setTimeout(() => syncFinancialsAndProject(true), 1500);
    const t2 = setTimeout(() => syncFinancialsAndProject(true), 3500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [syncFinancialsAndProject]);

  // Handle URL success param (e.g. returning from checkout)
  useEffect(() => {
    if (searchParams?.get("success") === "true") {
      syncFinancialsAndProject(true);
      const t = setTimeout(() => {
        syncFinancialsAndProject(true);
        try {
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.delete("success");
          window.history.replaceState(null, "", currentUrl.toString());
        } catch {}
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [searchParams, syncFinancialsAndProject]);

  // Refresh whenever tab gains focus or becomes visible
  useEffect(() => {
    const onFocus = () => syncFinancialsAndProject(true);
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        syncFinancialsAndProject(true);
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [syncFinancialsAndProject]);

  useEffect(() => {
    const projectId =
      project?._id ||
      project?.id ||
      project?.projectId ||
      project?.project_id;
    if (!projectId) return;
    paymentService
      .getTransactionsByProject(String(projectId))
      .then((res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        setProjectPayments(rows);
      })
      .catch(() => {
        // Keep existing projectPayments
      });
  }, [project?._id, project?.id, project?.projectId, project?.amountPaid, project?.paymentStatus, project?.updatedAt, project?.paymentLedger?.length]);

  useEffect(() => {
    const projectId = project?._id || project?.id || project?.projectId || project?.project_id || project?.orderId || project?.uuid || project?.uid || project?.project?._id || project?.project?.id;
    if (projectId) {
      projectService.markMessagesAsRead(projectId).catch(err => {
        console.error("Failed to mark messages as read:", err);
      });
    }
  }, [project?._id, project?.id, project?.projectId, project?.status]);

  const scrollToBottomMessages = React.useCallback((behavior: ScrollBehavior = "smooth") => {
    // 1. If there is a last message in the feed
    if (lastMessageRef.current) {
      const rect = lastMessageRef.current.getBoundingClientRect();
      // If the message is very tall (>60% of viewport), align its top so the user can read from start
      if (rect.height > window.innerHeight * 0.6) {
        lastMessageRef.current.scrollIntoView({ behavior, block: "start" });
        return;
      }
      // If message composer is present, aligning composer to the bottom of the viewport shows the last message right above it
      if (messageInputRef.current) {
        messageInputRef.current.scrollIntoView({ behavior, block: "end" });
        return;
      }
      lastMessageRef.current.scrollIntoView({ behavior, block: "center" });
      return;
    }

    // 2. If no messages exist yet (empty feed, matching Screenshot 2):
    // Aligning the composer centers it with "Project Started" above it
    if (messageInputRef.current) {
      messageInputRef.current.scrollIntoView({ behavior, block: "center" });
      return;
    }

    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: "end" });
      return;
    }

    const el = document.getElementById("messages");
    if (el) {
      el.scrollIntoView({ behavior, block: "start" });
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
  }, [project?._id, project?.messages?.length, scrollToBottomMessages]);

  if (!project) return null;

  const formatSubmittedDate = (date: any) => {
    return formatSubmittedDateTz(date);
  };

  const formatChatDate = (date: any) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const day = formatDateTimeTz(d, { day: "numeric" });
    const month = formatDateTimeTz(d, { month: "short" });
    const time = formatDateTimeTz(d, { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
    return `${day} ${month}, ${time}`;
  };

  const formatMessageTimestamp = (date: any) => {
    return formatMessageTimestampTz(date);
  };

  const formatCurrency = (amt: any, customSourceCurrency?: string) => {
    const num = Number(amt || 0);
    const activeUser = currentUser || (typeof window !== "undefined" ? authService.getUser() : null);
    const resolvedProjectCurrency = (
      project?.currency ||
      linkedQuote?.currency ||
      projectPayments[0]?.currency ||
      (project?.currencySymbol === "€" ? "EUR" : project?.currencySymbol === "$" ? "USD" : "USD")
    ).toUpperCase();
    const srcCurrency = (customSourceCurrency || resolvedProjectCurrency || "USD").toUpperCase();
    const targetCurrency = (
      contextCurrency ||
      activeUser?.currency ||
      activeUser?.preferredCurrency ||
      resolvedProjectCurrency ||
      "USD"
    ).toUpperCase();
    return formatPriceWithCurrency(num, targetCurrency, srcCurrency, conversionRate);
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
          const pId = project._id || project.id || project.projectId || project.project_id || project.orderId || project.uuid || project.uid || project.project?._id || project.project?.id;
          const res = await mediaService.uploadImage({
            file: att.file,
            folder: `project-attachments/${pId}`,
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

  const handleSendMessage = async () => {
    if (!requireAuth()) return;
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

    if (!messageText.trim()) {
      toast.error("Please enter a message before sending.");
      return;
    }

    setIsSending(true);
    try {
      const pId = project._id || project.id || project.projectId || project.project_id || project.orderId || project.uuid || project.uid || project.project?._id || project.project?.id;
      const res = await projectService.addMessage(pId, messageText, false, uploadedUrls);
      if (res && (res.statusCode === 200 || res.statusCode === 201)) {
        setMessageText("");
        setAttachments([]);
        refreshProject();
        setTimeout(() => {
          scrollToBottomMessages("smooth");
        }, 200);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleAcceptProposal = async (proposalId: string) => {
    if (actionLoadingRef.current || isActionLoading) return;
    actionLoadingRef.current = true;
    setIsActionLoading(true);
    try {
      const username = currentUser?.fullName || currentUser?.username || "User";
      const avatar = currentUser?.avatar;
      const pId = project._id || project.id || project.projectId || project.project_id || project.orderId || project.uuid || project.uid || project.project?._id || project.project?.id;
      const res = await projectService.acceptProposal(pId, proposalId, username, avatar);
      if (res && (res.statusCode === 200 || res.statusCode === 201 || res.isSuccessful || res.data)) {
        if (res.data) {
          setProject(res.data);
        }
        toast.success("Add-on proposal accepted successfully!");
        await refreshProject();
      } else {
        toast.error(res?.message || "Failed to accept proposal");
      }
    } catch (error: any) {
      console.error("Failed to accept proposal:", error);
      toast.error(error?.message || "Failed to accept proposal");
    } finally {
      actionLoadingRef.current = false;
      setIsActionLoading(false);
    }
  };

  const handleRestartProject = async () => {
    const pId = project?._id || project?.id || project?.projectId || project?.project_id || project?.orderId || project?.uuid || project?.uid || project?.project?._id || project?.project?.id;
    if (pId) {
      setIsRestarting(true);
      try {
        const res: any = await projectService.restartMonthlyProject(pId);
        if (res && (res.isSuccessful || res.statusCode === 200 || res.statusCode === 201 || res.data)) {
          if (res.data) {
            setProject(res.data);
          } else {
            setProject((prev: any) => prev ? ({ ...prev, status: "active" }) : prev);
          }
          toast.success("Project restarted successfully!");
          await refreshProject();
        } else {
          toast.error(res?.message || "Failed to restart project");
        }
      } catch (error: any) {
        console.error("Failed to restart project:", error);
        toast.error(error?.message || "Failed to restart project");
      } finally {
        setIsRestarting(false);
      }
    }
  };

  const handleToggleAutoRenewal = async (enable: boolean) => {
    const pId = project?._id || project?.id || project?.projectId || project?.project_id || project?.orderId || project?.uuid || project?.uid || project?.project?._id || project?.project?.id;
    if (!pId) return;

    setIsTogglingRenewal(true);
    try {
      // Optimistic state update
      setProject((prev: any) => prev ? ({ ...prev, autoRenewal: enable }) : prev);

      const res: any = await projectService.toggleAutoRenewal(pId, enable);
      if (res && (res.isSuccessful || res.statusCode === 200 || res.data)) {
        if (res.data) {
          setProject(res.data);
        }
        toast.success(enable ? "Auto-renewal enabled successfully!" : "Auto-renewal disabled successfully.");
        await refreshProject();
      } else {
        toast.error(res?.message || "Failed to update auto-renewal");
        await refreshProject();
      }
    } catch (err: any) {
      console.error("Auto-renewal error:", err);
      toast.error(err?.message || "Failed to update auto-renewal");
      await refreshProject();
    } finally {
      setIsTogglingRenewal(false);
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

        if (res && (res.statusCode === 200 || res.statusCode === 201 || res.isSuccessful || res.data)) {
          toast.success(actionModal.action === "decline" ? "Offer declined successfully" : "Modification request sent");
          setActionModal({ ...actionModal, isOpen: false });
          setActionComment("");
          refreshProject();
        } else {
          toast.error(res?.message || `Failed to ${actionModal.action} offer`);
        }
      } catch (error: any) {
        console.error(`Failed to handle ${actionModal.action}:`, error);
        toast.error(error?.message || `Failed to ${actionModal.action} offer`);
      } finally {
        setIsActionLoading(false);
      }
    }
  };

  const isUploading = attachments.some(a => a.status === "uploading");

  const isMonthlyProject = Boolean(
    project.billingType === "monthly" ||
    project.calculatorSpecs?.billingType === "monthly" ||
    project.calculatorSpecs?.categoryKey === "marketing" ||
    project.categoryKey === "marketing" ||
    /marketing|campaign/i.test(project.title || "") ||
    /marketing|campaign/i.test(project.calculatorSpecs?.categoryName || "") ||
    (project.calculatorSpecs?.categoryKey === "seo" && project.calculatorSpecs?.seoServiceMode === "monthly")
  );

  const linkedQuote = fetchedQuote || (typeof project?.quoteId === "object" && project?.quoteId ? project.quoteId : null) || project?.quote || {};
  const isEstoniaClient = (c?: string) => {
    if (!c) return false;
    const upper = c.trim().toUpperCase();
    return upper === "EE" || upper === "EST" || upper === "ESTONIA";
  };
  const countryStr = String(
    project?.clientCountry ||
    project?.country ||
    project?.client?.country ||
    project?.client?.clientCountry ||
    project?.client?.billingCountry ||
    project?.billingCountry ||
    linkedQuote?.clientCountry ||
    linkedQuote?.country ||
    (typeof linkedQuote?.client === "object" ? (linkedQuote?.client?.country || linkedQuote?.client?.clientCountry || linkedQuote?.client?.billingCountry) : "") ||
    currentUser?.country ||
    currentUser?.clientCountry ||
    ""
  );

  const explicitVatRate = Number(
    project?.vatRate ??
    project?.vatPercentage ??
    linkedQuote?.vatRate ??
    linkedQuote?.vatPercentage ??
    (project?.taxPercentage != null ? project?.taxPercentage : 0)
  ) || 0;

  const vatRate = explicitVatRate > 0 ? explicitVatRate : (isEstoniaClient(countryStr) ? 24 : 0);

  const rawBaseCost = Number(project?.price ?? project?.totalPrice ?? project?.totalCost ?? 0);

  // 1. Deduplicate addons from project.addons
  const seenAddonKeys = new Set<string>();
  const uniqueProjectAddons = (project?.addons || []).filter((addon: any) => {
    const key = String(addon.proposalMessageId || addon._id || (Array.isArray(addon.deliverableItems) ? addon.deliverableItems.map((i: any) => `${i.description}-${i.amount}-${i.duration}`).join('|') : '')).trim();
    if (!key) return true;
    if (seenAddonKeys.has(key)) return false;
    seenAddonKeys.add(key);
    return true;
  });

  const addonItemsFromAddons = uniqueProjectAddons.flatMap((addon: any) =>
    (addon.deliverableItems || []).map((item: any) => ({
      description: item.description || item.title || item.name || "Add-On Deliverable",
      details: item.details || "",
      duration: item.duration ? `${item.duration} ${item.unit || (String(item.duration).toLowerCase().includes("day") || String(item.duration).toLowerCase().includes("week") || String(item.duration).toLowerCase().includes("month") ? "" : "Days")}`.trim() : (addon.totalDuration ? `${addon.totalDuration}`.trim() : "1 Days"),
      amount: Number(item.amount ?? item.cost ?? 0),
      isAddOn: true,
    }))
  );

  // 2. Addon items from project.messages (fallback if project.addons is empty)
  const seenMsgIds = new Set<string>();
  const initialProposalId = String(project?.acceptedProposalMessageId || linkedQuote?.acceptedProposalMessageId || "").trim();
  const addonItemsFromMessages = (project?.messages || [])
    .filter((m: any) => {
      const isQuote = m.type === "quote_proposal" || m.content?.type === "quote_proposal";
      const isAccepted =
        m.content?.proposalStatus === "accepted" ||
        m.proposalStatus === "accepted" ||
        m.content?.status === "accepted" ||
        m.status === "accepted";
      if (!isQuote || !isAccepted) return false;
      const mId = String(m.id || m._id || m.content?.id || "").trim();
      // Skip the initial quote proposal if it matches the main project accepted proposal
      if (initialProposalId && mId === initialProposalId) return false;
      if (mId && seenMsgIds.has(mId)) return false;
      if (mId) seenMsgIds.add(mId);
      return true;
    })
    .flatMap((m: any) => {
      const items = m.deliverableItems || m.content?.deliverableItems || m.content?.items || [];
      return items.map((item: any) => ({
        description: item.description || item.title || item.name || "Add-On Deliverable",
        details: item.details || "",
        duration: item.duration ? `${item.duration} ${item.unit || (String(item.duration).toLowerCase().includes("day") || String(item.duration).toLowerCase().includes("week") || String(item.duration).toLowerCase().includes("month") ? "" : "Days")}`.trim() : (m.content?.duration ? `${m.content.duration}`.trim() : "1 Days"),
        amount: Number(item.amount ?? item.cost ?? 0),
        isAddOn: true,
      }));
    });

  const rawAddonItems = addonItemsFromAddons.length > 0 ? addonItemsFromAddons : addonItemsFromMessages;
  const seenItemKeys = new Set<string>();
  const allAddonItems = rawAddonItems.filter((item: any) => {
    const key = `${String(item.description || "").trim().toLowerCase()}-${Number(item.amount || 0)}-${String(item.duration || "").trim().toLowerCase()}`;
    if (seenItemKeys.has(key)) return false;
    seenItemKeys.add(key);
    return true;
  });

  // 3. Regular items (filter out items marked as add-on or that match an add-on item)
  const nonAddonDeliverableItems = (project?.deliverableItems && project.deliverableItems.length > 0)
    ? project.deliverableItems.filter((item: any) => {
        if (item.isAddOn) return false;
        if (allAddonItems.length > 0) {
          const key = `${String(item.description || item.title || item.name || "").trim().toLowerCase()}-${Number(item.amount ?? item.cost ?? 0)}-${String(item.duration || "").trim().toLowerCase()}`;
          if (seenItemKeys.has(key)) return false;
        }
        return true;
      })
    : [];

  const rawQuoteSubtotal = Number(
    project?.subtotal ??
    linkedQuote?.subtotal ??
    (vatRate > 0 && rawBaseCost > 0
      ? Math.round((rawBaseCost / (1 + vatRate / 100)) * 100) / 100
      : rawBaseCost)
  );

  const regularItems = nonAddonDeliverableItems.length > 0
    ? nonAddonDeliverableItems.map((item: any) => {
        let itemAmount = Number(item.amount ?? item.cost ?? 0);
        if (nonAddonDeliverableItems.length === 1) {
          if (itemAmount === 0 && rawQuoteSubtotal > 0) {
            itemAmount = rawQuoteSubtotal;
          } else if (
            vatRate > 0 &&
            rawQuoteSubtotal > 0 &&
            (Math.abs(itemAmount - rawBaseCost) <= 0.05 || (itemAmount > rawQuoteSubtotal && Math.abs(itemAmount - Math.round(rawQuoteSubtotal * (1 + vatRate / 100) * 100) / 100) <= 0.05))
          ) {
            itemAmount = rawQuoteSubtotal;
          }
        }
        return {
          description: item.description || item.title || item.name || "Deliverable",
          details: item.details || "",
          duration: item.duration ? `${item.duration} ${item.unit || (String(item.duration).toLowerCase().includes("day") || String(item.duration).toLowerCase().includes("week") || String(item.duration).toLowerCase().includes("month") ? "" : "Days")}`.trim() : "30 Days",
          amount: itemAmount,
          isAddOn: false,
        };
      })
    : project?.title
      ? [{
        description: project.title,
        details: project.description || "",
        duration: project.timelineInDays ? `${project.timelineInDays} Days` : (project.totalDuration || project.duration || project.timeline || "30 Days"),
        amount: rawQuoteSubtotal,
        isAddOn: false,
      }]
      : [];

  const regularItemsSum = regularItems.reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0);
  const addonsTotal = allAddonItems.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);

  const baseSubtotal = regularItemsSum > 0
    ? regularItemsSum
    : Number(
        project?.subtotal ??
        linkedQuote?.subtotal ??
        (vatRate > 0 && rawBaseCost > 0
          ? Math.round((rawBaseCost / (1 + vatRate / 100)) * 100) / 100
          : rawBaseCost)
      );

  const totalSubtotal = baseSubtotal + (regularItemsSum > 0 ? addonsTotal : 0);
  const effectiveVatAmount = vatRate > 0 && totalSubtotal > 0
    ? Math.round((totalSubtotal * (vatRate / 100)) * 100) / 100
    : Number(project?.vatAmount ?? linkedQuote?.vatAmount ?? 0);
  const totalCost = totalSubtotal + effectiveVatAmount;

  const projectNativeCurrency = (
    project?.currency ||
    linkedQuote?.currency ||
    projectPayments[0]?.currency ||
    (project?.currencySymbol === "€" ? "EUR" : project?.currencySymbol === "$" ? "USD" : "USD")
  ).toLowerCase();

  const activeUser = currentUser || (typeof window !== "undefined" ? authService.getUser() : null);
  const targetCurrency = (
    contextCurrency ||
    activeUser?.currency ||
    activeUser?.preferredCurrency ||
    projectNativeCurrency ||
    "USD"
  ).toUpperCase();

  const ledgerPayments = (project?.paymentLedger || []).map((entry: any, index: number) => ({
    _id: entry.transactionId || `ledger-${index}`,
    id: entry.transactionId || `ledger-${index}`,
    amount: entry.chargedAmount || entry.amount,
    currency: entry.chargedCurrency || entry.currency,
    status: entry.status || "succeeded",
    exchangeRate: entry.exchangeRate,
    metadata: { exchangeRate: entry.exchangeRate },
    createdAt: entry.date,
  }));

  const combinedPayments = [...(projectPayments || [])];
  const seenTxnIds = new Set(
    combinedPayments.map((p: any) => String(p._id || p.id || p.transactionId || "")).filter(Boolean)
  );
  for (const lp of ledgerPayments) {
    const id = String(lp._id || lp.id || "");
    if (!seenTxnIds.has(id)) {
      combinedPayments.push(lp);
      seenTxnIds.add(id);
    }
  }

  const totalPaidFromTransactions = combinedPayments
    .filter((p: any) => ["succeeded", "paid", "completed"].includes(String(p?.status || "").toLowerCase()))
    .reduce((sum: number, p: any) => {
      const pCurr = (p?.currency || projectNativeCurrency || "USD").toLowerCase();
      const pAmt = Number(p?.amountPaid || p?.amount || 0);
      const pRate = Number(p?.exchangeRate || p?.metadata?.exchangeRate || p?.metadata?.conversionRate || conversionRate || 1.14776);
      return sum + convertCurrencyAmount(pAmt, projectNativeCurrency, pCurr, pRate);
    }, 0);

  const amountPaid = Math.max(
    totalPaidFromTransactions,
    Number(project?.amountPaid || 0)
  );

  const isDepositHalf =
    project?.paymentOption === "half" ||
    project?.paymentOption === "deposit" ||
    linkedQuote?.paymentOption === "half" ||
    combinedPayments.some((p: any) => p?.metadata?.isDeposit === "true" || p?.metadata?.paymentOption === "half");

  let resolvedTotalCost = totalCost;
  if (isDepositHalf && amountPaid > 0 && Math.abs(resolvedTotalCost - (amountPaid * 2)) <= 15) {
    resolvedTotalCost = Math.round(amountPaid * 2 * 100) / 100;
  }

  const calculatedPending = Math.max(0, Math.round((resolvedTotalCost - amountPaid) * 100) / 100);
  const isActuallyPaidInFull = (resolvedTotalCost > 0 && amountPaid >= resolvedTotalCost - 0.009) || (project?.paymentStatus === "paid" && calculatedPending <= 0.05);
  const pendingBalance = isActuallyPaidInFull
    ? 0
    : amountPaid === 0
    ? resolvedTotalCost
    : calculatedPending;

  // Date for delivery due divider
  const deliveryDueStr = project.deadline ? formatSubmittedDate(project.deadline) : "";

  // Display all project messages and action notifications (filter out internal notes and initial project creation/requirements/scope overview boilerplate)
  const displayMessages = (project.messages || []).filter((msg: any) => {
    if (msg.isInternal || msg.content?.isInternal || msg.type === "internal_note" || msg.content?.type === "internal_note") {
      return false;
    }
    const rawTitle = (msg.content?.systemText || msg.message || "").toLowerCase();
    const cleanTitle = rawTitle
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}⏸▶️💳🛠️🎉✅🔄👤🚀📌🔔]/gu, "")
      .trim();
    if (
      cleanTitle === "project created" ||
      cleanTitle === "project requirements" ||
      cleanTitle === "financial & scope overview" ||
      cleanTitle === "scope of work"
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6 md:gap-8 w-full font-sans">
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

      {project.status === "completed" && isMonthlyProject && project.type !== "analysis" && (
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
            className="shrink-0 px-4 py-2 bg-[#5356ff] hover:bg-[#3232b7] text-white text-xs font-bold rounded shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isRestarting ? "Restarting..." : "Restart Project"}
          </button>
        </div>
      )}

      {/* Top 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Left Column: Project Details Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-300 rounded-[12px] shadow-sm p-4 sm:p-6 md:p-8">
            {/* Header: Submitted Date, Status Badge, and Right Side: Total Cost / Paid to Date / Pending Balance */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[10px] sm:text-xs text-gray-500 font-bold">
                  Submitted - {formatSubmittedDate(project.createdAt)}
                </span>
                <span className={`w-fit px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider border ${(() => {
                  const status = (project.status || "").toLowerCase();
                  if (status === "active" || status === "in_progress") return "bg-[#E1FCEF] text-[#14804A] border-[#E1FCEF]";
                  if (status === "paused") return "bg-[#FEF3C7] text-[#D97706] border-[#FEF3C7]";
                  if (status === "completed") return "bg-[#EBF5FF] text-[#2563EB] border-[#EBF5FF]";
                  if (status === "canceled" || status === "cancelled") return "bg-[#FEE2E2] text-[#B91C1C] border-[#FEE2E2]";
                  return "bg-gray-100 text-gray-700 border-gray-200";
                })()}`}>
                  {project.status || "ACTIVE"}
                </span>
              </div>

              {/* Right Side: Total Cost / Paid to Date / Pending Balance */}
              <div className="w-full sm:w-60 shrink-0 space-y-1.5 text-xs sm:text-sm self-start">
                <div className="flex justify-between items-center font-semibold">
                  <span className="text-gray-900">Total Cost</span>
                  <span className="text-gray-900 font-bold">
                    {formatCurrency(resolvedTotalCost)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-green-600">
                  <span className="font-medium">Paid to Date</span>
                  <span className="font-semibold">
                    {formatCurrency(amountPaid)}
                  </span>
                </div>
                <div className={`flex justify-between items-center pt-1 border-t border-gray-100 font-semibold ${pendingBalance > 0.009 ? "text-red-600" : "text-gray-600"}`}>
                  <span>Pending Balance</span>
                  <span className="font-bold">
                    {formatCurrency(pendingBalance)}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 mb-6 sm:mb-8" />

            {/* Title & Project Number */}
            <div className="pb-4 sm:pb-6 flex flex-col sm:flex-row justify-between items-start gap-2">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-700">
                  {project.title && project.title !== "Package Purchase"
                    ? project.title
                    : project.package?.name
                    ? `${project.package.name}${project.tierTitle ? ` - ${project.tierTitle}` : ""}`
                    : project.type === "analysis"
                    ? "Analysis Report Details"
                    : project.type === "bundle"
                    ? `Bundle Project (${project.billingType === "fixed" ? "Setup Phase" : "Maintenance Phase"})`
                    : project.type === "custom"
                    ? "Custom Project Details"
                    : "Package Details"}
                </h2>
                {(project.type === "bundle" || project.type === "package" || isMonthlyProject) && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {project.type === "bundle" && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded uppercase border border-purple-200">Bundle</span>}
                    {project.type === "package" && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase border border-green-200">
                        {project.tierTitle ? `${project.tierTitle} Plan` : project.billingType === "monthly" ? "Monthly Subscription Plan" : "Standard Package"}
                      </span>
                    )}
                    {isMonthlyProject && project.type !== "package" && (
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded uppercase border border-indigo-200">
                        Monthly Subscription
                      </span>
                    )}
                  </div>
                )}
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

            {/* Description / Calculator Specifications */}
            {project.calculatorSpecs ? (
              <div className="mb-10">
                <div className="text-sm text-gray-700 leading-relaxed font-medium">
                  <CalculatorSpecsCard specs={project.calculatorSpecs} currency={targetCurrency} />
                </div>
              </div>
            ) : (
              <div className="mb-10">
                <div className="text-sm text-gray-700 leading-relaxed font-medium">
                  <p style={{ color: '#334155', fontSize: '13.5px', lineHeight: '1.6', margin: '0 0 12px 0', fontWeight: 400, whiteSpace: 'pre-line' }}>
                    {project.description}
                  </p>
                </div>
              </div>
            )}

            {/* Deliverables Table — hidden for calculator projects (specs card covers it) */}
            {!project.calculatorSpecs && (
              <div className="border border-gray-400 rounded-[12px] overflow-hidden overflow-x-auto mb-4">
                <table className="w-full min-w-[500px] sm:min-w-0">
                  <thead>
                    <tr className="border-b border-gray-400">
                      <th className="px-3 sm:px-6 py-4 text-left text-xs sm:text-sm font-bold text-gray-600 bg-white w-1/2">Item</th>
                      <th className="px-3 sm:px-6 py-4 text-center text-xs sm:text-sm font-bold text-gray-600 bg-white">Duration</th>
                      <th className="px-3 sm:px-6 py-4 text-right text-xs sm:text-sm font-bold text-gray-600 bg-white">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regularItems.length > 0 ? (
                      regularItems.map((item: any, idx: number) => (
                        <tr key={item.description + idx} className={(idx < regularItems.length - 1 || allAddonItems.length > 0) ? "border-b border-gray-400" : ""}>
                          <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-500 align-top">
                            <div className="font-medium text-gray-700 mb-1">{item.description || item.title || item.name}</div>
                            {item.details && <div className="text-[10px] sm:text-xs text-gray-400">{item.details}</div>}
                          </td>
                          <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-600 font-medium text-center align-top whitespace-nowrap">
                            {item.duration}
                          </td>
                          <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-600 text-right font-bold align-top">
                            {formatCurrency(item.amount ?? 0)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className={allAddonItems.length > 0 ? "border-b border-gray-400" : ""}>
                        <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-600 font-semibold">{project.title || "Deliverable"}</td>
                        <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-600 text-center">-</td>
                        <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-800 text-right font-bold">
                          {formatCurrency(baseSubtotal)}
                        </td>
                      </tr>
                    )}
                    {/* Add-ons section if exists */}
                    {allAddonItems.length > 0 && (
                      <React.Fragment>
                        <tr className="bg-gray-800">
                          <td colSpan={3} className="px-6 py-2.5 text-xs font-bold text-white tracking-wider">Add-On Tasks</td>
                        </tr>
                        {allAddonItems.map((item: any, iIdx: number) => (
                          <tr key={`addon-${iIdx}`} className={iIdx === allAddonItems.length - 1 ? "" : "border-b border-gray-400"}>
                            <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-500 align-top">
                              <div className="font-medium text-gray-700 mb-1">{item.description}</div>
                              {item.details && <div className="text-[10px] sm:text-xs text-gray-400">{item.details}</div>}
                            </td>
                            <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-600 font-medium text-center align-top whitespace-nowrap">
                              {item.duration}
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
            )}

            {/* Calculator Project Summary Table */}
            {project.calculatorSpecs && (
              <div className="border border-gray-400 rounded-lg overflow-x-auto mb-4">
                <table className="w-full min-w-[500px] sm:min-w-0">
                  <thead>
                    <tr className="border-b border-gray-400">
                      <th className="px-3 sm:px-6 py-4 text-left text-xs sm:text-sm font-bold text-gray-600 bg-white w-1/2">Item</th>
                      <th className="px-3 sm:px-6 py-4 text-center text-xs sm:text-sm font-bold text-gray-600 bg-white">Duration</th>
                      <th className="px-3 sm:px-6 py-4 text-right text-xs sm:text-sm font-bold text-gray-600 bg-white">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className={allAddonItems.length > 0 ? "border-b border-gray-400" : ""}>
                      <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-500 align-top">
                        <div className="font-medium text-gray-700 mb-1">
                          {getMainCalculatorCategory(
                            project.calculatorSpecs?.categoryKey,
                            project.calculatorSpecs?.categoryName
                          )}
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-400">Based on calculator selections</div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-600 font-medium text-center align-top whitespace-nowrap">
                        {project.calculatorSpecs?.estimatedTimeline || project.timeline || "-"}
                      </td>
                      <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-600 text-right font-bold align-top">
                        {formatCurrency(baseSubtotal)}
                      </td>
                    </tr>
                    {/* Add-ons section if exists for calculator projects */}
                    {allAddonItems.length > 0 && (
                      <React.Fragment>
                        <tr className="bg-gray-800">
                          <td colSpan={3} className="px-6 py-2.5 text-xs font-bold text-white tracking-wider">Add-On Tasks</td>
                        </tr>
                        {allAddonItems.map((item: any, iIdx: number) => (
                          <tr key={`addon-calc-${iIdx}`} className={iIdx === allAddonItems.length - 1 ? "" : "border-b border-gray-400"}>
                            <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-500 align-top">
                              <div className="font-medium text-gray-700 mb-1">{item.description}</div>
                              {item.details && <div className="text-[10px] sm:text-xs text-gray-400">{item.details}</div>}
                            </td>
                            <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-600 font-medium text-center align-top whitespace-nowrap">
                              {item.duration}
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
            )}

            {/* Totals Summary */}
            <div className={`flex flex-row justify-end gap-6 sm:gap-12 text-xs sm:text-sm ${project.calculatorSpecs ? "mb-4" : "mb-8"}`}>
              {vatRate > 0 && effectiveVatAmount > 0 && (
                <div className="text-center">
                  <div className="text-gray-500 font-bold mb-1 sm:mb-2">Base Amount</div>
                  <div className={project.calculatorSpecs ? "font-medium text-gray-600" : "font-semibold text-gray-800"}>{formatCurrency(totalSubtotal)}</div>
                </div>
              )}
              {vatRate > 0 && effectiveVatAmount > 0 && (
                <div className="text-center">
                  <div className="text-gray-500 font-bold mb-1 sm:mb-2">VAT ({vatRate}%)</div>
                  <div className={project.calculatorSpecs ? "font-medium text-gray-600" : "font-semibold text-gray-800"}>{formatCurrency(effectiveVatAmount)}</div>
                </div>
              )}
              <div className="text-center">
                <div className="font-bold mb-1 sm:mb-2 text-gray-800">
                  Total Amount
                </div>
                <div className="font-bold text-gray-900">{formatCurrency(totalCost)}</div>
              </div>
            </div>

            {/* Bottom Card Row: Estimated Deadline & Action Buttons */}
            <div className={`flex flex-col sm:flex-row justify-between items-center gap-4 ${project.calculatorSpecs ? "mt-6" : "pt-6 border-t border-gray-200"}`}>
              <div>
                <div className="text-xs text-gray-500 flex flex-wrap items-center gap-2">
                  <span className={`font-bold ${project.calculatorSpecs ? "text-gray-600" : "text-gray-800"} mr-2`}>Estimated Deadline:</span>
                  <span>
                    {getProjectEstimatedDeadline(project)
                      ? formatSubmittedDate(getProjectEstimatedDeadline(project))
                      : project.deadline
                      ? formatSubmittedDate(project.deadline)
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
                      const isCalc = isCalculatorProject(project, fetchedQuote);
                      if (isCalc) {
                        const projectPayloadForPdf = {
                          ...project,
                          calculatorSpecs: project?.calculatorSpecs || fetchedQuote?.requirements || fetchedQuote?.calculatorSpecs,
                          quote: fetchedQuote || (typeof project?.quoteId === "object" ? project?.quoteId : null),
                        };
                        await downloadCalculatorProjectPDF(projectPayloadForPdf);
                      } else {
                        await downloadProjectDetailsPDF({ ...project, isProject: true });
                      }
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
                    const isCalc = isCalculatorProject(project, fetchedQuote);
                    if (isCalc) {
                      const projectPayloadForPdf = {
                        ...project,
                        calculatorSpecs: project?.calculatorSpecs || fetchedQuote?.requirements || fetchedQuote?.calculatorSpecs,
                        quote: fetchedQuote || (typeof project?.quoteId === "object" ? project?.quoteId : null),
                      };
                      printCalculatorProjectPDF(projectPayloadForPdf);
                    } else {
                      printProjectDetails(project);
                    }
                  }}
                  className="flex-1 sm:flex-initial px-6 py-2 bg-[#4343F0] hover:bg-[#3232b7] text-white text-[10px] sm:text-xs font-bold rounded shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                >
                  Print Details
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Project Manager Card */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-300 rounded-[12px] shadow-sm p-6 sm:p-8 sticky top-24">
            {(() => {
              const rawManagers = (Array.isArray(project.assignedManagers) && project.assignedManagers.length > 0)
                ? project.assignedManagers
                : (project.projectManager ? [project.projectManager] : []);
              const managers = rawManagers.filter((m: any) => m && (typeof m === 'object' ? (m._id || m.fullName || m.email) : Boolean(m)));

              if (managers.length > 1) {
                return (
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
                );
              }

              const manager = managers[0];
              const name = manager?.fullName || "Not assigned yet";
              const avatar = manager?.avatar;
              return (
                <div className="text-center py-4">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full mx-auto mb-4 flex items-center justify-center shadow-md overflow-hidden bg-gray-100 border border-gray-200">
                    {avatar ? (
                      <img src={avatar} alt={name} className="w-full h-full object-cover" />
                    ) : manager ? (
                      <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-3xl font-bold">
                        {name[0] || "M"}
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-b from-gray-100 to-gray-200 flex items-center justify-center text-gray-400">
                        <svg className="w-12 h-12 sm:w-14 sm:h-14 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" d="M12 4a4 4 0 100 8 4 4 0 000-8zm-2 9a6 6 0 00-6 6v1a1 1 0 001 1h14a1 1 0 001-1v-1a6 6 0 00-6-6h-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <h4 className="text-lg font-bold text-gray-800 mb-1">{manager ? name : "Not assigned yet"}</h4>
                  <p className="text-sm text-gray-500 font-medium uppercase tracking-wider text-[10px]">PROJECT MANAGER</p>
                </div>
              );
            })()}
          </div>

          {/* Subscription & Auto-Renewal Card — for all monthly projects (including calculator monthly projects) */}
          {isMonthlyProject && project.type !== "analysis" && (
            <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-6 sm:p-7 mt-8">
              <h3 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider mb-2 font-sans">
                SUBSCRIPTION &amp; AUTO-RENEWAL
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-4">
                This is a monthly subscription project. When auto-renewal is enabled, your project renews automatically each month.
              </p>

              <div className="bg-[#F8FAFC] border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-[#1E293B]">Auto-Renewal</h4>
                  {project.autoRenewal !== false ? (
                    <div className="flex items-center gap-1.5 text-xs text-[#00875A] font-medium mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-[#00875A] inline-block" />
                      Enabled
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mt-0.5">
                      <span className="w-2 h-2 rounded-full border border-gray-400 inline-block" />
                      Disabled
                    </div>
                  )}
                </div>

                {project.autoRenewal !== false ? (
                  <button
                    type="button"
                    onClick={() => handleToggleAutoRenewal(false)}
                    disabled={isTogglingRenewal}
                    className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 active:bg-gray-100 text-gray-700 text-xs font-bold rounded-lg transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                  >
                    {isTogglingRenewal ? "Updating..." : "Disable Auto-Renewal"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleToggleAutoRenewal(true)}
                    disabled={isTogglingRenewal}
                    className="px-4 py-2 bg-[#00875A] hover:bg-[#00704a] active:bg-[#005c3d] text-white text-xs font-bold rounded-lg transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                  >
                    {isTogglingRenewal ? "Updating..." : "Enable Auto-Renewal"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Horizontal Divider Banner */}
      <div id="messages" ref={messagesContainerRef} className="relative py-0 my-0 flex items-center justify-center w-full scroll-mt-6">
        <div className="flex-grow border-t border-gray-200"></div>
        <span className="px-4 text-xs sm:text-sm font-medium text-gray-500 text-center whitespace-normal sm:whitespace-nowrap">
          Project Started {deliveryDueStr ? `| Delivery due on ${deliveryDueStr}` : ""}
        </span>
        <div className="flex-grow border-t border-gray-200"></div>
      </div>

      {/* Full-Width Messages & Chat Section */}
      <div className="w-full space-y-6">
        {/* Messages Feed */}
        {displayMessages.length > 0 && (
          <div className="flex flex-col gap-6 w-full">
            {displayMessages.map((msg: any, idx: number) => {
              const msgId = msg.id || `msg-${idx}`;
              const isLast = idx === displayMessages.length - 1;

              // Check for quote proposal in this message
              const isQuoteProposal = msg.type === "quote_proposal" || msg.content?.type === "quote_proposal";

              // Check for recommended solutions in this message (ONLY when not a quote proposal)
              const recSolutions = !isQuoteProposal
                ? (msg.recommendedSolutions && msg.recommendedSolutions.length > 0 ? msg.recommendedSolutions : null) ||
                (msg.content?.recommendedSolutions && msg.content.recommendedSolutions.length > 0 ? msg.content.recommendedSolutions : null) ||
                (msg.type === "recommended_solutions" && msg.content?.packages ? msg.content.packages : null) ||
                []
                : [];
              const hasRecs = recSolutions.length > 0;

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
                  } else if (project?.amountDue) {
                    rawAmount = project.amountDue;
                  }
                }

                const amount = Number(rawAmount || 0);
                const currency = (content.currency || msg.currency || project?.currency || "USD").toUpperCase();

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

                const pId =
                  project._id ||
                  project.id ||
                  project.projectId ||
                  project.project_id ||
                  project.orderId ||
                  project.uuid ||
                  project.uid ||
                  project.project?._id ||
                  project.project?.id;

                const invId = asId(content.invoiceId || msg.invoiceId);
                const invNum = content.invoiceNumber || msg.invoiceNumber;
                const currentMsgId = asId(msg.id || msg._id || msgId);
                const isPaid = isExactPaymentRequestPaid(msg, project, combinedPayments);

                const payParams = new URLSearchParams();
                if (amount > 0) payParams.set("amount", String(amount));
                if (currency) payParams.set("currency", currency);
                if (invId) payParams.set("invoiceId", invId);
                if (invNum) payParams.set("invoiceNumber", String(invNum));
                if (currentMsgId) payParams.set("messageId", currentMsgId);
                if (description) payParams.set("description", String(description));
                const payUrl = `/dashboard/my-projects/${pId}/payments?${payParams.toString()}`;

                return (
                  <div
                    key={msgId}
                    ref={isLast ? lastMessageRef : null}
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
                          <span className="text-xl sm:text-2xl font-black text-[#1E3A8A]">
                            {currency === "EUR" ? "€" : "$"}{amount.toFixed(0)}
                          </span>
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
                          className="inline-block w-full sm:w-auto px-8 py-2.5 bg-[#4343F0] hover:bg-[#3232b7] text-white font-bold text-sm rounded-xl shadow-md shadow-[#4343F0]/20 transition-all text-center"
                        >
                          Pay Now
                        </Link>
                      )}
                    </div>
                  </div>
                );
              }

              // System notifications & Actions (Project Resumed, Action Required: Approval, etc.)
              const isSystemMsg = msg.type === "system_notification" || msg.isSystem || msg.sender === "system" || msg.role === "system";
              const messageAttachments = (msg.attachments && msg.attachments.length > 0) ? msg.attachments : (msg.content?.attachedFiles || msg.attachedFiles || (msg.content as any)?.attachedFilesUrl || msg.attachedFilesUrl || []);
              const hasFileAttachments = Array.isArray(messageAttachments) && messageAttachments.length > 0;

              if (isSystemMsg && !hasFileAttachments && !hasRecs && !isQuoteProposal) {
                const rawTitle = msg.content?.systemText || msg.message || "Notification";
                let cleanTitle = rawTitle.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}⏸▶️💳🛠️🎉✅🔄👤🚀📌🔔]/gu, "").trim();
                if (cleanTitle.toLowerCase() === "action required: payment" || cleanTitle.toLowerCase() === "payment required") {
                  cleanTitle = "Project paused";
                } else if (cleanTitle.toLowerCase().startsWith("project status updated to active") || cleanTitle.toLowerCase() === "active") {
                  cleanTitle = "Project resumed";
                } else if (cleanTitle.length > 0) {
                  cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1).toLowerCase();
                }

                const rawTextCandidate = msg.content?.text || msg.text || (msg.message !== rawTitle && msg.message !== cleanTitle ? msg.message : "");
                const isDuplicate =
                  rawTextCandidate.trim().toLowerCase() === cleanTitle.trim().toLowerCase() ||
                  rawTextCandidate.trim().toLowerCase() === rawTitle.trim().toLowerCase() ||
                  rawTextCandidate.trim().toLowerCase().startsWith("project status updated to active");
                const rawText = isDuplicate ? "" : rawTextCandidate;

                return (
                  <div key={msgId} ref={isLast ? lastMessageRef : null} className="text-center py-2 px-4 my-0">
                    <h3 className="text-xl sm:text-2xl font-bold text-[#0D1939] tracking-tight mb-1">
                      {cleanTitle}
                    </h3>
                    {rawText ? (
                      <p className="text-sm font-medium text-gray-500 leading-relaxed max-w-xl mx-auto">
                        {capitalizeCurrencyInText(rawText)}
                      </p>
                    ) : null}
                  </div>
                );
              }

              // Formal Quote Proposals (Add-ons with action buttons / deliverables table)
              if (isQuoteProposal) {
                const content = msg.content || {};
                const items = (content.deliverableItems && content.deliverableItems.length > 0)
                  ? content.deliverableItems
                  : (content.items && content.items.length > 0)
                    ? content.items
                    : (msg.deliverableItems && msg.deliverableItems.length > 0)
                      ? msg.deliverableItems
                      : [];
                const actions = (content.actionsAvailable && content.actionsAvailable.length > 0)
                  ? content.actionsAvailable
                  : ["accept", "request_modification", "decline"];

                const subsequentMessages = displayMessages.slice(idx + 1);
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
                const targetProposalId = msg._id || msg.id;

                const baseAmount = Number(content.subtotal || content.baseAmount || 0) || items.reduce((sum: number, it: any) => sum + (Number(it.amount ?? it.cost) || 0), 0) || Number(content.total || 0);
                const vatRate = Number(content.vatRate ?? 0);
                const vatAmount = Number(content.vatAmount ?? (vatRate > 0 ? (baseAmount * vatRate) / 100 : 0));
                const totalCost = Number(content.totalCost ?? content.total ?? (baseAmount + vatAmount));

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

                return (
                  <div key={msgId} ref={isLast ? lastMessageRef : null} className="w-full">
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-xs p-6 sm:p-8 md:p-10">
                      {/* Top Meta: Submitted date & Add-On Offer badge on left; Expires / resolution date on right */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs sm:text-sm text-gray-500 font-medium">
                            Submitted - {formatSubmittedDate(msg.createdAt)}
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
                        <span className="text-xs sm:text-sm text-gray-400 font-medium">From: {msg.username || "Project Manager"}</span>
                      </div>

                      {content.description && <div className="mb-6 text-sm text-gray-600 leading-relaxed font-medium">{content.description}</div>}

                      {/* Attachments */}
                      {((msg.attachments && msg.attachments.length > 0) || (content.attachedFiles && content.attachedFiles.length > 0)) && (
                        <div className="mb-6">
                          <h5 className="text-sm font-bold text-gray-700 mb-3">Attached Files</h5>
                          <div className="border-t border-gray-200 mb-4" />
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full">
                            {(msg.attachments || content.attachedFiles).map((att: any, aIdx: number) => {
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

                      {/* Deliverables Table (Inner bordered box matching screenshot) */}
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
                                  <div className="font-semibold text-gray-800">{item.description || item.name || item.title}</div>
                                  {item.details && <div className="text-[11px] text-gray-400 mt-0.5">{item.details}</div>}
                                </td>
                                <td className="px-6 py-5 text-xs sm:text-sm text-gray-600 font-medium text-center align-middle whitespace-nowrap">
                                  {item.duration ? `${item.duration} Days` : "-"}
                                </td>
                                <td className="px-6 py-5 text-xs sm:text-sm text-gray-900 text-right font-bold align-middle">
                                  {formatCurrency(item.amount ?? 0)}
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

                      {/* Action Buttons INSIDE the box (Accept, Request Modifications, Decline) with top border */}
                      {canAct && !actionModal.isOpen && (
                        <>
                          <div className="border-t border-gray-200 mt-8 mb-6" />
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
                            <div className="w-full sm:w-auto flex justify-start">
                              {actions.includes("accept") && (
                                <button
                                  onClick={() => targetProposalId && handleAcceptProposal(targetProposalId)}
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
                                  onClick={() => targetProposalId && setActionModal({
                                    isOpen: true,
                                    action: "request_modification",
                                    proposalId: targetProposalId,
                                    title: "Request Modifications",
                                    description: "Please describe the modifications you would like for this offer.",
                                    placeholder: "Describe your requested changes...",
                                    required: true
                                  })}
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
                                  onClick={() => targetProposalId && setActionModal({
                                    isOpen: true,
                                    action: "decline",
                                    proposalId: targetProposalId,
                                    title: "Decline Add-On Offer",
                                    description: "Are you sure you want to decline this offer? You can provide a reason below.",
                                    placeholder: "Reason for declining (optional)...",
                                    required: false
                                  })}
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
                      {actionModal.isOpen && actionModal.proposalId === targetProposalId && (
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
                              <span className="text-xs text-gray-400 font-medium">{formatSubmittedDate(new Date())}</span>
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
                                  className="flex-1 sm:flex-none px-6 py-2.5 bg-[#7A1C1C] hover:bg-[#631616] text-white font-bold text-sm rounded-md transition-colors shadow-sm cursor-pointer"
                                  disabled={isActionLoading}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleActionSubmit}
                                  disabled={isActionLoading || (actionModal.required && !actionComment.trim())}
                                  className={`flex-1 sm:flex-none px-6 py-2.5 text-white rounded-md text-sm font-bold transition-all shadow-sm cursor-pointer ${isActionLoading
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : actionModal.action === "decline"
                                      ? "bg-[#C62828] hover:bg-[#B71C1C]"
                                      : "bg-[#3B4BEF] hover:bg-[#2F3EC4]"
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
                  </div>
                );
              }

              // Regular Messages & Recommended Solutions Messages
              const isClient = msg.sender === "client" || msg.role === "client" || msg.role === "CLIENT";
              const manager = project.assignedManagers?.[0] || project.projectManager || {};
              const senderName = msg.username || msg.senderName || (isClient ? project.client?.fullName || "Client" : manager?.fullName || "Staff");
              const senderAvatar = msg.userAvatar || (isClient ? project.client?.avatar : manager?.avatar);
              const initial = (senderName || "U").charAt(0).toUpperCase();
              const attachmentList = (msg.attachments && msg.attachments.length > 0) ? msg.attachments : (msg.content?.attachedFiles || msg.attachedFiles || (msg.content as any)?.attachedFilesUrl || msg.attachedFilesUrl || []);
              const hasAttachments = Array.isArray(attachmentList) && attachmentList.length > 0;
              const messageBody = msg.message || msg.content?.text || msg.content?.projectDescription || msg.content?.description || "";

              return (
                <div key={msgId} ref={isLast ? lastMessageRef : null} className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden w-full">
                  <div className="p-4 sm:p-6 md:p-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
                      <div className="flex items-center gap-4">
                        {senderAvatar ? (
                          <img src={senderAvatar} alt={senderName} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover shadow-sm bg-gray-100" />
                        ) : (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-sm bg-[#0D1939]">
                            {initial}
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-gray-800 text-base sm:text-lg">{senderName}</h4>
                        </div>
                      </div>
                      <span className="text-[10px] sm:text-sm text-gray-500 font-bold uppercase tracking-wide whitespace-nowrap">
                        {formatMessageTimestamp(msg.createdAt)}
                      </span>
                    </div>
                    {messageBody && messageBody.trim() && (
                      <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap pl-0 md:pl-[64px] mb-6">
                        {messageBody}
                      </div>
                    )}

                    {hasAttachments && (
                      <div className="pl-0 md:pl-[64px]">
                        <h5 className="text-sm font-bold text-gray-700 mb-3">
                          Attached Files
                        </h5>
                        <div className="border-t border-gray-200 mb-4" />
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full">
                          {attachmentList.map((att: any, attIdx: number) => {
                            const url = typeof att === "string" ? att : (att.url || att.secure_url || att.path);
                            const name = typeof att === "string" ? decodeURIComponent(url.split("/").pop() || "file") : att.filename || att.name || "file";
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
                    {hasRecs && (
                      <div className="pl-0 md:pl-[64px] mt-6">
                        <RecommendedSolutions solutions={recSolutions} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div ref={messagesEndRef} className="h-0 w-full" />

        {/* Full-Width New Message Box (matching Screenshot 2 UI) */}
        <div ref={messageInputRef} id="new-message" className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden w-full scroll-mt-6">
          <div className="flex items-center justify-between p-4 sm:p-6 pb-4 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-3">
              {currentUser?.avatar ? (
                <img src={currentUser.avatar} alt="You" className="w-10 h-10 rounded-full object-cover shadow-sm" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#182D5E] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  {(currentUser?.fullName || currentUser?.username || "S").charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="font-bold text-gray-900 text-sm sm:text-base">{currentUser?.fullName || currentUser?.username || "saurav singh"}</h3>
                <p className="text-xs text-gray-400 font-medium">New Message</p>
              </div>
            </div>
            <span className="text-xs text-gray-400 font-medium">{formatChatDate(new Date())}</span>
          </div>
          <div className="p-4 sm:p-6">
            <textarea
              className="w-full min-h-[120px] text-gray-700 text-sm leading-relaxed resize-none focus:outline-none placeholder-gray-400 bg-transparent cursor-pointer"
              placeholder={isLoggedIn ? "Type a message..." : "Please log in or register to message our team..."}
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
              onClick={() => {
                if (!requireAuth()) return;
                fileInputRef.current?.click();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg border border-blue-600 hover:bg-blue-50 shadow-sm cursor-pointer shrink-0"
              type="button"
              disabled={isSending}
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span className="hidden min-[380px]:inline">Attach Files</span>
              <span className="min-[380px]:hidden">Attach</span>
              {attachments.length > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 bg-[#4343F0] text-white text-[10px] font-bold rounded-full ml-0.5">
                  {attachments.length}
                </span>
              )}
            </button>
            <input type="file" ref={fileInputRef} className="hidden" multiple accept="*/*" onChange={handleFileUpload} />

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  if (!requireAuth()) return;
                  setMessageText("");
                  setAttachments([]);
                }}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#7A1C1C] hover:bg-[#631616] text-white font-bold text-xs rounded-lg transition-colors shadow-sm cursor-pointer whitespace-nowrap"
                disabled={isSending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => {
                  if (!requireAuth()) {
                    e.preventDefault();
                    return;
                  }
                  handleSendMessage();
                }}
                disabled={
                  isLoggedIn &&
                  (isSending ||
                    isUploading ||
                    (!messageText.trim() && attachments.length === 0))
                }
                className={`px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition-all shadow-sm whitespace-nowrap ${
                  isLoggedIn &&
                  (isSending ||
                    isUploading ||
                    (!messageText.trim() && attachments.length === 0))
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                    : "bg-[#4343F0] hover:bg-[#3232b7] text-white cursor-pointer active:scale-95"
                }`}
              >
                {isSending ? <LoadingDots text="Sending" /> : isUploading ? "Uploading..." : "Send Message"}
              </button>
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

      {/* Help & Support / Newsletter Section */}
      <SupportNewsletter noPadding gridClassName="mt-0 md:mt-12" />
    </div>
  );
}
