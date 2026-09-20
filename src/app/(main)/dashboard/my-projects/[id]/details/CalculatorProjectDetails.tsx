"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/authService";
import { projectService } from "@/lib/projectService";
import { mediaService } from "@/lib/mediaService";
import { countryService } from "@/lib/countryService";
import { downloadFile, isImageUrl, getSafeUrl } from "@/lib/utils";
import {
  downloadCalculatorProjectPDF,
  printCalculatorProjectPDF,
} from "@/lib/generateCalculatorProjectPDF";
import LoadingDots from "@/components/common/LoadingDots";
import AuthPromptModal from "@/components/common/AuthPromptModal";
import DeadlineTooltip from "@/components/common/DeadlineTooltip";
import CalculatorSpecsCard from "@/components/common/CalculatorSpecsCard";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";
import {
  getMainCalculatorCategory,
  getProjectEstimatedDeadline,
} from "@/lib/calculatorUtils";
import {
  capitalizeCurrencyInText,
  formatPriceWithCurrency,
  convertCurrencyAmount,
} from "@/lib/currencyUtils";
import { useCurrency } from "@/context/CurrencyContext";
import { useTimezone } from "@/context/TimezoneContext";
import { toast } from "sonner";

const isEstoniaClient = (c?: string) => {
  if (!c) return false;
  const s = c.trim().toLowerCase();
  return s === "ee" || s === "est" || s === "estonia";
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

  if ((project?.invoices || []).some((inv: any) =>
    String(inv.status || "").toLowerCase() === "paid" &&
    matchesTarget({ invoiceId: inv._id || inv.id, invoiceNumber: inv.invoiceNumber })
  )) {
    return true;
  }

  if ((project?.messages || []).some((m: any) => {
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

interface CalculatorProjectDetailsProps {
  project: any;
  quote?: any;
  payments?: any[];
  onRefreshProject?: () => Promise<void> | void;
}

export default function CalculatorProjectDetails({
  project,
  quote,
  payments = [],
  onRefreshProject,
}: CalculatorProjectDetailsProps) {
  const router = useRouter();
  const {
    formatSubmittedDate: formatSubmittedDateTz,
    formatMessageTimestamp: formatMessageTimestampTz,
    formatDateTime: formatDateTimeTz,
  } = useTimezone();

  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isTogglingRenewal, setIsTogglingRenewal] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionComment, setActionComment] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    setCurrentUser(authService.getUser());
    countryService.getAllCountries().catch(() => {});
  }, []);

  const activeProject = project || {};
  const linkedQuote =
    quote ||
    (typeof activeProject.quoteId === "object" ? activeProject.quoteId : activeProject.quote) ||
    {};
  const specs =
    activeProject.calculatorSpecs ||
    linkedQuote?.requirements ||
    activeProject.requirements ||
    {};

  const projectId = String(activeProject._id || activeProject.id || "");
  const rawNumber =
    activeProject.projectNumber ||
    (linkedQuote?.quoteNumber && !String(linkedQuote.quoteNumber).startsWith("INV-")
      ? linkedQuote.quoteNumber
      : "") ||
    (activeProject.quoteNumber && !String(activeProject.quoteNumber).startsWith("INV-")
      ? activeProject.quoteNumber
      : "") ||
    (activeProject._id ? `SOC-2026-${activeProject._id.slice(-4).toUpperCase()}` : "SOC-2026-001");
  const cleanNumber = String(rawNumber).replace(/^Project\s*#?/i, "").replace(/^#/, "");

  const categoryDisplayName =
    getMainCalculatorCategory(
      specs.categoryKey || linkedQuote.requirements?.categoryKey,
      specs.categoryName || linkedQuote.serviceType
    ) || "Website";

  const itemTitle = `Custom ${categoryDisplayName} Development Project`
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const itemDuration =
    specs.estimatedTimeline ||
    linkedQuote.requirements?.estimatedTimeline ||
    activeProject.totalDuration ||
    linkedQuote.totalDuration ||
    activeProject.timeline ||
    "2 weeks";

  const clientCountryStr =
    activeProject.clientCountry ||
    activeProject.country ||
    linkedQuote?.clientCountry ||
    linkedQuote?.country ||
    "";
  const dbVatRate = countryService.getVatRateSync(clientCountryStr);
  const explicitVatRate = Number(
    activeProject.vatRate ??
    activeProject.vatPercentage ??
    linkedQuote.vatRate ??
    linkedQuote.vatPercentage ??
    (activeProject.taxPercentage != null ? activeProject.taxPercentage : 0)
  );
  const vatRate = isEstoniaClient(clientCountryStr)
    ? 24
    : dbVatRate > 0
    ? dbVatRate
    : explicitVatRate > 0
    ? explicitVatRate
    : 0;

  const { currency: contextCurrency, conversionRate } = useCurrency();

  const projectNativeCurrency = (
    activeProject.currency ||
    linkedQuote.currency ||
    payments[0]?.currency ||
    (activeProject?.currencySymbol === "€" ? "EUR" : activeProject?.currencySymbol === "$" ? "USD" : "USD")
  ).toLowerCase();

  // Active display currency: respects profile / context currency (e.g. USD)
  const activeDisplayCurrency = (
    contextCurrency ||
    currentUser?.currency ||
    currentUser?.preferredCurrency ||
    projectNativeCurrency ||
    "usd"
  ).toLowerCase();

  const formatCurrency = (amt: number, customCurr?: string) => {
    const targetCurr = (customCurr || activeDisplayCurrency).toLowerCase();
    return formatPriceWithCurrency(amt, targetCurr, projectNativeCurrency, conversionRate);
  };

  const projectPrice = Number(activeProject.price || 0) || Number(activeProject.totalPrice || 0);
  const rawTotalCost = projectPrice > 0
    ? Math.max(
        projectPrice,
        Number(activeProject.amountPaid || 0) + Number(activeProject.amountDue || 0)
      )
    : Math.max(
        Number(linkedQuote.totalCost || 0),
        Number(activeProject.totalCost || 0),
        Number(activeProject.amountPaid || 0) + Number(activeProject.amountDue || 0)
      );

  const regularItemsSum = (activeProject.deliverableItems && activeProject.deliverableItems.length > 0)
    ? activeProject.deliverableItems.reduce((sum: number, it: any) => sum + (Number(it.amount ?? it.cost) || 0), 0)
    : 0;

  // Prefer the authoritative subtotal stored in the DB over re-summing deliverable items.
  // Deliverable items are individually USD→EUR converted (each rounded to nearest €5) so
  // their sum can drift from the true project subtotal by up to ±€5.
  // Use activeProject.subtotal as primary source; fall back to regularItemsSum only when absent.
  const storedSubtotal = Number(activeProject.subtotal || 0);
  const baseSubtotal = storedSubtotal > 0
    ? storedSubtotal
    : (regularItemsSum > 0
        ? regularItemsSum
        : Number(
            linkedQuote.subtotal ??
            specs.subtotal ??
            specs.calculatedPrice ??
            linkedQuote.requirements?.subtotal ??
            linkedQuote.requirements?.calculatedPrice ??
            (vatRate > 0 && rawTotalCost > 0
              ? Math.round((rawTotalCost / (1 + vatRate / 100)) * 100) / 100
              : rawTotalCost)
          ));

  const primaryItemTitle =
    itemTitle ||
    activeProject.title ||
    `Custom ${categoryDisplayName} Development Project`;

  const primaryItems = [
    {
      description: primaryItemTitle,
      details: "Based on calculator selections",
      duration: itemDuration,
      amount: baseSubtotal,
      isAddOn: false,
    },
  ];

  // Deduplicate addon items from activeProject.addons
  const seenAddonKeys = new Set<string>();
  const uniqueProjectAddons = (activeProject.addons || []).filter((addon: any) => {
    const key = String(
      addon.proposalMessageId ||
      addon._id ||
      (Array.isArray(addon.deliverableItems)
        ? addon.deliverableItems.map((i: any) => `${i.description}-${i.amount}-${i.duration}`).join("|")
        : "")
    ).trim();
    if (!key) return true;
    if (seenAddonKeys.has(key)) return false;
    seenAddonKeys.add(key);
    return true;
  });

  const addonItemsFromAddons = uniqueProjectAddons.flatMap((addon: any) =>
    (addon.deliverableItems || []).map((item: any) => ({
      description: item.description || item.title || item.name || "Add-On Deliverable",
      details: item.details || "",
      duration: item.duration
        ? `${item.duration} ${item.unit || (String(item.duration).toLowerCase().includes("day") ? "" : "Days")}`.trim()
        : "1 Days",
      amount: Number(item.amount ?? item.cost ?? 0),
      isAddOn: true,
    }))
  );

  // Addon items from activeProject.messages
  const seenMsgIds = new Set<string>();
  const addonItemsFromMessages = (activeProject.messages || [])
    .filter((m: any) => {
      const isQuote = m.type === "quote_proposal" || m.content?.type === "quote_proposal";
      const isAccepted =
        m.content?.proposalStatus === "accepted" ||
        m.proposalStatus === "accepted" ||
        m.content?.status === "accepted" ||
        m.status === "accepted";
      if (!isQuote || !isAccepted) return false;
      const mId = String(m.id || m._id || m.content?.id || "").trim();
      if (mId && seenMsgIds.has(mId)) return false;
      if (mId) seenMsgIds.add(mId);
      return true;
    })
    .flatMap((m: any) => {
      const items = m.deliverableItems || m.content?.deliverableItems || m.content?.items || [];
      return items.map((item: any) => ({
        description: item.description || item.title || item.name || "Add-On Deliverable",
        details: item.details || "",
        duration: item.duration
          ? `${item.duration} ${item.unit || (String(item.duration).toLowerCase().includes("day") ? "" : "Days")}`.trim()
          : "1 Days",
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

  const addonsTotal = allAddonItems.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
  const totalSubtotal = baseSubtotal + addonsTotal;
  const effectiveVatAmount = vatRate > 0 && totalSubtotal > 0
    ? Math.round((totalSubtotal * (vatRate / 100)) * 100) / 100
    : Number(activeProject.vatAmount ?? linkedQuote.vatAmount ?? 0);
  let computedTotalCost = totalSubtotal + effectiveVatAmount;

  const totalPaidFromTransactions = (payments || [])
    .filter((p: any) => ["succeeded", "paid", "completed"].includes(String(p?.status || "").toLowerCase()))
    .reduce((sum: number, p: any) => {
      const pCurr = (p?.currency || projectNativeCurrency || "USD").toLowerCase();
      const pAmt = Number(p?.amountPaid || p?.amount || 0);
      const pRate = Number(p?.exchangeRate || p?.metadata?.exchangeRate || p?.metadata?.conversionRate || conversionRate || 1.14776);
      return sum + convertCurrencyAmount(pAmt, projectNativeCurrency, pCurr, pRate);
    }, 0);

  const amountPaid = totalPaidFromTransactions > 0
    ? totalPaidFromTransactions
    : Number(activeProject.amountPaid || 0);

  const isDepositHalf =
    activeProject.paymentOption === "half" ||
    activeProject.paymentOption === "deposit" ||
    linkedQuote?.paymentOption === "half" ||
    (payments || []).some((p: any) => p?.metadata?.isDeposit === "true" || p?.metadata?.paymentOption === "half");

  if (isDepositHalf && amountPaid > 0 && Math.abs(computedTotalCost - (amountPaid * 2)) <= 15) {
    computedTotalCost = Math.round(amountPaid * 2 * 100) / 100;
  }

  const totalCost = computedTotalCost;
  const calculatedPending = Math.max(0, Math.round((totalCost - amountPaid) * 100) / 100);
  const isActuallyPaidInFull = totalCost > 0 && amountPaid >= totalCost - 0.009;
  const pendingBalance = isActuallyPaidInFull
    ? 0
    : amountPaid === 0
    ? totalCost
    : calculatedPending;

  const isMonthlyProject = Boolean(
    activeProject.billingType === "monthly" ||
    specs?.billingType === "monthly" ||
    specs?.categoryKey === "marketing" ||
    activeProject.categoryKey === "marketing" ||
    /marketing|campaign/i.test(activeProject.title || "") ||
    /marketing|campaign/i.test(specs?.categoryName || "") ||
    (specs?.categoryKey === "seo" && specs?.seoServiceMode === "monthly")
  );

  const formatSubmittedDate = (date: any) => formatSubmittedDateTz(date);
  const formatChatDate = (date: any) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const day = formatDateTimeTz(d, { day: "numeric" });
    const month = formatDateTimeTz(d, { month: "short" });
    const time = formatDateTimeTz(d, { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
    return `${day} ${month}, ${time}`;
  };

  const projectPayloadForPdf = {
    ...activeProject,
    calculatorSpecs: specs,
    quote: linkedQuote,
  };

  const scrollToBottomMessages = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (lastMessageRef.current) {
      const rect = lastMessageRef.current.getBoundingClientRect();
      if (rect.height > window.innerHeight * 0.6) {
        lastMessageRef.current.scrollIntoView({ behavior, block: "start" });
        return;
      }
      if (messageInputRef.current) {
        messageInputRef.current.scrollIntoView({ behavior, block: "end" });
        return;
      }
      lastMessageRef.current.scrollIntoView({ behavior, block: "center" });
      return;
    }
    if (messageInputRef.current) {
      messageInputRef.current.scrollIntoView({ behavior, block: "center" });
      return;
    }
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: "end" });
      return;
    }
    const el = document.getElementById("messages");
    if (el) el.scrollIntoView({ behavior, block: "start" });
  }, []);

  const handleSendMessage = async () => {
    if (!authService.isAuthenticated()) {
      setShowAuthModal(true);
      return;
    }
    if (attachments.some((a) => a.status === "uploading")) {
      toast.info("Please wait for file upload to complete before sending.");
      return;
    }
    const user = authService.getUser();
    if (attachments.length > 0 && user && user.isEmailVerified === false) {
      toast.error("To protect your data, file uploads are restricted for unverified accounts. Please verify your email.");
      return;
    }
    const uploadedUrls = attachments.filter((a) => a.status === "done" && a.url).map((a) => a.url);
    if (!messageText.trim()) {
      toast.error("Please enter a message before sending.");
      return;
    }
    setIsSending(true);
    try {
      const res = await projectService.addMessage(projectId, messageText, false, uploadedUrls);
      if (res && (res.statusCode === 200 || res.statusCode === 201)) {
        setMessageText("");
        setAttachments([]);
        if (onRefreshProject) await onRefreshProject();
        setTimeout(() => scrollToBottomMessages("smooth"), 200);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const MAX_FILE_SIZE = 10 * 1024 * 1024;
      const validFiles = files.filter((f) => {
        if (f.size > MAX_FILE_SIZE) {
          toast.error(`File "${f.name}" exceeds 10MB limit.`);
          return false;
        }
        return true;
      });
      if (validFiles.length === 0) return;

      const newFiles = validFiles.map((file) => ({
        id: Math.random().toString(36).substring(7),
        file,
        name: file.name,
        size: file.size,
        status: "uploading",
        url: "",
      }));
      setAttachments((prev) => [...prev, ...newFiles]);

      for (const att of newFiles) {
        try {
          const res = await mediaService.uploadImage({
            file: att.file,
            folder: `project-attachments/${projectId}`,
          });
          const url = res.data?.secure_url || res.data?.url || res.secure_url || "";
          if (!url) throw new Error("Failed to get URL");
          setAttachments((prev) => prev.map((a) => (a.id === att.id ? { ...a, status: "done", url } : a)));
        } catch (error) {
          console.error("Upload failed for file:", att.name, error);
          toast.error(`Upload failed for ${att.name}`);
          setAttachments((prev) => prev.map((a) => (a.id === att.id ? { ...a, status: "error" } : a)));
        }
      }
    }
  };

  const handleAcceptProposal = async (proposalId: string) => {
    if (actionLoadingRef.current || isActionLoading) return;
    actionLoadingRef.current = true;
    setIsActionLoading(true);
    try {
      const username = currentUser?.fullName || currentUser?.username || "User";
      const avatar = currentUser?.avatar;
      const res = await projectService.acceptProposal(projectId, proposalId, username, avatar);
      if (res && (res.statusCode === 200 || res.statusCode === 201 || res.isSuccessful || res.data)) {
        toast.success("Add-on proposal accepted successfully!");
        if (onRefreshProject) await onRefreshProject();
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

  const handleActionSubmit = async () => {
    if (actionModal.proposalId && actionModal.action && (!actionModal.required || actionComment.trim())) {
      setIsActionLoading(true);
      try {
        let res;
        const username = currentUser?.fullName || currentUser?.username || "User";
        const avatar = currentUser?.avatar;
        if (actionModal.action === "decline") {
          res = await projectService.declineProposal(projectId, actionModal.proposalId, actionComment || "", username, avatar);
        } else if (actionModal.action === "request_modification") {
          res = await projectService.requestProposalModification(projectId, actionModal.proposalId, actionComment, username, avatar);
        }
        if (res && (res.statusCode === 200 || res.statusCode === 201 || res.isSuccessful || res.data)) {
          toast.success(actionModal.action === "decline" ? "Offer declined successfully" : "Modification request sent");
          setActionModal({ ...actionModal, isOpen: false });
          setActionComment("");
          if (onRefreshProject) await onRefreshProject();
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

  const handleToggleAutoRenewal = async (enable: boolean) => {
    if (!projectId) return;
    setIsTogglingRenewal(true);
    try {
      const res: any = await projectService.toggleAutoRenewal(projectId, enable);
      if (res && (res.isSuccessful || res.statusCode === 200 || res.data)) {
        toast.success(enable ? "Auto-renewal enabled successfully!" : "Auto-renewal disabled successfully.");
        if (onRefreshProject) await onRefreshProject();
      } else {
        toast.error(res?.message || "Failed to update auto-renewal");
      }
    } catch (err: any) {
      console.error("Auto-renewal error:", err);
      toast.error(err?.message || "Failed to update auto-renewal");
    } finally {
      setIsTogglingRenewal(false);
    }
  };

  const handleRestartProject = async () => {
    if (!projectId) return;
    setIsRestarting(true);
    try {
      const res: any = await projectService.restartMonthlyProject(projectId);
      if (res && (res.isSuccessful || res.statusCode === 200 || res.statusCode === 201 || res.data)) {
        toast.success("Project restarted successfully!");
        if (onRefreshProject) await onRefreshProject();
      } else {
        toast.error(res?.message || "Failed to restart project");
      }
    } catch (error: any) {
      console.error("Failed to restart project:", error);
      toast.error(error?.message || "Failed to restart project");
    } finally {
      setIsRestarting(false);
    }
  };

  const displayMessages = (activeProject.messages || []).filter((msg: any) => {
    if (msg.isInternal || msg.content?.isInternal || msg.type === "internal_note" || msg.content?.type === "internal_note") {
      return false;
    }
    const rawTitle = (msg.content?.systemText || msg.message || "").toLowerCase();
    const clean = rawTitle
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}⏸▶️💳🛠️🎉✅🔄👤🚀📌🔔]/gu, "")
      .trim();
    if (
      clean === "project created" ||
      clean === "project requirements" ||
      clean === "financial & scope overview" ||
      clean === "scope of work"
    ) {
      return false;
    }
    return true;
  });

  const deliveryDueStr = activeProject.deadline ? formatSubmittedDate(activeProject.deadline) : "";

  return (
    <div className="flex flex-col gap-6 md:gap-8 w-full font-sans">
      {/* Paused / Monthly Banners */}
      {activeProject.status === "paused" && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <span className="text-2xl" aria-hidden="true">⏸</span>
          <div className="flex-1">
            <h4 className="font-bold text-amber-800 text-sm">Project Paused</h4>
            <p className="text-amber-700 text-xs mt-0.5">
              This project is currently paused. The estimated deadline does not count while paused.
              {activeProject.pauseReason && (
                <span className="ml-1 capitalize">
                  Reason: {activeProject.pauseReason.replace(/_/g, " ")}.
                </span>
              )}{" "}
              Your project manager will resume work once the pending item is resolved.
            </p>
          </div>
        </div>
      )}

      {activeProject.status === "completed" && isMonthlyProject && (
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
            {/* Header: Submitted Date, Status Badge, Financial Summary */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[10px] sm:text-xs text-gray-500 font-bold">
                  Submitted - {formatSubmittedDate(activeProject.createdAt)}
                </span>
                <span
                  className={`w-fit px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider border ${(() => {
                    const status = (activeProject.status || "").toLowerCase();
                    if (status === "active" || status === "in_progress") return "bg-[#E1FCEF] text-[#14804A] border-[#E1FCEF]";
                    if (status === "paused") return "bg-[#FEF3C7] text-[#D97706] border-[#FEF3C7]";
                    if (status === "completed") return "bg-[#EBF5FF] text-[#2563EB] border-[#EBF5FF]";
                    if (status === "canceled" || status === "cancelled") return "bg-[#FEE2E2] text-[#B91C1C] border-[#FEE2E2]";
                    return "bg-gray-100 text-gray-700 border-gray-200";
                  })()}`}
                >
                  {activeProject.status || "ACTIVE"}
                </span>
              </div>

              {/* Financial Summary */}
              <div className="w-full sm:w-60 shrink-0 space-y-1.5 text-xs sm:text-sm self-start">
                <div className="flex justify-between items-center font-semibold">
                  <span className="text-gray-900">Total Cost</span>
                  <span className="text-gray-900 font-bold">{formatCurrency(totalCost)}</span>
                </div>
                <div className="flex justify-between items-center text-green-600">
                  <span className="font-medium">Paid to Date</span>
                  <span className="font-semibold">{formatCurrency(amountPaid)}</span>
                </div>
                <div
                  className={`flex justify-between items-center pt-1 border-t border-gray-100 font-semibold ${
                    pendingBalance > 0.009 ? "text-red-600" : "text-gray-600"
                  }`}
                >
                  <span>Pending Balance</span>
                  <span className="font-bold">{formatCurrency(pendingBalance)}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 mb-6 sm:mb-8" />

            {/* Title & Project Number */}
            <div className="pb-4 sm:pb-6 flex flex-col sm:flex-row justify-between items-start gap-2">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-700">
                  {primaryItemTitle}
                </h2>
                {isMonthlyProject && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded uppercase border border-indigo-200">
                      Monthly Subscription
                    </span>
                  </div>
                )}
              </div>
              <span className="text-[10px] sm:text-xs text-gray-400 font-medium whitespace-nowrap">
                Project #{cleanNumber}
              </span>
            </div>

            {/* Calculator Specifications Card */}
            {specs && Object.keys(specs).length > 0 && (
              <div className="mb-10">
                <div className="text-sm text-gray-700 leading-relaxed font-medium">
                  <CalculatorSpecsCard specs={specs} />
                </div>
              </div>
            )}

            {/* Calculator Project Summary Table */}
            <div className="border border-gray-400 rounded-lg overflow-x-auto mb-4">
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
                  <tr className={allAddonItems.length > 0 ? "border-b border-gray-400" : ""}>
                    <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-500 align-top">
                      <div className="font-medium text-gray-700 mb-1">
                        {categoryDisplayName}
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-400">
                        Based on calculator selections
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-600 font-medium text-center align-top whitespace-nowrap">
                      {itemDuration}
                    </td>
                    <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-600 text-right font-bold align-top">
                      {formatCurrency(baseSubtotal)}
                    </td>
                  </tr>
                  {/* Add-ons section if exists */}
                  {allAddonItems.length > 0 && (
                    <React.Fragment>
                      <tr className="bg-gray-800">
                        <td colSpan={3} className="px-6 py-2.5 text-xs font-bold text-white tracking-wider">
                          Add-On Tasks
                        </td>
                      </tr>
                      {allAddonItems.map((item: any, iIdx: number) => (
                        <tr
                          key={`addon-calc-${iIdx}`}
                          className={iIdx === allAddonItems.length - 1 ? "" : "border-b border-gray-400"}
                        >
                          <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-500 align-top">
                            <div className="font-medium text-gray-700 mb-1">{item.description}</div>
                            {item.details && (
                              <div className="text-[10px] sm:text-xs text-gray-400">{item.details}</div>
                            )}
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

            {/* Totals Summary */}
            <div className="flex flex-row justify-end gap-6 sm:gap-12 text-xs sm:text-sm mb-4">
              {vatRate > 0 && effectiveVatAmount > 0 && (
                <div className="text-center">
                  <div className="text-gray-500 font-bold mb-1 sm:mb-2">Base Amount</div>
                  <div className="font-medium text-gray-600">{formatCurrency(totalSubtotal)}</div>
                </div>
              )}
              {vatRate > 0 && effectiveVatAmount > 0 && (
                <div className="text-center">
                  <div className="text-gray-500 font-bold mb-1 sm:mb-2">VAT ({vatRate}%)</div>
                  <div className="font-medium text-gray-600">{formatCurrency(effectiveVatAmount)}</div>
                </div>
              )}
              <div className="text-center">
                <div className="font-bold mb-1 sm:mb-2 text-gray-800">Total Amount</div>
                <div className="font-bold text-gray-900">{formatCurrency(totalCost)}</div>
              </div>
            </div>

            {/* Bottom Card Row: Estimated Deadline & Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
              <div>
                <div className="text-xs text-gray-500 flex flex-wrap items-center gap-2">
                  <span className="font-bold text-gray-600 mr-2">Estimated Deadline:</span>
                  <span>
                    {getProjectEstimatedDeadline(activeProject)
                      ? formatSubmittedDate(getProjectEstimatedDeadline(activeProject))
                      : activeProject.deadline
                      ? formatSubmittedDate(activeProject.deadline)
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
                      await downloadCalculatorProjectPDF(projectPayloadForPdf);
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
                    printCalculatorProjectPDF(projectPayloadForPdf);
                  }}
                  className="flex-1 sm:flex-initial px-6 py-2 bg-[#4343F0] hover:bg-[#3232b7] text-white text-[10px] sm:text-xs font-bold rounded shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                >
                  Print Details
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Project Manager & Auto-Renewal */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-gray-300 rounded-[12px] shadow-sm p-6 sm:p-8 sticky top-24">
            {(() => {
              const rawManagers =
                Array.isArray(activeProject.assignedManagers) && activeProject.assignedManagers.length > 0
                  ? activeProject.assignedManagers
                  : activeProject.projectManager
                  ? [activeProject.projectManager]
                  : [];
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
                          <div
                            key={m._id || m.id || idx}
                            className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200"
                          >
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
                              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                                Project Manager
                              </p>
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
                  <p className="text-sm text-gray-500 font-medium uppercase tracking-wider text-[10px]">
                    PROJECT MANAGER
                  </p>
                </div>
              );
            })()}
          </div>

          {/* Auto-Renewal Card for Monthly Calculator Projects */}
          {isMonthlyProject && (
            <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-6 sm:p-7">
              <h3 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider mb-2 font-sans">
                SUBSCRIPTION &amp; AUTO-RENEWAL
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-4">
                This is a monthly subscription project. When auto-renewal is enabled, your project renews automatically each month.
              </p>

              <div className="bg-[#F8FAFC] border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-[#1E293B]">Auto-Renewal</h4>
                  {activeProject.autoRenewal !== false ? (
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

                {activeProject.autoRenewal !== false ? (
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

      {/* Messages & Chat Feed */}
      <div className="w-full space-y-6">
        {displayMessages.length > 0 && (
          <div className="flex flex-col gap-6 w-full">
            {displayMessages.map((msg: any, idx: number) => {
              const msgId = msg.id || `msg-${idx}`;
              const isLast = idx === displayMessages.length - 1;
              const isQuoteProposal = msg.type === "quote_proposal" || msg.content?.type === "quote_proposal";

              // Check for Payment Request
              const isPaymentRequest =
                msg.type === "payment_request" ||
                msg.content?.type === "payment_request" ||
                (msg.content?.systemText?.toLowerCase().includes("payment request") ||
                  msg.message?.toLowerCase().includes("payment request"));

              if (isPaymentRequest) {
                const content = typeof msg.content === "object" && msg.content !== null ? msg.content : {};
                let rawAmount = content.amount ?? msg.amount ?? content.total ?? content.price ?? content.invoice?.amount;
                if (rawAmount === undefined || rawAmount === null || rawAmount === "" || Number(rawAmount) === 0) {
                  const textSearch = `${content.text || ""} ${content.systemText || ""} ${msg.message || ""}`;
                  const match = textSearch.match(/(?:due:\s*\$|request:\s*|\$|amount:\s*|payment:\s*)(\d+(?:\.\d+)?)/i) ||
                    textSearch.match(/\$(\d+(?:\.\d+)?)/) ||
                    textSearch.match(/(\d+(?:\.\d+)?)\s*(?:USD|EUR|\$)/i) ||
                    textSearch.match(/(\d+(?:\.\d+)?)/);
                  if (match && match[1]) rawAmount = Number(match[1]);
                  else if (activeProject?.amountDue) rawAmount = activeProject.amountDue;
                }
                const reqAmount = Number(rawAmount || 0);
                const reqCurrency = (content.currency || msg.currency || activeDisplayCurrency || projectNativeCurrency || "USD").toUpperCase();
                const description = content.description || msg.description || content.note || content.message || content.text;
                const invId = asId(content.invoiceId || msg.invoiceId);
                const invNum = content.invoiceNumber || msg.invoiceNumber;
                const currentMsgId = asId(msg.id || msg._id || msgId);
                const isPaid = isExactPaymentRequestPaid(msg, activeProject, payments);

                const payParams = new URLSearchParams();
                if (reqAmount > 0) payParams.set("amount", String(reqAmount));
                if (invId) payParams.set("invoiceId", invId);
                if (invNum) payParams.set("invoiceNumber", String(invNum));
                if (currentMsgId) payParams.set("messageId", currentMsgId);
                if (description) payParams.set("description", String(description));
                const payUrl = `/dashboard/my-projects/${projectId}/payments?${payParams.toString()}`;

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
                            {reqCurrency === "EUR" ? "€" : "$"}{reqAmount.toFixed(0)}
                          </span>
                          <span className="text-[11px] font-bold text-[#3B82F6] uppercase">{reqCurrency}</span>
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

              // System notifications
              const isSystemMsg = msg.type === "system_notification" || msg.isSystem || msg.sender === "system" || msg.role === "system";
              const messageAttachments = (msg.attachments && msg.attachments.length > 0) ? msg.attachments : (msg.content?.attachedFiles || msg.attachedFiles || []);
              const hasFileAttachments = Array.isArray(messageAttachments) && messageAttachments.length > 0;

              if (isSystemMsg && !hasFileAttachments && !isQuoteProposal) {
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

              // Quote Proposals (Add-ons)
              if (isQuoteProposal) {
                const content = msg.content || {};
                const items = content.deliverableItems || content.items || msg.deliverableItems || [];
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
                const canAct = !isAccepted && !isDeclined && !isModRequested && !hasLaterProposal && !hasExplicitlyNoActions;
                const targetProposalId = msg._id || msg.id;

                const pBase = Number(content.subtotal || content.baseAmount || 0) || items.reduce((s: number, it: any) => s + (Number(it.amount ?? it.cost) || 0), 0) || Number(content.total || 0);
                const pVatRate = Number(content.vatRate ?? 0);
                const pVatAmount = Number(content.vatAmount ?? (pVatRate > 0 ? (pBase * pVatRate) / 100 : 0));
                const pTotal = Number(content.totalCost ?? content.total ?? (pBase + pVatAmount));

                return (
                  <div key={msgId} ref={isLast ? lastMessageRef : null} className="w-full">
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-xs p-6 sm:p-8 md:p-10">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs sm:text-sm text-gray-500 font-medium">
                            Submitted - {formatSubmittedDate(msg.createdAt)}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold border ${
                            isAccepted ? "border-green-400 text-green-600 bg-green-50" :
                            isDeclined ? "border-red-400 text-red-600 bg-red-50" :
                            isModRequested ? "border-orange-400 text-orange-600 bg-orange-50" :
                            "border-blue-400 text-blue-600 bg-blue-50/60"
                          }`}>
                            {isAccepted ? "Accepted" : isDeclined ? "Declined" : isModRequested ? "Modification Requested" : "Add-On Offer"}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 mb-6" />

                      <div className="pb-4 flex flex-col sm:flex-row justify-between items-start gap-2">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Add-on proposal</h2>
                        <span className="text-xs sm:text-sm text-gray-400 font-medium">From: {msg.username || "Project Manager"}</span>
                      </div>

                      {content.description && (
                        <div className="mb-6 text-sm text-gray-600 leading-relaxed font-medium">{content.description}</div>
                      )}

                      {/* Items table */}
                      {items.length > 0 && (
                        <div className="border border-gray-200 rounded-lg overflow-x-auto mb-6">
                          <table className="w-full text-xs sm:text-sm">
                            <thead>
                              <tr className="border-b border-gray-200 bg-gray-50/60">
                                <th className="px-4 py-3 text-left font-bold text-gray-600">Item</th>
                                <th className="px-4 py-3 text-center font-bold text-gray-600">Duration</th>
                                <th className="px-4 py-3 text-right font-bold text-gray-600">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((it: any, iIdx: number) => (
                                <tr key={iIdx} className="border-b border-gray-100 last:border-b-0">
                                  <td className="px-4 py-3 text-gray-700">{it.description || it.title || it.name}</td>
                                  <td className="px-4 py-3 text-center text-gray-500">{it.duration || "-"}</td>
                                  <td className="px-4 py-3 text-right font-bold text-gray-800">{formatCurrency(Number(it.amount ?? it.cost ?? 0))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <div className="flex justify-end gap-6 text-xs sm:text-sm font-bold text-gray-900 mb-6">
                        <span>Total: {formatCurrency(pTotal)}</span>
                      </div>

                      {canAct && (
                        <div className="flex flex-wrap gap-3 justify-end pt-4 border-t border-gray-200">
                          <button
                            type="button"
                            onClick={() => handleAcceptProposal(targetProposalId)}
                            disabled={isActionLoading}
                            className="px-6 py-2.5 bg-[#4343F0] hover:bg-[#3232b7] text-white text-xs font-bold rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            Accept Offer
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setActionModal({
                                isOpen: true,
                                action: "request_modification",
                                proposalId: targetProposalId,
                                title: "Request Modification",
                                description: "Please explain what changes you would like for this proposal.",
                                placeholder: "Enter your modification requests here...",
                                required: true,
                              })
                            }
                            disabled={isActionLoading}
                            className="px-6 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          >
                            Request Modification
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setActionModal({
                                isOpen: true,
                                action: "decline",
                                proposalId: targetProposalId,
                                title: "Decline Offer",
                                description: "Are you sure you want to decline this add-on offer?",
                                placeholder: "Optional reason for declining...",
                                required: false,
                              })
                            }
                            disabled={isActionLoading}
                            className="px-6 py-2.5 bg-white border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // Standard User / Manager Messages
              const isClient =
                msg.sender === "client" ||
                msg.role === "client" ||
                msg.sender === "user" ||
                (currentUser && (msg.userId === currentUser._id || msg.userId === currentUser.id));

              return (
                <div
                  key={msgId}
                  ref={isLast ? lastMessageRef : null}
                  className={`flex gap-3 sm:gap-4 w-full ${isClient ? "justify-end" : "justify-start"}`}
                >
                  {!isClient && (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs overflow-hidden">
                      {msg.avatar ? (
                        <img src={msg.avatar} alt={msg.username || "PM"} className="w-full h-full object-cover" />
                      ) : (
                        (msg.username || "PM")[0]
                      )}
                    </div>
                  )}

                  <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isClient ? "items-end" : "items-start"}`}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-xs font-bold text-gray-700">
                        {isClient ? "You" : msg.username || "Project Manager"}
                      </span>
                      <span className="text-[10px] text-gray-400">{formatChatDate(msg.createdAt)}</span>
                    </div>

                    <div
                      className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs ${
                        isClient
                          ? "bg-[#4343F0] text-white rounded-tr-xs"
                          : "bg-white border border-gray-200 text-gray-800 rounded-tl-xs"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{capitalizeCurrencyInText(msg.message || msg.text || "")}</p>

                      {/* Attachments */}
                      {hasFileAttachments && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {messageAttachments.map((att: any, aIdx: number) => {
                            const url = typeof att === "string" ? att : att.url;
                            const filename = typeof att === "string" ? decodeURIComponent(url.split("/").pop() || "File") : att.filename || att.name || "File";
                            const safeUrl = getSafeUrl(url);
                            return (
                              <a
                                key={aIdx}
                                href={safeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => downloadFile(e, safeUrl, filename)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                                  isClient
                                    ? "bg-white/15 hover:bg-white/25 text-white"
                                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                                }`}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="truncate max-w-[150px]">{filename}</span>
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {isClient && (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs overflow-hidden">
                      {currentUser?.avatar ? (
                        <img src={currentUser.avatar} alt="You" className="w-full h-full object-cover" />
                      ) : (
                        (currentUser?.fullName || currentUser?.username || "U")[0]
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div ref={messagesEndRef} />

        {/* Message Input Box */}
        <div ref={messageInputRef} className="bg-white border border-gray-300 rounded-2xl p-4 sm:p-5 shadow-xs">
          {/* Attachments preview */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {attachments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                >
                  <span className="text-gray-700 truncate max-w-[180px]">{a.name}</span>
                  {a.status === "uploading" && <div className="w-3 h-3 border-2 border-[#4343F0] border-t-transparent rounded-full animate-spin" />}
                  <button
                    type="button"
                    onClick={() => setAttachments((prev) => prev.filter((it) => it.id !== a.id))}
                    className="text-gray-400 hover:text-red-500 font-bold ml-1 cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type your message here..."
            rows={3}
            className="w-full text-xs sm:text-sm text-gray-800 placeholder-gray-400 resize-none outline-none focus:ring-0 border-0 p-0"
          />

          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span>Attach Files</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleSendMessage}
              disabled={isSending || !messageText.trim()}
              className="inline-flex items-center gap-2 px-6 py-2 bg-[#4343F0] hover:bg-[#3232b7] text-white text-xs font-bold rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <span>Send Message</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <SupportNewsletter />

      {/* Proposal Action Modal (Decline / Modification) */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-gray-900">{actionModal.title}</h3>
            <p className="text-xs text-gray-500">{actionModal.description}</p>
            <textarea
              value={actionComment}
              onChange={(e) => setActionComment(e.target.value)}
              placeholder={actionModal.placeholder}
              rows={4}
              className="w-full text-xs p-3 border border-gray-200 rounded-xl outline-none focus:border-[#4343F0]"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActionModal({ ...actionModal, isOpen: false })}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleActionSubmit}
                disabled={isActionLoading || (actionModal.required && !actionComment.trim())}
                className="px-5 py-2 bg-[#4343F0] hover:bg-[#3232b7] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {isActionLoading ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAuthModal && (
        <AuthPromptModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          title="Sign in to Send Messages"
          description="You need to be logged in to chat with your project manager."
        />
      )}
    </div>
  );
}
