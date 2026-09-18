"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  useStripe,
  useElements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
} from "@stripe/react-stripe-js";
import DashboardSubNav from "@/components/dashboard/DashboardSubNav";
import { projectService } from "@/lib/projectService";
import { paymentService } from "@/lib/paymentService";
import { authService } from "@/lib/authService";
import { countryService } from "@/lib/countryService";
import { getVatRateForCountry } from "@/lib/vatHelper";
import { formatDateTimeWithUserTz } from "@/lib/dateUtils";
import StatusPopup from "@/components/common/StatusPopup";
import VisaIcon from "@/components/icons/visa";
import MastercardIcon from "@/components/icons/mastercard";
import AmexIcon from "@/components/icons/amex";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

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

const GlobeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" className="text-primary-300"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
);

const formatExpiryDate = (dateString?: string) => {
  if (!dateString) return "Oct 5, 1:00 PM";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const month = formatDateTimeWithUserTz(d, { month: "short" });
    const day = formatDateTimeWithUserTz(d, { day: "numeric" });
    const time = formatDateTimeWithUserTz(d, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${month} ${day}, ${time}`;
  } catch {
    return dateString;
  }
};

const formatPrice = (amount: number, currency: string = "USD") => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
};

// Unified Details Box containing Payment Summary, Terms, and Payment Method under ONE box with shadow
function UnifiedRenewalDetailsBox({
  project,
  onToggleAutoRenew,
  onPaymentSuccess,
}: {
  project: any;
  onToggleAutoRenew: (project: any) => void;
  onPaymentSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const [processing, setProcessing] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [cardholderName, setCardholderName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [billingSameAsBusiness, setBillingSameAsBusiness] = useState(true);
  const [modal, setModal] = useState({
    isOpen: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });

  useEffect(() => {
    countryService.getAllCountries().catch(() => { });
    const user = authService.getUser();
    if (user) {
      setCardholderName(user.fullName || "");
      setUserEmail(user.email || "");
    }
  }, []);

  const isEstoniaClient = (country?: string) => {
    if (!country) return false;
    const c = country.trim().toUpperCase();
    return c === "EE" || c === "EST" || c === "ESTONIA";
  };
  const clientCountryStr = String(
    project.clientCountry ||
    project.country ||
    project.client?.country ||
    project.client?.clientCountry ||
    ""
  );
  // VAT only applies for Estonian clients (24%); all other countries are 0%
  const vatRate = getVatRateForCountry(clientCountryStr);

  const renewalPrice =
    typeof project.price === "number"
      ? project.price
      : typeof project.renewalPrice === "number"
        ? project.renewalPrice
        : parseFloat(String(project.price || project.renewalPrice || 100).replace(/[^0-9.]/g, "")) || 100;

  const baseSubtotal = Number(
    project.subtotal ??
    (vatRate > 0 && renewalPrice > 0
      ? Math.round((renewalPrice / (1 + vatRate / 100)) * 100) / 100
      : renewalPrice)
  );
  const vatAmount = vatRate > 0 ? Math.round((baseSubtotal * (vatRate / 100)) * 100) / 100 : 0;
  const totalDueAmount = Math.round((baseSubtotal + vatAmount) * 100) / 100;

  const projectCurrency = (project.currency || "USD").toUpperCase();
  const formattedSubtotal = formatPrice(baseSubtotal, projectCurrency);
  const formattedVat = formatPrice(vatAmount, projectCurrency);
  const formattedTotal = formatPrice(totalDueAmount > 0 ? totalDueAmount : renewalPrice, projectCurrency);

  const handleProcessPayment = async () => {
    if (!termsAccepted) {
      alert("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    if (!stripe || !elements) {
      alert("Payment processor is loading. Please wait.");
      return;
    }

    setProcessing(true);
    try {
      const res = await paymentService.createPaymentIntent({
        amount: totalDueAmount > 0 ? totalDueAmount : renewalPrice,
        currency: projectCurrency.toLowerCase(),
        metadata: {
          type: "PROJECT",
          entityId: project._id,
          entityNumber: project.projectNumber || project._id.slice(-6).toUpperCase(),
          title: `Renewal: ${project.title}`,
          description: `Monthly maintenance renewal for ${project.title}`,
          isRenewal: true,
          vatRate,
          vatAmount,
          subtotal: baseSubtotal,
          clientCountry: clientCountryStr,
        },
      });

      if (!res.isSuccessful || !res.data) {
        throw new Error(res.message || "Failed to initiate renewal payment.");
      }

      const { clientSecret, transactionId } = res.data;
      const cardElement = elements.getElement(CardNumberElement);

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement!,
          billing_details: {
            name: cardholderName || "Valued Client",
            email: userEmail || undefined,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (paymentIntent?.status === "succeeded") {
        await paymentService.confirmPayment({ transactionId });
        setModal({
          isOpen: true,
          type: "success",
          title: "Renewal Payment Successful",
          message: `Your renewal for ${project.title} has been successfully completed!`,
        });
        setTimeout(() => {
          onPaymentSuccess();
        }, 2000);
      }
    } catch (err: any) {
      setModal({
        isOpen: true,
        type: "error",
        title: "Payment Failed",
        message: err.message || "An unexpected error occurred during processing.",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200/90 rounded-2xl shadow-[0_6px_28px_rgba(0,0,0,0.06)] p-6 md:p-8 mb-10 animate-in fade-in slide-in-from-top-2 duration-300">
      <StatusPopup
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        type={modal.type}
        title={modal.title}
        message={modal.message}
      />

      {/* 1. Header */}
      <h3 className="text-sm font-bold text-gray-800 mb-6">Payment Summary</h3>

      {/* 2. Monthly Subscription Alert Notice */}
      <div className="bg-[#FFF5F5] border border-[#FED7D7] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h4 className="text-[11px] font-bold text-[#8A2424] uppercase tracking-wider mb-0.5">
            MONTHLY SUBSCRIPTION PRODUCT
          </h4>
          <p className="text-xs text-[#C53030] font-normal">
            This product automatically renews every month unless cancelled before the renewal date (
            {formatExpiryDate(project.nextRenewalDate)}).
          </p>
        </div>
        <button
          type="button"
          onClick={() => onToggleAutoRenew(project)}
          className="bg-white border border-[#FED7D7] text-[#E53E3E] hover:bg-red-50 text-xs font-semibold px-4 py-1.5 rounded-md whitespace-nowrap shadow-sm transition-colors self-start sm:self-auto"
        >
          {project.autoRenewal !== false ? "Stop Auto-Renewal" : "Enable Auto-Renewal"}
        </button>
      </div>

      {/* 3. Inner Gray Summary Box */}
      <div className="bg-[#F8F9FA] rounded-2xl p-6 md:p-8 mb-8 border border-gray-100">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h4 className="text-base md:text-lg font-bold text-gray-900 mb-0.5">
              {project.packageName || project.package?.name || "Maintenance Service"}
            </h4>
            <p className="text-xs text-gray-400">
              1 month: {formattedTotal} / mo
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-0.5">Due Date</p>
            <p className="text-base md:text-lg font-bold text-gray-900">
              {formatExpiryDate(project.nextRenewalDate)}
            </p>
          </div>
        </div>

        <div className="border-t border-gray-200/60 my-6" />

        <div className="space-y-3">
          <div className="flex justify-between text-xs font-semibold text-gray-600">
            <span>Subtotal</span>
            <span>{formattedSubtotal}</span>
          </div>
          {vatRate > 0 && (
            <div className="flex justify-between text-xs font-semibold text-gray-600">
              <span>VAT ({vatRate}%)</span>
              <span>{formattedVat}</span>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200/60 my-6" />

        <div className="flex justify-between items-center pt-1">
          <span className="text-lg font-bold text-gray-900">Total due</span>
          <span className="text-xl font-bold text-gray-900">
            {formattedTotal}
          </span>
        </div>
      </div>

      {/* 4. Terms & Agreement Box (Inside same container!) */}
      <div className="bg-[#F9FAFB] border border-gray-200/80 rounded-xl p-4 flex items-start gap-3 mb-8">
        <input
          type="checkbox"
          id="agreeTerms"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
          className="w-4 h-4 text-[#4545F0] rounded border-gray-300 focus:ring-[#4545F0] mt-0.5 cursor-pointer flex-shrink-0"
        />
        <label
          htmlFor="agreeTerms"
          className="text-xs text-gray-500 leading-relaxed font-normal cursor-pointer"
        >
          I confirm that I have read and agree to the{" "}
          <Link href="/terms" className="text-[#4545F0] font-semibold hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-[#4545F0] font-semibold hover:underline">
            Privacy Policy
          </Link>{" "}
          and I understand that the selected services are provided on a subscription basis. If
          you have not switched off auto renewal, it will be set for the same period you now
          renew your service(s) for. Renewal settings can be managed on the project page.
        </label>
      </div>

      {/* 5. Payment Method Section (Inside same container!) */}
      <div>
        {/* Card brand icons */}
        <div className="flex items-center gap-3 mb-6">
          <VisaIcon className="h-4" />
          <MastercardIcon className="h-5" />
          <AmexIcon className="h-4" />
        </div>

        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">
          PAYMENT METHOD
        </h4>

        {/* Radio Option */}
        <div className="border border-gray-300 rounded-xl p-4 flex items-center gap-3 cursor-pointer bg-white mb-6">
          <div className="w-4 h-4 rounded-full border-2 border-[#4545F0] flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[#4545F0]" />
          </div>
          <span className="text-xs font-semibold text-gray-800">
            Add a new payment method
          </span>
        </div>

        {/* Cardholder Name */}
        <div className="mb-5">
          <label className="block text-[15px] font-medium text-[#111827] mb-2">
            Name on the card:
          </label>
          <input
            type="text"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            placeholder="Full name as on card"
            className="w-full bg-[#F9FAFB] border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#4545F0] focus:ring-1 focus:ring-[#4545F0]"
          />
        </div>

        {/* Billing Address Toggle */}
        <div className="mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={billingSameAsBusiness}
              onChange={(e) => setBillingSameAsBusiness(e.target.checked)}
              className="w-4 h-4 text-[#4545F0] rounded border-gray-300 focus:ring-[#4545F0]"
            />
            <span className="text-xs font-bold text-gray-700">
              Billing Address same as Business Details
            </span>
          </label>
          <p className="text-[11px] text-gray-400 italic mt-1">
            NOTE: Business details saved in your account are always used for invoicing.{" "}
            <Link href="/dashboard/myAccount" className="text-[#4545F0] underline hover:text-[#3737D8]">
              Link to account section
            </Link>
          </p>
        </div>

        {/* Stripe Card Elements */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-[15px] font-medium text-[#111827] mb-2">
              Card number:
            </label>
            <div className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus-within:border-[#4545F0] focus-within:ring-1 focus-within:ring-[#4545F0]">
              <CardNumberElement options={CARD_ELEMENT_OPTIONS} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[15px] font-medium text-[#111827] mb-2">
                Expiry date:
              </label>
              <div className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus-within:border-[#4545F0] focus-within:ring-1 focus-within:ring-[#4545F0]">
                <CardExpiryElement options={CARD_ELEMENT_OPTIONS} />
              </div>
            </div>
            <div>
              <label className="block text-[15px] font-medium text-[#111827] mb-2">
                CVC:
              </label>
              <div className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus-within:border-[#4545F0] focus-within:ring-1 focus-within:ring-[#4545F0]">
                <CardCvcElement options={CARD_ELEMENT_OPTIONS} />
              </div>
            </div>
          </div>
        </div>

        {/* Pay Button */}
        <div>
          <button
            type="button"
            onClick={handleProcessPayment}
            disabled={processing || !termsAccepted}
            className={`bg-[#4545F0] hover:bg-[#3737D8] text-white text-sm font-semibold px-10 py-3 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 ${processing || !termsAccepted ? "opacity-60 cursor-not-allowed" : ""
              }`}
          >
            {processing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              `Pay ${formattedTotal}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RenewalsPage() {
  const [renewals, setRenewals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchRenewalsData = async () => {
    setIsLoading(true);
    try {
      const res = await projectService.getRenewals();
      if (res?.data && Array.isArray(res.data)) {
        const nonAnalysisRenewals = res.data.filter(
          (p: any) =>
            p.type !== "analysis" &&
            !p.isAnalysis &&
            !p.title?.toLowerCase().includes("website analysis") &&
            !p.title?.toLowerCase().includes("checking of work")
        );
        setRenewals(nonAnalysisRenewals);
      }
    } catch (e) {
      console.error("Failed to fetch renewals:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRenewalsData();
  }, []);

  const handleToggleAutoRenew = async (project: any) => {
    try {
      const currentVal = project.autoRenewal !== false;
      const newStatus = !currentVal;
      const res = await projectService.toggleAutoRenewal(project._id, newStatus);
      if (res?.isSuccessful || res?.statusCode === 200 || res?.data) {
        setRenewals((prev) =>
          prev.map((p) =>
            p._id === project._id ? { ...p, autoRenewal: newStatus } : p
          )
        );
      }
    } catch (err) {
      console.error("Failed to toggle auto-renewal:", err);
      alert("Failed to update auto-renewal settings. Please try again.");
    }
  };

  const selectedProject = selectedId
    ? renewals.find((p) => p._id === selectedId) || null
    : null;

  return (
    <div className="bg-white min-h-screen flex flex-col font-sans">
      <DashboardSubNav />
      <main className="flex-grow max-w-[1536px] mx-auto w-full px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-8 md:pt-12 pb-12">
        {/* Page Title */}
        <h1 className="text-[28px] md:text-[32px] font-medium text-primary-100 mb-8 md:mb-12">
          Renewals
        </h1>

        {isLoading ? (
          <div className="flex flex-col gap-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="border border-gray-200 rounded-xl h-24 animate-pulse bg-gray-50 shadow-sm"
              />
            ))}
          </div>
        ) : renewals.length === 0 ? (
          <div className="border border-gray-200/80 rounded-2xl p-16 flex flex-col items-center justify-center text-center bg-gray-50/40 shadow-sm">
            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-[#4545F0]">
              <GlobeIcon />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">
              No projects due for renewal
            </h3>
            <p className="text-xs text-gray-500 max-w-sm">
              Your monthly subscription projects and maintenance plans will appear here
              when they are scheduled for renewal.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {renewals.map((project) => {
              const isSelected = selectedId === project._id;
              const priceNum =
                typeof project.price === "number"
                  ? project.price
                  : typeof project.renewalPrice === "number"
                    ? project.renewalPrice
                    : parseFloat(String(project.price || project.renewalPrice || 100).replace(/[^0-9.]/g, "")) || 100;

              const isAutoRenewOn = project.autoRenewal !== false;
              const formattedItemPrice = formatPrice(priceNum, project.currency || "USD");

              return (
                <div
                  key={project._id}
                  onClick={() =>
                    setSelectedId((prev) => (prev === project._id ? null : project._id))
                  }
                  className={`bg-white rounded-xl p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0 cursor-pointer transition-all ${isSelected
                    ? "border border-primary-300 bg-primary-400/20 rounded-[6px] hover:border-gray-300 shadow-sm"
                    : "border border-gray-200 bg-white rounded-[6px] shadow-sm hover:border-gray-300"
                    }`}
                >
                  {/* Left Side: Checkbox + Globe + Info */}
                  <div className="flex items-start md:items-center gap-4 md:gap-6">
                    {/* Checkbox */}
                    <div
                      className={`mt-1 md:mt-0 w-5 h-5 rounded-[4px] flex-shrink-0 
                        flex items-center justify-center overflow-hidden transition-colors flex-shrink-0 ${isSelected
                          ? "bg-[#4343f0] border-primary-300 border text-white"
                          : "border border-gray-300 bg-white"
                        }`}
                    >
                      {isSelected && (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>

                    {/* Globe Icon */}
                    <div className="text-primary-300 flex-shrink-0">
                      <GlobeIcon />
                    </div>

                    {/* Title and Metadata */}
                    <div>
                      <div className="text-[15px] font-bold text-gray-900 leading-tight flex items-center gap-2">
                        {project.title}
                        {/* Auto-renew badge */}
                        {isAutoRenewOn ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-green-50 text-green-700 border-green-200">
                            AUTO-RENEW ON
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-500 border border-gray-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            AUTO-RENEW OFF
                          </span>
                        )}
                      </div>
                      <div className="text-[13px] text-gray-500 mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>
                          {project.packageName || project.package?.name || "Maintenance Service"}
                        </span>
                        <span className="hidden sm:inline text-gray-300">•</span>
                        <span className="text-gray-400 font-medium">
                          Expires {formatExpiryDate(project.nextRenewalDate)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Stop Auto-Renewal + Rate + Price */}
                  <div className="flex items-center md:items-center gap-4 md:gap-6 justify-between md:justify-end md:text-right pr-0 md:pr-4 pl-9 md:pl-0 ">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleAutoRenew(project);
                      }}
                      className="text-xs font-bold px-3 py-1.5 rounded transition-colors border bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
                    >
                      {isAutoRenewOn ? "Stop Auto-Renewal" : "Enable Auto-Renewal"}
                    </button>

                    <span className="text-[13px] text-gray-500 font-medium hidden lg:block">
                      1 month: {formattedItemPrice} / mo
                    </span>

                    <div className="text-base font-bold text-gray-900 min-w-0 md:min-w-[120px]">
                      {formattedItemPrice}
                      <span className="text-[10px] font-normal text-gray-400 ml-2 uppercase">
                        EXCL. TAX
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ONE Unified Details Box with shadow (Payment Summary + Terms + Payment Form) */}
        {!isLoading && selectedProject && (
          <Elements stripe={stripePromise}>
            <UnifiedRenewalDetailsBox
              project={selectedProject}
              onToggleAutoRenew={handleToggleAutoRenew}
              onPaymentSuccess={fetchRenewalsData}
            />
          </Elements>
        )}

        <div className="">
          <SupportNewsletter noPadding />
        </div>
      </main>
    </div>
  );
}
