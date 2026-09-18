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
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCurrency } from "@/context/CurrencyContext";
import StatusPopup from "@/components/common/StatusPopup";
type PaymentProcessStep = "idle" | "preparing" | "gateway" | "bank_auth" | "confirming" | "activating" | "success" | "error";
import { countryService, Country } from "@/lib/countryService";
import { getVatRateForCountry } from "@/lib/vatHelper";
import { convertCurrencyAmount, formatPriceWithCurrency } from "@/lib/currencyUtils";
import { downloadProjectDetailsPDF } from "@/lib/generateProjectDetailsPDF";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

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

export interface CalculatorUnifiedPaymentFormProps {
  type?: string;
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
  vatRate?: number;
  containerClassName?: string;
  onDownloadInvoice?: () => void | Promise<void>;
  isDownloadingInvoice?: boolean;
}

function CalculatorPaymentFormInner({
  type = "CALCULATOR",
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
  vatRate: propVatRate,
  containerClassName,
  onDownloadInvoice,
  isDownloadingInvoice: propIsDownloadingInvoice,
}: CalculatorUnifiedPaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const queryAmount = searchParams?.get("amount");
  const hasQueryAmount = !!(queryAmount && !isNaN(Number(queryAmount)) && Number(queryAmount) > 0);
  const hasAlreadyPaid = amountPaid > 0;
  
  const [paymentOption, setPaymentOption] = useState<string>(
    hasQueryAmount || hasAlreadyPaid ? "custom" : "full"
  );
  const [customAmount, setCustomAmount] = useState<string>(
    hasQueryAmount
      ? Number(queryAmount).toFixed(2)
      : hasAlreadyPaid
      ? totalCost.toFixed(2)
      : ""
  );
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
  const [countriesList, setCountriesList] = useState<Country[]>([]);

  const formatPrice = (amount: number) => {
    return formatPriceWithCurrency(amount, currency, nativeCurrency || "USD", conversionRate);
  };

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<PaymentProcessStep>("idle");
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
        console.error("Failed to fetch saved methods in calculator payment form:", err);
      } finally {
        setIsLoadingMethods(false);
      }
    };

    const fetchCredits = async () => {
      const user = authService.getUser();
      if (user) {
        if (user.fullName) setCardholderName(user.fullName);
        try {
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

    const fetchCountries = async () => {
      try {
        const list = await countryService.getAllCountries();
        if (list && list.length > 0) {
          setCountriesList(list);
        }
      } catch (err) {
        console.error("Failed to load countries in calculator payment form:", err);
      }
    };

    fetchCredits();
    initData();
    fetchCountries();
  }, []);

  const getActiveCountryCode = () => {
    return billingSameAsBusiness ? userCountry : billingAddress.country;
  };

  const getActiveVatRate = () => {
    if (propVatRate !== undefined && propVatRate !== null && Number(propVatRate) > 0) {
      return Number(propVatRate);
    }
    const activeCode = getActiveCountryCode();
    if (!activeCode) return 0;
    return getVatRateForCountry(activeCode);
  };

  const getVatAmount = (baseAmount: number) => {
    const vatRate = getActiveVatRate();
    return vatRate > 0 ? (baseAmount * vatRate) / 100 : 0;
  };

  const getPayableDeliverablesSum = () => {
    const payableItems = (deliverableItems || []).filter((item) => !item.isAddOn);
    return payableItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  };

  const getPendingWithVat = () => {
    const currentDeliverablesSum = getPayableDeliverablesSum();
    const currentSubtotal = currentDeliverablesSum > 0 ? currentDeliverablesSum : (totalCost + amountPaid);
    return Math.max(0, currentSubtotal + getVatAmount(currentSubtotal) - amountPaid);
  };

  const getDepositWithVat = () => depositAmount * (1 + getActiveVatRate() / 100);

  const canPayDepositHalf = amountPaid <= 0 && depositAmount > 0 && getDepositWithVat() < getPendingWithVat() - 0.009;

  useEffect(() => {
    const currentDeliverablesSum = getPayableDeliverablesSum();
    const currentSubtotal = currentDeliverablesSum > 0 ? currentDeliverablesSum : (totalCost + amountPaid);
    const vatMultiplier = 1 + getActiveVatRate() / 100;
    const effectivePending = amountPaid > 0
      ? Math.max(0, (currentSubtotal * vatMultiplier) - amountPaid)
      : currentSubtotal * (getActiveVatRate() > 0 ? vatMultiplier : 1);
    const convertedPending = convertCurrencyAmount(effectivePending, currency, nativeCurrency || "USD", conversionRate);

    const paramAmount = searchParams?.get("amount");
    if (paramAmount && !isNaN(Number(paramAmount)) && Number(paramAmount) > 0) {
      setPaymentOption("custom");
      setCustomAmount(Number(paramAmount).toFixed(2));
    } else if (amountPaid > 0) {
      setPaymentOption("custom");
      setCustomAmount(convertedPending.toFixed(2));
    }
  }, [searchParams, amountPaid, totalCost, deliverableItems, currency, conversionRate, nativeCurrency, countriesList, userCountry, billingSameAsBusiness, billingAddress.country, propVatRate]);

  useEffect(() => {
    if (paymentOption === "half" && !canPayDepositHalf) {
      setPaymentOption("full");
    }
  }, [paymentOption, canPayDepositHalf]);

  const [popup, setPopup] = useState({
    isOpen: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });
  const [localDownloadingInvoice, setLocalDownloadingInvoice] = useState(false);
  const isDownloadingInvoiceState = propIsDownloadingInvoice !== undefined ? propIsDownloadingInvoice : localDownloadingInvoice;

  const handleDownloadInvoiceClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isDownloadingInvoiceState) return;

    if (onDownloadInvoice) {
      await onDownloadInvoice();
      return;
    }

    setLocalDownloadingInvoice(true);
    try {
      const projectSubtotal = totalCost;
      await downloadProjectDetailsPDF({
        projectNumber: entityNumber,
        title: title || description,
        description: description,
        deliverableItems: deliverableItems,
        subtotal: projectSubtotal,
        vatRate: getActiveVatRate(),
        vatAmount: getVatAmount(projectSubtotal),
        totalCost: projectSubtotal + getVatAmount(projectSubtotal),
        amountPaid: amountPaid,
        pendingBalance: Math.max(0, (projectSubtotal + getVatAmount(projectSubtotal)) - amountPaid),
        currency: nativeCurrency || "USD",
        clientEmail: clientEmail,
      });
    } catch (err) {
      console.error("Failed to download project PDF for invoice view:", err);
    } finally {
      setLocalDownloadingInvoice(false);
    }
  };

  const getPayableAmount = () => {
    let amount = totalCost;
    if (paymentOption === "half") amount = depositAmount;
    else if (paymentOption === "custom" && customAmount) amount = parseFloat(customAmount);
    
    if (paymentOption !== "custom") {
      const pendingWithVat = convertCurrencyAmount(
        getPendingWithVat(),
        currency,
        nativeCurrency || "USD",
        conversionRate
      );
      if (paymentOption === "full") {
        return pendingWithVat;
      }
      amount = convertCurrencyAmount(amount, currency, nativeCurrency || "USD", conversionRate);
      const vatRate = getActiveVatRate();
      const withVat = vatRate > 0 ? amount * (1 + vatRate / 100) : amount;
      if (paymentOption === "half") {
        return Math.min(withVat, pendingWithVat);
      }
      return withVat;
    }
    
    return amount;
  };

  const convertedCredits = useMemo(() => {
    return convertCurrencyAmount(availableCredits, currency, nativeCurrency || "USD", conversionRate);
  }, [availableCredits, currency, nativeCurrency, conversionRate]);

  const activeCreditsToApply = useCredits ? Math.min(convertedCredits, getPayableAmount()) : 0;
  const finalPayable = Math.max(0, getPayableAmount() - activeCreditsToApply);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!authService.isAuthenticated()) {
      authService.redirectToLogin();
      return;
    }
    if (!stripe || !elements) return;

    const isVerifiedUser = (u: any): boolean => {
      if (!u) return true;
      return (
        u.isEmailVerified === true ||
        String(u.isEmailVerified) === "true" ||
        u.emailVerified === true ||
        u.isVerified === true
      );
    };

    let user = authService.getUser();
    let isVerified = isVerifiedUser(user);

    if (!isVerified) {
      const freshUser = await authService.getProfile();
      if (freshUser) {
        user = freshUser;
        isVerified = isVerifiedUser(freshUser);
      }
    }

    if (!isVerified && amountPaid <= 0) {
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

    const pendingWithVat = getPendingWithVat();
    const convertedPending = convertCurrencyAmount(pendingWithVat, currency, nativeCurrency || "USD", conversionRate);

    if (paymentOption === "custom") {
      if (!customAmount || parseFloat(customAmount) <= 0) {
        errors.amount = "Please enter a valid amount.";
      } else if (parseFloat(customAmount) > convertedPending + 0.01) {
        errors.amount = `Amount cannot exceed pending balance (${formatPrice(pendingWithVat)}).`;
      }
    }

    if (selectedMethod === "new" && finalPayable > 0) {
      if (!cardholderName.trim()) errors.cardholderName = "Cardholder name is required.";
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
    const finalCredits = useCredits ? Math.min(convertedCredits, finalAmount) : 0;

    setIsProcessing(true);
    setPaymentStep("preparing");
    try {
      const effectiveInvoiceId = invoiceId || searchParams?.get("invoiceId") || extraMetadata?.invoiceId || undefined;
      const effectiveInvoiceNumber = searchParams?.get("invoiceNumber") || extraMetadata?.invoiceNumber || undefined;
      const effectiveMessageId = searchParams?.get("messageId") || extraMetadata?.messageId || undefined;
      const rawDescription = searchParams?.get("description") || extraMetadata?.description || description || undefined;
      const effectiveDescription = rawDescription && rawDescription.length > 400
        ? rawDescription.substring(0, 397) + "..."
        : rawDescription;

      const rawLineItems = extraMetadata?.lineItems || (deliverableItems && deliverableItems.length > 0 ? deliverableItems.map((d: any) => d.description).join(", ") : undefined);
      const effectiveLineItems = rawLineItems && rawLineItems.length > 400
        ? rawLineItems.substring(0, 397) + "..."
        : rawLineItems;

      const currentVatRate = getActiveVatRate();
      const currentPayableSubtotal = getPayableDeliverablesSum() > 0 ? getPayableDeliverablesSum() : totalCost;
      const currentVatAmount = getVatAmount(currentPayableSubtotal);

      const isDeposit = paymentOption === "half";

      setPaymentStep("gateway");
      const intentResponse = await paymentService.createPaymentIntent({
        amount: finalAmount,
        currency,
        useCredits,
        paymentMethodId: selectedMethod !== "new" ? selectedMethod : undefined,
        saveCard: selectedMethod === "new" && saveCard,
        metadata: {
          ...extraMetadata,
          title: title || extraMetadata?.title,
          lineItems: effectiveLineItems,
          type: "CALCULATOR",
          isCalculator: "true",
          source: "calculator",
          projectId: entityId,
          projectNumber: entityNumber,
          billingComponentId,
          invoiceId: effectiveInvoiceId,
          invoiceNumber: effectiveInvoiceNumber,
          messageId: effectiveMessageId,
          description: effectiveDescription,
          vatRate: currentVatRate,
          vatAmount: currentVatAmount,
          subtotal: currentPayableSubtotal,
          fullAmount: currentPayableSubtotal + currentVatAmount,
          fullSubtotal: currentPayableSubtotal,
          fullVatAmount: currentVatAmount,
          clientCountry: getActiveCountryCode(),
          paymentOption,
          isDeposit: isDeposit ? "true" : "false",
          conversionRate: String(conversionRate),
          paymentCurrency: currency,
        },
      });

      if (!intentResponse.isSuccessful || !intentResponse.data) {
        if (authService.isUnauthorizedError(intentResponse)) {
          authService.redirectToLogin();
          return;
        }
        throw new Error(intentResponse.message || "Failed to initialize calculator payment.");
      }

      const { clientSecret, transactionId, fullyPaidByCredits } = intentResponse.data;

      if (fullyPaidByCredits) {
        setPaymentStep("activating");
        await new Promise((r) => setTimeout(r, 600));
        setPaymentStep("success");
        handlePaymentSuccess("Payment completed using your credits.", finalCredits);
        return;
      }

      await confirmStripePayment(clientSecret, transactionId, finalCredits);
    } catch (err: any) {
      console.error("Calculator Payment Error:", err);
      if (authService.isUnauthorizedError(err)) {
        authService.redirectToLogin();
        return;
      }
      setPaymentStep("error");
      setPopup({
        isOpen: true,
        type: "error",
        title: "Payment Failed",
        message: err.message || "An unexpected error occurred.",
      });
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
      }, 500);
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

    let paymentMethodData: any = undefined;
    if (selectedMethod === "new") {
      const cardElement = elements.getElement(CardNumberElement);
      if (!cardElement) throw new Error("Card element not found.");

      const billing_details: any = {
        name: cardholderName,
        email: clientEmail,
      };

      if (!billingSameAsBusiness) {
        billing_details.address = {
          line1: billingAddress.line1,
          city: billingAddress.city,
          state: billingAddress.state,
          postal_code: billingAddress.postal_code,
          country: billingAddress.country,
        };
      }

      paymentMethodData = {
        card: cardElement,
        billing_details,
      };
    }

    setPaymentStep("bank_auth");
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: selectedMethod === "new" ? paymentMethodData : selectedMethod,
      setup_future_usage: selectedMethod === "new" && saveCard ? "off_session" : undefined,
    });

    if (result.error) {
      throw new Error(result.error.message || "Payment authentication failed.");
    }

    if (result.paymentIntent && result.paymentIntent.status === "succeeded") {
      setPaymentStep("confirming");
      const confirmRes = await paymentService.confirmPayment({ transactionId });
      if (!confirmRes.isSuccessful) {
        throw new Error(confirmRes.message || "Server confirmation failed.");
      }

      setPaymentStep("activating");
      await new Promise((r) => setTimeout(r, 600));
      setPaymentStep("success");
      handlePaymentSuccess("Payment processed successfully!", creditsUsed);
    } else {
      throw new Error("Payment could not be completed.");
    }
  };

  const currentDeliverablesSum = getPayableDeliverablesSum();
  const currentSubtotal = currentDeliverablesSum > 0 ? currentDeliverablesSum : (totalCost + amountPaid);
  const currentVatRate = getActiveVatRate();
  const currentVatAmount = getVatAmount(currentSubtotal);
  const currentTotalCost = currentSubtotal + currentVatAmount;
  const pendingWithVat = getPendingWithVat();

  return (
    <div className={`bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-xs ${containerClassName || ""}`}>
      <StatusPopup
        isOpen={popup.isOpen}
        onClose={() => setPopup({ ...popup, isOpen: false })}
        type={popup.type}
        title={popup.title}
        message={popup.message}
      />

      {!hideHeader && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-gray-100 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                Calculator Payment
              </span>
              <span className="text-xs font-mono text-gray-400">#{entityNumber}</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mt-2">{title}</h1>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{description}</p>
          </div>

          <button
            type="button"
            onClick={handleDownloadInvoiceClick}
            disabled={isDownloadingInvoiceState}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 hover:border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-2xs shrink-0 disabled:opacity-60"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {isDownloadingInvoiceState ? "Generating..." : "Download Invoice"}
          </button>
        </div>
      )}

      {/* Financial Summary */}
      <div className="py-6 border-b border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <span className="text-xs text-gray-400 font-medium">Subtotal</span>
          <p className="text-base font-semibold text-gray-900 mt-0.5">{formatPrice(currentSubtotal)}</p>
        </div>
        <div>
          <span className="text-xs text-gray-400 font-medium">VAT ({currentVatRate}%)</span>
          <p className="text-base font-semibold text-gray-900 mt-0.5">{formatPrice(currentVatAmount)}</p>
        </div>
        <div>
          <span className="text-xs text-gray-400 font-medium">Total Cost</span>
          <p className="text-base font-bold text-gray-900 mt-0.5">{formatPrice(currentTotalCost)}</p>
        </div>
        <div>
          <span className="text-xs text-gray-400 font-medium">Pending Balance</span>
          <p className="text-base font-bold text-emerald-600 mt-0.5">{formatPrice(pendingWithVat)}</p>
        </div>
      </div>

      {/* Payment Options Selection */}
      {!isFullyPaid && (
        <form onSubmit={handleSubmit} className="pt-6 space-y-6">
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-800">Select Payment Amount</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label
                className={`flex flex-col p-4 border rounded-xl cursor-pointer transition-all ${
                  paymentOption === "full"
                    ? "border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-500/20"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">Remaining Balance</span>
                  <input
                    type="radio"
                    name="calc_paymentOption"
                    value="full"
                    checked={paymentOption === "full"}
                    onChange={() => setPaymentOption("full")}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                </div>
                <span className="text-xs text-gray-500 mt-1">Pay full pending balance</span>
                <span className="text-sm font-bold text-gray-900 mt-2">{formatPrice(pendingWithVat)}</span>
              </label>

              {canPayDepositHalf && (
                <label
                  className={`flex flex-col p-4 border rounded-xl cursor-pointer transition-all ${
                    paymentOption === "half"
                      ? "border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-500/20"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">50% Part-Payment</span>
                    <input
                      type="radio"
                      name="calc_paymentOption"
                      value="half"
                      checked={paymentOption === "half"}
                      onChange={() => setPaymentOption("half")}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                  </div>
                  <span className="text-xs text-gray-500 mt-1">50% deposit amount</span>
                  <span className="text-sm font-bold text-gray-900 mt-2">{formatPrice(getDepositWithVat())}</span>
                </label>
              )}

              <label
                className={`flex flex-col p-4 border rounded-xl cursor-pointer transition-all ${
                  paymentOption === "custom"
                    ? "border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-500/20"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">Custom Amount</span>
                  <input
                    type="radio"
                    name="calc_paymentOption"
                    value="custom"
                    checked={paymentOption === "custom"}
                    onChange={() => setPaymentOption("custom")}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                </div>
                <span className="text-xs text-gray-500 mt-1">Specify custom amount</span>
                <div className="mt-2">
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="Enter amount"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      if (paymentOption !== "custom") setPaymentOption("custom");
                    }}
                    className="w-full text-xs px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 font-semibold"
                  />
                </div>
              </label>
            </div>
            {formErrors.amount && <p className="text-xs text-red-500 font-medium">{formErrors.amount}</p>}
          </div>

          {/* Credits Box */}
          {availableCredits > 0 && (
            <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="calc_useCredits"
                  checked={useCredits}
                  onChange={(e) => setUseCredits(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <label htmlFor="calc_useCredits" className="text-sm text-gray-700 font-medium cursor-pointer">
                  Use available credits ({formatPrice(convertedCredits)})
                </label>
              </div>
              {useCredits && (
                <span className="text-xs font-bold text-emerald-700">
                  -{formatPrice(activeCreditsToApply)}
                </span>
              )}
            </div>
          )}

          {/* Cardholder name & details */}
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cardholder Name</label>
              <input
                type="text"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder="Full Name"
                className="w-full text-sm px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              {formErrors.cardholderName && <p className="text-xs text-red-500 mt-1">{formErrors.cardholderName}</p>}
            </div>

            {/* Stripe Card Elements */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Card Number</label>
                <div className="px-3.5 py-2.5 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 bg-white">
                  <CardNumberElement
                    options={stripeElementOptions}
                    onChange={(e) => setCardStatus((prev: any) => ({ ...prev, number: e }))}
                  />
                </div>
                {formErrors.cardNumber && <p className="text-xs text-red-500 mt-1">{formErrors.cardNumber}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Expiration Date</label>
                  <div className="px-3.5 py-2.5 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 bg-white">
                    <CardExpiryElement
                      options={stripeElementOptions}
                      onChange={(e) => setCardStatus((prev: any) => ({ ...prev, expiry: e }))}
                    />
                  </div>
                  {formErrors.cardExpiry && <p className="text-xs text-red-500 mt-1">{formErrors.cardExpiry}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">CVC / CVV</label>
                  <div className="px-3.5 py-2.5 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 bg-white">
                    <CardCvcElement
                      options={stripeElementOptions}
                      onChange={(e) => setCardStatus((prev: any) => ({ ...prev, cvc: e }))}
                    />
                  </div>
                  {formErrors.cardCvc && <p className="text-xs text-red-500 mt-1">{formErrors.cardCvc}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isProcessing}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Processing Payment...</span>
              </>
            ) : (
              <span>Pay {formatPrice(finalPayable)}</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default function CalculatorUnifiedPaymentForm(props: CalculatorUnifiedPaymentFormProps) {
  if (!stripePromise) {
    return <CalculatorPaymentFormInner {...props} />;
  }

  return (
    <Elements stripe={stripePromise}>
      <CalculatorPaymentFormInner {...props} />
    </Elements>
  );
}
