"use client";

import React, { useState, useEffect, useMemo } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  useStripe,
  useElements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
} from "@stripe/react-stripe-js";
import { paymentService } from "@/lib/paymentService";
import { authService } from "@/lib/authService";
import { useRouter } from "next/navigation";
import { useCurrency } from "@/context/CurrencyContext";
import VisaIcon from "@/components/icons/visa";
import MastercardIcon from "@/components/icons/mastercard";
import AmexIcon from "@/components/icons/amex";
import StatusPopup from "@/components/common/StatusPopup";
import InvoicePreviewModal from "./InvoicePreviewModal";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

const EUROPEAN_COUNTRIES = [
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK", "GB", "CH", "NO", "IS", "LI"
];
const VAT_RATE = 0.20; // 20% VAT

const stripeElementOptions = {
  disableLink: true,
  style: {
    base: {
      color: "#1f2937",
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSmoothing: "antialiased",
      fontSize: "14px",
      "::placeholder": {
        color: "#9ca3af",
      },
    },
    invalid: {
      color: "#ef4444",
      iconColor: "#ef4444",
    },
  },
};

interface UnifiedPaymentFormProps {
  type: string;
  entityId: string;
  entityNumber: string;
  title: string;
  description: string;
  date: string;
  totalCost: number;
  depositAmount?: number;
  deliverableItems: any[];
  clientEmail: string;
  successRedirectUrl: string;
  amountPaid?: number;
  startDate?: string;
  deadline?: string;
  isFullyPaid?: boolean;
  hideCurrencyToggle?: boolean;
  nativeCurrency?: string;
  billingComponentId?: string;
  invoiceId?: string;
  metadata?: any;
  hideHeader?: boolean;
}

