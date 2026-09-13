"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAnalysis } from "@/context/AnalysisContext";
import { downloadFile } from "@/lib/utils";
import { downloadProjectDetailsPDF, printProjectDetails } from "@/lib/generateProjectDetailsPDF";
import { downloadReceiptPDF } from "@/lib/generateReceiptPDF";

function ReceiptModal({ isOpen, onClose, analysis }: { isOpen: boolean; onClose: () => void; analysis: any }) {
  if (!isOpen || !analysis) return null;

  const projectNumber =
    analysis.projectNumber ||
    (analysis.quoteNumber || (analysis._id ? `INV-2026-${analysis._id.slice(-3).toUpperCase()}` : "INV-2026-150"));
  const isFree = analysis.isFree !== false || Number(analysis.price || 0) === 0;
  const totalPrice = isFree ? 0 : Number(analysis.price || analysis.totalCost || 0);
  const currency = (analysis.currency || "USD").toUpperCase();

  const formatCurrency = (amt: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amt);

  const dateFormatted = analysis.createdAt
    ? new Date(analysis.createdAt).toLocaleDateString("en-GB", {
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
            <h4 className="text-base font-bold text-gray-900">{analysis.title || "Free website analysis"}</h4>
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
                    {analysis.title || "Free website analysis"}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 text-center">
                    {analysis.timelineInDays ? `${analysis.timelineInDays} Days` : "5 Days"}
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
  const { analysis } = useAnalysis();
  const router = useRouter();
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);

  if (!analysis) return null;

  const projectNumber =
    analysis.projectNumber ||
    (analysis.quoteNumber || (analysis._id ? `INV-2026-${analysis._id.slice(-3).toUpperCase()}` : "INV-2026-150"));
  const isFree = analysis.isFree !== false || Number(analysis.price || 0) === 0;
  const totalPrice = isFree ? 0 : Number(analysis.price || analysis.totalCost || 0);
  const currency = (analysis.currency || "USD").toUpperCase();

  const formatCurrency = (amt: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amt);

  const paymentDate = analysis.createdAt
    ? new Date(analysis.createdAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "13 Sept 2026";

  const handleDownloadProject = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (analysis.resultsPdfUrl) {
      downloadFile(e as any, analysis.resultsPdfUrl, "Final_Analysis_Report.pdf");
    } else {
      await downloadProjectDetailsPDF(analysis);
    }
  };

  const handlePrintDetails = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    printProjectDetails(analysis);
  };

  const statusText = (analysis.paymentStatus || analysis.status || "succeeded").toLowerCase();

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          <div className="">
            <div className="grid grid-cols-1 gap-8">
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-bold text-[#0d1939]">
                        {analysis.title || "Free website analysis - http"}
                      </h3>
                      <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                        {statusText}
                      </span>
                    </div>
                    <span className="text-sm text-indigo-500 font-semibold whitespace-nowrap">
                      Project #{projectNumber}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 font-medium mt-2">
                    <span>
                      Payment Date: <span className="text-gray-600 font-semibold">{paymentDate}</span>
                    </span>
                    <span className="text-gray-200">|</span>
                    <button
                      type="button"
                      onClick={() => setIsReceiptOpen(true)}
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
                            {analysis.title || "Free website analysis"}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-500 text-center whitespace-nowrap">
                          {analysis.timelineInDays ? `${analysis.timelineInDays} Days` : "5 Days"}
                        </td>
                        <td className="py-4 px-6 text-sm font-bold text-gray-800 text-right whitespace-nowrap">
                          {formatCurrency(totalPrice)}
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
                            {formatCurrency(totalPrice)}
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="px-6 py-4 flex flex-wrap justify-end gap-3 border-t border-gray-100">
                  <button
                    type="button"
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
          </div>
        </div>

        <div>
          <div className="border border-gray-200 rounded-[8px] p-8 text-center bg-white">
            <h3 className="text-[20px] font-bold text-[#363636] mb-2 leading-tight">
              Need To Contact
              <br />
              Customer Support?
            </h3>
            <p className="text-xs text-[#88909D] mb-6">Contact us for further assistance.</p>
            <Link href="/help-support">
              <button
                type="button"
                className="bg-[#3232b7] hover:bg-opacity-90 text-white font-bold py-3 px-6 rounded-[4px] text-sm cursor-pointer"
              >
                Visit Help &amp; Support
              </button>
            </Link>
          </div>
        </div>
      </div>

      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        analysis={analysis}
      />
    </>
  );
}

