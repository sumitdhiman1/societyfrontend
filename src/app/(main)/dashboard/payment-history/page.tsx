"use client";

import React, { useState, useEffect } from "react";
import DashboardSubNav from "@/components/dashboard/DashboardSubNav";
import { paymentService } from "@/lib/paymentService";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";

// DatePicker component
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

function DatePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date | null;
  onChange: (d: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(value || new Date());
  const [view, setView] = useState(value || new Date());

  useEffect(() => {
    if (open) {
      const d = value || new Date();
      setCurrent(d);
      setView(d);
    }
  }, [open, value]);

  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const firstDay = new Date(view.getFullYear(), view.getMonth(), 1).getDay();

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(<div key={`empty-${i}`} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const selected =
      value &&
      current.getDate() === d &&
      current.getMonth() === view.getMonth() &&
      current.getFullYear() === view.getFullYear();
    cells.push(
      <button
        key={d}
        type="button"
        onClick={() => setCurrent(new Date(view.getFullYear(), view.getMonth(), d))}
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
          selected
            ? "bg-[#4545F0] text-white shadow-sm"
            : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        {d}
      </button>
    );
  }

  return (
    <div className="relative">
      <label className="block text-[10px] font-bold text-gray-800 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2.5 bg-[#E5E7EB]/80 hover:bg-[#E5E7EB] rounded-md px-3.5 py-2 w-[160px] md:w-[170px] cursor-pointer transition-colors h-[38px] text-left"
      >
        <div className="text-gray-600 flex-shrink-0">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <span className="text-xs text-gray-700 font-semibold truncate">
          {value
            ? value.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "Select date"}
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-[360px] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                {current.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </h2>
              <button
                type="button"
                onClick={() => {
                  const t = new Date();
                  setCurrent(t);
                  setView(t);
                }}
                className="px-3 py-1 border border-gray-200 rounded-md text-[10px] font-bold text-gray-600 hover:bg-gray-50 uppercase"
              >
                Today
              </button>
            </div>

            <div className="flex justify-between items-center mb-4 px-1">
              <button
                type="button"
                onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <div className="flex gap-2 font-bold text-sm text-gray-800">
                <span>{MONTHS[view.getMonth()]}</span>
                <span>{view.getFullYear()}</span>
              </div>
              <button
                type="button"
                onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <div className="grid grid-cols-7 mb-2">
                {DAYS.map((d, i) => (
                  <div key={i} className="text-center text-[11px] font-bold text-gray-400">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1.5 gap-x-1">{cells}</div>
            </div>

            <div className="flex items-center justify-end border-t border-gray-100 pt-4 gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(current);
                  setOpen(false);
                }}
                className="px-5 py-2 rounded-md bg-[#4545F0] hover:bg-[#3737D8] text-white text-xs font-semibold shadow-sm transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PaymentHistoryPage() {
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const params: any = {};
        if (fromDate) {
          const d = new Date(fromDate);
          d.setHours(0, 0, 0, 0);
          params.startDate = d.toISOString();
        }
        if (toDate) {
          const d = new Date(toDate);
          d.setHours(23, 59, 59, 999);
          params.endDate = d.toISOString();
        }
        const res = await paymentService.getHistory(params);
        if (res?.data) setPayments(res.data);
      } catch (e) {
        console.error("Failed to fetch payment history:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [fromDate, toDate]);

  const handleDownloadReceipt = async (payment: any) => {
    try {
      setLoading(true);
      const { invoiceService } = await import("@/lib/invoiceService");
      const res = await invoiceService.getInvoiceByTransaction(payment._id);
      const invoice = res?.data;
      if (invoice) {
        const { generateInvoicePDF } = await import("@/lib/generateInvoicePDF");
        await generateInvoicePDF(invoice);
      } else {
        alert("No receipt found for this payment");
      }
    } catch (e) {
      console.error("Failed to fetch/download receipt:", e);
      alert("Failed to load receipt. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (payments.length === 0) return void alert("No data to export");
    const getDesc = (p: any) => {
      const meta = p?.metadata || {};
      if (meta.type === "QUOTE" || meta.quoteNumber || meta.invoiceNumber) {
        const num = meta.quoteNumber || meta.invoiceNumber;
        return `Payment for Quote ${num ? `#${num}` : ""}`;
      }
      return meta.title ? `Payment for ${meta.title}` : "Payment Transaction";
    };
    const rows = [
      "Date,Transaction,Amount,Currency,Status,Payment Method,Transaction ID",
      ...payments.map((p) => {
        const date = new Date(p.createdAt).toLocaleDateString();
        const desc = getDesc(p);
        return [
          date,
          `"${desc}"`,
          p.amount,
          (p.currency || "USD").toUpperCase(),
          p.status,
          p.paymentMethod,
          p.externalTransactionId,
        ].join(",");
      }),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute(
      "download",
      `payment_history_${new Date().toISOString().split("T")[0]}.csv`
    );
    a.style.visibility = "hidden";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const formatRowDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      const datePart = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const timePart = d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return `${datePart}, ${timePart}`;
    } catch {
      return dateString;
    }
  };

  const getTransactionDesc = (p: any) => {
    const meta = p?.metadata || {};
    if (meta.type === "QUOTE" || meta.quoteNumber || meta.invoiceNumber) {
      const num = meta.quoteNumber || meta.invoiceNumber || meta.quoteId;
      if (num) {
        const cleanNum = String(num).startsWith("#") ? num : `#${num}`;
        return `Payment for Quote ${cleanNum}`;
      }
      return "Payment for Quote";
    }
    return "Payment Transaction";
  };

  const formatAmount = (amount: number, curr?: string) => {
    const code = (curr || "usd").toUpperCase();
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: code,
      }).format(amount);
    } catch {
      return `${code} ${amount.toFixed(2)}`;
    }
  };

  return (
    <div className="bg-white min-h-screen flex flex-col font-sans">
      <DashboardSubNav />
      <main className="flex-grow max-w-[1536px] mx-auto w-full px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-8 md:pt-10 pb-16">
        {/* Page Title */}
        <h1 className="text-[26px] md:text-[30px] font-bold text-gray-900 mb-8">
          Payment History
        </h1>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-end gap-4 mb-8">
          {/* FROM Date */}
          <div>
            <DatePicker label="FROM" value={fromDate} onChange={setFromDate} />
          </div>

          {/* TO Date */}
          <div>
            <DatePicker label="TO" value={toDate} onChange={setToDate} />
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setFromDate(null);
                setToDate(null);
              }}
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 text-xs font-semibold px-6 py-2.5 rounded-md transition-colors h-[38px] flex items-center justify-center"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="bg-[#4545F0] hover:bg-[#3737D8] text-white text-xs font-semibold px-6 py-2.5 rounded-md shadow-sm transition-colors h-[38px] flex items-center justify-center"
            >
              Export (.CSV)
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="border border-gray-200 rounded-lg overflow-x-auto bg-white shadow-none">
          <div className="min-w-[760px] md:min-w-full">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4545F0]" />
              </div>
            ) : payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <p className="text-base font-semibold text-gray-700 mb-1">
                  No payments found
                </p>
                <p className="text-xs text-gray-400">
                  Try adjusting your date range filter
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-gray-200">
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-[18%] border-r border-gray-200">
                      DATE
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-[52%] border-r border-gray-200">
                      TRANSACTION
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-[16%] border-r border-gray-200">
                      AMOUNT
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-[14%]">
                      DOCUMENTS
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {payments.map((p, i) => (
                    <tr
                      key={p._id || i}
                      className={`border-b border-gray-200 hover:bg-gray-50/50 transition-colors ${
                        i === payments.length - 1 ? "border-b-0" : ""
                      }`}
                    >
                      {/* DATE */}
                      <td className="px-6 py-3.5 text-xs text-gray-600 font-medium whitespace-nowrap border-r border-gray-200">
                        {formatRowDate(p.createdAt)}
                      </td>

                      {/* TRANSACTION */}
                      <td className="px-6 py-3.5 text-sm font-bold text-gray-900 border-r border-gray-200">
                        {getTransactionDesc(p)}
                      </td>

                      {/* AMOUNT */}
                      <td className="px-6 py-3.5 text-sm font-bold text-gray-900 border-r border-gray-200">
                        {formatAmount(p.amount, p.currency)}
                      </td>

                      {/* DOCUMENTS */}
                      <td className="px-6 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleDownloadReceipt(p)}
                          className="bg-[#4545F0] hover:bg-[#3737D8] text-white text-xs font-semibold px-6 py-2 rounded-md shadow-sm transition-all w-full max-w-[96px] text-center"
                        >
                          Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="mt-16">
          <SupportNewsletter noPadding />
        </div>
      </main>
    </div>
  );
}
