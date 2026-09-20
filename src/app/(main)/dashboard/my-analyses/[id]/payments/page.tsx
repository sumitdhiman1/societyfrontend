"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAnalysis } from "@/context/AnalysisContext";
import { paymentService } from "@/lib/paymentService";
import { requestAnalysisService } from "@/lib/requestAnalysisService";
import { authService } from "@/lib/authService";
import { downloadFile } from "@/lib/utils";
import { downloadAnalysisPDF, printAnalysisDetails } from "@/lib/generateAnalysisPDF";
import { downloadReceiptPDF } from "@/lib/generateReceiptPDF";
import { useCurrency } from "@/context/CurrencyContext";
import { formatPriceWithCurrency, convertCurrencyAmount, formatActiveCurrency } from "@/lib/currencyUtils";
import { useTimezone } from "@/context/TimezoneContext";
import UnifiedPaymentForm from "@/components/dashboard/UnifiedPaymentForm";

function ReceiptModal({
  isOpen,
  onClose,
  analysis,
  payment,
  deliverableItems = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  analysis: any;
  payment?: any;
  deliverableItems?: any[];
}) {
  if (!isOpen || !analysis) return null;

  const projectNumber =
    analysis.projectNumber ||
    (analysis.quoteNumber || (analysis._id ? `INV-2026-${analysis._id.slice(-3).toUpperCase()}` : "INV-2026-150"));
  const isFree = (analysis.isFree !== false && (!analysis.price || Number(analysis.price) === 0)) && !payment && deliverableItems.length === 0;
  const totalPrice = isFree ? 0 : Number(payment?.amount ?? analysis.amountPaid ?? analysis.price ?? analysis.totalCost ?? 0);
  const formatCurrency = (amt: number, customSourceCurrency?: string) => {
    const src = (
      customSourceCurrency ||
      payment?.currency ||
      payment?.chargedCurrency ||
      payment?.metadata?.paymentCurrency ||
      payment?.metadata?.currency ||
      analysis.currency ||
      "USD"
    ).toUpperCase();
    return formatActiveCurrency(amt, src);
  };

  const vatRate = Number(payment?.vatRate ?? payment?.metadata?.vatRate ?? analysis?.vatRate ?? 0);
  const vatAmount = vatRate > 0
    ? Number(payment?.vatAmount ?? payment?.metadata?.vatAmount ?? (totalPrice - Math.round((totalPrice / (1 + vatRate / 100)) * 100) / 100))
    : 0;
  const subtotal = vatRate > 0
    ? Number(payment?.subtotal ?? payment?.metadata?.subtotal ?? (totalPrice - vatAmount))
    : totalPrice;

  const dateFormatted = (payment?.createdAt || analysis.createdAt)
    ? new Date(payment?.createdAt || analysis.createdAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "13 Sept 2026";

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
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto" id="receipt-print-area">
          <div className="flex justify-between items-start border-b border-gray-100 pb-5">
            <div>
              <p className="text-xs uppercase font-extrabold tracking-wider text-blue-600 mb-1">Receipt Number</p>
              <p className="text-base font-black text-gray-900">{projectNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase font-extrabold tracking-wider text-gray-400 mb-1">Payment Date</p>
              <p className="text-sm font-bold text-gray-700">{dateFormatted}</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3 text-center">Duration</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deliverableItems.length > 0 ? (
                  deliverableItems.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3.5 text-gray-800 font-semibold">
                        {item.description || item.title}
                        {item.isAddOn && (
                          <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
                            Add-on
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600 text-center">
                        {item.duration}
                      </td>
                      <td className="px-5 py-3.5 text-right text-gray-900 font-bold">
                        {formatCurrency(Number(item.amount || 0))}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-5 py-3.5 text-gray-800 font-semibold">
                      {analysis.title || "Website Analysis"}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 text-center">
                      {analysis.timelineInDays ? `${analysis.timelineInDays} Days` : "7 Days"}
                    </td>
                    <td className="px-5 py-3.5 text-right text-gray-900 font-bold">
                      {formatCurrency(subtotal)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pr-2">
            <div className="w-full max-w-xs space-y-2">
              {vatRate > 0 && vatAmount > 0 && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-semibold">Subtotal:</span>
                  <span className="text-gray-800 font-bold">{formatCurrency(subtotal)}</span>
                </div>
              )}
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

export default function AnalysisPaymentsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const analysisId = params.id as string;
  const { analysis, isLoading: analysisLoading, refreshAnalysis } = useAnalysis();
  const activeAnalysis = analysis || {};
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false);
  const { currency, setCurrency, conversionRate } = useCurrency();
  const { formatDateTime: formatDateTimeTz } = useTimezone();
  const hasRefreshedRef = useRef(false);

  const fetchPayments = useCallback(async (silent = false) => {
    if (!analysisId) return;
    if (!silent) setIsLoading(true);
    try {
      const res = await paymentService.getTransactionsByProject(analysisId);
      if (res?.data) {
        setPayments(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch analysis payments:", error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [analysisId]);

  useEffect(() => {
    if (analysisId) {
      fetchPayments(false);
    }
  }, [analysisId, fetchPayments]);

  useEffect(() => {
    const isSuccess =
      searchParams?.get("success") === "true" ||
      searchParams?.get("redirect_status") === "succeeded" ||
      Boolean(searchParams?.get("payment_intent") && searchParams?.get("payment_intent_client_secret"));

    if (isSuccess) {
      refreshAnalysis();
      fetchPayments(true);

      const pollDelays = [300, 800, 1800, 3500];
      const timers = pollDelays.map((delay) =>
        setTimeout(() => {
          refreshAnalysis();
          fetchPayments(true);
        }, delay)
      );

      const cleanupTimer = setTimeout(() => {
        try {
          window.history.replaceState(null, "", `/dashboard/my-analyses/${analysisId}/payments`);
        } catch {}
      }, 4500);

      return () => {
        timers.forEach((t) => clearTimeout(t));
        clearTimeout(cleanupTimer);
      };
    }
  }, [searchParams, analysisId, refreshAnalysis, fetchPayments]);

  // Refresh whenever tab gains focus or becomes visible
  useEffect(() => {
    const onFocus = () => {
      refreshAnalysis();
      fetchPayments(true);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshAnalysis();
        fetchPayments(true);
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshAnalysis, fetchPayments]);

  useEffect(() => {
    if (analysisId && analysis) {
      fetchPayments(true);
    }
  }, [
    analysisId,
    analysis?.amountPaid,
    analysis?.paymentStatus,
    analysis?.messages?.length,
    analysis?.addons?.length,
    fetchPayments,
  ]);

  if (analysisLoading && !analysis) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4343F0]"></div>
      </div>
    );
  }

  if (!analysis) return null;

  const currentUser = authService.getUser();
  const projectNumber =
    activeAnalysis.projectNumber ||
    (activeAnalysis.quoteNumber || (activeAnalysis._id ? `INV-2026-${activeAnalysis._id.slice(-3).toUpperCase()}` : "INV-2026-150"));

  const [matchedProduct, setMatchedProduct] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    const loadMatchedProduct = async () => {
      try {
        const res: any = await requestAnalysisService.getProducts(true);
        const list = Array.isArray(res?.data) ? res.data : res?.data?.data || (Array.isArray(res) ? res : []);
        const targetId = activeAnalysis.productId || activeAnalysis.analysisProductId || activeAnalysis.product?._id || activeAnalysis.product?.id;
        const targetTitle = (activeAnalysis.title || "").toLowerCase().trim();
        const found = list.find((p: any) =>
          (targetId && (p._id === targetId || p.id === targetId)) ||
          (p.title && targetTitle && p.title.toLowerCase().trim() === targetTitle) ||
          (targetTitle.includes("check") && (p.title || "").toLowerCase().includes("check"))
        );
        if (isMounted && found) {
          setMatchedProduct(found);
        }
      } catch (e) {
        console.error("Failed to load matching analysis product in payments tab:", e);
      }
    };
    if (activeAnalysis && activeAnalysis._id) {
      loadMatchedProduct();
    }
    return () => {
      isMounted = false;
    };
  }, [activeAnalysis?._id, activeAnalysis?.title]);

  const isGenericDesc = (desc?: string) => {
    if (!desc) return true;
    return (
      desc.startsWith("Our standard free analysis offer covering brand, UI/UX") ||
      desc.startsWith("Comprehensive Website Review, Detailed PDF Report")
    );
  };

  const rawTitle = activeAnalysis.title || "Free Website Analysis";
  const dynamicAnalysisTitle = rawTitle.includes(" - ") ? rawTitle.split(" - ")[0] : rawTitle;

  const dynamicAnalysisDesc =
    (activeAnalysis.deliverableItems?.[0]?.details && !isGenericDesc(activeAnalysis.deliverableItems?.[0]?.details))
      ? activeAnalysis.deliverableItems?.[0]?.details
      : (matchedProduct?.shortDescription ||
         matchedProduct?.description ||
         matchedProduct?.longDescription ||
         activeAnalysis.shortDescription ||
         activeAnalysis.product?.shortDescription ||
         activeAnalysis.product?.description ||
         (activeAnalysis.description && !activeAnalysis.description.startsWith("Analysis for ") ? activeAnalysis.description : "") ||
         (dynamicAnalysisTitle.toLowerCase().includes("check")
           ? "An offer to check the completed work of any other web professionals, including your own in-house staff and/or partners. Fully custom and manual checking by our quality assurance team. Serves as a third, objective perspective on the quality of work completed."
           : "Our classic analysis offer covering branding, UI/UX, functionalities, AI potentiality, tech stack, speed, and SEO. A manual review using a custom process created by Society Web Solutions, checking every important part of your website. Delivered as a custom PDF report within 5 days."));

  // 1. Regular items
  const regularItems = (activeAnalysis.deliverableItems && activeAnalysis.deliverableItems.length > 0)
    ? activeAnalysis.deliverableItems.map((item: any) => ({
        description: item.description || item.title || item.name || dynamicAnalysisTitle,
        details: !isGenericDesc(item.details) ? item.details : dynamicAnalysisDesc,
        duration: item.duration ? `${item.duration} ${item.unit || (String(item.duration).toLowerCase().includes("day") ? "" : "Days")}`.trim() : (activeAnalysis.timelineInDays ? `${activeAnalysis.timelineInDays} Days` : "7 Days"),
        amount: Number(item.amount ?? (activeAnalysis.addons?.length ? 0 : (activeAnalysis.price ?? activeAnalysis.totalCost ?? 0))),
        isAddOn: false,
      }))
    : [{
        description: dynamicAnalysisTitle,
        details: dynamicAnalysisDesc,
        duration: activeAnalysis.timelineInDays ? `${activeAnalysis.timelineInDays} Days` : "5 Days",
        amount: Number(activeAnalysis.basePrice ?? (activeAnalysis.addons?.length ? 0 : (activeAnalysis.price ?? activeAnalysis.totalCost ?? 0))),
        isAddOn: false,
      }];

  // 2. Addon items from activeAnalysis.addons
  const addonItemsFromAddons = (activeAnalysis.addons || []).flatMap((addon: any) =>
    (addon.deliverableItems || []).map((item: any) => ({
      description: item.description || item.title || item.name || "Add-On Deliverable",
      details: item.details || "",
      duration: item.duration ? `${item.duration} ${item.unit || (String(item.duration).toLowerCase().includes("day") ? "" : "Days")}`.trim() : "1 Days",
      amount: Number(item.amount ?? addon.totalCost ?? addon.cost ?? 0),
      currency: (addon.currency || item.currency || "").toUpperCase(),
      isAddOn: true,
    }))
  );

  // 3. Addon items from activeAnalysis.messages
  const addonItemsFromMessages = (activeAnalysis.messages || []).flatMap((msg: any, idx: number) => {
    const isQuote = msg.type === "quote_proposal" || msg.content?.type === "quote_proposal";
    if (!isQuote) return [];

    const content = msg.content || {};
    const subsequentMessages = (activeAnalysis.messages || []).slice(idx + 1);
    const nextProposalIdx = subsequentMessages.findIndex(
      (m: any) => m.type === "quote_proposal" || m.content?.type === "quote_proposal"
    );
    const relevantSubsequent = nextProposalIdx !== -1 ? subsequentMessages.slice(0, nextProposalIdx) : subsequentMessages;

    const wasAcceptedAfterThis = relevantSubsequent.some((m: any) => {
      const text = `${m.message || ""} ${m.content?.systemText || ""} ${m.content?.text || ""}`.toLowerCase();
      return (
        (m.type === "system_notification" || m.isSystem || m.type === "quote_action") &&
        (text.includes("accepted") || text.includes("add-on proposal accepted") || text.includes("offer was accepted"))
      );
    });

    const isAccepted =
      content.status === "accepted" ||
      content.proposalStatus === "accepted" ||
      msg.status === "accepted" ||
      msg.proposalStatus === "accepted" ||
      wasAcceptedAfterThis;

    if (!isAccepted) return [];

    const items = content.deliverableItems || content.items || msg.deliverableItems || [];
    const proposalCurrency = (content.currency || msg.currency || "").toUpperCase();
    return items.map((item: any) => ({
      description: item.description || item.title || item.name || "Add-On Deliverable",
      details: item.details || "",
      duration: item.duration ? `${item.duration} ${item.unit || (String(item.duration).toLowerCase().includes("day") ? "" : "Days")}`.trim() : "1 Days",
      amount: Number(item.amount ?? item.cost ?? 0),
      currency: (proposalCurrency || item.currency || "").toUpperCase(),
      isAddOn: true,
    }));
  });

  const allAddonItems = addonItemsFromAddons.length > 0 ? addonItemsFromAddons : addonItemsFromMessages;
  const deliverableItems = allAddonItems.length > 0 ? [...regularItems, ...allAddonItems] : regularItems;

  const activeAddonCurrency = (
    allAddonItems.find((a: any) => a.currency)?.currency ||
    activeAnalysis?.addons?.[0]?.currency ||
    activeAnalysis?.messages?.find((m: any) => (m.type === 'quote_proposal' || m.content?.type === 'quote_proposal') && (m.content?.currency || m.currency))?.content?.currency ||
    activeAnalysis?.messages?.find((m: any) => (m.type === 'quote_proposal' || m.content?.type === 'quote_proposal') && (m.content?.currency || m.currency))?.currency ||
    ""
  ).toUpperCase();

  const isBaseFree = Boolean(
    activeAnalysis.isFree ||
    (!activeAnalysis.basePrice && (!activeAnalysis.deliverableItems?.length || activeAnalysis.deliverableItems.every((d: any) => Number(d.amount ?? d.cost ?? 0) === 0)))
  );

  const effectiveAnalysisSourceCurrency = (
    isBaseFree && activeAddonCurrency
      ? activeAddonCurrency
      : (activeAnalysis.currency || activeAddonCurrency || payments[0]?.currency || "USD")
  ).toUpperCase();

  const analysisNativeCurrency = effectiveAnalysisSourceCurrency.toLowerCase();

  const totalPaidFromTransactions = (payments || [])
    .filter((p: any) => ["succeeded", "paid", "completed"].includes(p.status?.toLowerCase()))
    .reduce((sum: number, p: any) => {
      const pCurr = (p?.currency || analysisNativeCurrency || "USD").toLowerCase();
      const pAmt = Number(p?.amountPaid || p?.amount || 0);
      const pRate = Number(p?.exchangeRate || p?.metadata?.exchangeRate || p?.metadata?.conversionRate || conversionRate || 1.14776);
      return sum + convertCurrencyAmount(pAmt, analysisNativeCurrency, pCurr, pRate);
    }, 0);

  const amountPaid = totalPaidFromTransactions > 0
    ? totalPaidFromTransactions
    : Number(activeAnalysis.amountPaid || 0);

  const addonsTotal = allAddonItems.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
  const currentPrice = Number(activeAnalysis.price ?? activeAnalysis.totalCost ?? 0);
  const baseCost = activeAnalysis.basePrice != null
    ? Number(activeAnalysis.basePrice)
    : (activeAnalysis.isFree ? 0 : Math.max(0, currentPrice - addonsTotal));

  const rawVat = activeAnalysis.vatRate ?? activeAnalysis.vatPercentage ?? activeAnalysis.taxPercentage;
  const vatRate = rawVat !== undefined && rawVat !== null && Number(rawVat) > 0 ? Number(rawVat) : 0;
  const totalSubtotal = baseCost + addonsTotal;
  const effectiveVatAmount = Number(
    activeAnalysis.vatAmount ??
    (vatRate > 0 ? Math.round((totalSubtotal * (vatRate / 100)) * 100) / 100 : 0)
  );
  const totalProjectCost = totalSubtotal + effectiveVatAmount;
  const pendingBalance = Math.max(0, totalProjectCost - amountPaid);
  const isFullyPaid = pendingBalance <= 0.009 && amountPaid > 0 && activeAnalysis.paymentStatus !== "pending";

  const isFree = totalProjectCost === 0 && amountPaid === 0 && allAddonItems.length === 0;

  const getAnalysisPayloadForPdf = () => {
    const activeTitle = dynamicAnalysisTitle || activeAnalysis.title || "Website Analysis";
    const activeDesc = dynamicAnalysisDesc || activeAnalysis.description || "";
    const activeCurrency = (currency || (typeof window !== "undefined" ? localStorage.getItem("app-currency") : "") || "usd").toUpperCase();
    const sourceCurrency = effectiveAnalysisSourceCurrency;

    const deliverableAmount = isFree
      ? 0
      : baseCost > 0
      ? baseCost
      : Number(activeAnalysis.price || 0);

    const timelineDays = parseInt(String(activeAnalysis.timelineInDays || activeAnalysis.totalDuration || "5"), 10) || 5;

    const rawUrls = (activeAnalysis.targetWebsiteUrl || activeAnalysis.websiteUrl || "").trim();
    const submittedUrls = rawUrls
      ? rawUrls
          .split(/[\n,;]+/)
          .map((u: string) => u.trim())
          .filter(Boolean)
      : [];

    const calculatedDeadline =
      activeAnalysis.deadline ||
      activeAnalysis.estimatedDeadline ||
      (activeAnalysis.startDate || activeAnalysis.createdAt
        ? new Date(
            new Date(activeAnalysis.startDate || activeAnalysis.createdAt).getTime() +
              timelineDays * 24 * 60 * 60 * 1000
          ).toISOString()
        : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString());

    return {
      ...activeAnalysis,
      isProject: true,
      isQuote: false,
      title: activeTitle,
      projectTitle: activeTitle,
      description: activeDesc,
      projectDescription: activeDesc,
      deadline: calculatedDeadline,
      estimatedDeadline: calculatedDeadline,
      targetWebsiteUrl: activeAnalysis.targetWebsiteUrl || activeAnalysis.websiteUrl || "",
      websiteUrl: activeAnalysis.targetWebsiteUrl || activeAnalysis.websiteUrl || "",
      submittedUrls: submittedUrls,
      scopeOfWork: (activeAnalysis.scopeOfWork || activeAnalysis.metadata?.scopeOfWork || "").trim(),
      whoCompletedWork: (activeAnalysis.whoCompletedWork || activeAnalysis.metadata?.whoCompletedWork || "").trim(),
      agreementDetails: (activeAnalysis.agreementDetails || activeAnalysis.metadata?.agreementDetails || "").trim(),
      additionalComments: (activeAnalysis.additionalComments || activeAnalysis.metadata?.additionalComments || "").trim(),
      loginsDetails: (activeAnalysis.loginsDetails || activeAnalysis.metadata?.loginsDetails || "").trim(),
      isLoginsDetailsVisible: Boolean(
        activeAnalysis.loginsDetails &&
        activeAnalysis.loginsDetails !== "checking@societywebsolutions.com"
      ),
      currency: activeCurrency,
      targetCurrency: activeCurrency,
      sourceCurrency: sourceCurrency,
      conversionRate: conversionRate || 1.08,
      subtotal: totalSubtotal,
      baseAmount: totalSubtotal,
      vatRate: vatRate,
      vatAmount: effectiveVatAmount,
      totalCost: totalProjectCost,
      totalPrice: totalProjectCost,
      amountPaid: amountPaid,
      pendingBalance: pendingBalance,
      deliverables: [
        {
          name: activeTitle,
          details: activeDesc,
          duration: `${timelineDays} Days`,
          amount: deliverableAmount,
        },
      ],
      addons: allAddonItems.map((a: any) => ({
        name: a.description || a.title || "Add-on Task",
        duration: a.duration
          ? (/\b(days?|weeks?|months?|years?|hours?)\b/i.test(String(a.duration))
              ? String(a.duration).trim()
              : `${String(a.duration).trim()} ${a.unit || "Days"}`.trim())
          : "1 Days",
        amount: Number(a.amount || 0),
      })),
    };
  };

  const handleDownloadProject = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    try {
      if (activeAnalysis.resultsPdfUrl) {
        downloadFile(e as any, activeAnalysis.resultsPdfUrl, "Final_Analysis_Report.pdf");
      } else {
        await downloadAnalysisPDF(getAnalysisPayloadForPdf());
      }
    } catch (err) {
      console.error("Failed to download analysis PDF:", err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadReceipt = async (payment: any) => {
    const pId = payment._id || payment.id;
    setDownloadingReceiptId(pId);
    try {
      await downloadReceiptPDF(activeAnalysis, payment);
    } catch (err) {
      console.error("Failed to download receipt PDF:", err);
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  const handlePrintDetails = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    printAnalysisDetails(getAnalysisPayloadForPdf());
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "succeeded":
      case "paid":
      case "completed":
        return "bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]";
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

  const formatPaymentAmount = (payment: any) => {
    const pCurr = (
      payment.currency ||
      payment.chargedCurrency ||
      payment.metadata?.paymentCurrency ||
      payment.metadata?.currency ||
      activeAnalysis.currency ||
      "USD"
    ).toUpperCase();
    const rawAmt = Number(payment.amount ?? payment.chargedAmount ?? payment.amountPaid ?? 0);
    return formatActiveCurrency(rawAmt, pCurr);
  };

  // 1. FREE ANALYSIS: Display Payment Overview + Free Website Analysis cards matching project design
  if (isFree) {
    const startDate = activeAnalysis.startDate || activeAnalysis.createdAt || new Date();
    const timelineDays = parseInt(String(activeAnalysis.timelineInDays || activeAnalysis.totalDuration || "5"), 10) || 5;
    const deadlineDate = activeAnalysis.deadline || activeAnalysis.expectedDeadline || new Date(new Date(startDate).getTime() + timelineDays * 24 * 60 * 60 * 1000);

    const formatDateTime = (dateVal: any) => {
      if (!dateVal) return "Aug 28, 7:46 PM";
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      const datePart = formatDateTimeTz(d, { month: "short", day: "numeric" });
      const timePart = formatDateTimeTz(d, { hour: "numeric", minute: "2-digit", hour12: true });
      return `${datePart}, ${timePart}`;
    };

    const formatDateOnly = (dateVal: any) => {
      if (!dateVal) return "Aug 28, 2026";
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return formatDateTimeTz(d, { month: "short", day: "numeric", year: "numeric" });
    };

    const startDateStr = formatDateTime(startDate);
    const deadlineStr = formatDateTime(deadlineDate);
    const paymentDateStr = formatDateOnly(activeAnalysis.createdAt || startDate);

    const getDomainSubtitle = () => {
      const rawUrl = activeAnalysis.targetWebsiteUrl || activeAnalysis.websiteUrl || activeAnalysis.targetUrl;
      if (rawUrl) {
        try {
          const u = rawUrl.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").trim();
          if (u) return `Analysis for ${u}.`;
        } catch {
          return `Analysis for ${rawUrl}.`;
        }
      }
      const title = activeAnalysis.title || "";
      if (title.includes(" - ")) {
        const part = title.split(" - ").pop()?.trim();
        if (part) return `Analysis for ${part}.`;
      }
      return "";
    };

    const formatPriceDisplay = (amt: number) => {
      return currency === "eur" ? `€${amt.toFixed(2)}` : `$${amt.toFixed(2)}`;
    };

    const freeItemTitle = dynamicAnalysisTitle;
    const freeItemDesc = dynamicAnalysisDesc;
    const freeItemDuration = `${timelineDays} Days`;

    const handleViewInvoice = async (e?: React.MouseEvent) => {
      if (e) e.preventDefault();
      setIsDownloadingInvoice(true);
      try {
        await downloadAnalysisPDF(getAnalysisPayloadForPdf());
      } catch (err) {
        console.error("Failed to download project PDF for invoice view:", err);
      } finally {
        setIsDownloadingInvoice(false);
      }
    };

    return (
      <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 font-sans">
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            {/* 1. Payment Overview Card */}
            <div className="bg-white border border-gray-300 rounded-lg p-4 sm:p-6 md:p-8">
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start mb-6 sm:mb-4 gap-4 sm:gap-6">
                  <div className="w-full sm:max-w-[70%] order-2 sm:order-1">
                    <div className="flex items-center gap-4 mb-4">
                      <h2 className="text-lg font-bold text-gray-800 font-sans">
                        Payment Overview
                      </h2>
                      <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => setCurrency("usd")}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                            currency === "usd"
                              ? "bg-white shadow text-gray-800"
                              : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          USD
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrency("eur")}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                            currency === "eur"
                              ? "bg-white shadow text-gray-800"
                              : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          EUR
                        </button>
                      </div>
                    </div>
                    {getDomainSubtitle() ? (
                      <p
                        className="text-sm sm:text-gray-600 mb-4 leading-relaxed line-clamp-3 sm:line-clamp-2 font-sans"
                        title={getDomainSubtitle()}
                      >
                        {getDomainSubtitle()}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] sm:text-xs text-gray-500 font-sans">
                      <span className="whitespace-nowrap">
                        Project No: <span className="text-gray-700 font-medium">#{projectNumber}</span>
                      </span>
                      <span className="hidden sm:inline text-gray-300">|</span>
                      <span className="whitespace-nowrap">
                        Start Date: <span className="text-gray-700 font-medium">{startDateStr}</span>
                      </span>
                      <span className="hidden sm:inline text-gray-300">|</span>
                      <span className="whitespace-nowrap">
                        Expected Deadline: <span className="text-gray-700 font-medium">{deadlineStr}</span>
                      </span>
                    </div>
                  </div>
                  <div className="w-full sm:w-auto order-1 sm:order-2 bg-gray-50 sm:bg-transparent p-4 sm:p-0 rounded-lg space-y-2 flex flex-col sm:items-end">
                    <div className="flex justify-between items-center sm:justify-end gap-3 w-full">
                      <span className="text-xs sm:text-sm text-gray-500 font-medium font-sans">
                        Total Cost:
                      </span>
                      <span className="text-sm sm:text-base font-bold text-gray-800 font-sans min-w-[60px] text-right">
                        {formatPriceDisplay(0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center sm:justify-end gap-3 w-full">
                      <span className="text-xs sm:text-sm text-gray-700 font-bold font-sans">
                        Total Payable:
                      </span>
                      <span className="text-base sm:text-lg font-extrabold text-[#4343F0] font-sans min-w-[60px] text-right">
                        {formatPriceDisplay(0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-x-auto mb-2" style={{ cursor: "grab" }}>
                <table className="w-full min-w-[500px] sm:min-w-0 table-fixed">
                  <thead>
                    <tr className="border-b border-gray-200 bg-white">
                      <th className="text-left py-3 px-3 sm:px-6 text-xs font-bold text-gray-500 uppercase tracking-wider w-[55%] sm:w-[58%]">
                        Item
                      </th>
                      <th className="text-left py-3 px-3 sm:px-6 text-xs font-bold text-gray-500 uppercase tracking-wider w-[25%] sm:w-[22%] whitespace-nowrap">
                        Duration
                      </th>
                      <th className="text-right py-3 px-3 sm:px-6 text-xs font-bold text-gray-500 uppercase tracking-wider w-[20%] whitespace-nowrap">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100 last:sm:border-b-0">
                      <td className="py-4 px-3 sm:px-6 text-xs sm:text-sm text-gray-600">
                        <div className="font-medium mb-1">{freeItemTitle}</div>
                        <div className="text-gray-400 text-[10px] sm:text-xs">
                          {freeItemDesc}
                        </div>
                      </td>
                      <td className="py-4 px-3 sm:px-6 text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                        {freeItemDuration}
                      </td>
                      <td className="py-4 px-3 sm:px-6 text-xs sm:text-sm text-gray-600 font-bold sm:font-medium text-right">
                        {formatPriceDisplay(0)}
                      </td>
                    </tr>
                    {vatRate > 0 && effectiveVatAmount > 0 && (
                      <tr className="border-t-2 border-gray-200 bg-gray-50/70">
                        <td className="py-2.5 px-3 sm:px-6"></td>
                        <td className="py-2.5 px-3 sm:px-6 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">
                          Base Amount:
                        </td>
                        <td className="py-2.5 px-3 sm:px-6 text-right text-xs font-semibold text-gray-700">
                          {formatPriceDisplay(0)}
                        </td>
                      </tr>
                    )}
                    {vatRate > 0 && effectiveVatAmount > 0 && (
                      <tr className="bg-gray-50/70">
                        <td className="py-2.5 px-3 sm:px-6"></td>
                        <td className="py-2.5 px-3 sm:px-6 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">
                          VAT ({vatRate}%):
                        </td>
                        <td className="py-2.5 px-3 sm:px-6 text-right text-xs font-semibold text-gray-700">
                          {formatPriceDisplay(0)}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-blue-50/50 border-t border-gray-200">
                      <td className="py-3 px-3 sm:px-6"></td>
                      <td className="py-3 px-3 sm:px-6 text-left text-xs sm:text-sm font-bold text-gray-800 uppercase font-sans whitespace-nowrap">
                        TOTAL PAYABLE:
                      </td>
                      <td className="py-3 px-3 sm:px-6 text-right text-sm sm:text-base font-extrabold text-[#4343F0] font-sans">
                        {formatPriceDisplay(0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Download & Print Action Buttons */}
              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  disabled={isDownloadingPdf}
                  onClick={handleDownloadProject}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#2E30B2] hover:bg-[#252796] text-white text-xs sm:text-sm font-bold rounded-lg transition-colors shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {isDownloadingPdf ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Downloading...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" x2="12" y1="15" y2="3"></line>
                      </svg>
                      <span>Download Project (.PDF)</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handlePrintDetails}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#1F217A] hover:bg-[#181961] text-white text-xs sm:text-sm font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect width="12" height="8" x="6" y="14"></rect>
                  </svg>
                  <span>Print Details</span>
                </button>
              </div>
            </div>
          </div>

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
              Visit Help &amp; Support
            </button>
          </div>
        </div>

        <ReceiptModal
          isOpen={showReceipt}
          onClose={() => setShowReceipt(false)}
          analysis={activeAnalysis}
          payment={selectedPayment}
          deliverableItems={deliverableItems}
        />
      </>
    );
  }

  // 2. PAID ANALYSIS: Display full UnifiedPaymentForm with Subtotal, VAT, Total Cost, Paid, Pending Balance + All Transaction Records
  const searchInvoiceId = searchParams?.get("invoiceId") || undefined;
  const searchInvoiceNumber = searchParams?.get("invoiceNumber") || undefined;
  const searchMessageId = searchParams?.get("messageId") || undefined;
  const searchDescription = searchParams?.get("description") || undefined;
  const targetCost = amountPaid === 0
    ? totalSubtotal
    : (vatRate > 0 ? Math.round((pendingBalance / (1 + vatRate / 100)) * 100) / 100 : pendingBalance);

  return (
    <div className="w-full font-sans space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Unified Payment Form (col-span-2) */}
        <div className="lg:col-span-2">
          <UnifiedPaymentForm
            type="ANALYSIS"
            entityId={analysisId}
            entityNumber={projectNumber}
            title={activeAnalysis.title || "Website Analysis"}
            description={
              searchDescription
                ? `Payment for ${searchDescription}`
                : (activeAnalysis.description || "Payment for website analysis deliverables")
            }
            date={activeAnalysis.createdAt}
            startDate={activeAnalysis.startDate || activeAnalysis.createdAt}
            deadline={activeAnalysis.deadline || activeAnalysis.expectedDeadline}
            totalCost={targetCost}
            depositAmount={Number(activeAnalysis.depositAmount || activeAnalysis.deposit || 0)}
            deliverableItems={deliverableItems}
            clientEmail={currentUser?.email || activeAnalysis.clientEmail || ""}
            successRedirectUrl={`/dashboard/my-analyses/${analysisId}/payments?success=true`}
            amountPaid={amountPaid}
            isFullyPaid={isFullyPaid}
            nativeCurrency={effectiveAnalysisSourceCurrency || activeAnalysis.currency || "USD"}
            vatRate={activeAnalysis.vatRate ?? activeAnalysis.vatPercentage ?? activeAnalysis.taxPercentage ?? undefined}
            invoiceId={searchInvoiceId}
            onDownloadInvoice={async () => {
              if (isDownloadingInvoice) return;
              setIsDownloadingInvoice(true);
              try {
                if (activeAnalysis.resultsPdfUrl) {
                  downloadFile({} as any, activeAnalysis.resultsPdfUrl, "Final_Analysis_Report.pdf");
                } else {
                  await downloadAnalysisPDF(getAnalysisPayloadForPdf());
                }
              } catch (err) {
                console.error("Failed to download analysis invoice PDF:", err);
              } finally {
                setIsDownloadingInvoice(false);
              }
            }}
            isDownloadingInvoice={isDownloadingInvoice}
            onPaymentSuccess={async () => {
              await fetchPayments(true);
              refreshAnalysis();
              const pollDelays = [300, 800, 1800, 3500];
              pollDelays.forEach((delay) => {
                setTimeout(() => {
                  fetchPayments(true);
                  refreshAnalysis();
                }, delay);
              });
            }}
            metadata={{
              type: "ANALYSIS",
              analysisId: analysisId,
              projectId: analysisId,
              productId: activeAnalysis.productId || analysisId,
              title: activeAnalysis.title,
              description: activeAnalysis.description,
              invoiceId: searchInvoiceId,
              invoiceNumber: searchInvoiceNumber,
              messageId: searchMessageId,
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
            Visit Help &amp; Support
          </button>
        </div>
      </div>

      {/* Transaction Records Breakdown (if available) */}
      {!isLoading && payments.length > 0 && (
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
                    <span>Download Analysis (.PDF)</span>
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
                <span>Print Details</span>
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
                      {payment.description || "Analysis Payment"}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">
                      {formatPaymentAmount(payment)}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(payment.createdAt).toLocaleDateString()}
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

      <ReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        analysis={activeAnalysis}
        payment={selectedPayment}
        deliverableItems={deliverableItems}
      />
    </div>
  );
}
