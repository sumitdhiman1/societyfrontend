"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useProject } from "@/context/ProjectContext";
import { paymentService } from "@/lib/paymentService";
import { authService } from "@/lib/authService";
import { downloadFile } from "@/lib/utils";
import { downloadProjectDetailsPDF, printProjectDetails } from "@/lib/generateProjectDetailsPDF";
import { downloadReceiptPDF } from "@/lib/generateReceiptPDF";
import { downloadCalculatorProjectPDF, printCalculatorProjectPDF } from "@/lib/generateCalculatorProjectPDF";
import { getMainCalculatorCategory } from "@/lib/calculatorUtils";
import UnifiedPaymentForm from "@/components/dashboard/UnifiedPaymentForm";

function ReceiptModal({ isOpen, onClose, project, payment }: { isOpen: boolean; onClose: () => void; project: any; payment?: any }) {
  if (!isOpen || !project) return null;

  const projectNumber =
    project.projectNumber ||
    (project.quoteNumber || (project._id ? `INV-2026-${project._id.slice(-3).toUpperCase()}` : "INV-2026-163"));
  const totalPrice = Number(payment?.amount ?? project.amountPaid ?? project.price ?? project.totalCost ?? 0);
  const currency = (payment?.currency || project.currency || "USD").toUpperCase();

  const formatCurrency = (amt: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amt);

  const dateFormatted = (payment?.createdAt || project.createdAt)
    ? new Date(payment?.createdAt || project.createdAt).toLocaleDateString("en-GB", {
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

export default function ProjectPaymentsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const { project, isLoading: projectLoading, refreshProject } = useProject();
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
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

  if (projectLoading && !project) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4343F0]"></div>
      </div>
    );
  }

  const activeProject = project || {};
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
      if (activeProject.calculatorSpecs) {
        await downloadCalculatorProjectPDF(activeProject);
      } else if (activeProject.resultsPdfUrl || activeProject.pdfUrl) {
        downloadFile(e as any, activeProject.resultsPdfUrl || activeProject.pdfUrl, "Project_Document.pdf");
      } else {
        await downloadProjectDetailsPDF(activeProject);
      }
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
    if (activeProject.calculatorSpecs) {
      printCalculatorProjectPDF(activeProject);
    } else {
      printProjectDetails(activeProject);
    }
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

  if (activeProject.calculatorSpecs) {
    const rawNumber =
      activeProject.projectNumber ||
      activeProject.quoteNumber ||
      (activeProject._id ? `INV-2026-${activeProject._id.slice(-3).toUpperCase()}` : "INV-2026-201");
    const cleanNumber = String(rawNumber).replace(/^Project\s*#?/i, "").replace(/^#/, "");
    const formattedProjectNumber = `Project #${cleanNumber}`;

    const paymentDateFormatted = payments[0]?.createdAt
      ? new Date(payments[0].createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : activeProject.startDate
      ? new Date(activeProject.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : activeProject.createdAt
      ? new Date(activeProject.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "Sep 7, 2026";

    const paymentStatus = (activeProject.paymentStatus || payments[0]?.status || "succeeded").toLowerCase();

    const categoryDisplayName = getMainCalculatorCategory(
      activeProject.calculatorSpecs?.categoryKey,
      activeProject.calculatorSpecs?.categoryName
    ) || "Website";

    const itemTitle = `Custom ${categoryDisplayName} Development Project`;

    const itemDuration =
      activeProject.calculatorSpecs?.estimatedTimeline ||
      activeProject.totalDuration ||
      activeProject.timeline ||
      "2 weeks";

    const totalPaidAmount = Number(
      activeProject.totalCost ??
      activeProject.price ??
      activeProject.amountPaid ??
      activeProject.totalPrice ??
      totalProjectCost ??
      0
    );

    const currency = (activeProject.currency || payments[0]?.currency || "USD").toUpperCase();

    const formatCurrency = (amt: number) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amt);

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
              <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                <div className="flex items-start justify-between gap-4 mb-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg font-bold text-[#0d1939]">
                      {activeProject.title || `Website Price Calculator - ${activeProject.clientName || activeProject.client?.fullName || "Client"}`}
                    </h3>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                      {paymentStatus}
                    </span>
                  </div>
                  <span className="text-sm text-indigo-500 font-semibold whitespace-nowrap">
                    {formattedProjectNumber}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 font-medium mt-2">
                  <span>
                    Payment Date: <span className="text-gray-600 font-semibold">{paymentDateFormatted}</span>
                  </span>
                  <span className="text-gray-200">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPayment(
                        payments[0] || {
                          amount: totalPaidAmount,
                          createdAt: activeProject.createdAt,
                          status: paymentStatus,
                        }
                      );
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
                        <div className="font-semibold text-[#0d1939]">{itemTitle}</div>
                        <div className="text-xs text-gray-400 mt-0.5">Based on calculator selections</div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-500 text-center whitespace-nowrap">
                        {itemDuration}
                      </td>
                      <td className="py-4 px-6 text-sm font-bold text-gray-800 text-right whitespace-nowrap">
                        {formatCurrency(totalPaidAmount)}
                      </td>
                    </tr>
                    {allAddonItems.map((addon: any, idx: number) => (
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
      </div>
    );
  }

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
              allAddonItems.length > 0
                ? "Payment for accepted add-on project deliverables"
                : (activeProject.description || "Payment for accepted project deliverables")
            }
            date={activeProject.createdAt}
            startDate={activeProject.startDate}
            deadline={activeProject.deadline}
            totalCost={pendingBalance}
            deliverableItems={deliverableItems}
            clientEmail={currentUser?.email || activeProject.clientEmail || ""}
            successRedirectUrl={`/dashboard/my-projects/${projectId}/payments?success=true`}
            amountPaid={amountPaid}
            isFullyPaid={isFullyPaid}
            nativeCurrency={activeProject.currency || "USD"}
            vatRate={Number(activeProject.vatRate ?? activeProject.vatPercentage ?? (activeProject.taxPercentage != null ? activeProject.taxPercentage : 0))}
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
