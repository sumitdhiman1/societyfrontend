"use client";

import React from "react";
import { useAnalysis } from "@/context/AnalysisContext";

export default function AnalysisPaymentsPage() {
  const { analysis } = useAnalysis();

  if (!analysis) return null;

  const isFree = analysis.isFree !== false || Number(analysis.price || 0) === 0;
  const amountDue = Number(analysis.amountDue || 0);
  const amountPaid = Number(analysis.amountPaid || 0);
  const totalPrice = Number(analysis.price || 0);

  return (
    <div className="space-y-8 font-sans">
      {/* Fully Paid Green Box / Status */}
      {isFree || amountDue === 0 ? (
        <div className="bg-[#E8F7EE] border border-[#27AE60]/30 rounded-xl p-8 flex items-center gap-5 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-[#27AE60] text-white flex items-center justify-center text-2xl font-bold shrink-0">
            ✓
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#1E7E34]">The analysis is fully paid</h3>
            <p className="text-sm text-[#2E7D32] mt-1">
              {isFree
                ? "This is a complimentary free analysis service provided by Society Web Solutions. No payment is required."
                : "All payments for this analysis order have been settled in full."}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xs">
          <div>
            <h3 className="text-xl font-bold text-amber-900">Payment Pending</h3>
            <p className="text-sm text-amber-800 mt-1">
              An outstanding balance of ${(amountDue).toFixed(2)} is pending for this analysis.
            </p>
          </div>
          <button className="px-8 py-3 bg-[#5356ff] hover:bg-[#3232b7] text-white font-bold rounded-lg text-sm transition-colors shadow-md">
            Pay ${(amountDue).toFixed(2)} Now
          </button>
        </div>
      )}

      {/* Summary Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-gray-800 mb-6">Payment Overview</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-6 border-b border-gray-100">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Price</span>
            <p className="text-2xl font-black text-gray-800 mt-1">
              {isFree ? "Free" : `$${totalPrice.toFixed(2)}`}
            </p>
          </div>
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Amount Paid</span>
            <p className="text-2xl font-black text-green-600 mt-1">
              {isFree ? "$0.00" : `$${amountPaid.toFixed(2)}`}
            </p>
          </div>
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Amount Due</span>
            <p className="text-2xl font-black text-gray-800 mt-1">
              $0.00
            </p>
          </div>
        </div>

        <div className="pt-6 flex justify-between items-center text-xs text-gray-400 font-medium">
          <span>Billing Type: Standard One-Time Order</span>
          <span>Receipt ID: {analysis.projectNumber || `#ANL-${analysis._id?.slice(-8).toUpperCase()}`}</span>
        </div>
      </div>
    </div>
  );
}
