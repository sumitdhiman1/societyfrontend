"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAnalysis } from "@/context/AnalysisContext";
import { paymentService } from "@/lib/paymentService";
import { authService } from "@/lib/authService";
import { downloadFile } from "@/lib/utils";
import { downloadProjectDetailsPDF, printProjectDetails } from "@/lib/generateProjectDetailsPDF";
import { downloadReceiptPDF } from "@/lib/generateReceiptPDF";
import UnifiedPaymentForm from "@/components/dashboard/UnifiedPaymentForm";

function ReceiptModal({
  isOpen,
  onClose,
  analysis,
  payment,
}: {
  isOpen: boolean;
  onClose: () => void;
  analysis: any;
  payment?: any;
}) {
  if (!isOpen || !analysis) return null;

  const projectNumber =
    analysis.projectNumber ||
    (analysis.quoteNumber || (analysis._id ? `INV-2026-${analysis._id.slice(-3).toUpperCase()}` : "INV-2026-150"));
  const isFree = (analysis.isFree !== false || Number(analysis.price || 0) === 0) && !payment;
  const totalPrice = isFree ? 0 : Number(payment?.amount ?? analysis.amountPaid ?? analysis.price ?? analysis.totalCost ?? 0);
  const currency = (payment?.currency || analysis.currency || "USD").toUpperCase();

  const formatCurrency = (amt: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amt);

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
                Web Solutions &amp; Digital Marketing
              </p>
            </div>
            <div className="text-right">
              <h3 className="text-xl font-bold text-gray-800 mb-0.5">PAYMENT RECEIPT</h3>
              <p className="text-xs text-gray-500 font-semibold">Analysis No: {projectNumber}</p>
              <p className="text-xs text-gray-500 font-semibold">Date: {dateFormatted}</p>
            </div>
          </div>

          <div className="border-t border-b border-gray-100 py-4 mb-6">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
              Service / Analysis
            </span>
            <h4 className="text-base font-bold text-gray-900">{analysis.title || "Website Analysis"}</h4>
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
                    {analysis.title || "Website Analysis"}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 text-center">
                    {analysis.timelineInDays ? `${analysis.timelineInDays} Days` : "7 Days"}
                  </td>
                  <td className="px-5 py-3.5 text-right text-gray-900 font-bold">
                    {formatCurrency(totalPrice)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pr-2">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-semibold">Subtotal:</span>
                <span className="text-gray-800 font-bold">{formatCurrency(totalPrice)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-semibold">Tax (0%):</span>
                <span className="text-gray-800 font-bold">$0.00</span>
              </div>
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
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);
  const hasRefreshedRef = useRef(false);

  const fetchPayments = useCallback(async () => {
    if (!analysisId) return;
    setIsLoading(true);
    try {
      const res = await paymentService.getTransactionsByProject(analysisId);
      if (res?.data) {
        setPayments(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch analysis payments:", error);
    } finally {
      setIsLoading(false);
    }
  }, [analysisId]);

  useEffect(() => {
    if (analysisId) {
      fetchPayments();
    }
  }, [analysisId, fetchPayments]);

  useEffect(() => {
    if (searchParams?.get("success") === "true" && !hasRefreshedRef.current) {
      hasRefreshedRef.current = true;
      refreshAnalysis();
      fetchPayments();
      window.history.replaceState(null, "", `/dashboard/my-analyses/${analysisId}/payments`);
    }
  }, [searchParams, analysisId, refreshAnalysis, fetchPayments]);

  if (analysisLoading && !analysis) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4343F0]"></div>
      </div>
    );
  }

  if (!analysis) return null;

  const activeAnalysis = analysis || {};
  const currentUser = authService.getUser();
  const projectNumber =
    activeAnalysis.projectNumber ||
    (activeAnalysis.quoteNumber || (activeAnalysis._id ? `INV-2026-${activeAnalysis._id.slice(-3).toUpperCase()}` : "INV-2026-150"));

  const totalPaidFromTransactions = (payments || [])
    .filter((p: any) => ["succeeded", "paid", "completed"].includes(p.status?.toLowerCase()))
    .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

  const amountPaid = Math.max(Number(activeAnalysis.amountPaid || 0), totalPaidFromTransactions);
  const baseCost = Number(activeAnalysis.price ?? activeAnalysis.totalCost ?? 0);
  const totalProjectCost = baseCost;
  const rawVat = activeAnalysis.vatRate ?? activeAnalysis.vatPercentage ?? activeAnalysis.taxPercentage;
  const activeVat = rawVat !== undefined && rawVat !== null && Number(rawVat) > 0 ? Number(rawVat) : 18;
  const totalWithVat = totalProjectCost * (1 + activeVat / 100);
  const pendingBalance = Math.max(0, totalWithVat - amountPaid);
  const isFullyPaid = pendingBalance <= 0.009 && amountPaid > 0 && activeAnalysis.paymentStatus !== "pending";

  const isFree = (activeAnalysis.isFree === true || (!activeAnalysis.price && !activeAnalysis.totalCost)) && amountPaid === 0;

  const handleDownloadProject = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    try {
      if (activeAnalysis.resultsPdfUrl) {
        downloadFile(e as any, activeAnalysis.resultsPdfUrl, "Final_Analysis_Report.pdf");
      } else {
        await downloadProjectDetailsPDF(activeAnalysis);
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
    printProjectDetails(activeAnalysis);
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

  // 1. FREE ANALYSIS: Display simple Free Website Analysis card
  if (isFree) {
    const paymentDate = activeAnalysis.createdAt
      ? new Date(activeAnalysis.createdAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "13 Sept 2026";
    const statusText = (activeAnalysis.paymentStatus || activeAnalysis.status || "succeeded").toLowerCase();

    return (
      <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 font-sans">
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                <div className="flex items-start justify-between gap-4 mb-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg font-bold text-[#0d1939]">
                      {activeAnalysis.title || "Free website analysis"}
                    </h3>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                      {statusText}
                    </span>
                  </div>
                  <span className="text-sm text-indigo-500 font-semibold whitespace-nowrap">
                    Analysis #{projectNumber}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 font-medium mt-2">
                  <span>
                    Payment Date: <span className="text-gray-600 font-semibold">{paymentDate}</span>
                  </span>
                  <span className="text-gray-200">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPayment(null);
                      setShowReceipt(true);
                    }}
                    className="text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-800 font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    View Receipt
                  </button>
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
                        <div className="font-semibold text-[#0d1939]">
                          {activeAnalysis.title || "Free website analysis"}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-500 text-center whitespace-nowrap">
                        {activeAnalysis.timelineInDays ? `${activeAnalysis.timelineInDays} Days` : "5 Days"}
                      </td>
                      <td className="py-4 px-6 text-sm font-bold text-gray-800 text-right whitespace-nowrap">
                        $0.00
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-gray-50/30">
                      <td className="py-3 px-6" colSpan={2}></td>
                      <td className="py-3 px-6 text-right">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Total Paid
                        </div>
                        <div className="text-sm font-bold text-gray-800 mt-0.5">
                          $0.00
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="px-6 py-4 flex flex-wrap justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  disabled={isDownloadingPdf}
                  onClick={handleDownloadProject}
                  className="flex items-center gap-2 px-5 py-2 bg-[#3535b8] hover:bg-[#2a2a9a] text-white text-sm font-bold rounded transition-all shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="15"
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
                  Download Project (.PDF)
                </button>
                <button
                  type="button"
                  onClick={handlePrintDetails}
                  className="flex items-center gap-2 px-5 py-2 bg-[#3535b8] hover:bg-[#2a2a9a] text-white text-sm font-bold rounded transition-all shadow-sm cursor-pointer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="15"
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
                  Print Details
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
        />
      </>
    );
  }

  // 2. PAID ANALYSIS: Display full UnifiedPaymentForm with Subtotal, VAT, Total Cost, Paid, Pending Balance + All Transaction Records
  const deliverableItems = (activeAnalysis.deliverableItems && activeAnalysis.deliverableItems.length > 0)
    ? activeAnalysis.deliverableItems.map((item: any) => ({
        description: item.description || item.title || item.name || "Analysis Deliverable",
        details: item.details || "",
        duration: item.duration ? `${item.duration} ${item.unit || (String(item.duration).toLowerCase().includes("day") ? "" : "Days")}`.trim() : (activeAnalysis.timelineInDays ? `${activeAnalysis.timelineInDays} Days` : "7 Days"),
        amount: Number(item.amount ?? activeAnalysis.price ?? activeAnalysis.totalCost ?? 0),
        isAddOn: false,
      }))
    : [{
        description: activeAnalysis.title || "Initial Analysis Setup & Implementation",
        details: "Comprehensive Website Review, Detailed PDF Report, Key Performance Issues Identified, Actionable Recommendations",
        duration: activeAnalysis.timelineInDays ? `${activeAnalysis.timelineInDays} Days` : "7 Days",
        amount: totalProjectCost,
        isAddOn: false,
      }];

  const searchAmount = searchParams?.get("amount") ? Number(searchParams.get("amount")) : 0;
  const searchInvoiceId = searchParams?.get("invoiceId") || undefined;
  const searchInvoiceNumber = searchParams?.get("invoiceNumber") || undefined;
  const searchMessageId = searchParams?.get("messageId") || undefined;
  const searchDescription = searchParams?.get("description") || undefined;
  const targetCost = searchAmount > 0 ? searchAmount : pendingBalance;

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
            deliverableItems={deliverableItems}
            clientEmail={currentUser?.email || activeAnalysis.clientEmail || ""}
            successRedirectUrl={`/dashboard/my-analyses/${analysisId}/payments?success=true`}
            amountPaid={amountPaid}
            isFullyPaid={isFullyPaid}
            nativeCurrency={activeAnalysis.currency || "USD"}
            vatRate={activeAnalysis.vatRate ?? activeAnalysis.vatPercentage ?? activeAnalysis.taxPercentage ?? undefined}
            invoiceId={searchInvoiceId}
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
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: (payment.currency || activeAnalysis.currency || "USD").toUpperCase(),
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(payment.amount ?? 0)}
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
      />
    </div>
  );
}
