"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authService } from "@/lib/authService";
import { countryService } from "@/lib/countryService";
import { downloadProjectDetailsPDF, printProjectDetails } from "@/lib/generateProjectDetailsPDF";
import { downloadCalculatorProjectPDF, printCalculatorProjectPDF } from "@/lib/generateCalculatorProjectPDF";
import { downloadReceiptPDF } from "@/lib/generateReceiptPDF";
import { getMainCalculatorCategory } from "@/lib/calculatorUtils";
import { useTimezone } from "@/context/TimezoneContext";
import UnifiedPaymentForm from "@/components/dashboard/UnifiedPaymentForm";

const isEstoniaClient = (c?: string) => {
  if (!c) return false;
  const s = c.trim().toLowerCase();
  return s === "ee" || s === "est" || s === "estonia";
};

export function ReceiptModal({
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

  const projectNumber =
    project.projectNumber ||
    (project.quoteNumber && !String(project.quoteNumber).startsWith("INV-")
      ? project.quoteNumber
      : project._id
      ? `SOC-2026-${project._id.slice(-4).toUpperCase()}`
      : "SOC-2026-001");
  const totalPrice = Number(payment?.amount ?? project.amountPaid ?? project.price ?? project.totalCost ?? 0);
  const currency = (payment?.currency || project.currency || (project?.currencySymbol === "€" ? "EUR" : project?.currencySymbol === "$" ? "USD" : "USD")).toUpperCase();

  const clientCountryStr = project?.clientCountry || project?.country || payment?.clientCountry || "";
  const dbVatRate = countryService.getVatRateSync(clientCountryStr);
  const explicitVatRate = Number(
    payment?.vatRate ??
    project.vatRate ??
    project.vatPercentage ??
    (project.taxPercentage != null ? project.taxPercentage : 0)
  );
  const vatRate = isEstoniaClient(clientCountryStr) ? 24 : (dbVatRate > 0 ? dbVatRate : (explicitVatRate > 0 ? explicitVatRate : 0));
  const vatAmount = Number(
    payment?.vatAmount ??
    project.vatAmount ??
    (vatRate > 0 ? Math.round(((totalPrice * vatRate) / (100 + vatRate)) * 100) / 100 : 0)
  );
  const subtotal = Number(
    payment?.subtotal ??
    project.subtotal ??
    (vatRate > 0 ? Math.round((totalPrice - vatAmount) * 100) / 100 : totalPrice)
  );

  const formatCurrency = (amt: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amt);

  const { formatDateTime: formatDateTimeTz } = useTimezone();

  const dateFormatted = payment?.createdAt || project.createdAt
    ? formatDateTimeTz(payment?.createdAt || project.createdAt, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "5 Sept 2026";

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
              Service / Project
            </span>
            <h4 className="text-base font-bold text-gray-900">{project.title || "Web Development Project"}</h4>
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
                    {project.title || "Project Development"}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 text-center">
                    {project.timelineInDays ? `${project.timelineInDays} Days` : "30 Days"}
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

interface CalculatorProjectPaymentsProps {
  project: any;
  quote?: any;
  payments: any[];
  isLoadingPayments?: boolean;
  refreshPayments?: () => Promise<void>;
  allAddonItems?: any[];
}

export default function CalculatorProjectPayments({
  project,
  quote,
  payments = [],
  isLoadingPayments = false,
  allAddonItems = [],
}: CalculatorProjectPaymentsProps) {
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
  const linkedQuote = quote || (typeof activeProject.quoteId === "object" ? activeProject.quoteId : activeProject.quote) || {};
  const specs = activeProject.calculatorSpecs || linkedQuote?.requirements || activeProject.requirements || {};

  const projectId = String(activeProject._id || activeProject.id || "");
  const rawNumber =
    activeProject.projectNumber ||
    (linkedQuote?.quoteNumber && !String(linkedQuote.quoteNumber).startsWith("INV-") ? linkedQuote.quoteNumber : "") ||
    (activeProject.quoteNumber && !String(activeProject.quoteNumber).startsWith("INV-") ? activeProject.quoteNumber : "") ||
    (activeProject._id ? `SOC-2026-${activeProject._id.slice(-4).toUpperCase()}` : "SOC-2026-001");
  const cleanNumber = String(rawNumber).replace(/^Project\s*#?/i, "").replace(/^#/, "");
  const formattedProjectNumber = `Project #${cleanNumber}`;

  const { formatDateTime: formatDateTimeTz } = useTimezone();

  const paymentDateFormatted = payments[0]?.createdAt
    ? formatDateTimeTz(payments[0].createdAt, { month: "short", day: "numeric", year: "numeric" })
    : activeProject.startDate
    ? formatDateTimeTz(activeProject.startDate, { month: "short", day: "numeric", year: "numeric" })
    : activeProject.createdAt
    ? formatDateTimeTz(activeProject.createdAt, { month: "short", day: "numeric", year: "numeric" })
    : "Sep 7, 2026";

  const rawPaymentStatus = (activeProject.paymentStatus || payments[0]?.status || "pending").toLowerCase();

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
  const vatRate = isEstoniaClient(clientCountryStr) ? 24 : (dbVatRate > 0 ? dbVatRate : (explicitVatRate > 0 ? explicitVatRate : 0));

  // Prefer project.price (always in payment currency) over quote.totalCost (always USD)
  // to avoid cross-currency Math.max picking the larger USD value for EUR payers.
  const projectPrice = Number(activeProject.price || 0) || Number(activeProject.totalPrice || 0);
  const rawTotalCost = projectPrice > 0
    ? Math.max(
        projectPrice,
        (Number(activeProject.amountPaid || 0) + Number(activeProject.amountDue || 0))
      )
    : Math.max(
        Number(linkedQuote.totalCost || 0),
        Number(activeProject.totalCost || 0),
        Number(activeProject.amountPaid || 0) + Number(activeProject.amountDue || 0)
      );

  const regularItemsSum = (activeProject.deliverableItems && activeProject.deliverableItems.length > 0)
    ? activeProject.deliverableItems.reduce((sum: number, it: any) => sum + (Number(it.amount ?? it.cost) || 0), 0)
    : 0;

  const baseSubtotal = regularItemsSum > 0
    ? regularItemsSum
    : Number(
        activeProject.subtotal ??
        linkedQuote.subtotal ??
        specs.subtotal ??
        specs.calculatedPrice ??
        linkedQuote.requirements?.subtotal ??
        linkedQuote.requirements?.calculatedPrice ??
        (vatRate > 0 && rawTotalCost > 0
          ? Math.round((rawTotalCost / (1 + vatRate / 100)) * 100) / 100
          : rawTotalCost)
      );

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

  // 2. Deduplicate addon items from activeProject.addons
  const seenAddonKeys = new Set<string>();
  const uniqueProjectAddons = (activeProject.addons || []).filter((addon: any) => {
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
      duration: item.duration ? `${item.duration} ${item.unit || (String(item.duration).toLowerCase().includes("day") ? "" : "Days")}`.trim() : "1 Days",
      amount: Number(item.amount ?? 0),
      isAddOn: true,
    }))
  );

  // 3. Addon items from activeProject.messages (fallback if activeProject.addons is empty)
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
        duration: item.duration ? `${item.duration} ${item.unit || (String(item.duration).toLowerCase().includes("day") ? "" : "Days")}`.trim() : "1 Days",
        amount: Number(item.amount ?? 0),
        isAddOn: true,
      }));
    });

  const rawAddonItems = (allAddonItems && allAddonItems.length > 0)
    ? allAddonItems
    : (addonItemsFromAddons.length > 0 ? addonItemsFromAddons : addonItemsFromMessages);

  const seenItemKeys = new Set<string>();
  const resolvedAddonItems = rawAddonItems.filter((item: any) => {
    const key = `${String(item.description || "").trim().toLowerCase()}-${Number(item.amount || 0)}-${String(item.duration || "").trim().toLowerCase()}`;
    if (seenItemKeys.has(key)) return false;
    seenItemKeys.add(key);
    return true;
  });

  const deliverableItems = resolvedAddonItems.length > 0
    ? [...primaryItems, ...resolvedAddonItems]
    : primaryItems;

  const addonsTotal = resolvedAddonItems.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
  const totalSubtotal = baseSubtotal + addonsTotal;
  const effectiveVatAmount = vatRate > 0 && totalSubtotal > 0
    ? Math.round((totalSubtotal * (vatRate / 100)) * 100) / 100
    : Number(activeProject.vatAmount ?? linkedQuote.vatAmount ?? 0);
  const totalProjectCost = totalSubtotal + effectiveVatAmount;

  const totalPaidFromTransactions = (payments || [])
    .filter((p: any) => ["succeeded", "paid", "completed"].includes(p.status?.toLowerCase()))
    .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

  const amountPaid = Math.max(Number(activeProject.amountPaid || 0), totalPaidFromTransactions);
  const calculatedPending = Math.max(0, totalProjectCost - amountPaid);

  const isActuallyPaidInFull = totalProjectCost > 0 && amountPaid >= totalProjectCost - 0.009;

  const pendingBalance = isActuallyPaidInFull
    ? 0
    : amountPaid === 0
    ? totalProjectCost
    : calculatedPending;

  const isPartiallyPaid = !isActuallyPaidInFull && amountPaid > 0.009 && pendingBalance > 0.009;

  const isFullyPaid = isActuallyPaidInFull || (pendingBalance <= 0.009 && amountPaid > 0);

  const resolvedPaymentStatus = isFullyPaid
    ? "paid"
    : isPartiallyPaid
    ? "partially_paid"
    : (activeProject.paymentStatus || "pending").toLowerCase();

  const paymentStatus = resolvedPaymentStatus;

  const successfulPayments = (payments || []).filter((p: any) =>
    ["succeeded", "paid", "completed"].includes(p.status?.toLowerCase())
  );

  const explicitAmountDue =
    activeProject.amountDue !== undefined && activeProject.amountDue !== null
      ? Number(activeProject.amountDue)
      : null;

  const hasInvoiceOrAmountQuery = Boolean(searchParams?.get("amount")) || Boolean(searchParams?.get("invoiceId"));

  // Check if payment was done in parts or has a pending balance:
  // ONLY render the Unified Payment form if the project is NOT fully paid (or has an explicit invoice/amount query)
  const isPartPayment =
    !isFullyPaid &&
    (
      pendingBalance > 0.009 ||
      isPartiallyPaid ||
      (explicitAmountDue !== null && explicitAmountDue > 0.009) ||
      (amountPaid < totalProjectCost - 0.009) ||
      activeProject.paymentStatus === "partially_paid" ||
      activeProject.paymentStatus === "partial" ||
      activeProject.paymentStatus === "pending" ||
      activeProject.paymentStatus === "unpaid" ||
      linkedQuote.paymentStatus === "partially_paid" ||
      linkedQuote.paymentStatus === "partial" ||
      activeProject.billingType === "milestone" ||
      activeProject.billingType === "installment" ||
      linkedQuote.billingType === "milestone" ||
      linkedQuote.billingType === "installment" ||
      activeProject.paymentOption === "half" ||
      activeProject.paymentOption === "deposit" ||
      activeProject.paymentOption === "part" ||
      linkedQuote.paymentOption === "half" ||
      Number(activeProject.depositAmount) > 0 ||
      Number(linkedQuote.depositAmount) > 0 ||
      Number(activeProject.depositPercentage) > 0 ||
      Number(linkedQuote.depositPercentage) > 0
    ) ||
    hasInvoiceOrAmountQuery;

  const depositAmount = amountPaid > 0
    ? 0
    : Number(
        activeProject.depositAmount ||
        linkedQuote.depositAmount ||
        (totalSubtotal > 0 ? totalSubtotal / 2 : (totalProjectCost > 0 ? totalProjectCost / 2 : 0))
      );

  const currency = (
    activeProject.currency ||
    linkedQuote.currency ||
    payments[0]?.currency ||
    (activeProject?.currencySymbol === "€" ? "EUR" : activeProject?.currencySymbol === "$" ? "USD" : "USD")
  ).toUpperCase();

  const formatCurrency = (amt: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amt);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "succeeded":
      case "paid":
      case "completed":
        return "bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]";
      case "partially_paid":
      case "partial":
      case "partially paid":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "pending":
      case "processing":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "failed":
      case "canceled":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const projectPayloadForPdf = {
    ...activeProject,
    calculatorSpecs: specs,
    quote: linkedQuote,
  };

  const handleDownloadProject = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isDownloadingPdf || isDownloadingInvoice) return;
    setIsDownloadingPdf(true);
    try {
      await downloadCalculatorProjectPDF(projectPayloadForPdf);
    } catch (err) {
      console.error("Failed to download project PDF:", err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleViewInvoice = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (isDownloadingInvoice || isDownloadingPdf) return;
    setIsDownloadingInvoice(true);
    try {
      await downloadCalculatorProjectPDF(projectPayloadForPdf);
    } catch (err) {
      console.error("Failed to download project PDF for invoice view:", err);
    } finally {
      setIsDownloadingInvoice(false);
    }
  };

  const handlePrintDetails = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    printCalculatorProjectPDF(projectPayloadForPdf);
  };

  const handleDownloadReceipt = async (payment: any) => {
    const pId = payment._id || payment.id;
    setDownloadingReceiptId(pId);
    try {
      await downloadReceiptPDF(activeProject, payment);
    } catch (err) {
      console.error("Failed to download receipt PDF:", err);
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  // -------------------------------------------------------------------------
  // CASE 1: Payment Done In Parts -> Display the Part-Payment UI with UnifiedPaymentForm
  // -------------------------------------------------------------------------
  if (isPartPayment) {
    const searchInvoiceId = searchParams?.get("invoiceId") || undefined;
    const searchInvoiceNumber = searchParams?.get("invoiceNumber") || undefined;
    const searchMessageId = searchParams?.get("messageId") || undefined;
    const searchDescription = searchParams?.get("description") || undefined;
    const targetCost = amountPaid === 0
      ? totalSubtotal
      : (vatRate > 0 ? Math.round((pendingBalance / (1 + vatRate / 100)) * 100) / 100 : pendingBalance);

    return (
      <div className="w-full font-sans space-y-8">
        <ReceiptModal
          isOpen={showReceipt}
          onClose={() => setShowReceipt(false)}
          project={activeProject}
          payment={selectedPayment}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column: Unified Payment Form (col-span-2) */}
          <div className="lg:col-span-2">
            <UnifiedPaymentForm
              type="project"
              entityId={projectId}
              entityNumber={cleanNumber}
              title={activeProject.title || itemTitle}
              description={
                searchDescription
                  ? `Payment for ${searchDescription}`
                  : (resolvedAddonItems.length > 0
                    ? "Payment for accepted add-on project deliverables"
                    : (activeProject.description && !activeProject.description.includes("Selected Options:") && activeProject.description.length < 250
                      ? activeProject.description
                      : "Payment for accepted project deliverables"))
              }
              date={activeProject.createdAt}
              startDate={activeProject.startDate}
              deadline={activeProject.deadline}
              totalCost={targetCost}
              depositAmount={depositAmount}
              deliverableItems={deliverableItems}
              clientEmail={currentUser?.email || activeProject.clientEmail || ""}
              successRedirectUrl={`/dashboard/my-projects/${projectId}/payments?success=true`}
              amountPaid={amountPaid}
              isFullyPaid={isFullyPaid}
              nativeCurrency={currency}
              vatRate={vatRate}
              invoiceId={searchInvoiceId}
              onDownloadInvoice={handleViewInvoice}
              isDownloadingInvoice={isDownloadingInvoice}
              metadata={{
                invoiceId: searchInvoiceId,
                invoiceNumber: searchInvoiceNumber,
                messageId: searchMessageId,
                description: searchDescription,
              }}
            />
          </div>

          {/* Right Column: Need To Contact Customer Support? (col-span-1) */}
          <div className="lg:col-span-1 bg-white border border-gray-200 rounded-2xl p-8 sm:p-10 shadow-xs flex flex-col items-center justify-center text-center self-start">
            <h4 className="font-bold text-gray-900 text-lg sm:text-xl mb-1.5">
              Need To Contact Customer Support?
            </h4>
            <p className="text-xs sm:text-sm text-gray-500 mb-6 font-normal leading-relaxed">
              Contact us for further assistance.
            </p>
            <button
              type="button"
              onClick={() => router.push("/help-support")}
              className="w-full sm:w-auto bg-[#4343F0] hover:bg-[#3232b7] text-white text-xs sm:text-sm font-semibold py-3 px-8 rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer text-center"
            >
              Visit Help & Support
            </button>
          </div>
        </div>

        {/* Transaction Records Breakdown */}
        {!isLoadingPayments && payments.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-base font-bold text-gray-800">All Transaction Records</h3>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isDownloadingPdf}
                  onClick={handleDownloadProject}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4343F0] hover:bg-[#3232b7] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {isDownloadingPdf ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Downloading...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>Download Project (.PDF)</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handlePrintDetails}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4343F0] hover:bg-[#3232b7] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Details
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 font-bold text-gray-500 uppercase">Reference</th>
                    <th className="px-6 py-3 font-bold text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-3 font-bold text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 font-bold text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 font-bold text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right font-bold text-gray-500 uppercase">Download Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((payment) => (
                    <tr key={payment._id || payment.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-700">
                        #{payment.transactionNumber || payment.paymentIntentId?.slice(-8).toUpperCase() || (payment._id || payment.id)?.slice(-8).toUpperCase()}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {payment.description || "Project Payment"}
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">
                        {formatCurrency(payment.amount ?? 0)}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {payment.createdAt ? formatDateTimeTz(payment.createdAt, { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDownloadReceipt(payment)}
                          disabled={downloadingReceiptId === (payment._id || payment.id)}
                          className="inline-flex items-center gap-1.5 text-[#4343F0] hover:text-[#2025AB] font-semibold hover:underline cursor-pointer disabled:opacity-50"
                          title="Download PDF Receipt"
                        >
                          {downloadingReceiptId === (payment._id || payment.id) ? (
                            <>
                              <div className="w-3 h-3 border-2 border-[#4343F0] border-t-transparent rounded-full animate-spin" />
                              <span>Downloading...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              <span>Receipt</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // CASE 2: Single Full Payment (Fully Paid at once) -> Display Calculator Payment Summary Card
  // -------------------------------------------------------------------------
  const totalPaidAmount = Number(
    activeProject.amountPaid ??
    (totalPaidFromTransactions > 0 ? totalPaidFromTransactions : undefined) ??
    totalProjectCost ??
    activeProject.totalCost ??
    activeProject.price ??
    0
  );

  return (
    <div className="w-full font-sans space-y-8">
      <ReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        project={activeProject}
        payment={selectedPayment}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Calculator Payment Card (col-span-2) */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap mb-3">
                  <h3 className="text-lg font-bold text-[#0d1939]">
                    {(activeProject.title || "Website Price Calculator")
                      .replace(/<br\s*\/?>/gi, " ")
                      .replace(/\s+/g, " ")
                      .trim()}
                  </h3>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${getStatusColor(paymentStatus)}`}>
                    {paymentStatus.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] sm:text-xs text-gray-500">
                  <span className="whitespace-nowrap">
                    Project No: <span className="text-gray-700 font-medium">#{cleanNumber}</span>
                  </span>
                  <span className="hidden sm:inline text-gray-300">|</span>
                  <button
                    type="button"
                    disabled={isDownloadingInvoice || isDownloadingPdf}
                    onClick={handleViewInvoice}
                    className="text-xs sm:text-sm font-semibold text-[#4343F0] hover:text-[#3232b7] underline decoration-[#4343F0]/40 hover:decoration-[#4343F0] underline-offset-2 whitespace-nowrap cursor-pointer transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {isDownloadingInvoice ? (
                      <>
                        <div className="w-3 h-3 border-2 border-[#4343F0] border-t-transparent rounded-full animate-spin" />
                        <span>Downloading Invoice...</span>
                      </>
                    ) : (
                      "View invoice"
                    )}
                  </button>
                </div>
              </div>

              {/* Right Side: Total Cost / Paid to Date / Pending Balance */}
              <div className="w-full sm:w-60 shrink-0 space-y-1.5 text-xs sm:text-sm self-start">
                <div className="flex justify-between items-center font-semibold">
                  <span className="text-gray-900">Total Cost</span>
                  <span className="text-gray-900 font-bold">
                    {formatCurrency(totalProjectCost)}
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

            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/60">
                    <th className="text-left py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="text-center py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="text-right py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-4 px-6 text-sm">
                      <div className="font-semibold text-[#0d1939]">{itemTitle}</div>
                      <div className="text-xs text-gray-400 mt-0.5">Based on calculator selections</div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500 text-center whitespace-nowrap">
                      {itemDuration}
                    </td>
                    <td className="py-4 px-6 text-sm font-bold text-gray-800 text-right whitespace-nowrap">
                      {formatCurrency(baseSubtotal)}
                    </td>
                  </tr>
                  {resolvedAddonItems.map((addon: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-4 px-6 text-sm">
                        <div className="font-semibold text-[#0d1939]">{addon.description}</div>
                        {addon.details && <div className="text-xs text-gray-400 mt-0.5">{addon.details}</div>}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-500 text-center whitespace-nowrap">
                        {addon.duration}
                      </td>
                      <td className="py-4 px-6 text-sm font-bold text-gray-800 text-right whitespace-nowrap">
                        {formatCurrency(addon.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  {vatRate > 0 && effectiveVatAmount > 0 ? (
                    <>
                      <tr className="border-t border-gray-200 bg-gray-50/20">
                        <td className="py-2.5 px-6 text-right text-xs font-semibold text-gray-500" colSpan={2}>
                          Subtotal:
                        </td>
                        <td className="py-2.5 px-6 text-right text-xs font-bold text-gray-800">
                          {formatCurrency(totalSubtotal)}
                        </td>
                      </tr>
                      {vatRate > 0 && effectiveVatAmount > 0 && (
                        <tr className="bg-gray-50/20">
                          <td className="py-2.5 px-6 text-right text-xs font-semibold text-gray-500" colSpan={2}>
                            VAT ({vatRate}%):
                          </td>
                          <td className="py-2.5 px-6 text-right text-xs font-bold text-gray-800">
                            {formatCurrency(effectiveVatAmount)}
                          </td>
                        </tr>
                      )}
                      <tr className="border-t border-gray-200 bg-gray-50/40">
                        <td className="py-3 px-6 text-right text-xs font-bold text-gray-500 uppercase tracking-wider" colSpan={2}>
                          Total Paid
                        </td>
                        <td className="py-3 px-6 text-right">
                          <div className="text-sm font-black text-gray-900">
                            {formatCurrency(totalPaidAmount)}
                          </div>
                        </td>
                      </tr>
                    </>
                  ) : (
                    <tr className="border-t border-gray-200 bg-gray-50/30">
                      <td className="py-3 px-6" colSpan={2}></td>
                      <td className="py-3 px-6 text-right">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Total Paid
                        </div>
                        <div className="text-sm font-bold text-gray-800 mt-0.5">
                          {formatCurrency(totalPaidAmount)}
                        </div>
                      </td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>

            <div className="px-6 py-4 flex flex-wrap justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                disabled={isDownloadingPdf || isDownloadingInvoice}
                onClick={handleDownloadProject}
                className="flex items-center gap-2 px-5 py-2 bg-[#3535b8] hover:bg-[#2a2a9a] text-white text-sm font-bold rounded transition-all shadow-sm disabled:opacity-60 cursor-pointer"
              >
                {isDownloadingPdf ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" x2="12" y1="15" y2="3"></line>
                    </svg>
                    Download Project (.PDF)
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handlePrintDetails}
                className="flex items-center gap-2 px-5 py-2 bg-[#3535b8] hover:bg-[#2a2a9a] text-white text-sm font-bold rounded transition-all shadow-sm cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"></polyline>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                  <rect width="12" height="8" x="6" y="14"></rect>
                </svg>
                Print Details
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Need To Contact Customer Support? (col-span-1) */}
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-2xl p-8 sm:p-10 shadow-xs flex flex-col items-center justify-center text-center self-start">
          <h4 className="font-bold text-gray-900 text-lg sm:text-xl mb-1.5">
            Need To Contact Customer Support?
          </h4>
          <p className="text-xs sm:text-sm text-gray-500 mb-6 font-normal leading-relaxed">
            Contact us for further assistance.
          </p>
          <button
            type="button"
            onClick={() => router.push("/help-support")}
            className="w-full sm:w-auto bg-[#4343F0] hover:bg-[#3232b7] text-white text-xs sm:text-sm font-semibold py-3 px-8 rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer text-center"
          >
            Visit Help & Support
          </button>
        </div>
      </div>

      {/* Transaction Records Breakdown (if available) */}
      {!isLoadingPayments && payments.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-base font-bold text-gray-800">All Transaction Records</h3>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isDownloadingPdf || isDownloadingInvoice}
                onClick={handleDownloadProject}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4343F0] hover:bg-[#3232b7] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isDownloadingPdf ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download Project (.PDF)</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handlePrintDetails}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4343F0] hover:bg-[#3232b7] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Details
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-bold text-gray-500 uppercase">Reference</th>
                  <th className="px-6 py-3 font-bold text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 font-bold text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 font-bold text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 font-bold text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right font-bold text-gray-500 uppercase">Download Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((payment) => (
                  <tr key={payment._id || payment.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-700">
                      #{payment.transactionNumber || payment.paymentIntentId?.slice(-8).toUpperCase() || (payment._id || payment.id)?.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {payment.description || "Project Payment"}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">
                      {formatCurrency(payment.amount ?? 0)}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {payment.createdAt ? formatDateTimeTz(payment.createdAt, { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDownloadReceipt(payment)}
                        disabled={downloadingReceiptId === (payment._id || payment.id)}
                        className="inline-flex items-center gap-1.5 text-[#4343F0] hover:text-[#2025AB] font-semibold hover:underline cursor-pointer disabled:opacity-50"
                        title="Download PDF Receipt"
                      >
                        {downloadingReceiptId === (payment._id || payment.id) ? (
                          <>
                            <div className="w-3 h-3 border-2 border-[#4343F0] border-t-transparent rounded-full animate-spin" />
                            <span>Downloading...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span>Receipt</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
