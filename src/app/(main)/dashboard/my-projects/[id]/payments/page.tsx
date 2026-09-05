"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProject } from "@/context/ProjectContext";
import { paymentService } from "@/lib/paymentService";
import { downloadFile } from "@/lib/utils";
import { downloadProjectDetailsPDF, printProjectDetails } from "@/lib/generateProjectDetailsPDF";

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
  const projectId = params.id as string;
  const { project, isLoading: projectLoading } = useProject();
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  useEffect(() => {
    const fetchPayments = async () => {
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
    };

    if (projectId) {
      fetchPayments();
    }
  }, [projectId]);

  if (projectLoading && !project) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4343F0]"></div>
      </div>
    );
  }

  const activeProject = project || {};
  const projectNumber =
    activeProject.projectNumber ||
    (activeProject.quoteNumber || (activeProject._id ? `INV-2026-${activeProject._id.slice(-3).toUpperCase()}` : "INV-2026-163"));

  const totalPrice = Number(activeProject.amountPaid ?? activeProject.price ?? activeProject.totalCost ?? 0);
  const currency = (activeProject.currency || "USD").toUpperCase();

  const formatCurrency = (amt: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amt);

  const paymentDate = (payments[0]?.createdAt || activeProject.createdAt)
    ? new Date(payments[0]?.createdAt || activeProject.createdAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "5 Sept 2026";

  const handleDownloadProject = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (activeProject.resultsPdfUrl || activeProject.pdfUrl) {
      downloadFile(e as any, activeProject.resultsPdfUrl || activeProject.pdfUrl, "Project_Document.pdf");
    } else {
      await downloadProjectDetailsPDF(activeProject);
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

  const mainStatus = (activeProject.paymentStatus || activeProject.status || "SUCCEEDED").toUpperCase();

  return (
    <div className="w-full font-sans space-y-8">
      <ReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        project={activeProject}
        payment={selectedPayment}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Card: Payment Details & Table (col-span-2) */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col justify-between">
          <div>
            {/* Top Row: Title + Status + Project Number */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-3">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  {activeProject.title || "Free website analysis - com"}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border ${getStatusColor(mainStatus)}`}>
                  {mainStatus === "ACTIVE" ? "SUCCEEDED" : mainStatus}
                </span>
              </div>
              <span className="text-xs sm:text-sm font-semibold text-[#4343F0]">
                Project #{projectNumber}
              </span>
            </div>

            {/* Sub Row: Payment Date + View Receipt Link */}
            <div className="flex items-center gap-3 text-xs text-gray-500 mb-6 font-normal">
              <span>Payment Date: {paymentDate}</span>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedPayment(payments[0] || null);
                  setShowReceipt(true);
                }}
                className="text-[#4343F0] font-medium hover:underline cursor-pointer"
              >
                View Receipt
              </button>
            </div>

            {/* Table Header & Rows */}
            <div className="border-t border-b border-gray-100 py-3 mb-4">
              <div className="grid grid-cols-12 text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2">
                <div className="col-span-6 text-left">ITEM</div>
                <div className="col-span-3 text-center">DURATION</div>
                <div className="col-span-3 text-right">AMOUNT</div>
              </div>
            </div>

            {/* Line Item Row */}
            <div className="grid grid-cols-12 text-xs sm:text-sm font-medium text-gray-800 px-2 py-3 items-center">
              <div className="col-span-6 font-semibold text-gray-900">
                {activeProject.title || "Free website analysis"}
              </div>
              <div className="col-span-3 text-center text-gray-600 font-normal">
                {activeProject.timelineInDays ? `${activeProject.timelineInDays} Days` : (activeProject.duration || "5 Days")}
              </div>
              <div className="col-span-3 text-right font-bold text-gray-900">
                {formatCurrency(totalPrice)}
              </div>
            </div>

            {/* Divider Line */}
            <div className="border-t border-gray-100 my-6" />

            {/* Total Paid Section */}
            <div className="flex justify-end text-right mb-6">
              <div>
                <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  TOTAL PAID
                </span>
                <span className="text-base sm:text-lg font-bold text-gray-900">
                  {formatCurrency(totalPrice)}
                </span>
              </div>
            </div>

            {/* Bottom Action Buttons (Aligned to bottom-right) */}
            <div className="flex justify-end items-center gap-3 mt-4">
              <button
                type="button"
                onClick={handleDownloadProject}
                className="inline-flex items-center gap-2 bg-[#2B30C9] hover:bg-[#2025AB] text-white text-xs sm:text-sm font-bold py-2.5 px-5 rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Project (.PDF)
              </button>
              <button
                type="button"
                onClick={handlePrintDetails}
                className="inline-flex items-center gap-2 bg-[#2B30C9] hover:bg-[#2025AB] text-white text-xs sm:text-sm font-bold py-2.5 px-5 rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Details
              </button>
            </div>
          </div>
        </div>

        {/* Right Card: Need To Contact Customer Support? (col-span-1) */}
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-2xl p-8 sm:p-10 shadow-sm flex flex-col items-center justify-center text-center self-start h-auto min-h-[260px]">
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
      {!isLoading && payments.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-base font-bold text-gray-800">All Transaction Records</h3>
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
                  <th className="px-6 py-3 text-right font-bold text-gray-500 uppercase">Action</th>
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
                      ${(payment.amount ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                        onClick={() => {
                          setSelectedPayment(payment);
                          setShowReceipt(true);
                        }}
                        className="text-[#4343F0] font-semibold hover:underline"
                      >
                        Receipt
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
