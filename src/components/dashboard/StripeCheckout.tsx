"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStripe, useElements, CardNumberElement, CardExpiryElement, CardCvcElement } from "@stripe/react-stripe-js";
import { paymentService } from "@/lib/paymentService";
import { authService } from "@/lib/authService";
import { useCurrency } from "@/context/CurrencyContext";
import StatusPopup from "@/components/common/StatusPopup";
import VisaIcon from "@/components/icons/visa";
import MastercardIcon from "@/components/icons/mastercard";
import AmexIcon from "@/components/icons/amex";
import DiscoverIcon from "@/components/icons/discover";

const CARD_ELEMENT_OPTIONS = {
  disableLink: true,
  style: {
    base: {
      color: "#1f2937",
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSmoothing: "antialiased",
      fontSize: "14px",
      "::placeholder": { color: "#9ca3af" },
    },
    invalid: { color: "#ef4444", iconColor: "#ef4444" },
  },
};

interface StripeCheckoutProps {
  type: "PROJECT" | "PACKAGE" | "BUNDLE" | "QUOTE";
  entityId: string;
  entityNumber: string;
  title: string;
  description: string;
  date: string;
  totalCost: number;
  amountPaid: number;
  lineItems: any[];
  nativeCurrency?: string;
  successRedirectUrl?: string;
  hideCurrencyToggle?: boolean;
  extraMetadata?: any;
}

