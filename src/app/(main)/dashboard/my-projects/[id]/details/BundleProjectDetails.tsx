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
            const res = await mediaService.uploadMedia(f);
            return {
              name: f.name,
              url: res.url || res.data?.url || res,
              type: f.type.startsWith("image/") ? "image" : "document",
              size: f.size,
            };
          })
        );
      }

      const res = await projectService.addMessage(projectId, {
        message: messageText.trim(),
        attachments: uploadedUrls,
        sender: auth.fullName || `${auth.firstName || ""} ${auth.lastName || ""}`.trim() || auth.email || "Client",
        senderRole: "client",
      });

      if (res?.data) {
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

  const handleAutoRenewalToggle = async () => {
    const auth = requireAuth();
    if (!auth) return;
    setIsTogglingRenewal(true);
    try {
      const nextState = !(activeProject.autoRenew ?? true);
      const res = await projectService.updateProject(projectId, {
        autoRenew: nextState,
      });
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
              className="flex-grow overflow-y-auto space-y-3.5 pr-2 mb-4 scrollbar-thin scrollbar-thumb-gray-200"
            >
              {(!activeProject.messages || activeProject.messages.length === 0) ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-[#4343F0] flex items-center justify-center mb-2">
                    💬
                  </div>
                  <p className="text-xs font-semibold text-gray-600">No messages yet</p>
                  <p className="text-[11px] text-gray-400 mt-1 max-w-xs">
                    Use the chat box below to discuss project requirements, timelines, or ask questions.
                  </p>
                </div>
              ) : (
                activeProject.messages.map((msg: any, idx: number) => {
                  const isUser = msg.senderRole === "client" || msg.sender === currentUser?.email;
                  const isPaidReq = isExactPaymentRequestPaid(msg, activeProject, payments);

                  return (
                    <div
                      key={msg._id || idx}
                      className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[11px] font-bold text-gray-700">{msg.sender || "Team Member"}</span>
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
                })
              )}
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

      {showAuthModal && <AuthPromptModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}
