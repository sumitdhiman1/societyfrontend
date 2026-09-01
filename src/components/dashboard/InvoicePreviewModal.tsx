"use client";

import React, { useRef } from "react";

interface DeliverableItem {
  description: string;
  details?: string;
  amount?: number;
  duration?: string;
  unit?: string;
}

interface IncludedFeature {
  name: string;
}

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageData?: any;
  selectedColumn?: any;
  totalCost: number;
  projectDuration?: string;
  projectNumber: string;
  includedFeatures?: IncludedFeature[];
  deliverableItems?: DeliverableItem[];
  vatAmount?: number;
  vatRate?: number;
}

export default function InvoicePreviewModal({
  isOpen,
  onClose,
  packageData,
  selectedColumn,
  totalCost,
  projectDuration,
  projectNumber,
  includedFeatures = [],
  deliverableItems = [],
  vatAmount = 0,
  vatRate = 0,
}: InvoicePreviewModalProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const isPackageBased = !!packageData && !!selectedColumn;

  if (!isOpen) return null;

  const handlePrint = () => {
    const content = invoiceRef.current;
    if (!content) return;

    const printWindow = window.open("", "", "width=900,height=900");
    if (printWindow) {
      printWindow.document.write("<html><head><title>Invoice Preview</title>");
      printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
      printWindow.document.write('</head><body class="bg-white p-8">');
      printWindow.document.write(content.innerHTML);
      printWindow.document.write("</body></html>");
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800">Invoice Preview</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Print Invoice"
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
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-6 sm:p-10" ref={invoiceRef}>
          {/* Invoice Header */}
          <div className="flex justify-between items-start mb-12">
            <div>
              <div className="text-3xl font-extrabold text-[#5356ff] mb-2 tracking-tight">SOCIETY</div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                Web Solutions & Digital Marketing
              </p>
            </div>
            <div className="text-right">
              <h3 className="text-2xl font-bold text-gray-800 mb-1">INVOICE</h3>
              <p className="text-sm text-gray-500 font-semibold">Project No: {projectNumber}</p>
              <p className="text-sm text-gray-500 font-semibold">Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-8 mb-12">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">
                Package Selected
              </p>
              <h4 className="text-lg font-bold text-gray-800">
                {packageData?.name || "Service Selection"}
              </h4>
              <p className="text-sm text-[#5356ff] font-bold">
                {selectedColumn?.title || "Custom Pack"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">
                Timeline Summary
              </p>
              <p className="text-sm text-gray-700 font-medium">Est. Duration: {projectDuration || "Pending"}</p>
              <p className="text-sm text-gray-700 font-medium">Start Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden mb-8 shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/80 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-bold text-gray-600">Included Item/Feature</th>
                  <th className="px-6 py-4 text-right font-bold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isPackageBased ? (
                  <>
                    <tr className="bg-blue-50/30">
                      <td className="px-6 py-5 font-bold text-gray-800">
                        {packageData?.name} - {selectedColumn?.title}
                        <p className="text-xs text-gray-500 font-normal mt-1 leading-relaxed">
                          {packageData?.description?.slice(0, 100)}...
                        </p>
                      </td>
                      <td className="px-6 py-5 text-right font-bold text-[#5356ff]">Included</td>
                    </tr>
                    {includedFeatures.map((feature, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 text-gray-600 font-medium">{feature.name}</td>
                        <td className="px-6 py-4 text-right text-green-600">
                          <svg className="w-4 h-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </td>
                      </tr>
                    ))}
                  </>
                ) : (
                  deliverableItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 text-gray-600 font-medium">
                        {item.description}
                        {item.details && <p className="text-[10px] text-gray-400 font-normal">{item.details}</p>}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-800 font-bold">${item.amount?.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end pr-6">
            <div className="w-full max-w-xs space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-bold uppercase tracking-wider">Subtotal:</span>
                <span className="text-gray-800 font-bold">${totalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-bold uppercase tracking-wider">Tax ({vatRate > 0 ? (vatRate * 100).toFixed(0) : "0"}%):</span>
                <span className="text-gray-800 font-bold">${vatAmount.toFixed(2)}</span>
              </div>
              <div className="h-px bg-gray-200 w-full pt-1" />
              <div className="flex justify-between items-center pt-2">
                <span className="text-lg font-extrabold text-gray-800 uppercase tracking-tighter">Total Due:</span>
                <span className="text-2xl font-black text-gray-900 tracking-tight">${(totalCost + vatAmount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400 font-medium leading-relaxed">
              Thank you for choosing Society Web Solutions. This is a pre-purchase invoice preview. Actual billing will occur upon selection of a payment plan.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
          <button
            onClick={handlePrint}
            className="w-full sm:w-auto px-6 py-2.5 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Print Quote
          </button>
          <button
            onClick={onClose}
            className="w-full sm:w-auto bg-[#5356ff] hover:bg-[#3232b7] text-white text-xs font-bold py-2.5 px-10 rounded-lg shadow-md transition-all active:scale-95"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