export default function StripeCheckout({
  type,
  entityId,
  entityNumber,
  title,
  description,
  date,
  totalCost,
  amountPaid,
  lineItems,
  nativeCurrency = "usd",
  successRedirectUrl = "/dashboard/my-projects",
  hideCurrencyToggle = false,
  extraMetadata = {}
}: StripeCheckoutProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { currency: currentCurrency, setCurrency, conversionRate } = useCurrency();

  const [processing, setProcessing] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, type: "success" as "success" | "error", title: "", message: "" });
  const [useCredits, setUseCredits] = useState(false);
  const [userCredits, setUserCredits] = useState(0);
  const [paymentMode, setPaymentMode] = useState<"full" | "custom">("full");
  const [customAmount, setCustomAmount] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [cardholderName, setCardholderName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [savedMethods, setSavedMethods] = useState<any[]>([]);
  const [selectedMethod, setSelectedMethod] = useState("new");
  const [errors, setErrors] = useState<any>({});
  const [cardStatus, setCardStatus] = useState<any>({
    number: { complete: false, error: null },
    expiry: { complete: false, error: null },
    cvc: { complete: false, error: null }
  });
  const [billingSameAsBusiness, setBillingSameAsBusiness] = useState(true);
  const [billingAddress, setBillingAddress] = useState({ street: "", city: "", state: "", zip: "", country: "" });

  useEffect(() => {
    const user = authService.getUser();
    if (user) {
      setUserCredits(user.credits || 0);
      setCardholderName(user.fullName || "");
      setBillingEmail(user.email || "");
    }

    const loadMethods = async () => {
      try {
        const res = await paymentService.getSavedPaymentMethods();
        if (res?.data && Array.isArray(res.data)) {
          setSavedMethods(res.data);
          if (res.data.length > 0) setSelectedMethod(res.data[0].id);
        }
      } catch (err) {
        console.error("Failed to load saved methods", err);
      }
    };
    loadMethods();
  }, []);

  const formatPrice = (val: number) => {
    let amount = val;
    const isEur = currentCurrency?.toLowerCase() === "eur";
    // Simple conversion if needed, though usually backend handles the actual conversion
    // For UI parity, we follow the conversion logic if it exists
    if (isEur && conversionRate) {
      amount = 10 * Math.round(amount / conversionRate / 10);
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currentCurrency?.toUpperCase() || "USD",
      minimumFractionDigits: isEur ? 0 : 2,
      maximumFractionDigits: isEur ? 0 : 2
    }).format(amount);
  };

  const amountRemaining = totalCost - amountPaid;
  const amountToPay = useMemo(() => {
    if (paymentMode === "custom" && customAmount) return parseFloat(customAmount);
    return amountRemaining;
  }, [paymentMode, customAmount, amountRemaining]);

  const creditsToApply = useCredits ? Math.min(userCredits, amountToPay) : 0;
  const netAmount = amountToPay - creditsToApply;

  const handleProcessPayment = async () => {
    if (!stripe || !elements || !termsAccepted) return;

    const currentErrors: any = {};
    if (paymentMode === "custom") {
      if (!customAmount || parseFloat(customAmount) <= 0) currentErrors.amount = "Enter a valid amount.";
      else if (parseFloat(customAmount) > amountRemaining) currentErrors.amount = "Cannot exceed remaining balance.";
    }

    if (netAmount > 0 && selectedMethod === "new") {
      if (!cardholderName.trim()) currentErrors.cardHolderName = "Name is required.";
      if (!cardStatus.number.complete) currentErrors.cardNumber = "Incomplete card number.";
      if (!cardStatus.expiry.complete) currentErrors.cardExpiry = "Incomplete expiry.";
      if (!cardStatus.cvc.complete) currentErrors.cardCvc = "Incomplete CVC.";
    }

    setErrors(currentErrors);
    if (Object.keys(currentErrors).length > 0) return;

    setProcessing(true);
    try {
      const res = await paymentService.createPaymentIntent({
        amount: amountToPay,
        currency: currentCurrency,
        creditsToApply,
        useCredits,
        metadata: {
          type,
          entityId,
          entityNumber,
          title,
          description,
          lineItems: Array.isArray(lineItems) ? lineItems.map(i => i.name || i).join(", ") : String(lineItems),
          ...extraMetadata
        }
      });

      if (!res.isSuccessful || !res.data) throw new Error(res.message || "Failed to initiate payment.");

      const { clientSecret, transactionId, fullyPaidByCredits } = res.data;

      if (fullyPaidByCredits) {
        setModal({ isOpen: true, type: "success", title: "Payment Successful", message: "Transaction completed using credits." });
        setTimeout(() => router.push(successRedirectUrl), 2000);
        return;
      }

      let paymentMethod;
      if (selectedMethod === "new") {
        const cardElement = elements.getElement(CardNumberElement);
        paymentMethod = {
          card: cardElement!,
          billing_details: {
            name: cardholderName,
            email: billingEmail,
            address: billingSameAsBusiness ? undefined : {
              line1: billingAddress.street,
              city: billingAddress.city,
              state: billingAddress.state,
              postal_code: billingAddress.zip,
              country: billingAddress.country
            }
          }
        };
      } else {
        paymentMethod = selectedMethod;
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, { payment_method: paymentMethod as any });
      if (error) throw new Error(error.message);

      if (paymentIntent?.status === "succeeded") {
        const confirmRes = await paymentService.confirmPayment({ transactionId });
        if (confirmRes.isSuccessful) {
          setModal({ isOpen: true, type: "success", title: "Payment Successful", message: "Your payment has been processed." });
          setTimeout(() => router.push(successRedirectUrl), 2000);
        } else {
          throw new Error("Confirmation failed. Please contact support.");
        }
      }
    } catch (err: any) {
      setModal({ isOpen: true, type: "error", title: "Payment Error", message: err.message || "An unexpected error occurred." });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <StatusPopup 
        isOpen={modal.isOpen} 
        onClose={() => setModal({ ...modal, isOpen: false })} 
        type={modal.type} 
        title={modal.title} 
        message={modal.message} 
      />

      {/* Left: Summary Card */}
      <div className="flex-1 bg-white border border-gray-300 rounded-[4px] p-6 md:p-10 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
          <div>
            <h2 className="text-[28px] md:text-[32px] font-bold text-gray-800 leading-tight pr-4">Payment Summary</h2>
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-500 font-medium">
              <span>{type === "PROJECT" ? "Project" : "Order"} # {entityNumber}</span>
              <span className="text-gray-300">|</span>
              <span>{new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
          </div>
          {!hideCurrencyToggle && (
            <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
              <button 
                onClick={() => setCurrency("usd")}
                className={`px-6 py-2 text-xs font-bold rounded-md uppercase transition-all ${currentCurrency === "usd" ? "bg-[#0D1939] text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                USD ($)
              </button>
              <button 
                onClick={() => setCurrency("eur")}
                className={`px-6 py-2 text-xs font-bold rounded-md uppercase transition-all ${currentCurrency === "eur" ? "bg-[#0D1939] text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                EUR (€)
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="pb-6 border-b border-gray-100">
            <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">Included Deliverables:</h4>
            <ul className="space-y-3">
              {lineItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-primary-300 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{item.name || item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Project Cost</span>
              <span className="font-bold text-gray-800">{formatPrice(totalCost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Amount Paid</span>
              <span className="font-bold text-green-600">{formatPrice(amountPaid)}</span>
            </div>
            <div className="flex justify-between pt-4 border-t border-gray-100">
              <span className="text-lg font-bold text-gray-800">Remaining Balance</span>
              <span className="text-2xl font-black text-gray-800">{formatPrice(amountRemaining)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Payment Details Card */}
      <div className="flex-1 flex flex-col gap-6">
        <div className="bg-white border border-gray-300 rounded-[4px] p-6 md:p-10 shadow-sm">
          <h3 className="text-xl font-bold text-gray-800 mb-8">Payment Details</h3>
          
          <div className="space-y-8">
            {/* Amount Selection */}
            <div>
              <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Amount to Pay</h4>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${paymentMode === "full" ? "border-primary-300" : "border-gray-300"}`}>
                    {paymentMode === "full" && <div className="w-2.5 h-2.5 rounded-full bg-primary-300" />}
                  </div>
                  <input type="radio" className="hidden" checked={paymentMode === "full"} onChange={() => setPaymentMode("full")} />
                  <span className="text-sm text-gray-700 font-medium">Pay Full Balance: <strong>{formatPrice(amountRemaining)}</strong></span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${paymentMode === "custom" ? "border-primary-300" : "border-gray-300"}`}>
                    {paymentMode === "custom" && <div className="w-2.5 h-2.5 rounded-full bg-primary-300" />}
                  </div>
                  <input type="radio" className="hidden" checked={paymentMode === "custom"} onChange={() => setPaymentMode("custom")} />
                  <span className="text-sm text-gray-700 font-medium">Pay Custom Amount</span>
                </label>
                {paymentMode === "custom" && (
                  <div className="ml-8 animate-in slide-in-from-left-2 duration-200">
                    <div className="relative w-full max-w-[200px]">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">{currentCurrency === "eur" ? "€" : "$"}</span>
                      <input 
                        type="number" 
                        value={customAmount} 
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className={`w-full bg-gray-50 border ${errors.amount ? "border-red-500" : "border-gray-300"} rounded-[4px] py-2.5 pl-8 pr-4 text-sm font-bold outline-none focus:border-primary-300`}
                        placeholder="0.00"
                      />
                    </div>
                    {errors.amount && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.amount}</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Credits Section */}
            {userCredits > 0 && (
              <div className="bg-blue-50/50 border border-blue-100 rounded-[4px] p-5">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-gray-700">Available Credits</h4>
                  <span className="text-lg font-black text-green-600">{formatPrice(userCredits)}</span>
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={useCredits} 
                    onChange={(e) => setUseCredits(e.target.checked)}
                    className="w-4 h-4 text-primary-300 mt-0.5 rounded border-gray-300 focus:ring-primary-300" 
                  />
                  <span className="text-xs text-gray-600 font-medium leading-relaxed">Apply credits to this payment. Remaining balance will be charged to your card.</span>
                </label>
              </div>
            )}

            {/* Payment Method Section */}
            <div>
              <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Payment Method</h4>
              <div className="space-y-3">
                {savedMethods.map((method) => (
                  <label 
                    key={method.id} 
                    className={`flex items-center justify-between p-4 border rounded-[4px] cursor-pointer transition-all ${selectedMethod === method.id ? "border-primary-300 bg-blue-50/30 ring-1 ring-primary-300" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedMethod === method.id ? "border-primary-300" : "border-gray-300"}`}>
                        {selectedMethod === method.id && <div className="w-2.5 h-2.5 rounded-full bg-primary-300" />}
                      </div>
                      <input type="radio" className="hidden" checked={selectedMethod === method.id} onChange={() => setSelectedMethod(method.id)} />
                      <div className="flex items-center gap-3">
                        <span className="capitalize text-sm font-bold text-gray-700">{method.brand}</span>
                        <span className="text-sm text-gray-500 font-medium">•••• {method.last4}</span>
                      </div>
                    </div>
                    {method.brand === "visa" && <VisaIcon className="h-4" />}
                    {method.brand === "mastercard" && <MastercardIcon className="h-6" />}
                    {method.brand === "amex" && <AmexIcon className="h-5" />}
                    {method.brand === "discover" && <DiscoverIcon className="h-4" />}
                  </label>
                ))}
                
                <label className={`flex items-center gap-4 p-4 border rounded-[4px] cursor-pointer transition-all ${selectedMethod === "new" ? "border-primary-300 bg-blue-50/30 ring-1 ring-primary-300" : "border-gray-200 hover:border-gray-300"}`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedMethod === "new" ? "border-primary-300" : "border-gray-300"}`}>
                    {selectedMethod === "new" && <div className="w-2.5 h-2.5 rounded-full bg-primary-300" />}
                  </div>
                  <input type="radio" className="hidden" checked={selectedMethod === "new"} onChange={() => setSelectedMethod("new")} />
                  <span className="text-sm font-bold text-gray-700">Add a new payment method</span>
                </label>
              </div>

              {selectedMethod === "new" && (
                <div className="mt-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300 bg-gray-50/50 p-6 rounded-[4px] border border-gray-100">
                  {/* Billing address toggle */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={billingSameAsBusiness}
                        onChange={(e) => setBillingSameAsBusiness(e.target.checked)}
                        className="w-4 h-4 text-[#3535b8] rounded border-gray-300 focus:ring-[#3535b8]"
                      />
                      <span className="text-sm font-medium text-gray-700">Billing address is the same as Business details</span>
                    </label>
                  </div>

                  {/* Custom billing address fields */}
                  {!billingSameAsBusiness && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-white rounded border border-gray-200">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Street Address</label>
                        <input
                          type="text"
                          value={billingAddress.street}
                          onChange={(e) => setBillingAddress(a => ({ ...a, street: e.target.value }))}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm focus:border-blue-500 outline-none"
                          placeholder="123 Main St"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
                        <input
                          type="text"
                          value={billingAddress.city}
                          onChange={(e) => setBillingAddress(a => ({ ...a, city: e.target.value }))}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm focus:border-blue-500 outline-none"
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">State / Province</label>
                        <input
                          type="text"
                          value={billingAddress.state}
                          onChange={(e) => setBillingAddress(a => ({ ...a, state: e.target.value }))}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm focus:border-blue-500 outline-none"
                          placeholder="State/Province"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">ZIP / Postal Code</label>
                        <input
                          type="text"
                          value={billingAddress.zip}
                          onChange={(e) => setBillingAddress(a => ({ ...a, zip: e.target.value }))}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm focus:border-blue-500 outline-none"
                          placeholder="ZIP Code"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Country</label>
                        <input
                          type="text"
                          value={billingAddress.country}
                          onChange={(e) => setBillingAddress(a => ({ ...a, country: e.target.value }))}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm focus:border-blue-500 outline-none"
                          placeholder="Country Code (e.g. US)"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Cardholder Name</label>
                    <input 
                      type="text" 
                      value={cardholderName} 
                      onChange={(e) => setCardholderName(e.target.value)}
                      placeholder="Full Name as on card"
                      className={`w-full px-4 py-3 bg-white border ${errors.cardHolderName ? "border-red-500" : "border-gray-300"} rounded-[4px] text-sm text-gray-700 focus:border-primary-300 outline-none`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Card Number</label>
                    <div className={`w-full px-4 py-3 bg-white border ${errors.cardNumber ? "border-red-500" : "border-gray-300"} rounded-[4px] text-sm focus-within:border-primary-300`}>
                      <CardNumberElement options={CARD_ELEMENT_OPTIONS} onChange={(e) => setCardStatus((p: any) => ({ ...p, number: { complete: e.complete, error: e.error } }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Expiry</label>
                      <div className={`w-full px-4 py-3 bg-white border ${errors.cardExpiry ? "border-red-500" : "border-gray-300"} rounded-[4px] text-sm focus-within:border-primary-300`}>
                        <CardExpiryElement options={CARD_ELEMENT_OPTIONS} onChange={(e) => setCardStatus((p: any) => ({ ...p, expiry: { complete: e.complete, error: e.error } }))} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">CVC</label>
                      <div className={`w-full px-4 py-3 bg-white border ${errors.cardCvc ? "border-red-500" : "border-gray-300"} rounded-[4px] text-sm focus-within:border-primary-300`}>
                        <CardCvcElement options={CARD_ELEMENT_OPTIONS} onChange={(e) => setCardStatus((p: any) => ({ ...p, cvc: { complete: e.complete, error: e.error } }))} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Terms and Pay Button */}
            <div className="pt-4 space-y-6">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={termsAccepted} 
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="w-4 h-4 text-primary-300 mt-1 rounded border-gray-300 focus:ring-primary-300"
                />
                <span className="text-xs text-gray-500 font-medium leading-relaxed group-hover:text-gray-700 transition-colors">
                  I confirm that I have read and agree to the <strong>Terms of Service</strong> and <strong>Privacy Policy</strong>. I understand that my project will be initiated upon successful payment.
                </span>
              </label>

              <button 
                onClick={handleProcessPayment}
                disabled={processing || !termsAccepted}
                className={`w-full py-5 bg-[#3535b8] hover:bg-[#2a2a9a] text-white font-black rounded-[4px] shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-base uppercase tracking-widest`}
              >
                {processing ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  `Pay ${formatPrice(netAmount)} Now`
                )}
              </button>

              <div className="flex items-center justify-center gap-6 opacity-40 grayscale pt-2">
                <VisaIcon className="h-4" />
                <MastercardIcon className="h-6" />
                <AmexIcon className="h-5" />
                <DiscoverIcon className="h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Support Widget */}
        <div className="bg-gray-50 border border-gray-200 rounded-[4px] p-6 text-center">
          <h5 className="font-bold text-gray-700 mb-2">Need help with your payment?</h5>
          <p className="text-xs text-gray-500 mb-4 font-medium">Our support team is available 24/7 to assist you.</p>
          <button 
            onClick={() => (window as any).openChat?.()}
            className="text-xs font-bold text-primary-300 hover:underline underline-offset-4"
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}
