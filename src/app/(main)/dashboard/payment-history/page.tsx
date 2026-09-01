"use client";

import React, { useState, useEffect } from "react";
import DashboardSubNav from "@/components/dashboard/DashboardSubNav";
import { paymentService } from "@/lib/paymentService";

// DatePicker component matching production dist
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

function DatePicker({ label, value, onChange }: { label: string; value: Date | null; onChange: (d: Date) => void }) {
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
  for (let i = 0; i < firstDay; i++) cells.push(<div key={`e-${i}`} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const selected =
      value &&
      current.getDate() === d &&
      current.getMonth() === view.getMonth() &&
      current.getFullYear() === view.getFullYear();
    cells.push(
      <button
        key={d}
        onClick={() => setCurrent(new Date(view.getFullYear(), view.getMonth(), d))}
        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium transition-all
          ${selected ? "bg-primary-300 text-white shadow-md hover:bg-primary-350" : "text-gray-700 hover:bg-gray-100"}`}
      >
        {d}
      </button>
    );
  }

  return (
    <div className="relative">
      <label className="block text-[10px] font-bold text-gray-800 uppercase tracking-wide mb-1">{label}</label>
      <div
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 bg-[#EBEBEB] rounded-[4px] px-3 py-2 w-[160px] cursor-pointer"
      >
        <div className="text-gray-800">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5z" />
          </svg>
        </div>
        <span className="text-xs text-gray-600 font-bold">
          {value ? value.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }) : "Select date"}
        </span>
      </div>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[1px] px-4">
          <div className="bg-white rounded-[12px] shadow-2xl p-8 w-full max-w-[400px] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-end mb-8">
              <h2 className="text-[28px] font-bold text-[#5E5E5E] leading-none">
                {current.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </h2>
              <button
                onClick={() => { const t = new Date(); setCurrent(t); setView(t); }}
                className="px-5 py-1.5 border border-[#E0E0E0] rounded-[4px] text-[10px] font-bold text-[#5E5E5E] hover:bg-gray-50 transition-colors uppercase tracking-wide"
              >
                Today
              </button>
            </div>

            <div className="flex justify-between items-center mb-6 px-2">
              <button
                onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <div className="flex gap-8 font-bold text-sm text-gray-800">
                <span>{MONTHS[view.getMonth()]}</span>
                <span>{view.getFullYear()}</span>
              </div>
              <button
                onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            <div className="mb-8">
              <div className="grid grid-cols-7 mb-4">
                {DAYS.map((d, i) => (
                  <div key={i} className="text-center text-[11px] font-medium text-gray-400">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-2 gap-x-1">{cells}</div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 pt-6 gap-4">
              <button
                onClick={() => setOpen(false)}
                className="w-[120px] py-2.5 rounded-[4px] bg-[#741b10] text-white text-xs font-bold hover:bg-[#5a150c] transition-colors uppercase tracking-wide"
              >
                Cancel
              </button>
              <button
                onClick={() => { onChange(current); setOpen(false); }}
                className="w-[120px] py-2.5 rounded-[4px] bg-primary-300 text-white text-xs font-bold hover:bg-primary-350 transition-colors uppercase tracking-wide"
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
      // Dynamic import of invoice service
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
      if (p?.type === "QUOTE") {
        const num = p.quoteNumber ? `#${p.quoteNumber}` : "";
        return `Payment for Quote ${num}`;
      }
      return "Payment Transaction";
    };
    const rows = [
      "Date,Transaction,Amount,Currency,Status,Payment Method,Transaction ID",
      ...payments.map((p) => {
        const date = new Date(p.createdAt).toLocaleDateString();
        const desc = getDesc(p.metadata);
        return [date, `"${desc}"`, p.amount, p.currency.toUpperCase(), p.status, p.paymentMethod, p.externalTransactionId].join(",");
      }),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", `payment_history_${new Date().toISOString().split("T")[0]}.csv`);
    a.style.visibility = "hidden";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const getTransactionDesc = (metadata: any) => {
    if (metadata?.type === "QUOTE") {
      const num = metadata.quoteNumber ? `#${metadata.quoteNumber}` : "";
      return `Payment for Quote ${num}`;
    }
    return "Payment Transaction";
  };

  return (
    <div className="bg-white min-h-screen flex flex-col font-sans">
      <DashboardSubNav />
      <main className="flex-grow max-w-[1536px] mx-auto w-full px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-8 md:pt-12 pb-12">
        <h1 className="text-[28px] md:text-[32px] font-medium text-primary-100 mb-8 md:mb-12">
          Payment History
        </h1>

        <div className="flex flex-wrap items-end gap-4 md:gap-5 mb-8 md:mb-10">
          <div className="w-full md:w-auto flex gap-4">
            <div className="flex-1 md:w-[200px]">
              <DatePicker label="From" value={fromDate} onChange={setFromDate} />
            </div>
            <div className="flex-1 md:w-[200px]">
              <DatePicker label="To" value={toDate} onChange={setToDate} />
            </div>
          </div>

          <div className="flex gap-4 w-full sm:w-auto">
            <button
              onClick={() => { setFromDate(null); setToDate(null); }}
              className="flex-1 sm:flex-none bg-white border border-gray-300 text-gray-600 text-xs font-bold px-6 md:px-8 py-3 rounded-[4px] transition-colors h-[42px] hover:bg-gray-50"
            >
              Reset
            </button>
            <button
              onClick={handleExportCSV}
              className="flex-1 sm:flex-none bg-[#5356ff] hover:bg-[#3232b7] text-white text-xs font-bold px-6 md:px-8 py-3 rounded-[4px] transition-colors h-[42px]"
            >
              Export (.CSV)
            </button>
          </div>
        </div>

        <div className="border border-gray-300 rounded-[4px] overflow-x-auto min-h-[400px] hide-scrollbar">
          <div className="min-w-[800px] md:min-w-full">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
              </div>
            ) : payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <p className="text-lg font-medium">No payments found</p>
                <p className="text-sm">Try adjusting your date range filter</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-gray-300">
                    <th className="px-4 md:px-8 py-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider w-[20%] md:w-[15%] border-r border-gray-300">Date</th>
                    <th className="px-4 md:px-8 py-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider w-[40%] md:w-[55%] border-r border-gray-300">Transaction</th>
                    <th className="px-4 md:px-8 py-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider w-[20%] md:w-[15%] border-r border-gray-300">Amount</th>
                    <th className="px-4 md:px-8 py-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider w-[20%] md:w-[15%]">Documents</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {payments.map((p, i) => (
                    <tr
                      key={p._id}
                      className={`border-b border-gray-300 text-sm hover:bg-gray-50 transition-colors ${i === payments.length - 1 ? "border-b-0" : ""}`}
                    >
                      <td className="px-4 md:px-8 py-6 text-gray-600 font-medium whitespace-nowrap border-r border-gray-300">
                        {new Date(p.createdAt).toLocaleDateString("en-US", {
                          day: "2-digit", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 md:px-8 py-6 text-gray-600 font-bold leading-relaxed max-w-lg border-r border-gray-300">
                        {getTransactionDesc(p.metadata)}
                        {p.metadata?.description && (
                          <span className="block text-xs text-gray-400 mt-1 font-normal">{p.metadata.description}</span>
                        )}
                      </td>
                      <td className="px-4 md:px-8 py-6 text-gray-800 font-bold border-r border-gray-300">
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: p.currency.toUpperCase() }).format(p.amount)}
                      </td>
                      <td className="px-4 md:px-8 py-6">
                        <button
                          onClick={() => handleDownloadReceipt(p)}
                          className="text-xs font-bold px-4 md:px-6 py-2 rounded-[4px] transition-colors w-full text-center bg-[#5356ff] hover:bg-[#3232b7] text-white cursor-pointer"
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
      </main>
    </div>
  );
}
