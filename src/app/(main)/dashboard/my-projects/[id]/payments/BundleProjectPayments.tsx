"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authService } from "@/lib/authService";
import { countryService } from "@/lib/countryService";
import { downloadBundlePDF, printBundlePDF } from "@/lib/generateBundlePDF";
import { downloadReceiptPDF } from "@/lib/generateReceiptPDF";
import { useTimezone } from "@/context/TimezoneContext";
import { useCurrency } from "@/context/CurrencyContext";
import {
  formatPriceWithCurrency,
  formatActiveCurrency,
  convertCurrencyAmount,
  sumPaymentsInNativeCurrency,
} from "@/lib/currencyUtils";
import PackageBundlePaymentForm from "@/components/dashboard/PackageBundlePaymentForm";
import { toast } from "sonner";

const isEstoniaClient = (c?: string) => {
  if (!c) return false;
  const s = c.trim().toLowerCase();
  return s === "ee" || s === "est" || s === "estonia";
};

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

export function BundleReceiptModal({
  isOpen,
  onClose,
  project,
  payment,
}: {
  isOpen: boolean;
  onClose: () => void;
  project: any;
  payment?: any;
}) {
  if (!isOpen || !project) return null;

  const rawNumber =
    project.projectNumber ||
    (project.quoteNumber && !String(project.quoteNumber).startsWith("INV-")
      ? project.quoteNumber
      : project._id
      ? `SOC-2026-${project._id.slice(-4).toUpperCase()}`
      : "SOC-2026-001");
  const cleanNumber = String(rawNumber).replace(/^Project\s*#?/i, "").replace(/^#/, "");
  const projectNumber = `#${cleanNumber}`;

  const totalPrice = Number(
    payment?.amount ??
    payment?.chargedAmount ??
    payment?.amountPaid ??
    project.amountPaid ??
    project.price ??
    project.totalCost ??
    0
  );

  const currency = (
    payment?.currency ||
    payment?.chargedCurrency ||
    payment?.metadata?.paymentCurrency ||
    payment?.metadata?.currency ||
    project.currency ||
    (project?.currencySymbol === "€" ? "EUR" : project?.currencySymbol === "$" ? "USD" : "USD")
  ).toUpperCase();

  const clientCountryStr = project?.clientCountry || project?.country || payment?.clientCountry || "";
  const dbVatRate = countryService.getVatRateSync(clientCountryStr);
  const explicitVatRate = Number(
    payment?.vatRate ??
    project.vatRate ??
    project.vatPercentage ??
    (project.taxPercentage != null ? project.taxPercentage : 0)
  );
  const vatRate = isEstoniaClient(clientCountryStr)
    ? 24
    : dbVatRate > 0
    ? dbVatRate
    : explicitVatRate > 0
    ? explicitVatRate
    : Number(project.vatRate || 0);

  const vatAmount = Number(
    payment?.vatAmount !== undefined && !isNaN(Number(payment.vatAmount))
      ? Number(payment.vatAmount)
      : (vatRate > 0 ? Math.round(((totalPrice * vatRate) / (100 + vatRate)) * 100) / 100 : 0)
  );

  const subtotal = Number(
    payment?.subtotal !== undefined && !isNaN(Number(payment.subtotal))
      ? Number(payment.subtotal)
      : (vatRate > 0 ? Math.round((totalPrice - vatAmount) * 100) / 100 : totalPrice)
  );

  const formatCurrency = (amt: number) => formatActiveCurrency(amt, currency);

  const { formatDateTime: formatDateTimeTz } = useTimezone();
  const dateFormatted = payment?.createdAt || project.createdAt
    ? formatDateTimeTz(payment?.createdAt || project.createdAt, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Sep 7, 2026";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-800">Official Receipt</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              title="Print Receipt"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-6 sm:p-10 bg-white" id="receipt-print-area">
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="text-2xl font-extrabold text-[#4343F0] mb-1 tracking-tight">SOCIETY</div>
              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">
                Web Solutions & Digital Marketing
              </p>
            </div>
            <div className="text-right">
              <h3 className="text-xl font-bold text-gray-800 mb-0.5">PAYMENT RECEIPT</h3>
              <p className="text-xs text-gray-500 font-semibold">Project No: {projectNumber}</p>
              <p className="text-xs text-gray-500 font-semibold">Date: {dateFormatted}</p>
            </div>
          </div>

          <div className="border-t border-b border-gray-100 py-4 mb-6">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
              Bundle Service / Project
            </span>
            <h4 className="text-base font-bold text-gray-900">{project.title || "Local Business Growth Bundle"}</h4>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden mb-6 shadow-2xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 font-bold text-gray-700">Item</th>
                  <th className="px-5 py-3 text-center font-bold text-gray-700">Duration</th>
                  <th className="px-5 py-3 text-right font-bold text-gray-700">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-5 py-3.5 text-gray-800 font-semibold">
                    {project.title || "Bundle Setup & Implementation"}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 text-center">
                    {formatDurationLabel(project.totalDuration || project.duration || "2 weeks")}
                  </td>
                  <td className="px-5 py-3.5 text-right text-gray-900 font-bold">
                    {formatCurrency(subtotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pr-2">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-semibold">Subtotal:</span>
                <span className="text-gray-800 font-bold">{formatCurrency(subtotal)}</span>
              </div>
              {vatRate > 0 && vatAmount > 0 && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-semibold">VAT ({vatRate}%):</span>
                  <span className="text-gray-800 font-bold">{formatCurrency(vatAmount)}</span>
                </div>
              )}
              <div className="h-px bg-gray-200 w-full pt-0.5" />
              <div className="flex justify-between items-center pt-1">
                <span className="text-sm font-extrabold text-gray-900 uppercase">Total Paid:</span>
                <span className="text-lg font-black text-gray-900">{formatCurrency(totalPrice)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Print Receipt
          </button>
          <button
            type="button"
            onClick={onClose}
            className="bg-[#4343F0] hover:bg-[#3232b7] text-white text-xs font-bold py-2.5 px-8 rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface BundleProjectPaymentsProps {
  project: any;
  quote?: any;
  payments: any[];
  isLoadingPayments?: boolean;
  refreshPayments?: () => Promise<void>;
}

export default function BundleProjectPayments({
  project,
  quote,
  payments = [],
  isLoadingPayments = false,
  refreshPayments,
}: BundleProjectPaymentsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = authService.getUser();

  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);

  useEffect(() => {
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

  const { formatDateTime: formatDateTimeTz } = useTimezone();
  const { currency: contextCurrency, conversionRate } = useCurrency();

  const projectNativeCurrency = (
    activeProject.currency ||
    linkedQuote.currency ||
    payments[0]?.currency ||
    (activeProject?.currencySymbol === "€" ? "EUR" : activeProject?.currencySymbol === "$" ? "USD" : "USD")
  ).toLowerCase();

  // Active display currency: respects profile / context currency
  const activeDisplayCurrency = (
    contextCurrency ||
    currentUser?.currency ||
    currentUser?.preferredCurrency ||
    projectNativeCurrency ||
    "usd"
  ).toLowerCase();

  const formatCurr = (amt: number, customCurr?: string) => {
    const targetCurr = (customCurr || activeDisplayCurrency).toLowerCase();
    if (targetCurr === projectNativeCurrency) {
      return formatActiveCurrency(amt, targetCurr);
    }
    return formatPriceWithCurrency(amt, targetCurr, projectNativeCurrency, conversionRate);
  };

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

  // Deliverables & Pricing — mirrors CalculatorProjectPayments logic
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
    transactionNumber: entry.transactionNumber || (entry.transactionId ? entry.transactionId.slice(-8).toUpperCase() : `LEDGER-${index + 1}`),
    amount: entry.chargedAmount || entry.amount,
    currency: entry.chargedCurrency || entry.currency,
    description: entry.type === "deposit" ? "Initial Deposit Payment" : (entry.type === "final" ? "Final Payment" : "Bundle Project Payment"),
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

  if (isDepositHalf && combinedPayments.length <= 1 && rawAmountPaid > 0 && Math.abs(computedTotalCost - (rawAmountPaid * 2)) <= 15) {
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

  const recurringAmount = Number(activeProject.recurringAmount || activeProject.recurringPrice || linkedQuote.recurringPrice || 0);

  const isPaid = isActuallyPaidInFull || activeProject.isPaid || activeProject.paymentStatus === "paid" || activeProject.paymentStatus === "succeeded";


  const formatPaymentAmount = (payment: any) => {
    const pCurr = (
      payment?.currency ||
      payment?.chargedCurrency ||
      payment?.metadata?.paymentCurrency ||
      payment?.metadata?.currency ||
      projectNativeCurrency ||
      "USD"
    ).toUpperCase();
    const rawAmt = Number(payment?.amount ?? payment?.chargedAmount ?? payment?.amountPaid ?? 0);
    return formatActiveCurrency(rawAmt, pCurr);
  };

  const handleDownloadPdf = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
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

  const handleViewInvoice = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (isDownloadingInvoice) return;
    setIsDownloadingInvoice(true);
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
      console.error("Failed to download bundle invoice:", err);
      toast.error("Failed to download invoice.");
    } finally {
      setIsDownloadingInvoice(false);
    }
  };

  const handlePrint = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
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

  const handleDownloadReceipt = async (p: any) => {
    const pId = p._id || p.id;
    setDownloadingReceiptId(pId);
    try {
      await downloadReceiptPDF(activeProject, p);
    } catch (err) {
      console.error("Failed to download receipt:", err);
      toast.error("Failed to download receipt.");
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  const clientEmail =
    activeProject.clientEmail ||
    activeProject.client?.email ||
    currentUser?.email ||
    "client@example.com";

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Navigation Tabs */}
      <div className="flex items-center gap-4 border-b border-gray-200 pb-3">
        <Link
          href={`/dashboard/my-projects/${projectId}/details`}
          className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors pb-1"
        >
          Project Details
        </Link>
        <div className="text-sm font-bold text-[#4343F0] border-b-2 border-[#4343F0] pb-1">
          Payments & Invoices
        </div>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            {activeProject.title || "Local Business Growth Bundle - Starter"}
          </h1>

          {/* Project number and timeline in one row */}
          <div className="flex items-center gap-2 mt-2 text-xs sm:text-sm text-gray-600 font-medium">
            <span className="font-bold text-gray-900">Project No: #{cleanNumber}</span>
            <span className="text-gray-300">•</span>
            <span>Timeline: <strong className="text-gray-900">{duration}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="px-4 py-2 bg-[#4343F0] hover:bg-[#3232b7] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-75"
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
            onClick={handleViewInvoice}
            disabled={isDownloadingInvoice}
            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            View Invoice
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            Print Details
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Cost</div>
          <div className="text-xl sm:text-2xl font-black text-gray-900">{formatCurr(totalCost)}</div>
        <div className="text-[11px] text-gray-500 mt-1">Includes VAT ({vatRate}%)</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Amount Paid</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600">{formatCurr(amountPaid)}</div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">Confirmed payments</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Pending Balance</div>
          <div className={`text-xl sm:text-2xl font-black ${pendingBalance > 0 ? "text-amber-600" : "text-gray-400"}`}>
            {formatCurr(pendingBalance)}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            {pendingBalance > 0 ? "Due for settlement" : "No balance due"}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Payment Status</div>
          <div className="mt-1">
            <span
              className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                isPaid
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {isPaid ? "Paid in Full" : "Payment Pending"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Items Breakdown & Payment Checkout Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Deliverables Breakdown Table */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
            <h2 className="text-base font-bold text-gray-900 mb-4">Deliverables & Financial Breakdown</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50/80 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 font-bold text-gray-700">Item Description</th>
                    <th className="px-4 py-3 text-center font-bold text-gray-700">Duration</th>
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

            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-semibold">Base Amount:</span>
                  <span className="text-gray-800 font-bold">{formatCurr(totalSubtotal)}</span>
                </div>
                {vatRate > 0 && effectiveVatAmount > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-semibold">VAT ({vatRate}%):</span>
                    <span className="text-gray-800 font-bold">{formatCurr(effectiveVatAmount)}</span>
                  </div>
                )}
                <div className="h-px bg-gray-200 w-full" />
                <div className="flex justify-between items-center pt-1">
                  <span className="text-xs font-bold text-gray-900 uppercase">TOTAL PAYABLE:</span>
                  <span className="text-base font-black text-gray-900">{formatCurr(totalCost)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Section if pending balance */}
          {pendingBalance > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
              <h2 className="text-base font-bold text-gray-900 mb-4">Complete Payment</h2>
              <PackageBundlePaymentForm
                type="bundle"
                entityId={projectId}
                entityNumber={cleanNumber}
                title={activeProject.title || "Local Business Growth Bundle - Starter"}
                description={activeProject.description || "Bundle Setup & Implementation"}
                date={activeProject.createdAt || new Date().toISOString()}
                totalCost={totalSubtotal}
                deliverableItems={deliverableItems}
                clientEmail={clientEmail}
                successRedirectUrl={`/dashboard/my-projects/${projectId}/payments?success=true`}
                amountPaid={amountPaid}
                vatRate={vatRate}
                hideHeader={true}
                nativeCurrency={projectNativeCurrency.toUpperCase()}
                metadata={{
                  projectId: projectId,
                }}
                onPaymentSuccess={async () => {
                  if (refreshPayments) await refreshPayments();
                }}
              />
            </div>
          )}

          {/* Payment History / Ledger Table */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
            <h2 className="text-base font-bold text-gray-900 mb-4">Payment History & Receipts</h2>

            {combinedPayments.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs">
                No payment transactions recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50/80 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 font-bold text-gray-700">Date</th>
                      <th className="px-4 py-3 font-bold text-gray-700">Transaction ID</th>
                      <th className="px-4 py-3 font-bold text-gray-700">Description</th>
                      <th className="px-4 py-3 font-bold text-gray-700">Method</th>
                      <th className="px-4 py-3 font-bold text-gray-700">Amount</th>
                      <th className="px-4 py-3 font-bold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-right font-bold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {combinedPayments.map((p, idx) => {
                      const pId = p._id || p.id || p.transactionId || `tx_${idx}`;
                      const pDate = p.createdAt ? formatDateTimeTz(p.createdAt, { month: "short", day: "numeric", year: "numeric" }) : "-";
                      const pRef = p.transactionNumber || p.paymentIntentId?.slice(-8).toUpperCase() || (String(pId).startsWith("ledger-") ? pId.toUpperCase() : String(pId).slice(-10).toUpperCase());

                      return (
                        <tr key={pId} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3.5 text-gray-600 font-medium">{pDate}</td>
                          <td className="px-4 py-3.5 text-gray-800 font-mono text-[11px]">{pRef}</td>
                          <td className="px-4 py-3.5 text-gray-600">{p.description || "Bundle Project Payment"}</td>
                          <td className="px-4 py-3.5 text-gray-600 capitalize">{p.paymentMethod || "Card"}</td>
                          <td className="px-4 py-3.5 font-bold text-gray-900">{formatPaymentAmount(p)}</td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              ["succeeded", "paid", "completed"].includes(String(p.status || "").toLowerCase())
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}>
                              {p.status || "Succeeded"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPayment(p);
                                setShowReceipt(true);
                              }}
                              className="text-[#4343F0] hover:underline font-bold text-xs"
                            >
                              View Receipt
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadReceipt(p)}
                              disabled={downloadingReceiptId === pId}
                              className="text-gray-600 hover:text-gray-900 font-semibold text-xs"
                            >
                              {downloadingReceiptId === pId ? "..." : "PDF"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Billing Information */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-3.5 text-xs">
            <h3 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wider text-xs">
              Billing Information
            </h3>

            <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Client Email:</span>
              <span className="font-bold text-gray-900 truncate max-w-[180px]">{clientEmail}</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Currency:</span>
              <span className="font-bold text-gray-900">{activeDisplayCurrency.toUpperCase()}</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Estonia VAT (24%):</span>
              <span className="font-bold text-gray-900">{vatRate > 0 ? "Applied" : "0% (Non-EE)"}</span>
            </div>

            {recurringAmount > 0 && (
              <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Recurring Maintenance:</span>
                <span className="font-bold text-purple-700">{formatCurr(recurringAmount)} / mo</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {showReceipt && (
        <BundleReceiptModal
          isOpen={showReceipt}
          onClose={() => setShowReceipt(false)}
          project={activeProject}
          payment={selectedPayment}
        />
      )}
    </div>
  );
}
