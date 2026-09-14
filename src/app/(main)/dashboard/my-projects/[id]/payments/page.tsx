"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useProject } from "@/context/ProjectContext";
import { paymentService } from "@/lib/paymentService";
import { authService } from "@/lib/authService";
import { quoteService } from "@/lib/quoteService";
import { downloadProjectDetailsPDF, printProjectDetails } from "@/lib/generateProjectDetailsPDF";
import { downloadReceiptPDF } from "@/lib/generateReceiptPDF";
import UnifiedPaymentForm from "@/components/dashboard/UnifiedPaymentForm";
import CalculatorProjectPayments from "./CalculatorProjectPayments";

export function isCalculatorProject(project: any, quote?: any): boolean {
  if (!project) return false;
  if (project.isCalculator) return true;
  if (project.calculatorSpecs && Object.keys(project.calculatorSpecs).length > 0) return true;

  const q = quote || (typeof project.quoteId === "object" ? project.quoteId : null) || project.quote;
  if (q) {
    if (q.isCalculator === true) return true;
    if (q.source === "calculator") return true;
    if (
      q.requirements?.categoryKey ||
      q.requirements?.calculatedPrice ||
      (Array.isArray(q.requirements?.selections) && q.requirements.selections.length > 0)
    ) {
      return true;
    }
  }

  if (
    project.requirements?.categoryKey ||
    (Array.isArray(project.requirements?.selections) && project.requirements.selections.length > 0)
  ) {
    return true;
  }

  return false;
}