function PaymentForm({
  type,
  entityId,
  entityNumber,
  title,
  description,
  date,
  totalCost,
  depositAmount = 0,
  deliverableItems,
  clientEmail,
  successRedirectUrl,
  amountPaid = 0,
  startDate,
  deadline,
  isFullyPaid = false,
  hideCurrencyToggle = false,
  nativeCurrency = "USD",
  billingComponentId,
  invoiceId,
  metadata: extraMetadata,
  hideHeader = false,
}: UnifiedPaymentFormProps & { hideHeader?: boolean }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  
  const hasAlreadyPaid = amountPaid > 0;
  const [paymentOption, setPaymentOption] = useState<string>(hasAlreadyPaid ? "custom" : "full");
  const [customAmount, setCustomAmount] = useState<string>(hasAlreadyPaid ? totalCost.toFixed(2) : "");
  const [cardholderName, setCardholderName] = useState("");
  const { currency, setCurrency, conversionRate } = useCurrency();
  const [billingSameAsBusiness, setBillingSameAsBusiness] = useState(true);
  const [billingAddress, setBillingAddress] = useState({
    line1: "",
    city: "",
    state: "",
    postal_code: "",
    country: "US",
  });
  const [savedMethods, setSavedMethods] = useState<any[]>([]);
  const [selectedMethod, setSelectedMethod] = useState("new");
  const [saveCard, setSaveCard] = useState(true);
  const [isLoadingMethods, setIsLoadingMethods] = useState(false);
  const [userCountry, setUserCountry] = useState("US");

  const formatPrice = (amount: number) => {
    let convertedAmount = amount;
    if (nativeCurrency && nativeCurrency.toLowerCase() !== currency.toLowerCase()) {
      if (nativeCurrency.toLowerCase() === "usd" && currency === "eur") {
        convertedAmount = amount / conversionRate;
      } else if (nativeCurrency.toLowerCase() === "eur" && currency === "usd") {
        convertedAmount = amount * conversionRate;
      }
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(convertedAmount);
  };

  const [isProcessing, setIsProcessing] = useState(false);
  const [useCredits, setUseCredits] = useState(false);
  const [availableCredits, setAvailableCredits] = useState(0);
  const [formErrors, setFormErrors] = useState<any>({});
  const [cardStatus, setCardStatus] = useState<any>({
    number: { complete: false, error: null },
    expiry: { complete: false, error: null },
    cvc: { complete: false, error: null },
  });

  useEffect(() => {
    const initData = async () => {
      setIsLoadingMethods(true);
      try {
        const response = await paymentService.getSavedPaymentMethods();
        if (response.isSuccessful && response.data) {
          setSavedMethods(response.data);
          if (response.data.length > 0) {
            setSelectedMethod(response.data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch saved methods:", err);
      } finally {
        setIsLoadingMethods(false);
      }
    };

    const fetchCredits = async () => {
      const user = authService.getUser();
      if (user) {
        if (user.fullName) setCardholderName(user.fullName);
        try {
          // This is a dynamic import in the chunk, we assume profileService is available via lib
          const { profileService } = await import("@/lib/profileService");
          const profile = await profileService.getMyProfile();
          if (profile?.data) {
            setAvailableCredits(profile.data.credits || 0);
            setUserCountry(profile.data.country || profile.data.billingCountry || "US");
            authService.updateInternalUser({ credits: profile.data.credits || 0 });
          } else if (user.credits !== undefined) {
            setAvailableCredits(user.credits);
          }
        } catch (err) {
          console.error("Failed to fetch latest credits:", err);
          if (user.credits !== undefined) setAvailableCredits(user.credits);
        }
      }
    };

    fetchCredits();
    initData();
  }, []);

  const [popup, setPopup] = useState({
    isOpen: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const getPayableAmount = () => {
    let amount = totalCost;
    if (paymentOption === "half") amount = depositAmount;
    else if (paymentOption === "custom" && customAmount) amount = parseFloat(customAmount);
    
    // Add VAT if applicable
    const activeCountry = billingSameAsBusiness ? userCountry : billingAddress.country;
    const isEuropean = EUROPEAN_COUNTRIES.includes(activeCountry?.toUpperCase());
    
    if (isEuropean) {
      return amount * (1 + VAT_RATE);
    }
    
    return amount;
  };

  const getVatAmount = (baseAmount: number) => {
    const activeCountry = billingSameAsBusiness ? userCountry : billingAddress.country;
    const isEuropean = EUROPEAN_COUNTRIES.includes(activeCountry?.toUpperCase());
    return isEuropean ? baseAmount * VAT_RATE : 0;
  };

  const handleSubmit = async () => {
    if (!stripe || !elements) return;

    const user = authService.getUser();
    if (user && !user.isEmailVerified) {
      setPopup({
        isOpen: true,
        type: "error",
        title: "Email Verification Required",
        message:
          "To protect your financial security, payments and project starts are restricted for unverified accounts. Please verify your email using the banner at the top of your dashboard to continue.",
      });
      return;
    }

    const errors: any = {};
    const amount = getPayableAmount();
    const creditsToApply = useCredits ? Math.min(availableCredits, amount) : 0;

    if (paymentOption === "custom") {
      if (!customAmount || parseFloat(customAmount) <= 0) {
        errors.amount = "Please enter a valid amount.";
      } else if (parseFloat(customAmount) > totalCost) {
        errors.amount = `Amount cannot exceed pending balance ($${totalCost.toFixed(2)}).`;
      }
    }

    if (amount - creditsToApply > 0 && selectedMethod === "new") {
      if (!cardholderName.trim()) errors.cardHolderName = "Cardholder name is required.";
      if (!billingSameAsBusiness) {
        if (!billingAddress.line1.trim()) errors.billingLine1 = "Address is required.";
        if (!billingAddress.city.trim()) errors.billingCity = "City is required.";
        if (!billingAddress.state.trim()) errors.billingState = "State is required.";
        if (!billingAddress.postal_code.trim()) errors.billingZip = "ZIP is required.";
      }
      if (!cardStatus.number.complete) errors.cardNumber = cardStatus.number.error?.message || "Incomplete card number.";
      if (!cardStatus.expiry.complete) errors.cardExpiry = cardStatus.expiry.error?.message || "Incomplete expiry date.";
      if (!cardStatus.cvc.complete) errors.cardCvc = cardStatus.cvc.error?.message || "Incomplete CVC.";
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const finalAmount = getPayableAmount();
    const finalCredits = useCredits ? Math.min(availableCredits, finalAmount) : 0;

    setIsProcessing(true);
    try {
      const intentResponse = await paymentService.createPaymentIntent({
        amount: finalAmount,
        currency,
        useCredits,
        paymentMethodId: selectedMethod !== "new" ? selectedMethod : undefined,
        saveCard: selectedMethod === "new" && saveCard,
        invoiceId,
        metadata: {
          ...extraMetadata,
          type,
          [`${type.toLowerCase()}Id`]: entityId,
          [`${type.toLowerCase()}Number`]: entityNumber,
          billingComponentId,
        },
      });

      if (!intentResponse.isSuccessful || !intentResponse.data) {
        throw new Error(intentResponse.message || "Failed to initialize payment.");
      }

      const { clientSecret, transactionId, fullyPaidByCredits } = intentResponse.data;

      if (fullyPaidByCredits) {
        handlePaymentSuccess("Payment completed using your credits.", finalCredits);
        return;
      }

      await confirmStripePayment(clientSecret, transactionId, finalCredits);
    } catch (err: any) {
      console.error("Payment Error:", err);
      setPopup({
        isOpen: true,
        type: "error",
        title: "Payment Failed",
        message: err.message || "An unexpected error occurred.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = (msg: string, creditsUsed: number) => {
    setPopup({
      isOpen: true,
      type: "success",
      title: "Payment Successful",
      message: msg,
    });
    if (creditsUsed > 0) {
      const user = authService.getUser();
      if (user) {
        authService.updateInternalUser({
          credits: Math.max(0, (user.credits || 0) - creditsUsed),
        });
      }
    }
    setTimeout(() => router.push(successRedirectUrl), 2000);
  };

  const confirmStripePayment = async (clientSecret: string, transactionId: string, creditsUsed: number) => {
    if (!stripe || !elements) return;

    const cardElement = elements.getElement(CardNumberElement);
    if (selectedMethod === "new" && !cardElement) {
      throw new Error("Card element not found. Please ensure payment fields are visible.");
    }

    const billing_details = billingSameAsBusiness
      ? {}
      : {
          address: {
            line1: billingAddress.line1,
            city: billingAddress.city,
            state: billingAddress.state,
            postal_code: billingAddress.postal_code,
            country: billingAddress.country,
          },
        };

    const confirmResponse = await stripe.confirmCardPayment(clientSecret, {
      payment_method: selectedMethod !== "new" ? selectedMethod : {
        card: cardElement!,
        billing_details: {
          name: cardholderName,
          email: clientEmail,
          ...billing_details,
        },
      },
      setup_future_usage: selectedMethod === "new" ? "off_session" : undefined,
    });

    if (confirmResponse.error) {
      throw new Error(confirmResponse.error.message);
    }

    if (confirmResponse.paymentIntent?.status === "succeeded") {
      const confirmResult = await paymentService.confirmPayment({ transactionId });
      if (confirmResult.isSuccessful) {
        handlePaymentSuccess("Your payment has been processed successfully.", creditsUsed);
      } else {
        throw new Error("Payment succeeded but server confirmation failed. Please contact support.");
      }
    }
  };

  const regularItems = deliverableItems.filter((item) => !item.isAddOn);
  const addonItems = deliverableItems.filter((item) => item.isAddOn);
  const subtotalRegular = regularItems.reduce((acc, item) => acc + (item.amount || 0), 0);
  const subtotalAddons = addonItems.reduce((acc, item) => acc + (item.amount || 0), 0);

  return (
    <div className="bg-white border border-gray-300 rounded-lg p-4 sm:p-6 md:p-8">
      <StatusPopup
        isOpen={popup.isOpen}
        onClose={() => setPopup({ ...popup, isOpen: false })}
        type={popup.type}
        title={popup.title}
        message={popup.message}
      />

      {!hideHeader && (
        <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start mb-6 sm:mb-4 gap-4 sm:gap-6">
          <div className="w-full sm:max-w-[70%] order-2 sm:order-1">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-lg font-bold text-gray-800">Secure Payment</h2>
              {!hideCurrencyToggle && (
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setCurrency("usd")}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                      currency === "usd" ? "bg-white shadow text-gray-800" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    USD
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency("eur")}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                      currency === "eur" ? "bg-white shadow text-gray-800" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    EUR
                  </button>
                </div>
              )}
            </div>
            <p
              className="text-sm sm:text-gray-600 mb-4 leading-relaxed line-clamp-3 sm:line-clamp-2"
              title={description}
            >
              {description || title}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] sm:text-xs text-gray-500">
              <span className="whitespace-nowrap">
                Project No: <span className="text-gray-700 font-medium">#{entityNumber}</span>
              </span>
              <span className="hidden sm:inline text-gray-300">|</span>
              <span className="whitespace-nowrap">
                Start Date:{" "}
                <span className="text-gray-700 font-medium">
                  {startDate ? new Date(startDate).toLocaleDateString() : date ? new Date(date).toLocaleDateString() : "Pending"}
                </span>
              </span>
              <span className="hidden sm:inline text-gray-300">|</span>
              <span className="whitespace-nowrap">
                Expected Deadline:{" "}
                <span className="text-gray-700 font-medium">
                  {deadline ? new Date(deadline).toLocaleDateString() : "Pending"}
                </span>
              </span>
              <span className="hidden sm:inline text-gray-300">|</span>
              <button
                onClick={() => setShowInvoiceModal(true)}
                className="text-gray-500 underline decoration-gray-400 underline-offset-2 hover:text-gray-700 whitespace-nowrap cursor-pointer hover:font-bold transition-all"
              >
                View invoice
              </button>
            </div>
          </div>

          <div className="w-full sm:w-auto text-left sm:text-right space-y-2 order-1 sm:order-2 bg-gray-50 sm:bg-transparent p-4 sm:p-0 rounded-lg">
            <div className="flex justify-between items-center sm:justify-end gap-6 sm:gap-8">
              <span className="text-xs sm:text-sm text-gray-600 uppercase sm:capitalize font-bold sm:font-normal">
                Subtotal:
              </span>
              <span className="text-sm font-bold text-gray-700">{formatPrice(totalCost + amountPaid)}</span>
            </div>
            {getVatAmount(totalCost + amountPaid) > 0 && (
              <div className="flex justify-between items-center sm:justify-end gap-6 sm:gap-8">
                <span className="text-xs sm:text-sm text-gray-600 font-bold sm:font-semibold">VAT (20%):</span>
                <span className="text-sm text-gray-600 font-bold sm:font-semibold">{formatPrice(getVatAmount(totalCost + amountPaid))}</span>
              </div>
            )}
            <div className="flex justify-between items-center sm:justify-end gap-6 sm:gap-8 border-t border-gray-100 pt-2">
              <span className="text-xs sm:text-sm text-gray-800 uppercase sm:capitalize font-bold">
                Total Cost:
              </span>
              <span className="text-lg sm:text-xl font-bold text-gray-800">{formatPrice((totalCost + amountPaid) + getVatAmount(totalCost + amountPaid))}</span>
            </div>
            <div className="flex justify-between items-center sm:justify-end gap-6 sm:gap-8">
              <span className="text-xs sm:text-sm text-green-600 font-bold sm:font-semibold">Paid:</span>
              <span className="text-sm text-green-600 font-bold sm:font-semibold">{formatPrice(amountPaid)}</span>
            </div>
            <div className="flex justify-between items-center sm:justify-end gap-6 sm:gap-8">
              <span className="text-xs sm:text-sm text-red-600 font-bold sm:font-semibold">Pending Balance:</span>
              <span className="text-sm text-red-600 font-bold sm:font-semibold">{formatPrice(totalCost + getVatAmount(totalCost))}</span>
            </div>
          </div>
        </div>
      </div>
    )}

      {deliverableItems && deliverableItems.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-x-auto mb-10">
          <table className="w-full min-w-[500px] sm:min-w-0">
            <thead>
              <tr className="border-b border-gray-200 bg-white">
                <th className="text-left py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Item</th>
                <th className="text-left py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="text-right py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody>
              {regularItems.map((item, idx) => (
                <tr key={`regular-${idx}-${item.amount ?? 0}`} className="border-b border-gray-100 last:sm:border-b-0">
                  <td className="py-4 px-3 sm:px-6 text-xs sm:text-sm text-gray-600">
                    <div className="font-medium mb-1">{item.description}</div>
                    {item.details && <div className="text-gray-400 text-[10px] sm:text-xs line-clamp-2">{item.details}</div>}
                  </td>
                  <td className="py-4 px-3 sm:px-6 text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                    {item.duration} {item.unit || ""}
                  </td>
                  <td className="py-4 px-3 sm:px-6 text-xs sm:text-sm text-gray-600 font-bold sm:font-medium text-right">
                    {formatPrice(item.amount ?? 0)}
                  </td>
                </tr>
              ))}

              {addonItems.length > 0 && (
                <>
                  <tr className="bg-gray-800">
                    <td colSpan={3} className="py-3 px-6 text-xs font-bold text-white tracking-wider">
                      Add-On Tasks
                    </td>
                  </tr>
                  {addonItems.map((item, idx) => (
                    <tr key={`addon-${idx}-${item.amount ?? 0}`} className="border-b border-gray-100 last:border-0">
                      <td className="py-4 px-3 sm:px-6 text-xs sm:text-sm text-gray-600">
                        <div className="font-medium mb-1">{item.description}</div>
                        {item.details && <div className="text-gray-400 text-[10px] sm:text-xs line-clamp-2">{item.details}</div>}
                      </td>
                      <td className="py-4 px-3 sm:px-6 text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                        {item.duration} {item.unit || ""}
                      </td>
                      <td className="py-4 px-3 sm:px-6 text-xs sm:text-sm text-gray-600 font-bold sm:font-medium text-right">
                        {formatPrice(item.amount ?? 0)}
                      </td>
                    </tr>
                  ))}
                </>
              )}

              {getVatAmount(subtotalRegular + subtotalAddons) > 0 && (
                <tr className="border-t border-gray-200 bg-gray-50/30">
                  <td className="py-3 px-3 sm:px-6 text-xs sm:text-sm font-semibold text-gray-600 text-center sm:text-left">
                    VAT (20%)
                  </td>
                  <td className="py-3 px-3 sm:px-6 text-xs sm:text-sm text-gray-400">
                    -
                  </td>
                  <td className="py-3 px-3 sm:px-6 text-xs sm:text-sm font-semibold text-gray-600 text-right">
                    {formatPrice(getVatAmount(subtotalRegular + subtotalAddons))}
                  </td>
                </tr>
              )}

              <tr className="border-t-2 border-gray-300 bg-gray-50">
                <td className="py-4 px-3 sm:px-6 text-xs sm:text-sm font-bold text-gray-800 uppercase text-center sm:text-left">
                  Total
                </td>
                <td className="py-4 px-3 sm:px-6 text-[10px] sm:text-sm font-semibold text-gray-600 whitespace-nowrap">
                  {(() => {
                    const totalDays = [...regularItems, ...addonItems].reduce((acc, item) => {
                      const dur = parseInt(item.duration || "0");
                      return acc + (isNaN(dur) ? 0 : dur);
                    }, 0);
                    return totalDays > 0 ? `${totalDays} Days` : "-";
                  })()}
                </td>
                <td className="py-4 px-3 sm:px-6 text-xs sm:text-sm font-bold text-gray-800 text-right">
                  {formatPrice((subtotalRegular + subtotalAddons) + getVatAmount(subtotalRegular + subtotalAddons))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {!stripePromise && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
          <div className="flex gap-4">
            <svg className="w-6 h-6 text-amber-600 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="text-amber-800 font-bold mb-1">Payment System Offline</h4>
              <p className="text-amber-700 text-sm">
                The secure checkout is currently being configured. Please contact our support team at 
                <span className="font-bold"> support@society.com</span> to complete your payment manually.
              </p>
            </div>
          </div>
        </div>
      )}

      {!isFullyPaid && (
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h3 className="text-gray-700 font-bold text-lg">Pay Amount</h3>
            <div className="flex gap-4 items-center opacity-80 scale-90 sm:scale-100 origin-left">
              <VisaIcon />
              <MastercardIcon />
              <AmexIcon />
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {depositAmount > 0 && (
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    paymentOption === "half" ? "border-gray-800" : "border-gray-300"
                  }`}
                >
                  {paymentOption === "half" && <div className="w-3 h-3 rounded-full bg-gray-600" />}
                </div>
                <input
                  type="radio"
                  name="paymentOption"
                  className="hidden"
                  checked={paymentOption === "half"}
                  onChange={() => setPaymentOption("half")}
                />
                <span className="text-gray-600 text-sm">
                  Deposit half: <span className="font-medium">${depositAmount.toFixed(2)}</span>
                </span>
              </label>
            )}

            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  paymentOption === "full" ? "border-gray-800" : "border-gray-300"
                }`}
              >
                {paymentOption === "full" && <div className="w-3 h-3 rounded-full bg-gray-600" />}
              </div>
              <input
                type="radio"
                name="paymentOption"
                className="hidden"
                checked={paymentOption === "full"}
                onChange={() => setPaymentOption("full")}
              />
              <span className="text-gray-600 text-sm">
                Pay the full amount: <span className="font-medium">${totalCost.toFixed(2)}</span>
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    paymentOption === "custom" ? "border-gray-800" : "border-gray-300"
                  }`}
                >
                  {paymentOption === "custom" && <div className="w-3 h-3 rounded-full bg-gray-600" />}
                </div>
                <input
                  type="radio"
                  name="paymentOption"
                  className="hidden"
                  checked={paymentOption === "custom"}
                  onChange={() => setPaymentOption("custom")}
                />
                <span className="text-gray-600 text-sm">Pay another amount</span>
              </label>

              {paymentOption === "custom" && (
                <div className="flex flex-col gap-2 pl-8 sm:pl-0">
                  <div className="flex items-center gap-2">
                    <div className={`relative w-full sm:w-32 transition-all ${formErrors.amount ? "ring-1 ring-red-500 rounded-md" : ""}`}>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={customAmount}
                        onChange={(e) => {
                          setCustomAmount(e.target.value);
                          if (formErrors.amount) setFormErrors((prev: any) => ({ ...prev, amount: "" }));
                        }}
                        className={`w-full bg-white border ${
                          formErrors.amount ? "border-red-500" : "border-gray-300"
                        } rounded-md py-1.5 px-3 text-sm focus:ring-1 focus:ring-gray-300 outline-none transition-shadow`}
                        placeholder="Amount"
                      />
                    </div>
                  </div>
                  {formErrors.amount && <span className="text-[10px] text-red-500 font-bold ml-1">{formErrors.amount}</span>}
                </div>
              )}
            </div>

            {availableCredits >= 0 && (
              <div className="p-5 border border-gray-200 rounded-lg bg-gray-50/50 mt-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-full shadow-sm text-amber-600">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                        <path d="M12 18V6" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-800">Available Credits</h4>
                      <p className="text-xs text-gray-500">
                        {availableCredits > 0 ? (
                          <span className="flex items-center gap-1">
                            Apply your balance of <span className="font-bold text-gray-800">${availableCredits.toFixed(2)}</span> to
                            this payment.
                          </span>
                        ) : (
                          "You have no available credits to apply."
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <label
                      className={`relative inline-flex items-center ${
                        availableCredits > 0 ? "cursor-pointer" : "cursor-not-allowed opacity-40"
                      }`}
                    >
                      <span className="sr-only">Apply Credits</span>
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={useCredits}
                        onChange={(e) => availableCredits > 0 && setUseCredits(e.target.checked)}
                        disabled={availableCredits <= 0}
                      />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mb-10">
            <h3 className="text-gray-700 font-bold mb-4 uppercase tracking-wider text-xs">Payment Method</h3>
            {isLoadingMethods ? (
              <div className="animate-pulse space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-md" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {savedMethods.map((method) => (
                  <label
                    key={method.id}
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedMethod === method.id
                        ? "border-indigo-600 bg-indigo-50/30 ring-1 ring-indigo-600"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          selectedMethod === method.id ? "border-indigo-600" : "border-gray-300"
                        }`}
                      >
                        {selectedMethod === method.id && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                      </div>
                      <input
                        type="radio"
                        name="paymentMethod"
                        className="hidden"
                        checked={selectedMethod === method.id}
                        onChange={() => setSelectedMethod(method.id)}
                      />
                      <div className="flex items-center gap-3">
                        <span className="capitalize text-sm font-bold text-gray-700">{method.brand}</span>
                        <span className="text-sm text-gray-500">•••• {method.last4}</span>
                        <span className="text-xs text-gray-400">
                          Expires {method.expMonth}/{method.expYear}
                        </span>
                      </div>
                    </div>
                    {method.brand === "visa" && <VisaIcon />}
                    {method.brand === "mastercard" && <MastercardIcon />}
                    {method.brand === "amex" && <AmexIcon />}
                  </label>
                ))}

                <label
                  className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedMethod === "new"
                      ? "border-indigo-600 bg-indigo-50/30 ring-1 ring-indigo-600"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      selectedMethod === "new" ? "border-indigo-600" : "border-gray-300"
                    }`}
                  >
                    {selectedMethod === "new" && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                  </div>
                  <input
                    type="radio"
                    name="paymentMethod"
                    className="hidden"
                    checked={selectedMethod === "new"}
                    onChange={() => setSelectedMethod("new")}
                  />
                  <span className="text-sm font-bold text-gray-700">Add a new payment method</span>
                </label>
              </div>
            )}
          </div>

          {selectedMethod === "new" && getPayableAmount() - (useCredits ? Math.min(availableCredits, getPayableAmount()) : 0) > 0 ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <div>
                <label htmlFor="card-holder-name" className="block text-xs font-bold text-gray-700 mb-2">
                  Name on the card
                </label>
                <input
                  id="card-holder-name"
                  type="text"
                  value={cardholderName}
                  onChange={(e) => {
                    setCardholderName(e.target.value);
                    if (formErrors.cardHolderName) setFormErrors((prev: any) => ({ ...prev, cardHolderName: "" }));
                  }}
                  placeholder="John Allen Doe"
                  className={`w-full bg-gray-100 border ${
                    formErrors.cardHolderName ? "border-red-500 ring-1 ring-red-500" : "border-none"
                  } rounded-md px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:ring-1 focus:ring-gray-300 transition-shadow outline-none`}
                />
                {formErrors.cardHolderName && (
                  <span className="text-[10px] text-red-500 font-bold mt-1 block">{formErrors.cardHolderName}</span>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer mt-2">
                  <input
                    type="checkbox"
                    checked={billingSameAsBusiness}
                    onChange={(e) => setBillingSameAsBusiness(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Billing Address same as Business Details</span>
                </label>
                <p className="mt-2 text-[10px] text-gray-500 italic">
                  NOTE: Business details saved in your account are always used for invoicing.
                  <a href="/dashboard/settings" className="ml-1 text-indigo-600 hover:underline">
                    Link to account section
                  </a>
                </p>
              </div>

              {!billingSameAsBusiness && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 bg-gray-50/50 border border-gray-200 p-4 rounded-lg mt-2 animate-in fade-in slide-in-from-top-1">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-2">Street Address</label>
                    <input
                      type="text"
                      value={billingAddress.line1}
                      onChange={(e) => {
                        setBillingAddress({ ...billingAddress, line1: e.target.value });
                        setFormErrors((prev: any) => ({ ...prev, billingLine1: "" }));
                      }}
                      className={`w-full bg-white border ${
                        formErrors.billingLine1 ? "border-red-500 focus:ring-red-300" : "border-gray-300 focus:ring-indigo-300"
                      } rounded-md px-4 py-2 text-sm text-gray-800 outline-none focus:ring-2`}
                    />
                    {formErrors.billingLine1 && <span className="text-[10px] text-red-500">{formErrors.billingLine1}</span>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      value={billingAddress.city}
                      onChange={(e) => {
                        setBillingAddress({ ...billingAddress, city: e.target.value });
                        setFormErrors((prev: any) => ({ ...prev, billingCity: "" }));
                      }}
                      className={`w-full bg-white border ${
                        formErrors.billingCity ? "border-red-500 focus:ring-red-300" : "border-gray-300 focus:ring-indigo-300"
                      } rounded-md px-4 py-2 text-sm text-gray-800 outline-none focus:ring-2`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">State / Province</label>
                    <input
                      type="text"
                      value={billingAddress.state}
                      onChange={(e) => {
                        setBillingAddress({ ...billingAddress, state: e.target.value });
                        setFormErrors((prev: any) => ({ ...prev, billingState: "" }));
                      }}
                      className={`w-full bg-white border ${
                        formErrors.billingState ? "border-red-500 focus:ring-red-300" : "border-gray-300 focus:ring-indigo-300"
                      } rounded-md px-4 py-2 text-sm text-gray-800 outline-none focus:ring-2`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">ZIP / Postal Code</label>
                    <input
                      type="text"
                      value={billingAddress.postal_code}
                      onChange={(e) => {
                        setBillingAddress({ ...billingAddress, postal_code: e.target.value });
                        setFormErrors((prev: any) => ({ ...prev, billingZip: "" }));
                      }}
                      className={`w-full bg-white border ${
                        formErrors.billingZip ? "border-red-500 focus:ring-red-300" : "border-gray-300 focus:ring-indigo-300"
                      } rounded-md px-4 py-2 text-sm text-gray-800 outline-none focus:ring-2`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">Country</label>
                    <select
                      value={billingAddress.country}
                      onChange={(e) => setBillingAddress({ ...billingAddress, country: e.target.value })}
                      className="w-full bg-white border border-gray-300 focus:ring-indigo-300 rounded-md px-4 py-2 text-sm text-gray-800 outline-none focus:ring-2"
                    >
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="GB">United Kingdom</option>
                      <option value="IE">Ireland</option>
                      <option value="DE">Germany</option>
                      <option value="FR">France</option>
                      <option value="IT">Italy</option>
                      <option value="ES">Spain</option>
                      <option value="NL">Netherlands</option>
                      <option value="BE">Belgium</option>
                      <option value="AT">Austria</option>
                      <option value="SE">Sweden</option>
                      <option value="DK">Denmark</option>
                      <option value="FI">Finland</option>
                      <option value="PT">Portugal</option>
                      <option value="GR">Greece</option>
                      <option value="CH">Switzerland</option>
                      <option value="AU">Australia</option>
                      <option value="IN">India</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Card number</label>
                <div
                  className={`w-full bg-gray-100 border ${
                    formErrors.cardNumber ? "border-red-500 ring-1 ring-red-500" : "border-none"
                  } rounded-md px-4 py-3 text-sm focus-within:ring-1 focus-within:ring-gray-300 transition-shadow`}
                >
                  <CardNumberElement
                    options={{ ...stripeElementOptions, showIcon: true }}
                    className="w-full"
                    onChange={(e) => {
                      setCardStatus((prev: any) => ({ ...prev, number: { complete: e.complete, error: e.error } }));
                      if (e.complete || !e.error) setFormErrors((prev: any) => ({ ...prev, cardNumber: "" }));
                    }}
                  />
                </div>
                {formErrors.cardNumber && (
                  <span className="text-[10px] text-red-500 font-bold mt-1 block">{formErrors.cardNumber}</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">Expiry date</label>
                  <div
                    className={`w-full bg-gray-100 border ${
                      formErrors.cardExpiry ? "border-red-500 ring-1 ring-red-500" : "border-none"
                    } rounded-md px-4 py-3 text-sm focus-within:ring-1 focus-within:ring-gray-300 transition-shadow`}
                  >
                    <CardExpiryElement
                      options={stripeElementOptions}
                      className="w-full"
                      onChange={(e) => {
                        setCardStatus((prev: any) => ({ ...prev, expiry: { complete: e.complete, error: e.error } }));
                        if (e.complete || !e.error) setFormErrors((prev: any) => ({ ...prev, cardExpiry: "" }));
                      }}
                    />
                  </div>
                  {formErrors.cardExpiry && (
                    <span className="text-[10px] text-red-500 font-bold mt-1 block">{formErrors.cardExpiry}</span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">CVC</label>
                  <div
                    className={`w-full bg-gray-100 border ${
                      formErrors.cardCvc ? "border-red-500 ring-1 ring-red-500" : "border-none"
                    } rounded-md px-4 py-3 text-sm focus-within:ring-1 focus-within:ring-gray-300 transition-shadow`}
                  >
                    <CardCvcElement
                      options={stripeElementOptions}
                      className="w-full"
                      onChange={(e) => {
                        setCardStatus((prev: any) => ({ ...prev, cvc: { complete: e.complete, error: e.error } }));
                        if (e.complete || !e.error) setFormErrors((prev: any) => ({ ...prev, cardCvc: "" }));
                      }}
                    />
                  </div>
                  {formErrors.cardCvc && (
                    <span className="text-[10px] text-red-500 font-bold mt-1 block">{formErrors.cardCvc}</span>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={saveCard}
                    onChange={(e) => setSaveCard(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-gray-800 border-gray-300 rounded focus:ring-gray-500 focus:ring-2 cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="text-sm text-gray-700 font-medium">Save this card for future payments</span>
                    <p className="text-xs text-gray-500 mt-1">
                      Securely save your card details for faster checkout next time
                    </p>
                  </div>
                </label>
              </div>
            </div>
          ) : selectedMethod !== "new" && getPayableAmount() - (useCredits ? Math.min(availableCredits, getPayableAmount()) : 0) > 0 ? (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg mb-8 animate-in fade-in duration-300">
              <p className="text-sm text-gray-600">You are paying with your saved card.</p>
            </div>
          ) : (
            <div className="p-6 bg-green-50 border border-green-200 rounded-lg text-center mb-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-green-800 font-bold">Fully Covered by Credits!</p>
              <p className="text-xs text-green-600 mt-1">No credit card required for this transaction.</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isProcessing || !stripe || !elements || !stripePromise}
            className="w-full bg-[#1e293b] hover:bg-[#0f172a] text-white font-medium py-3 rounded-md transition-colors text-sm mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <div className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Processing...
              </div>
            ) : (
              `Pay $${(getPayableAmount() - (useCredits ? Math.min(availableCredits, getPayableAmount()) : 0)).toLocaleString(
                "en-US",
                { minimumFractionDigits: 2, maximumFractionDigits: 2 }
              )} now`
            )}
          </button>
        </div>
      )}

      <InvoicePreviewModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        projectNumber={entityNumber}
        totalCost={totalCost + amountPaid}
        deliverableItems={deliverableItems}
        vatAmount={getVatAmount(totalCost + amountPaid)}
        vatRate={EUROPEAN_COUNTRIES.includes((billingSameAsBusiness ? userCountry : billingAddress.country)?.toUpperCase()) ? VAT_RATE : 0}
      />
    </div>
  );
}

export default function UnifiedPaymentForm(props: UnifiedPaymentFormProps & { hideHeader?: boolean }) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm {...props} />
    </Elements>
  );
}
