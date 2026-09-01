"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { paymentService } from "@/lib/paymentService";

export default function ProjectPaymentsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "succeeded":
      case "paid":
      case "completed":
        return "bg-green-100 text-green-700 border-green-200";
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

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gray-50/30">
        <h2 className="text-lg font-bold text-gray-800">Payment History</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Reference</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Description</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5356ff]"></div>
                    <span className="text-gray-400 text-sm font-medium">Loading history...</span>
                  </div>
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic text-sm font-medium">
                  No payment records found for this project.
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment._id || payment.id || payment.projectId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-gray-700">
                      #{payment.transactionNumber || payment.paymentIntentId?.slice(-8).toUpperCase() || (payment._id || payment.id || payment.projectId).slice(-8).toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-700">{payment.description || "Project Payment"}</span>
                      <span className="text-[10px] text-gray-400 uppercase font-bold">{payment.paymentMethod || "Card"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">
                    ${(payment.amount ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase ${getStatusColor(payment.status)}`}>
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && payments.length > 0 && (
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button className="text-[#5356ff] hover:text-[#3232b7] text-sm font-bold flex items-center gap-2 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download All Receipts
          </button>
        </div>
      )}
    </div>
  );
}