export default function ProjectPaymentsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const { project, isLoading: projectLoading, refreshProject } = useProject();
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchedQuote, setFetchedQuote] = useState<any>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);
  const hasRefreshedRef = useRef(false);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await paymentService.getTransactionsByProject(projectId);
      if (res?.data) {
        setPayments(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch project payments:", error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchPayments();
    }
  }, [projectId, fetchPayments]);

  useEffect(() => {
    if (searchParams?.get("success") === "true" && !hasRefreshedRef.current) {
      hasRefreshedRef.current = true;
      refreshProject();
      fetchPayments();
      window.history.replaceState(null, "", `/dashboard/my-projects/${projectId}/payments`);
    }
  }, [searchParams, projectId, refreshProject, fetchPayments]);

  const activeProject = project || {};

  useEffect(() => {
    const rawQuoteId = typeof activeProject?.quoteId === "string" ? activeProject.quoteId : activeProject?.quoteId?._id;
    if (rawQuoteId && !fetchedQuote && (!activeProject?.quoteId || typeof activeProject?.quoteId === "string" || !activeProject?.quoteId?.requirements)) {
      quoteService
        .getQuoteById(rawQuoteId)
        .then((res) => {
          if (res?.data) {
            setFetchedQuote(res.data);
          }
        })
        .catch((err) => {
          console.warn("Could not fetch quote for calculator verification:", err);
        });
    }
  }, [activeProject?.quoteId, activeProject?.calculatorSpecs, activeProject?.isCalculator, fetchedQuote]);

  if (projectLoading && !project) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4343F0]"></div>
      </div>
    );
  }

  const currentUser = authService.getUser();
  const projectNumber =
    activeProject.projectNumber ||
    (activeProject.quoteNumber || (activeProject._id ? `INV-2026-${activeProject._id.slice(-3).toUpperCase()}` : "INV-2026-188"));

  // 1. Regular items
  const regularItems = (activeProject.deliverableItems && activeProject.deliverableItems.length > 0)
    ? activeProject.deliverableItems.map((item: any) => ({
      description: item.description || item.title || item.name || "Deliverable",
      details: item.details || "",
      duration: item.duration ? `${item.duration} ${item.unit || (String(item.duration).toLowerCase().includes("day") ? "" : "Days")}`.trim() : "30 Days",
      amount: Number(item.amount ?? 0),
      isAddOn: false,
    }))
    : activeProject.title
      ? [{
        description: activeProject.title,
        duration: activeProject.timelineInDays ? `${activeProject.timelineInDays} Days` : "30 Days",
        amount: Number(activeProject.price ?? activeProject.totalCost ?? 0),
        isAddOn: false,
      }]
      : [];

  // 2. Addon items from activeProject.addons
  const addonItemsFromAddons = (activeProject.addons || []).flatMap((addon: any) =>
    (addon.deliverableItems || []).map((item: any) => ({
      description: item.description || item.title || item.name || "Add-On Deliverable",
      details: item.details || "",
      duration: item.duration ? `${item.duration} ${item.unit || (String(item.duration).toLowerCase().includes("day") ? "" : "Days")}`.trim() : "1 Days",
      amount: Number(item.amount ?? 0),
      isAddOn: true,
    }))
  );

  // 3. Addon items from activeProject.messages
  const addonItemsFromMessages = (activeProject.messages || [])
    .filter((m: any) => m.type === "quote_proposal" || m.content?.proposalStatus === "accepted" || m.proposalStatus === "accepted")
    .flatMap((m: any) => {
      const items = m.deliverableItems || m.content?.deliverableItems || [];
      return items.map((item: any) => ({
        description: item.description || item.title || item.name || "Add-On Deliverable",
        details: item.details || "",
        duration: item.duration ? `${item.duration} ${item.unit || (String(item.duration).toLowerCase().includes("day") ? "" : "Days")}`.trim() : "1 Days",
        amount: Number(item.amount ?? 0),
        isAddOn: true,
      }));
    });

  const allAddonItems = addonItemsFromAddons.length > 0 ? addonItemsFromAddons : addonItemsFromMessages;

  // Combine deliverable items
  const deliverableItems = allAddonItems.length > 0 ? [...regularItems, ...allAddonItems] : regularItems;

  const totalPaidFromTransactions = (payments || [])
    .filter((p: any) => ["succeeded", "paid", "completed"].includes(p.status?.toLowerCase()))
    .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

  const amountPaid = Math.max(Number(activeProject.amountPaid || 0), totalPaidFromTransactions);
  const baseCost = Number(activeProject.price ?? activeProject.totalCost ?? 0);
  const addonsTotal = allAddonItems.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
  const deliverablesTotal = deliverableItems.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
  const totalProjectCost = deliverablesTotal > 0 ? deliverablesTotal : (baseCost > 0 ? baseCost : addonsTotal);

  const pendingBalance = Math.max(0, totalProjectCost - amountPaid);
  const payableAmount = pendingBalance;

  const isFullyPaid = pendingBalance <= 0 && amountPaid > 0 && activeProject.paymentStatus !== "pending";

  const handleDownloadProject = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    try {
      await downloadProjectDetailsPDF(activeProject);
    } catch (err) {
      console.error("Failed to download project PDF:", err);
    } finally {
      setIsDownloadingPdf(false);
    }
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

  const handlePrintDetails = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    printProjectDetails(activeProject);
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

  const isCalc = isCalculatorProject(activeProject, fetchedQuote);

  if (isCalc) {
    return (
      <CalculatorProjectPayments
        project={activeProject}
        quote={fetchedQuote || (typeof activeProject.quoteId === "object" ? activeProject.quoteId : activeProject.quote)}
        payments={payments}
        isLoadingPayments={isLoading}
        refreshPayments={fetchPayments}
        allAddonItems={allAddonItems}
      />
    );
  }

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
            type="project"
            entityId={projectId}
            entityNumber={projectNumber}
            title={activeProject.title || "Project Development"}
            description={
              searchDescription
                ? `Payment for ${searchDescription}`
                : (allAddonItems.length > 0
                  ? "Payment for accepted add-on project deliverables"
                  : (activeProject.description && !activeProject.description.includes("Selected Options:") && activeProject.description.length < 250
                    ? activeProject.description
                    : "Payment for accepted project deliverables"))
            }
            date={activeProject.createdAt}
            startDate={activeProject.startDate}
            deadline={activeProject.deadline}
            totalCost={targetCost}
            deliverableItems={deliverableItems}
            clientEmail={currentUser?.email || activeProject.clientEmail || ""}
            successRedirectUrl={`/dashboard/my-projects/${projectId}/payments?success=true`}
            amountPaid={amountPaid}
            isFullyPaid={isFullyPaid}
            nativeCurrency={activeProject.currency || "USD"}
            vatRate={Number(activeProject.vatRate ?? activeProject.vatPercentage ?? (activeProject.taxPercentage != null ? activeProject.taxPercentage : 0))}
            invoiceId={searchInvoiceId}
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
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: (payment.currency || activeProject.currency || "USD").toUpperCase(),
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
    </div>
  );
}
