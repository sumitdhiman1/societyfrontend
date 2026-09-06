"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useQuote } from "../layout";
import { authService } from "@/lib/authService";
import { paymentService } from "@/lib/paymentService";
import { useCurrency } from "@/context/CurrencyContext";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

const stripeOptions = {
  disableLink: true,
  style: {
    base: {
      color: "#1f2937",
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSmoothing: "antialiased",
      fontSize: "14px",
      "::placeholder": { color: "#9ca3af" }
    },
    invalid: { color: "#ef4444", iconColor: "#ef4444" }
  }
};

const CustomPopup = ({ isOpen, onClose, type, title, message }: any) => {
  const [show, setShow] = useState(isOpen);

  useEffect(() => {
    if (isOpen) setShow(true);
    else {
      const timer = setTimeout(() => setShow(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!show && !isOpen) return null;
  const isSuccess = type === "success";
  const iconColor = isSuccess ? "text-[#5356FF]" : "text-red-500";

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 px-4 ${isOpen ? "opacity-100" : "opacity-0"}`}>
      <button type="button" className="absolute inset-0 w-full h-full bg-[#1a2847]/60 backdrop-blur-sm cursor-default border-none outline-none appearance-none p-0 m-0" onClick={onClose} aria-label="Close popup" />
      <div className={`relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 transform transition-all duration-300 ${isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"}`}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full" aria-label="Close">✕</button>
        <div className="flex flex-col items-center text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${isSuccess ? "bg-[#5356FF]/10" : "bg-red-50"}`}>
            {isSuccess ? (
              <svg className={`w-10 h-10 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className={`w-10 h-10 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <h3 className="text-2xl font-bold mb-3 text-gray-900">{title}</h3>
          <p className="text-gray-500 mb-8 leading-relaxed px-4">{message}</p>
          <button onClick={onClose} className={`w-full py-3.5 rounded-xl font-bold text-white transition-all shadow-lg hover:shadow-xl active:scale-[0.98] ${isSuccess ? "bg-[#5356FF] hover:bg-[#4346DD]" : "bg-red-500 hover:bg-red-600"} ${isSuccess ? "shadow-blue-500/20" : "shadow-red-500/20"}`}>
            {type === "success" ? "Continue" : "Try Again"}
          </button>
        </div>
      </div>
    </div>
  );
};

const InvoicePreview = ({ isOpen, onClose, quoteNumber, totalCost, deliverableItems, description }: any) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800">Invoice Preview</h2>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" title="Print Invoice">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </button>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-grow overflow-y-auto p-6 sm:p-10 bg-white" id="invoice-preview-area">
          <div className="flex justify-between items-start mb-12">
            <div>
              <div className="text-3xl font-extrabold text-[#4343F0] mb-2 tracking-tight">SOCIETY</div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Web Solutions & Digital Marketing</p>
            </div>
            <div className="text-right">
              <h3 className="text-2xl font-bold text-gray-800 mb-1">INVOICE</h3>
              <p className="text-sm text-gray-500 font-semibold">Project No: {quoteNumber}</p>
              <p className="text-sm text-gray-500 font-semibold">Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-8 mb-12">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Package Selected</p>
              <h4 className="text-lg font-bold text-gray-800">{description || "Custom Pack"}</h4>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden mb-8 shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/80 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-bold text-gray-600">Included Item/Feature</th>
                  <th className="px-6 py-4 text-right font-bold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deliverableItems?.map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="px-6 py-4 text-gray-600 font-medium">
                      {item.description}
                      {item.details && <p className="text-[10px] text-gray-400 font-normal">{item.details}</p>}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-800 font-bold">
                      ${(item.amount || item.cost || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end pr-6">
            <div className="w-full max-w-xs space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-bold uppercase tracking-wider">Subtotal:</span>
                <span className="text-gray-800 font-bold">${totalCost?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-bold uppercase tracking-wider">Tax (0%):</span>
                <span className="text-gray-800 font-bold">$0.00</span>
              </div>
              <div className="h-px bg-gray-200 w-full pt-1" />
              <div className="flex justify-between items-center pt-2">
                <span className="text-lg font-extrabold text-gray-800 uppercase tracking-tighter">Total Due:</span>
                <span className="text-2xl font-black text-gray-900 tracking-tight">${totalCost?.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
          <button onClick={handlePrint} className="w-full sm:w-auto px-6 py-2.5 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Quote
          </button>
          <button onClick={onClose} className="w-full sm:w-auto bg-[#4343F0] hover:bg-[#3232b7] text-white text-xs font-bold py-2.5 px-10 rounded-lg shadow-md transition-all active:scale-95">
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};

function QuotePaymentForm({ quoteDetails, totalCost, depositAmount }: any) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  
  const [paymentOption, setPaymentOption] = useState("full");
  const [customAmount, setCustomAmount] = useState("");
  const [cardHolderName, setCardHolderName] = useState("");
  const [saveCard, setSaveCard] = useState(true);
  
  const { currency, setCurrency } = useCurrency();
  const formatCurrency = (amt: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amt);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [showInvoice, setShowInvoice] = useState(false);
  
  const [cardState, setCardState] = useState({
    number: { complete: false, error: null as any },
    expiry: { complete: false, error: null as any },
    cvc: { complete: false, error: null as any }
  });
  
  const [popup, setPopup] = useState({ isOpen: false, type: "success", title: "", message: "" });

  useEffect(() => {
    const user = authService.getUser();
    if (user?.fullName) setCardHolderName(user.fullName);
  }, []);

  const getAmountToPay = () => {
    if (paymentOption === "half") return depositAmount;
    if (paymentOption === "full") return totalCost;
    if (paymentOption === "other" && customAmount) return Number.parseFloat(customAmount);
    return totalCost;
  };

  const handlePayment = async () => {
    if (!stripe || !elements) return;
    
    const errs: any = {};
    if (paymentOption === "other") {
      if (!customAmount || Number.parseFloat(customAmount) <= 0) errs.amount = "Enter a valid amount.";
      else if (Number.parseFloat(customAmount) > totalCost) errs.amount = "Cannot exceed total cost.";
      else if (Number.parseFloat(customAmount) < depositAmount - 0.01) errs.amount = `Min ${formatCurrency(depositAmount)}.`;
    }
    
    if (!cardHolderName.trim()) errs.cardHolderName = "Cardholder name is required.";
    if (!cardState.number.complete) errs.cardNumber = cardState.number.error?.message || "Incomplete card number.";
    if (!cardState.expiry.complete) errs.cardExpiry = cardState.expiry.error?.message || "Incomplete expiry date.";
    if (!cardState.cvc.complete) errs.cardCvc = cardState.cvc.error?.message || "Incomplete CVC.";
    
    setErrors(errs);
    if (Object.keys(errs).length !== 0) return;
    
    const amount = getAmountToPay();
    setIsProcessing(true);
    
    try {
      const intentRes = await paymentService.createPaymentIntent({
        amount,
        currency,
        payment_method_types: ["card"],
        saveCard,
        metadata: { type: "QUOTE", quoteId: quoteDetails._id, quoteNumber: quoteDetails.quoteNumber }
      });
      
      if (!intentRes.isSuccessful || !intentRes.data) {
        throw new Error(intentRes.message || "Failed to initialize payment.");
      }
      
      const { clientSecret, transactionId } = intentRes.data;
      const cardElement = elements.getElement(CardNumberElement);
      if (!cardElement) throw new Error("Card element not found.");
      
      const confirmRes = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElement, billing_details: { name: cardHolderName, email: quoteDetails.client?.email } },
        setup_future_usage: saveCard ? "off_session" : undefined
      });
      
      if (confirmRes.error) throw new Error(confirmRes.error.message);
      
      if (confirmRes.paymentIntent.status === "succeeded") {
        const confirmResult = await paymentService.confirmPayment({ transactionId });
        if (confirmResult.isSuccessful) {
          setPopup({ isOpen: true, type: "success", title: "Payment Successful", message: "Your payment has been processed successfully." });
          setTimeout(() => {
            router.push(`/dashboard/my-quotes/${quoteDetails._id}`);
          }, 2000);
        } else {
          throw new Error("Payment succeeded but server confirmation failed. Please contact support.");
        }
      }
    } catch (e: any) {
      console.error("Payment Error:", e);
      setPopup({ isOpen: true, type: "error", title: "Payment Failed", message: e.message || "An unexpected error occurred." });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <CustomPopup isOpen={popup.isOpen} onClose={() => setPopup({ ...popup, isOpen: false })} type={popup.type} title={popup.title} message={popup.message} />
      
      <div className="lg:col-span-2">
        <div className="bg-white border border-gray-300 rounded-lg p-8">
          <div className="flex justify-between items-start mb-6">
            <div className="max-w-[70%]">
              <h2 className="text-xl font-medium text-gray-700 mb-2 leading-snug line-clamp-2" title={quoteDetails.projectDescription || quoteDetails.projectTitle}>
                {quoteDetails.projectDescription || quoteDetails.projectTitle}
              </h2>
              <div className="flex items-center gap-3 text-xs text-gray-400 mt-4">
                <span>Project #{quoteDetails.quoteNumber}</span>
                <span className="text-gray-300">|</span>
                <button type="button" onClick={() => setShowInvoice(true)} className="text-gray-500 underline underline-offset-2 hover:text-gray-700">View invoice</button>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-600">{formatCurrency(totalCost)}</div>
          </div>
          
          {((quoteDetails.lineItems && quoteDetails.lineItems.length > 0) || (quoteDetails.deliverableItems && quoteDetails.deliverableItems.length > 0)) && (
            <div className="border border-gray-200 rounded-lg overflow-hidden mb-10">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-white">
                    <th className="text-left py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="text-left py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Duration</th>
                    <th className="text-right py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(quoteDetails.lineItems || quoteDetails.deliverableItems).map((item: any, i: number) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="py-4 px-6 text-sm text-gray-600">
                        <div className="font-medium mb-1">{item.description || item.name}</div>
                        <div className="text-gray-400 text-xs">{item.details}</div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-500">{item.duration}</td>
                      <td className="py-4 px-6 text-sm text-gray-600 font-medium text-right">{formatCurrency(item.amount || item.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-gray-700 font-bold text-lg">Pay Amount</h3>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button type="button" onClick={() => setCurrency("usd")} className={`px-3 py-1 text-xs font-bold rounded-md ${currency === "usd" ? "bg-white shadow text-gray-800" : "text-gray-500"}`}>USD</button>
                <button type="button" onClick={() => setCurrency("eur")} className={`px-3 py-1 text-xs font-bold rounded-md ${currency === "eur" ? "bg-white shadow text-gray-800" : "text-gray-500"}`}>EUR</button>
              </div>
            </div>
            
            <div className="space-y-4 mb-8">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${paymentOption === "half" ? "border-gray-800" : "border-gray-300"}`}>
                  {paymentOption === "half" && <div className="w-3 h-3 rounded-full bg-gray-600" />}
                </div>
                <input type="radio" className="hidden" checked={paymentOption === "half"} onChange={() => setPaymentOption("half")} />
                <span className="text-gray-600 text-sm">Deposit half: <span className="font-medium">{formatCurrency(depositAmount)}</span></span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${paymentOption === "full" ? "border-gray-800" : "border-gray-300"}`}>
                  {paymentOption === "full" && <div className="w-3 h-3 rounded-full bg-gray-600" />}
                </div>
                <input type="radio" className="hidden" checked={paymentOption === "full"} onChange={() => setPaymentOption("full")} />
                <span className="text-gray-600 text-sm">Pay full: <span className="font-medium">{formatCurrency(totalCost)}</span></span>
              </label>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Name on card</label>
                <input type="text" value={cardHolderName} onChange={e => setCardHolderName(e.target.value)} className="w-full bg-gray-100 rounded-md px-4 py-3 text-sm outline-none" />
                {errors.cardHolderName && <p className="text-red-500 text-xs mt-1">{errors.cardHolderName}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Card number</label>
                <div className="w-full bg-gray-100 rounded-md px-4 py-3 text-sm">
                  <CardNumberElement options={stripeOptions} onChange={e => setCardState(s => ({ ...s, number: { complete: e.complete, error: e.error } }))} />
                </div>
                {errors.cardNumber && <p className="text-red-500 text-xs mt-1">{errors.cardNumber}</p>}
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">Expiry</label>
                  <div className="w-full bg-gray-100 rounded-md px-4 py-3 text-sm">
                    <CardExpiryElement options={stripeOptions} onChange={e => setCardState(s => ({ ...s, expiry: { complete: e.complete, error: e.error } }))} />
                  </div>
                  {errors.cardExpiry && <p className="text-red-500 text-xs mt-1">{errors.cardExpiry}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">CVC</label>
                  <div className="w-full bg-gray-100 rounded-md px-4 py-3 text-sm">
                    <CardCvcElement options={stripeOptions} onChange={e => setCardState(s => ({ ...s, cvc: { complete: e.complete, error: e.error } }))} />
                  </div>
                  {errors.cardCvc && <p className="text-red-500 text-xs mt-1">{errors.cardCvc}</p>}
                </div>
              </div>
              
              <button onClick={handlePayment} disabled={isProcessing || !stripe || !elements} className="w-full bg-[#1e293b] text-white font-medium py-3 rounded-md text-sm mt-4 disabled:opacity-70">
                {isProcessing ? "Processing..." : `Pay ${formatCurrency(getAmountToPay())} now`}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="lg:col-span-1">
        <div className="bg-white border border-gray-300 rounded-lg p-10 text-center sticky top-8">
          <h3 className="text-xl font-bold text-gray-600 mb-2">Need Help?</h3>
          <p className="text-gray-500 text-xs mb-8">Contact us for assistance.</p>
          <Link href="/help-support">
            <button className="bg-[#3232b7] text-white text-xs font-medium py-3 px-8 rounded-md w-full">Support</button>
          </Link>
        </div>
      </div>
      
      <InvoicePreview isOpen={showInvoice} onClose={() => setShowInvoice(false)} quoteNumber={`#${quoteDetails.quoteNumber}`} totalCost={totalCost} deliverableItems={quoteDetails.lineItems || quoteDetails.deliverableItems} description={quoteDetails.projectDescription || quoteDetails.projectTitle} />
    </div>
  );
}

export default function QuotePaymentPage() {
  const { quote } = useQuote();
  if (!quote) return null;
  const totalCost = quote.totalCost || quote.estimatedPrice || 0;
  
  return (
    <Elements stripe={stripePromise}>
      <QuotePaymentForm quoteDetails={quote} totalCost={totalCost} depositAmount={totalCost * 0.5} />
    </Elements>
  );
}
