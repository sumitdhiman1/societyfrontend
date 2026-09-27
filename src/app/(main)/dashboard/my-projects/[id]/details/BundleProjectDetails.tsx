"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/authService";
import { projectService } from "@/lib/projectService";
import { mediaService } from "@/lib/mediaService";
import { countryService } from "@/lib/countryService";
import { downloadFile, isImageUrl, getSafeUrl } from "@/lib/utils";
import { downloadBundlePDF, printBundlePDF } from "@/lib/generateBundlePDF";
import LoadingDots from "@/components/common/LoadingDots";
import AuthPromptModal from "@/components/common/AuthPromptModal";
import DeadlineTooltip from "@/components/common/DeadlineTooltip";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";
import {
  capitalizeCurrencyInText,
  formatPriceWithCurrency,
  convertCurrencyAmount,
  sumPaymentsInNativeCurrency,
} from "@/lib/currencyUtils";
import { useCurrency } from "@/context/CurrencyContext";
import { useTimezone } from "@/context/TimezoneContext";
import { toast } from "sonner";
import { getPauseReasonConfig } from "@/lib/pauseReasonMapping";

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

  const projectStatus = String(project?.status || "").toLowerCase();
  const isCompletedProject = ["completed", "approved", "delivered", "active", "in_progress"].includes(projectStatus);
  const isProjectFullyPaid = Boolean(
    project?.isPaid ||
    project?.paymentStatus === "paid" ||
    project?.paymentStatus === "succeeded" ||
    (project?.amountPaid > 0 && project?.amountDue === 0)
  );

  if (isCompletedProject && isProjectFullyPaid) return true;

  if (
    (project.paymentLedger || []).some(
      (l: any) =>
        ["paid", "succeeded", "completed"].includes(String(l.status || "").toLowerCase()) &&
        matchesTarget({
          messageId: l.messageId,
          invoiceId: l.invoiceId,
          invoiceNumber: l.invoiceNumber,
        })
    )
  ) {
    return true;
  }

  if (
    (project.messages || []).some((m: any) => {
      const c = m.content || {};
      const type = String(m.type || c.type || "").toLowerCase();
      const text = `${m.message || ""} ${c.text || ""} ${c.systemText || ""}`.toLowerCase();
      const isReceipt =
        type === "payment_received" ||
        type === "payment_receipt" ||
        text.includes("payment received") ||
        text.includes("payment confirmed");
      return (
        isReceipt &&
        matchesTarget({
          messageId: c.messageId || m.messageId,
          invoiceId: c.invoiceId || m.invoiceId,
          invoiceNumber: c.invoiceNumber || m.invoiceNumber,
        })
      );
    })
  ) {
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

function formatDurationLabel(raw: any): string {
  if (!raw) return "2 weeks";
  const str = String(raw).trim();
  if (str === "" || str === "-") return "2 weeks";
  return str
    .replace(/\bWeeks\b/g, "weeks")
    .replace(/\bWeek\b/g, "week")
    .replace(/\bDays\b/g, "days")
    .replace(/\bDay\b/g, "day")
    .replace(/\bMonths\b/g, "months")
    .replace(/\bMonth\b/g, "month");
}

interface BundleProjectDetailsProps {
  project: any;
  quote?: any;
  payments?: any[];
  onRefreshProject?: () => Promise<void> | void;
}

export default function BundleProjectDetails({
  project,
  quote,
  payments = [],
  onRefreshProject,
}: BundleProjectDetailsProps) {
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

  const bundleTitle = String(
    activeProject.title ||
    linkedQuote.title ||
    activeProject.name ||
    "Local Business Growth Bundle - Starter"
  ).trim();

  const clientCountryStr =
    activeProject.clientCountry ||
    activeProject.country ||
    linkedQuote?.clientCountry ||
    linkedQuote?.country ||
    currentUser?.country ||
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

  const formatCurr = (amt: number, customCurr?: string) => {
    const targetCurr = (customCurr || activeDisplayCurrency).toLowerCase();
    return formatPriceWithCurrency(amt, targetCurr, projectNativeCurrency, conversionRate);
  };

  // Deliverables & Pricing — mirrors CalculatorProjectDetails logic
  let rawDeliverables: any[] = [];
  if (Array.isArray(activeProject.deliverableItems) && activeProject.deliverableItems.length > 0) {
    rawDeliverables = activeProject.deliverableItems;
  } else if (Array.isArray(activeProject.deliverables) && activeProject.deliverables.length > 0) {
    rawDeliverables = activeProject.deliverables;
  } else if (Array.isArray(linkedQuote.deliverableItems) && linkedQuote.deliverableItems.length > 0) {
    rawDeliverables = linkedQuote.deliverableItems;
  }

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

  const regularItemsSum = (rawDeliverables.length > 0)
    ? rawDeliverables.reduce((sum: number, it: any) => sum + (Number(it.amount ?? it.cost) || 0), 0)
    : 0;

  const storedSubtotal = Number(activeProject.subtotal || 0);
  const quoteExpectedSubtotal = Number(
    linkedQuote.subtotal ??
    linkedQuote.totalCost ??
    activeProject.baseAmount ??
    0
  );
  const isPartialProject =
    activeProject.paymentOption === "custom" ||
    activeProject.paymentOption === "other" ||
    activeProject.paymentOption === "half" ||
    activeProject.paymentOption === "deposit";

  const effectiveStoredSubtotal =
    storedSubtotal > 0 && !(isPartialProject && quoteExpectedSubtotal > storedSubtotal + 10)
      ? storedSubtotal
      : (quoteExpectedSubtotal > 0
          ? quoteExpectedSubtotal
          : (storedSubtotal > 0 ? storedSubtotal : regularItemsSum));

  const baseSubtotal = effectiveStoredSubtotal > 0
    ? effectiveStoredSubtotal
    : (regularItemsSum > 0
        ? regularItemsSum
        : (vatRate > 0 && rawTotalCost > 0
            ? Math.round((rawTotalCost / (1 + vatRate / 100)) * 100) / 100
            : rawTotalCost));

  const deliverableItems = rawDeliverables.length > 0
    ? rawDeliverables.map((item: any) => {
        const itemAmt = Number(item.amount ?? item.cost ?? (rawDeliverables.length === 1 ? baseSubtotal : 0));
        return {
          name: item.description || item.title || item.name || "Initial Project Setup & Implementation",
          details: item.details || item.subtitle || "",
          duration: formatDurationLabel(item.duration || activeProject.totalDuration || "2 weeks"),
          amount: itemAmt,
        };
      })
    : [
        {
          name: "Initial Project Setup & Implementation",
          details: activeProject.description || "Bundle Setup Phase",
          duration: formatDurationLabel(activeProject.totalDuration || activeProject.duration || "2 weeks"),
          amount: baseSubtotal,
        },
      ];

  const totalSubtotal = baseSubtotal;
  const effectiveVatAmount = vatRate > 0 && totalSubtotal > 0
    ? Math.round((totalSubtotal * (vatRate / 100)) * 100) / 100
    : Number(activeProject.vatAmount ?? linkedQuote.vatAmount ?? 0);
  let computedTotalCost = totalSubtotal + effectiveVatAmount;

  const ledgerPayments = (activeProject.paymentLedger || []).map((entry: any, index: number) => ({
    _id: entry.transactionId || `ledger-${index}`,
    id: entry.transactionId || `ledger-${index}`,
    amount: entry.chargedAmount || entry.amount,
    currency: entry.chargedCurrency || entry.currency,
    status: entry.status || "succeeded",
    exchangeRate: entry.exchangeRate,
    metadata: { exchangeRate: entry.exchangeRate },
    createdAt: entry.date,
  }));

  const combinedPayments = [...(payments || [])];
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

  // Mirror backend sumPaymentLedger: use each payment's own DB exchangeRate,
  // precise 2-decimal math (no nearest-5 per payment), round final sum once.
  const totalPaidFromTransactions = sumPaymentsInNativeCurrency(
    combinedPayments,
    projectNativeCurrency,
    conversionRate
  );

  const rawAmountPaid = Math.max(
    totalPaidFromTransactions,
    Number(activeProject.amountPaid || 0)
  );

  const isDepositHalf =
    activeProject.paymentOption === "half" ||
    activeProject.paymentOption === "deposit" ||
    linkedQuote?.paymentOption === "half" ||
    combinedPayments.some((p: any) => p?.metadata?.isDeposit === "true" || p?.metadata?.paymentOption === "half");

  if (isDepositHalf && rawAmountPaid > 0 && Math.abs(computedTotalCost - (rawAmountPaid * 2)) <= 15) {
    computedTotalCost = Math.round(rawAmountPaid * 2 * 100) / 100;
  }

  const totalCost = computedTotalCost;
  const calculatedPending = Math.max(0, Math.round((totalCost - rawAmountPaid) * 100) / 100);

  // Trust the backend's payment status decision. When a project has been confirmed
  // paid (paymentStatus="paid"), multi-currency exchange-rate rounding can cause the
  // summed transaction total to be slightly less than the quoted project cost (e.g.
  // €2,702.10 vs €2,703.20). In that case we honour the backend's determination and
  // show amountPaid = totalCost so no false pending balance appears.
  //
  // IMPORTANT: Only apply this override when rawAmountPaid >= 90% of totalCost.
  // This prevents deposit/half-payment scenarios (≈50%) from being incorrectly
  // treated as fully paid. Exchange-rate gaps are always < 1%, so 90% is safe.
  const isBackendConfirmedPaid =
    (activeProject.paymentStatus === "paid" ||
     activeProject.paymentStatus === "succeeded" ||
     activeProject.isPaid === true) &&
    totalCost > 0 &&
    rawAmountPaid >= totalCost * 0.9;

  const isActuallyPaidInFull =
    (totalCost > 0 && rawAmountPaid >= totalCost - 0.009) ||
    isBackendConfirmedPaid;

  // When fully paid, pin amountPaid to totalCost to avoid showing a fractional gap
  const amountPaid = isActuallyPaidInFull && rawAmountPaid > 0
    ? Math.max(rawAmountPaid, totalCost)
    : rawAmountPaid;

  const pendingBalance = isActuallyPaidInFull
    ? 0
    : rawAmountPaid === 0
    ? totalCost
    : calculatedPending;

  const duration = formatDurationLabel(activeProject.totalDuration || activeProject.duration || deliverableItems[0]?.duration || "2 weeks");

  // Recurring Phase
  const recurringAmount = Number(activeProject.recurringAmount || activeProject.recurringPrice || linkedQuote.recurringPrice || 0);

  const isCompleted = ["completed", "approved", "delivered"].includes(String(activeProject.status || "").toLowerCase());
  const isPaid = isActuallyPaidInFull || activeProject.isPaid || activeProject.paymentStatus === "paid" || activeProject.paymentStatus === "succeeded";

  const requireAuth = () => {
    if (!authService.isAuthenticated()) {
      setShowAuthModal(true);
      return null;
    }
    const current = currentUser || authService.getUser() || {};
    if (!currentUser && authService.getUser()) setCurrentUser(authService.getUser());
    return current;
  };

  const handleDownloadPdf = async () => {
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    try {
      const payload = {
        ...activeProject,
        quote: linkedQuote,
        targetCurrency: activeDisplayCurrency.toUpperCase(),
        sourceCurrency: projectNativeCurrency.toUpperCase(),
        conversionRate,
        isProject: true,
      };
      await downloadBundlePDF(payload);
    } catch (err) {
      console.error("Failed to download bundle PDF:", err);
      toast.error("Failed to download PDF. Please try again.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handlePrint = (e: React.MouseEvent) => {
    e.preventDefault();
    const payload = {
      ...activeProject,
      quote: linkedQuote,
      targetCurrency: activeDisplayCurrency.toUpperCase(),
      sourceCurrency: projectNativeCurrency.toUpperCase(),
      conversionRate,
      isProject: true,
    };
    printBundlePDF(payload);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() && attachments.length === 0) return;
    const auth = requireAuth();
    if (!auth) return;

    setIsSending(true);
    try {
      let uploadedUrls: any[] = [];
      if (attachments.length > 0) {
        uploadedUrls = await Promise.all(
          attachments.map(async (f) => {
            const res: any = await mediaService.uploadImage({ file: f });
            return {
              name: f.name,
              url: res?.data?.secure_url || res?.data?.url || res?.url || res || "",
              type: f.type.startsWith("image/") ? "image" : "document",
              size: f.size,
            };
          })
        );
      }

      const res = await projectService.addMessage(projectId, messageText.trim(), false, uploadedUrls);

      if (res?.data || res) {
        if (onRefreshProject) await onRefreshProject();
        setMessageText("");
        setAttachments([]);
      }
    } catch (err: any) {
      console.error("Failed to send message:", err);
      toast.error(err.message || "Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
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

  const handleAutoRenewalToggle = async () => {
    const auth = requireAuth();
    if (!auth) return;
    setIsTogglingRenewal(true);
    try {
      const nextState = !(activeProject.autoRenew ?? true);
      const res = await projectService.toggleAutoRenewal(projectId, nextState);
      if (res) {
        if (onRefreshProject) await onRefreshProject();
        toast.success(`Auto-renewal ${nextState ? "enabled" : "disabled"}.`);
      }
    } catch (e: any) {
      console.error("Failed auto-renewal toggle:", e);
      toast.error("Failed to update auto-renewal setting.");
    } finally {
      setIsTogglingRenewal(false);
    }
  };

  const rawManagers =
    Array.isArray(activeProject.assignedManagers) && activeProject.assignedManagers.length > 0
      ? activeProject.assignedManagers
      : activeProject.projectManager
      ? [activeProject.projectManager]
      : [];
  const managers = rawManagers.filter(
    (m: any) => m && (typeof m === "object" ? m._id || m.fullName || m.email : Boolean(m))
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <Link
              href="/dashboard/my-projects"
              className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-[#4343F0] transition-colors"
            >
              ← Back to Projects
            </Link>
            <span className="text-gray-300">|</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-[#4343F0] border border-blue-200">
              Bundle Project
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                isPaid
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {isPaid ? "Paid in Full" : "Pending Balance"}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            {bundleTitle}
          </h1>

          {/* Project number and timeline in one row */}
          <div className="flex items-center gap-2 mt-2 text-xs sm:text-sm text-gray-600 font-medium">
            <span className="font-bold text-gray-900">Project No: #{cleanNumber}</span>
            <span className="text-gray-300">•</span>
            <span>Timeline: <strong className="text-gray-900">{duration}</strong></span>
            {activeProject.createdAt && (
              <>
                <span className="text-gray-300">•</span>
                <span>Submitted: {formatSubmittedDateTz(activeProject.createdAt)}</span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="px-4 py-2 bg-[#4343F0] hover:bg-[#3232b7] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isDownloadingPdf ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download Project (.PDF)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            Print Details
          </button>

          <Link
            href={`/dashboard/my-projects/${projectId}/payments`}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
          >
            {pendingBalance > 0 ? "Pay Balance" : "View Payments"}
          </Link>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Deliverables, Financials, Messages */}
        <div className="lg:col-span-2 space-y-6">
          {/* Phase 1: Setup Deliverables Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#4343F0] bg-blue-50 px-2 py-0.5 rounded">
                  Phase 1
                </span>
                <h2 className="text-lg font-bold text-gray-900 mt-1">Initial Setup & Implementation Deliverables</h2>
              </div>
              <span className="text-xs font-semibold text-gray-500">Duration: {duration}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50/80 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 font-bold text-gray-700">Deliverable Item</th>
                    <th className="px-4 py-3 text-center font-bold text-gray-700">Timeline</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-700">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {deliverableItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-gray-900">{item.name}</div>
                        {item.details && (
                          <div className="text-[11px] text-gray-500 mt-0.5">{item.details}</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center text-gray-600 font-medium">
                        {item.duration}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-gray-900">
                        {formatCurr(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Phase 2: Recurring Maintenance Deliverables Card (if exists) */}
          {recurringAmount > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                    Phase 2
                  </span>
                  <h2 className="text-lg font-bold text-gray-900 mt-1">Ongoing Maintenance & Optimization</h2>
                </div>
                <span className="text-xs font-semibold text-purple-700 font-bold">Monthly Recurring</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50/80 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 font-bold text-gray-700">Recurring Service</th>
                      <th className="px-4 py-3 text-center font-bold text-gray-700">Billing Cycle</th>
                      <th className="px-4 py-3 text-right font-bold text-gray-700">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-gray-900">Monthly Maintenance & Dedicated Support</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          Ongoing security patches, high-performance hosting, analytics reports, and technical maintenance.
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center text-gray-600 font-medium">Monthly</td>
                      <td className="px-4 py-3.5 text-right font-bold text-gray-900">
                        {formatCurr(recurringAmount)} / mo
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Financial Breakdown Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
            <h2 className="text-base font-bold text-gray-900 mb-4">Financial Summary</h2>
            <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-5 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600 font-medium">Base Amount (Subtotal):</span>
                <span className="text-gray-900 font-bold">{formatCurr(totalSubtotal)}</span>
              </div>
              {vatRate > 0 && effectiveVatAmount > 0 && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 font-medium">VAT ({vatRate}%):</span>
                  <span className="text-gray-900 font-bold">{formatCurr(effectiveVatAmount)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 flex justify-between items-center text-sm">
                <span className="font-bold text-gray-900 uppercase">Total Payable:</span>
                <span className="font-black text-gray-900 text-base">{formatCurr(totalCost)}</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1">
                <span className="text-emerald-700 font-semibold">Amount Paid:</span>
                <span className="text-emerald-700 font-bold">{formatCurr(amountPaid)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-amber-700 font-semibold">Pending Balance:</span>
                <span className="text-amber-700 font-bold">{formatCurr(pendingBalance)}</span>
              </div>
            </div>
          </div>

          {/* Team Collaboration & Discussion Panel */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs flex flex-col h-[520px]">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">Project Discussion & Activity</h3>
                <p className="text-xs text-gray-500">Communicate directly with your assigned project management team.</p>
              </div>
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" title="Live" />
            </div>

            {/* Messages Scroll Area */}
            <div
              ref={messagesContainerRef}
              className="flex-grow overflow-y-auto space-y-4 pr-2 mb-4 scrollbar-thin scrollbar-thumb-gray-200"
            >
              {(() => {
                const displayMessages = (activeProject.messages || []).filter((msg: any) => {
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

                if (displayMessages.length === 0) {
                  return (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-[#4343F0] flex items-center justify-center mb-2">
                        💬
                      </div>
                      <p className="text-xs font-semibold text-gray-600">No messages yet</p>
                      <p className="text-[11px] text-gray-400 mt-1 max-w-xs">
                        Use the chat box below to discuss project requirements, timelines, or ask questions.
                      </p>
                    </div>
                  );
                }

                return displayMessages.map((msg: any, idx: number) => {
                  const msgId = msg.id ? `${msg.id}-${idx}` : (msg._id ? `${msg._id}-${idx}` : `msg-${idx}`);
                  const isLast = idx === displayMessages.length - 1;
                  const isQuoteProposal = msg.type === "quote_proposal" || msg.content?.type === "quote_proposal";

                  // Payment Request
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
                    const isPaidReq = isExactPaymentRequestPaid(msg, activeProject, payments);

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
                        className="w-full bg-[#F4F8FF] border border-[#DCE8FE] rounded-2xl p-4 sm:p-5 my-2 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <rect x="2" y="7" width="14" height="11" rx="2.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              <circle cx="6.5" cy="12.5" r="1.5" strokeWidth="2" />
                              <path d="M7 4h11.5A2.5 2.5 0 0121 6.5V14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-bold text-[#1E3A8A] text-sm mb-0.5">Payment Request</h4>
                            {description ? (
                              <p className="text-xs text-[#3B82F6] font-medium mb-1">{description}</p>
                            ) : null}
                            <div className="flex items-baseline gap-1">
                              <span className="text-lg font-black text-[#1E3A8A]">
                                {reqCurrency === "EUR" ? "€" : "$"}{reqAmount.toFixed(0)}
                              </span>
                              <span className="text-[10px] font-bold text-[#3B82F6] uppercase">{reqCurrency}</span>
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {isPaidReq ? (
                            <span className="inline-flex items-center gap-1 px-4 py-1.5 bg-green-50 text-green-700 font-bold text-xs rounded-lg border border-green-200">
                              ✓ Paid
                            </span>
                          ) : (
                            <Link
                              href={payUrl}
                              className="inline-block px-5 py-2 bg-[#4343F0] hover:bg-[#3232b7] text-white font-bold text-xs rounded-lg shadow-sm transition-all text-center"
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
                    const rawTextCandidate = msg.content?.text || msg.text || (msg.message !== rawTitle && msg.message !== cleanTitle ? msg.message : "");
                    const lowerTitle = cleanTitle.toLowerCase();
                    const lowerRaw = rawTitle.toLowerCase();
                    const lowerText = rawTextCandidate.toLowerCase();

                    const isDeadlineAdjusted =
                      lowerTitle.includes("deadline adjusted") ||
                      lowerRaw.includes("deadline adjusted") ||
                      lowerText.includes("deadline has been extended") ||
                      lowerText.includes("deadline adjusted");

                    const isManagerAssigned =
                      !isDeadlineAdjusted &&
                      (lowerTitle.includes("manager assigned") ||
                      lowerRaw.includes("manager assigned") ||
                      lowerText.includes("assigned as project manager") ||
                      lowerText.includes("assigned to your project"));

                    const isReactivated =
                      !isDeadlineAdjusted &&
                      !isManagerAssigned &&
                      (lowerTitle.includes("reactivate") || lowerRaw.includes("reactivate") || lowerText.includes("reactivate"));

                    const isResumed =
                      !isDeadlineAdjusted &&
                      !isManagerAssigned &&
                      !isReactivated &&
                      (lowerTitle.includes("resumed") || lowerRaw.includes("resumed") || lowerText.includes("resumed") || lowerTitle.startsWith("project status updated to active") || lowerTitle === "active");

                    const isCompletedMsg =
                      lowerTitle.includes("completed") || lowerRaw.includes("completed") || lowerText.includes("completed");

                    const isOfferReceived =
                      !isDeadlineAdjusted &&
                      !isManagerAssigned &&
                      !isReactivated &&
                      !isResumed &&
                      !isCompletedMsg &&
                      (lowerTitle.includes("offer received") ||
                      lowerRaw.includes("offer received") ||
                      lowerTitle.includes("you received an offer") ||
                      lowerRaw.includes("you received an offer") ||
                      lowerText.includes("you received an offer") ||
                      lowerText.includes("created a new offer"));

                    const isProposalAccepted =
                      !isDeadlineAdjusted &&
                      !isManagerAssigned &&
                      !isReactivated &&
                      !isResumed &&
                      !isCompletedMsg &&
                      (lowerTitle.includes("proposal accepted") ||
                      lowerRaw.includes("proposal accepted") ||
                      lowerText.includes("accepted the offered quote"));

                    const isProposalDeclined =
                      !isDeadlineAdjusted &&
                      !isManagerAssigned &&
                      !isReactivated &&
                      !isResumed &&
                      !isCompletedMsg &&
                      (lowerTitle.includes("proposal declined") ||
                      lowerRaw.includes("proposal declined") ||
                      lowerTitle.includes("offer declined") ||
                      lowerText.includes("the offer was declined"));

                    const isModificationsRequested =
                      !isDeadlineAdjusted &&
                      !isManagerAssigned &&
                      !isReactivated &&
                      !isResumed &&
                      !isCompletedMsg &&
                      (lowerTitle.includes("modification requested") ||
                      lowerTitle.includes("modifications requested") ||
                      lowerText.includes("requested modifications") ||
                      lowerText.includes("modifications requested"));

                    let finalTitle = cleanTitle;
                    let rawText = rawTextCandidate;

                    if (isDeadlineAdjusted) {
                      finalTitle = "Deadline Adjusted";
                      rawText = rawTextCandidate || "The project deadline has been extended by 0 day(s), 0 hour(s) and 0 minute(s), because the project has been paused for that long.";
                    } else if (isOfferReceived) {
                      finalTitle = "You Received an Offer";
                      if (rawTextCandidate && rawTextCandidate.toLowerCase().includes("containing")) {
                        rawText = rawTextCandidate;
                      } else {
                        const deliverables = (msg as any)?.content?.deliverableItems || (msg as any)?.content?.items || [];
                        const count = (msg as any)?.content?.deliverableCount || deliverables.length || 0;
                        rawText = count > 0
                          ? `Your project manager has created a new offer containing ${count} deliverable item(s).`
                          : rawTextCandidate || "Your project manager has created a new offer.";
                      }
                    } else if (isProposalAccepted) {
                      finalTitle = "Proposal Accepted";
                      rawText = "Confirmed! You accepted the offered quote.";
                    } else if (isProposalDeclined) {
                      finalTitle = "Proposal Declined";
                      rawText = "The offer was declined.";
                    } else if (isModificationsRequested) {
                      finalTitle = "Modifications Requested";
                      rawText = "The client requested modifications.";
                    } else if (isManagerAssigned) {
                      finalTitle = "Project Manager Assigned";
                      rawText = rawTextCandidate || "Project manager has been assigned to your project.";
                    } else if (isReactivated) {
                      finalTitle = "Project Reactivated";
                      rawText = "Your project has been reactivated by the project manager.";
                    } else if (isResumed) {
                      finalTitle = "Project Resumed";
                      rawText = "Your project has been resumed.";
                    } else if (isCompletedMsg) {
                      finalTitle = "Order Completed";
                      rawText = "Your order has been completed! Click here if you need further assistance.";
                    }

                    return (
                      <div key={msgId} ref={isLast ? lastMessageRef : null} className="text-center py-2 px-3 my-1">
                        <h4 className="text-base sm:text-lg font-bold text-[#0D1939] tracking-tight mb-1">
                          {finalTitle}
                        </h4>
                        {rawText ? (
                          <p className="text-xs font-medium text-gray-500 leading-relaxed max-w-lg mx-auto">
                            {rawText.includes("Click here") ? (
                              <>
                                {rawText.split("Click here")[0]}
                                <Link href="/help-support" className="text-[#4343F0] hover:underline font-semibold">
                                  Click here
                                </Link>
                                {rawText.split("Click here")[1]}
                              </>
                            ) : (
                              capitalizeCurrencyInText(rawText)
                            )}
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

                    const calculatedDurationDays = items.reduce((sum: number, it: any) => {
                      const dur = String(it.duration || "").toLowerCase();
                      const match = dur.match(/(\d+(\.\d+)?)/);
                      const val = match ? parseFloat(match[0]) : 0;
                      if (dur.includes("week")) return sum + val * 7;
                      if (dur.includes("month")) return sum + val * 30;
                      return sum + val;
                    }, 0);

                    const totalOfferDuration = calculatedDurationDays > 0
                      ? (calculatedDurationDays >= 30 && calculatedDurationDays % 30 === 0
                          ? `${calculatedDurationDays / 30} Month${calculatedDurationDays / 30 > 1 ? "s" : ""}`
                          : calculatedDurationDays >= 7 && calculatedDurationDays % 7 === 0
                            ? `${calculatedDurationDays / 7} Week${calculatedDurationDays / 7 > 1 ? "s" : ""}`
                            : `${calculatedDurationDays} Day${calculatedDurationDays > 1 ? "s" : ""}`)
                      : (content.totalDuration || content.duration || "");

                    return (
                      <div key={msgId} ref={isLast ? lastMessageRef : null} className="w-full">
                        <div className="bg-white border border-gray-200 rounded-xl shadow-xs p-5 sm:p-6">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs text-gray-500 font-medium">
                                Submitted - {formatSubmittedDateTz(msg.createdAt)}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                isAccepted ? "border-green-400 text-green-600 bg-green-50" :
                                isDeclined ? "border-red-400 text-red-600 bg-red-50" :
                                isModRequested ? "border-orange-400 text-orange-600 bg-orange-50" :
                                "border-blue-400 text-blue-600 bg-blue-50/60"
                              }`}>
                                {isAccepted ? "Accepted" : isDeclined ? "Declined" : isModRequested ? "Modification Requested" : "Add-On Offer"}
                              </span>
                            </div>
                          </div>

                          <div className="border-t border-gray-100 mb-4" />

                          <div className="pb-3 flex flex-col sm:flex-row justify-between items-start gap-1">
                            <h3 className="text-lg font-bold text-gray-900">Add-on proposal</h3>
                            <span className="text-xs text-gray-400 font-medium">From: {msg.username || "Project Manager"}</span>
                          </div>

                          {content.description && (
                            <div className="mb-4 text-xs text-gray-600 leading-relaxed font-medium">{content.description}</div>
                          )}

                          {/* Items table */}
                          {items.length > 0 && (
                            <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
                              <table className="w-full text-xs text-left">
                                <thead>
                                  <tr className="border-b border-gray-200 bg-gray-50/80">
                                    <th className="px-4 py-2.5 font-bold text-gray-700">Item</th>
                                    <th className="px-4 py-2.5 text-center font-bold text-gray-700">Duration</th>
                                    <th className="px-4 py-2.5 text-right font-bold text-gray-700">Amount</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {items.map((it: any, sIdx: number) => (
                                    <tr key={sIdx} className="hover:bg-gray-50/50">
                                      <td className="px-4 py-3 font-semibold text-gray-900">
                                        {it.description || it.title || it.name}
                                        {it.details && <div className="text-[10px] text-gray-400 font-normal">{it.details}</div>}
                                      </td>
                                      <td className="px-4 py-3 text-center text-gray-600 font-medium whitespace-nowrap">
                                        {it.duration ? (String(it.duration).toLowerCase().includes("day") ? it.duration : `${it.duration} Days`) : "-"}
                                      </td>
                                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                                        {formatCurr(Number(it.amount ?? it.cost ?? 0))}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Totals & Duration */}
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 pt-1 pb-2">
                            <div>
                              {totalOfferDuration ? (
                                <div className="flex items-center gap-1.5 text-xs">
                                  <span className="text-gray-700 font-bold">Total Duration:</span>
                                  <span className="font-extrabold text-gray-900">{totalOfferDuration}</span>
                                </div>
                              ) : null}
                            </div>
                            <div className="flex flex-col items-end gap-1 text-xs min-w-[180px]">
                              {pVatRate > 0 && pVatAmount > 0 && (
                                <div className="flex justify-between w-full gap-4 text-gray-600">
                                  <span>Base Amount:</span>
                                  <span className="font-bold">{formatCurr(pBase)}</span>
                                </div>
                              )}
                              {pVatRate > 0 && pVatAmount > 0 && (
                                <div className="flex justify-between w-full gap-4 text-gray-600">
                                  <span>VAT ({pVatRate}%):</span>
                                  <span className="font-bold">{formatCurr(pVatAmount)}</span>
                                </div>
                              )}
                              <div className="flex justify-between w-full gap-4 pt-1 border-t border-gray-100 font-bold text-gray-900">
                                <span>Total Cost:</span>
                                <span className="font-black text-sm">{formatCurr(pTotal)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          {canAct && !actionModal.isOpen && (
                            <div className="border-t border-gray-100 mt-4 pt-4 flex flex-wrap items-center justify-between gap-2.5">
                              <button
                                type="button"
                                onClick={() => targetProposalId && handleAcceptProposal(targetProposalId)}
                                disabled={isActionLoading}
                                className="px-5 py-2 bg-[#317336] hover:bg-[#285d2c] text-white text-xs font-bold rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                              >
                                Accept Offer
                              </button>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
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
                                  className="px-4 py-2 bg-[#3B4BEF] hover:bg-[#2F3EC4] text-white text-xs font-bold rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                                >
                                  Request Modifications
                                </button>
                                <button
                                  type="button"
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
                                  className="px-4 py-2 bg-[#7A1C1C] hover:bg-[#631616] text-white text-xs font-bold rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                                >
                                  Decline Offer
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Inline Action Modal for Proposal */}
                          {actionModal.isOpen && actionModal.proposalId === targetProposalId && (
                            <div className="w-full mt-4 bg-gray-50/80 border border-gray-200 rounded-xl p-4 animate-in fade-in duration-200">
                              <h4 className="font-bold text-gray-900 text-sm mb-1">{actionModal.title}</h4>
                              <p className="text-xs text-gray-500 mb-3">{actionModal.description}</p>
                              <textarea
                                value={actionComment}
                                onChange={(e) => setActionComment(e.target.value)}
                                placeholder={actionModal.placeholder}
                                className="w-full text-xs p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4343F0]/20 focus:border-[#4343F0] bg-white min-h-[80px]"
                              />
                              <div className="flex justify-end gap-2 mt-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionModal({ ...actionModal, isOpen: false });
                                    setActionComment("");
                                  }}
                                  className="px-3.5 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={handleActionSubmit}
                                  disabled={isActionLoading || (actionModal.required && !actionComment.trim())}
                                  className={`px-4 py-1.5 text-white text-xs font-bold rounded-lg disabled:opacity-50 ${
                                    actionModal.action === "decline" ? "bg-[#7A1C1C] hover:bg-[#631616]" : "bg-[#3B4BEF] hover:bg-[#2F3EC4]"
                                  }`}
                                >
                                  {isActionLoading ? "Submitting..." : "Submit"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // Regular user / team messages
                  const isUser = msg.senderRole === "client" || msg.sender === currentUser?.email;
                  return (
                    <div
                      key={msg._id || idx}
                      className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[11px] font-bold text-gray-700">{msg.username || msg.sender || "Team Member"}</span>
                        <span className="text-[10px] text-gray-400">
                          {msg.createdAt ? formatMessageTimestampTz(msg.createdAt) : ""}
                        </span>
                      </div>

                      <div
                        className={`p-3.5 rounded-2xl max-w-md text-xs leading-relaxed ${
                          isUser
                            ? "bg-[#4343F0] text-white rounded-br-xs"
                            : "bg-gray-100 text-gray-900 rounded-bl-xs"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{capitalizeCurrencyInText(msg.message || msg.content?.text || "")}</p>

                        {/* Attachments */}
                        {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-white/20 space-y-1">
                            {msg.attachments.map((att: any, aIdx: number) => (
                              <a
                                key={aIdx}
                                href={getSafeUrl(att.url || att)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-[11px] underline hover:opacity-80"
                              >
                                📎 {att.name || `Attachment ${aIdx + 1}`}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Box */}
            <div className="border-t border-gray-100 pt-3">
              {attachments.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-2">
                  {attachments.map((file, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-[#4343F0] text-[11px] font-semibold rounded-md border border-blue-200"
                    >
                      📎 {file.name}
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="text-red-500 hover:text-red-700 ml-1 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-400 hover:text-[#4343F0] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                  title="Attach files"
                >
                  📎
                </button>
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message or question..."
                  className="flex-grow px-3.5 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4343F0]/20 focus:border-[#4343F0]"
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={isSending || (!messageText.trim() && attachments.length === 0)}
                  className="px-4 py-2 bg-[#4343F0] hover:bg-[#3232b7] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isSending ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Send"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Project Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Project Management Team Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider text-xs">
              Project Management Team
            </h3>

            {managers.length > 0 ? (
              <div className="space-y-4">
                {managers.map((pm: any, idx: number) => {
                  const name = pm.fullName || `${pm.firstName || ""} ${pm.lastName || ""}`.trim() || pm.email || "Dedicated Project Manager";
                  const role = pm.role || "Lead Project Manager";
                  const email = pm.email || "support@societywebsolutions.com";

                  return (
                    <div key={pm._id || idx} className="flex items-center gap-3 p-3 bg-gray-50/70 border border-gray-200/60 rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-[#4343F0] text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-gray-900 truncate">{name}</h4>
                        <p className="text-[11px] text-gray-500 font-medium truncate">{role}</p>
                        <p className="text-[10px] text-[#4343F0] font-semibold truncate mt-0.5">{email}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-gray-50/70 border border-gray-200/60 rounded-xl text-center">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-[#4343F0] mx-auto flex items-center justify-center font-bold text-sm mb-2">
                  🛡️
                </div>
                <h4 className="text-xs font-bold text-gray-900">Dedicated Support Team</h4>
                <p className="text-[11px] text-gray-500 mt-0.5">Society Web Solutions Engineering Team</p>
                <p className="text-[10px] text-[#4343F0] font-semibold mt-1">contact@societywebsolutions.com</p>
              </div>
            )}
          </div>

          {/* Project Details Info Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-3.5 text-xs">
            <h3 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wider text-xs">
              Project Information
            </h3>

            <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Project Type:</span>
              <span className="font-bold text-gray-900">Bundle Service</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Project ID:</span>
              <span className="font-bold text-[#4343F0]">#{cleanNumber}</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Timeline:</span>
              <span className="font-bold text-gray-900">{duration}</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Status:</span>
              <span className="font-bold capitalize text-gray-900">{activeProject.status || "In Progress"}</span>
            </div>

            {clientCountryStr && (
              <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Client Country:</span>
                <span className="font-bold text-gray-900">{clientCountryStr}</span>
              </div>
            )}
          </div>

          {/* Support Newsletter / Contact */}
          <SupportNewsletter />
        </div>
      </div>

      {showAuthModal && <AuthPromptModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}
