"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  useStripe,
  useElements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
} from "@stripe/react-stripe-js";
import { useRouter } from "next/navigation";
import { useChatWidget } from "@/context/ChatWidgetContext";
import { useCurrency } from "@/context/CurrencyContext";
import { authService } from "@/lib/authService";
import { paymentService } from "@/lib/paymentService";
import { priceCalculatorService, CalculatorCategory, CalculatorConfig, CalculatorSelection } from "@/lib/priceCalculatorService";
import {
  getSelectedTier,
  getTierQuestionKey,
  getGraphicsCategoryKeys,
  shouldShowPriceBar,
  selectionsToArray,
  filterQuestionAnswers,
  isQuestionVisible,
  getSeoServiceMode,
  isMonthlyBillingCategory,
  pruneHiddenSelections,
  getCategoryDisplayName,
  getCategoryProposalName,
  getDefaultCategoryTimeline,
  getCategoryIllustration,
  formatCalculatorAnswerLabel,
  formatCalculatorQuestionText,
  formatCalculatorPrice,
  getCalculatorDisplayAmount,
  getCalculatorPayableAmount,
  getCalculatorHalfPayableAmount,
  roundCalculatorPrice,
} from "@/lib/calculatorUtils";
import { downloadCalculatorPdf, getCalculatorPdfBase64 } from "@/lib/calculatorPdfService";
import StatusPopup from "@/components/common/StatusPopup";
import DashboardSubNav from "@/components/dashboard/DashboardSubNav";
import VisaIcon from "@/components/icons/visa";
import MastercardIcon from "@/components/icons/mastercard";
import AmexIcon from "@/components/icons/amex";

// Initialize Stripe
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

const calculatorDarkBg = {
  backgroundImage: "radial-gradient(circle, #001f5c 1%, transparent 1%)",
  backgroundSize: "20px 20px",
  backgroundColor: "#00102e",
} as const;

const stripeElementOptions = {
  disableLink: true,
  style: {
    base: {
      color: "#000000",
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSmoothing: "antialiased",
      fontSize: "16px",
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

// --- Sub-components ---

const CurrencyDropdown = ({
  currency,
  setCurrency,
  size = "md",
}: {
  currency: string;
  setCurrency: (c: "usd" | "eur") => void;
  size?: "sm" | "md";
}) => {
  const labelClass =
    size === "sm"
      ? "text-[16px] font-bold text-[#002E8A] uppercase tracking-wide font-sans"
      : "text-sm md:text-[18px] font-bold text-[#002E8A] uppercase tracking-wide font-sans";
  const valueClass =
    size === "sm"
      ? "text-[16px] font-bold text-black uppercase font-sans"
      : "text-lg md:text-xl font-bold text-black uppercase font-sans";

  return (
    <div className="flex items-center gap-2 md:gap-3">
      <span className={labelClass}>CURRENCY:</span>
      <div className="relative inline-flex items-center">
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value as "usd" | "eur")}
          aria-label="Select currency"
          className={`${valueClass} appearance-none bg-transparent pr-6 cursor-pointer focus:outline-none`}
        >
          <option value="usd">USD</option>
          <option value="eur">EUR</option>
        </select>
        <svg
          className="w-4 h-4 text-black pointer-events-none absolute right-0 top-1/2 -translate-y-1/2"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </div>
  );
};

const CategoryGrid = ({ categories, selectedCategoryKey, onSelect }: { categories: CalculatorCategory[], selectedCategoryKey: string | null, onSelect: (key: string) => void }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 xl:gap-8 items-stretch">
    {categories.map((cat: CalculatorCategory) => {
      const isSelected = selectedCategoryKey === cat.categoryKey;
      return (
      <button
        key={cat.categoryKey}
        onClick={() => onSelect(cat.categoryKey)}
        className={`group relative bg-white rounded-[4px] shadow-[0px_10px_30px_rgba(0,0,0,0.1)] border-0 transition-all duration-300 transform hover:-translate-y-1 flex flex-col w-full h-full focus:outline-none focus:ring-2 focus:ring-white/20 ${
          isSelected ? "pb-[26px]" : ""
        }`}
      >
        <div className="w-full flex-1 flex items-center justify-center px-6 pt-8 pb-4 bg-white min-h-[190px] rounded-t-[4px]">
          <img
            src={getCategoryIllustration(cat.categoryKey, cat.image)}
            alt={cat.categoryName}
            className="max-w-full max-h-[150px] w-auto object-contain transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div className="w-full px-4 pt-2 pb-5 bg-white min-h-[88px] flex items-start">
          <h3 className="font-black text-[#002E8A] uppercase tracking-tight text-[15px] leading-[1.3] text-left">
            {getCategoryDisplayName(cat.categoryKey, cat.categoryName)}
          </h3>
        </div>
        {isSelected && (
          <div className="absolute bottom-0 left-0 right-0 h-[26px] flex items-center px-4 text-[9px] font-black uppercase tracking-[0.2em] bg-[#334155] text-white rounded-b-[4px]">
            SELECTED
          </div>
        )}
      </button>
    );
    })}
  </div>
);

const NumberStepper = ({
  value,
  onChange,
  min = 0,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
}) => (
  <div className="inline-flex items-center gap-3 rounded-full bg-gray-100 px-3 py-2">
    <button
      type="button"
      onClick={() => onChange(Math.max(min, value - 1))}
      className="w-10 h-10 rounded-full text-gray-600 text-xl font-normal flex items-center justify-center hover:bg-white transition-colors"
    >
      −
    </button>
    <div className="min-w-[48px] text-center text-2xl font-semibold text-[#363636]">{value}</div>
    <button
      type="button"
      onClick={() => onChange(value + 1)}
      className="w-10 h-10 rounded-full text-gray-600 text-xl font-normal flex items-center justify-center hover:bg-white transition-colors"
    >
      +
    </button>
  </div>
);

const QuestionCard = ({
  question,
  selection,
  onToggleAnswer,
  tier,
  categoryKey,
  categorySelections,
  seoServiceMode,
}: {
  question: any;
  selection: any;
  onToggleAnswer: any;
  tier: string;
  categoryKey?: string | null;
  categorySelections?: string[];
  seoServiceMode?: string;
}) => {
  const [textVal, setTextVal] = useState(selection?.textValue || "");
  const numVal = selection?.numericValue ?? 0;

  useEffect(() => {
    setTextVal(selection?.textValue || "");
  }, [selection?.textValue]);

  const activeKeys = selection?.answerKeys || [];
  const filteredQuestion = filterQuestionAnswers(question, tier);
  let visibleAnswers = filteredQuestion.answers || [];
  if (question.key === "SEO_SERVICE_TYPE") {
    visibleAnswers = visibleAnswers.filter((a: any) => a.key !== "SEO_TYPE_COMBO");
  }
  const answerGroups = [{ heading: null, answers: visibleAnswers }];

  return (
    <div className="animate-in fade-in duration-700 bg-white p-6 md:p-10 rounded-[10px] shadow-2xl">
      <h2 className="text-xl md:text-2xl font-semibold text-[#363636] mb-6 md:mb-8 tracking-tight font-manrope">
        {formatCalculatorQuestionText(question.text, question.isRequired, question.type)}
      </h2>

      {question.type === "text" && (
        <textarea
          value={textVal}
          onChange={(e) => setTextVal(e.target.value)}
          onBlur={() => onToggleAnswer(question.key, textVal, "text")}
          placeholder="Enter your response here..."
          className="w-full p-4 bg-white border border-gray-200 rounded-lg text-[#002E8A] focus:border-[#002E8A] focus:ring-1 focus:ring-[#002E8A] focus:outline-none min-h-[120px] resize-vertical placeholder:text-gray-400 transition-all"
        />
      )}

      {question.type === "number" && (
        <NumberStepper
          value={numVal}
          min={
            question.key === "SEO_WORDS" || question.key === "SEO_BACKLINKS" || question.key === "SEO_MONTHS"
              ? 0
              : (question.config?.minValue ?? 1)
          }
          onChange={(n) => onToggleAnswer(question.key, n, "number")}
        />
      )}

      {(question.type === "single" || question.type === "multi") &&
        answerGroups.map((group, gIdx) => (
          <div key={gIdx} className={gIdx > 0 ? "mt-6" : ""}>
            <div className="grid grid-cols-1 gap-1">
              {group.answers.map((ans: any) => {
                const isSelected = activeKeys.includes(ans.key);
                return (
                  <button
                    key={ans.key}
                    type="button"
                    onClick={() => onToggleAnswer(question.key, ans.key, question.type)}
                    className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-all outline-none text-left"
                  >
                    <div className="flex-shrink-0">
                      {question.type === "multi" ? (
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            isSelected ? "bg-[#5356ff] border-[#5356ff]" : "border-gray-300 bg-white"
                          }`}
                        >
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center">
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#5356ff]" />}
                        </div>
                      )}
                    </div>
                    <div className="text-[17px] font-normal text-[#5a6a7a] tracking-wide">{formatCalculatorAnswerLabel(ans.text, question.key)}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
};

const ProposalPreview = ({
  category,
  selections,
  totalPrice,
  timeline,
  billingType,
  onDownloadPdf,
}: any) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const { currency, conversionRate } = useCurrency();

  const formatPriceLocal = (amt: number) =>
    formatCalculatorPrice(amt, currency, conversionRate, category.categoryKey);

  const isMonthly = billingType === "monthly";

  const sortedQuestions = [...(category.questions || [])].sort(
    (a: any, b: any) => (a.order || 0) - (b.order || 0)
  );
  const firstQuestionKey = sortedQuestions[0]?.key;
  let subtitle = "";
  const breakdown: { question: string; answers: string[] }[] = [];

  sortedQuestions.forEach((q: any) => {
    if (!isQuestionVisible(q, selections)) return;

    const sel = selections[q.key];
    if (!sel) return;

    if (q.key === firstQuestionKey && q.type === "single" && sel.answerKeys?.[0]) {
      const ans = q.answers.find((a: any) => a.key === sel.answerKeys[0]);
      if (ans) subtitle = ans.text;
      return;
    }

    const ansTexts: string[] = [];
    if (q.type === "number" && sel.numericValue !== undefined) {
      ansTexts.push(String(sel.numericValue));
    } else if (q.type === "text" && sel.textValue?.trim()) {
      ansTexts.push(sel.textValue.trim());
    } else if (sel.answerKeys?.length) {
      sel.answerKeys.forEach((k: string) => {
        const ans = q.answers.find((a: any) => a.key === k);
        if (ans) ansTexts.push(formatCalculatorAnswerLabel(ans.text, q.key));
      });
    }

    if (ansTexts.length > 0) {
      breakdown.push({ question: formatCalculatorQuestionText(q.text, q.isRequired, q.type), answers: ansTexts });
    }
  });

  const displayName = getCategoryProposalName(category.categoryKey, category.categoryName);
  const displayTimeline = timeline || getDefaultCategoryTimeline(category.categoryKey, category.timeline);

  const handleDownload = async () => {
    try {
      await downloadCalculatorPdf({
        categoryName: category.categoryName,
        subtitle,
        breakdownItems: breakdown,
        totalPrice,
        timeline: timeline || category.timeline,
        currency: currency,
        conversionRate,
        categoryKey: category.categoryKey,
      });
      if (onDownloadPdf) onDownloadPdf();
    } catch (err) {
      console.error("Failed to generate PDF", err);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  const handleEmail = async () => {
    const email = prompt("Please enter your email address to receive the proposal:");
    if (!email || !email.includes("@")) {
      if (email !== null) alert("Please enter a valid email address.");
      return;
    }

    try {
      const subject = `Estimate: ${category.categoryName}`;
      let body = `Hello,\n\nHere is your project estimate breakdown:\n\n* Category: ${category.categoryName}\n${subtitle ? `* Subtitle: ${subtitle}\n` : ""}`;

      breakdown.forEach(item => {
        body += `\n- ${item.question}:\n  ${item.answers.join(", ")}`;
      });

      body += `\n\nTotal Price: ${formatPriceLocal(totalPrice)}\nTimeline: ${displayTimeline || "TBA"}\n\nAttached is your detailed proposal PDF.\n\nGenerated via Society Web Solutions Calculator.`;

      alert("Generating PDF and sending email... Please wait a moment.");

      const pdfBase64 = await getCalculatorPdfBase64({
        categoryName: category.categoryName,
        subtitle,
        breakdownItems: breakdown,
        totalPrice,
        timeline: timeline || category.timeline,
        currency: currency,
        conversionRate,
        categoryKey: category.categoryKey,
      });

      const res = await fetch("/api-gateway/quotes/email-calculator-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          subject,
          messageBody: body,
          pdfBase64
        })
      });

      if (res.ok) {
        alert("Proposal sent successfully to your email!");
      } else {
        alert("Failed to send proposal via email. Please try downloading it instead.");
      }
    } catch (err) {
      console.error("Error emailing proposal:", err);
      alert("An error occurred while sending the proposal.");
    }
  };

  return (
    <div className="w-full max-w-[680px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 my-6">
      <h2 className="text-[34px] font-normal text-white text-center mb-8 tracking-wide font-manrope">YOUR PROPOSAL</h2>
      <div className="bg-white rounded-[10px] p-8 md:p-10 shadow-2xl text-left border border-white">
        <h3 className="text-[#363636] font-bold text-[26px] md:text-[28px] mb-2 tracking-tight leading-none">
          {displayName}
        </h3>
        {subtitle && (
          <p className="text-[#5a6a7a] text-[15px] md:text-[16px] font-normal mb-10 leading-snug">
            {subtitle}
          </p>
        )}
        {!subtitle && <div className="mb-10" />}

        <div className="space-y-7">
          {breakdown.map((item, idx) => (
            <div key={idx} className="font-sans">
              <h4 className="text-[#002E8A] font-bold text-[17px] md:text-[18px] mb-1.5 leading-snug">
                {item.question}
              </h4>
              {item.answers.length === 1 ? (
                <p className="text-[#5a6a7a] text-[16px] md:text-[17px] font-normal leading-relaxed">
                  {item.answers[0]}
                </p>
              ) : (
                <ul className="list-disc pl-5 text-[#5a6a7a] text-[16px] md:text-[17px] font-normal leading-relaxed space-y-1">
                  {item.answers.map((ans, aIdx) => (
                    <li key={aIdx}>{ans}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 mb-6">
          <h3 className="text-[#363636] text-[28px] md:text-[32px] font-black tracking-tighter">
            PROJECT TOTAL COST:{" "}
            <span className="text-[#5356ff]">{formatPriceLocal(totalPrice)}</span>
          </h3>
          {isMonthly && <p className="text-[#363636] text-[13px] font-medium mt-1 opacity-75">First month billed on start. Then auto-renewed monthly.</p>}
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[#363636] text-[18px] font-bold">Estimated Deadline</span>
            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="w-5 h-5 rounded-full bg-gray-400 text-white text-[11px] font-bold flex items-center justify-center cursor-help leading-none"
              >
                ?
              </button>
              {showTooltip && (
                <div className="absolute left-7 top-0 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl z-10 leading-relaxed font-normal">
                  The estimated deadline counts only active working days. Time is paused while waiting for your reply — e.g. for approvals, content submissions, or pending payments.
                </div>
              )}
            </div>
          </div>
          <p className="text-[#363636] text-[16px] font-bold">{displayTimeline}</p>
        </div>

        <div className="bg-[#F3F0FF] border border-[#E0DBFF] rounded-lg p-4 mb-8 text-sm text-[#5356ff] leading-relaxed">
          <strong>📋 Timeline Note:</strong> The estimated deadline does not count time when your response is pending — including approvals, content submissions, or payment deadlines. Your project manager will notify you if the project timeline is paused.
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <button onClick={handleDownload} className="w-full bg-[#5356ff] hover:bg-[#4346DD] text-white font-bold py-4 px-6 rounded-[5px] transition-colors flex items-center justify-center gap-2 shadow-[0px_4px_10px_rgba(0,0,0,0.1)] group">
            <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span className="text-[16px] font-black tracking-wide uppercase">Download PDF</span>
          </button>
          <button onClick={handleEmail} className="w-full bg-white border-2 border-[#5356ff] hover:bg-gray-50 text-[#5356ff] font-bold py-4 px-6 rounded-[5px] transition-colors flex items-center justify-center gap-2 group">
            <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1 0.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <span className="text-[16px] font-black tracking-wide uppercase">Email Proposal</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const CalculatorPaymentForm = ({ totalPrice, timeline, categoryKey, selections, formatPriceLocal, currency, setCurrency, conversionRate }: any) => {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const payableTotal = getCalculatorPayableAmount(totalPrice, currency, conversionRate);
  const halfPrice = getCalculatorHalfPayableAmount(payableTotal);

  const [paymentOption, setPaymentOption] = useState("full");
  const [customAmount, setCustomAmount] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [billingSameAsBusiness, setBillingSameAsBusiness] = useState(true);
  const [billingAddress, setBillingAddress] = useState({ street: "", city: "", state: "", zip: "", country: "" });
  const [bizInfo, setBizInfo] = useState({
    personName: "",
    personEmail: "",
    personPhone: "",
    preferredContactMethod: "email",
    businessName: "",
    businessEmail: "",
    businessPhone: "",
    businessAddress: "",
    businessWebsite: "",
    businessDescription: ""
  });

  useEffect(() => {
    const user = authService.getUser();
    if (user) {
      if (user.fullName) {
        setCardholderName(user.fullName);
        setBizInfo(p => ({ ...p, personName: user.fullName || "" }));
      }
      if (user.email) {
        setBizInfo(p => ({ ...p, personEmail: user.email || "" }));
      }
    }
  }, []);

  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState({ isOpen: false, type: "success" as any, title: "", message: "" });
  const [errors, setErrors] = useState<any>({});
  const [cardStatus, setCardStatus] = useState<any>({
    number: { complete: false, error: null },
    expiry: { complete: false, error: null },
    cvc: { complete: false, error: null }
  });

  const handleBizChange = (e: any) => setBizInfo({ ...bizInfo, [e.target.name]: e.target.value });

  const vatRate = 0;
  const currencyLabel = currency.toUpperCase();

  const getBasePayableAmount = () => {
    if (paymentOption === "half") return halfPrice;
    if (paymentOption === "full") return payableTotal;
    if (paymentOption === "custom" && customAmount) return parseFloat(customAmount) || 0;
    return payableTotal;
  };

  const baseAmount = getBasePayableAmount();
  const vatAmount = Math.round(baseAmount * vatRate * 100) / 100;
  const totalPayable = Math.round((baseAmount + vatAmount) * 100) / 100;

  const formatPaymentLine = (amt: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyLabel,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amt);

  const getPayableAmount = () => totalPayable;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    const errs: any = {};
    const amount = getPayableAmount();

    if (!bizInfo.personName.trim()) errs.personName = "Name is required.";
    if (!bizInfo.personEmail.trim()) {
      errs.personEmail = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bizInfo.personEmail)) {
      errs.personEmail = "Invalid email format.";
    }

    if (paymentOption === "custom") {
      if (!customAmount || parseFloat(customAmount) <= 0) {
        errs.amount = "Enter a valid amount.";
      } else if (parseFloat(customAmount) > payableTotal) {
        errs.amount = "Cannot exceed total price.";
      } else if (parseFloat(customAmount) < payableTotal * 0.1) {
        errs.amount = `Min ${formatPaymentLine(payableTotal * 0.1)}.`;
      }
    }

    if (!cardholderName.trim()) errs.cardHolderName = "Cardholder name is required.";
    if (!cardStatus.number.complete) errs.cardNumber = cardStatus.number.error?.message || "Incomplete card number.";
    if (!cardStatus.expiry.complete) errs.cardExpiry = cardStatus.expiry.error?.message || "Incomplete expiry.";
    if (!cardStatus.cvc.complete) errs.cardCvc = cardStatus.cvc.error?.message || "Incomplete CVC.";

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setStatus({ isOpen: true, type: "error", title: "Validation Error", message: "Please correct the highlighted fields." });
      return;
    }

    setIsProcessing(true);
    try {
      const proposalData = {
        categoryKey,
        selections: Object.values(selections),
        calculatedPrice: totalPrice,
        estimatedTimeline: timeline,
        ...bizInfo
      };

      const submitRes = await priceCalculatorService.submitQuote(proposalData);
      if (!submitRes.isSuccessful || !submitRes.data?.quote) {
        throw new Error(submitRes.message || "Failed to submit proposal request.");
      }

      const quote = submitRes.data.quote;
      const quoteId = quote._id || quote.id;
      const quoteNum = quote.quoteNumber || "Q-PENDING";

      const intentRes = await paymentService.createPaymentIntent({
        amount,
        currency,
        useCredits: false,
        metadata: {
          type: "QUOTE",
          quoteId,
          quoteNumber: quoteNum
        }
      });

      if (!intentRes.isSuccessful || !intentRes.data) {
        throw new Error(intentRes.message || "Failed to initialize payment.");
      }

      const { clientSecret, transactionId } = intentRes.data;
      const cardElement = elements.getElement(CardNumberElement);
      if (!cardElement) throw new Error("Card element not found.");

      const confirmRes = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: cardholderName || bizInfo.personName,
            email: bizInfo.personEmail,
            address: billingSameAsBusiness ? undefined : {
              line1: billingAddress.street,
              city: billingAddress.city,
              state: billingAddress.state,
              postal_code: billingAddress.zip,
              country: billingAddress.country
            }
          }
        }
      });

      if (confirmRes.error) throw new Error(confirmRes.error.message);

      if (confirmRes.paymentIntent?.status === "succeeded") {
        const confirmResult = await paymentService.confirmPayment({ transactionId });
        if (confirmResult.isSuccessful) {
          setStatus({ isOpen: true, type: "success", title: "Payment Successful", message: "Your project has been started successfully!" });
          setTimeout(() => router.push(`/dashboard/my-quotes/${quoteId}`), 2000);
        } else {
          throw new Error("Payment succeeded but server confirmation failed. Please contact support.");
        }
      }
    } catch (err: any) {
      console.error("Payment Error:", err);
      setStatus({ isOpen: true, type: "error", title: "Payment Failed", message: err.message || "An unexpected error occurred." });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="animate-in fade-in duration-500 w-full flex flex-col gap-8">
      <StatusPopup isOpen={status.isOpen} onClose={() => setStatus({ ...status, isOpen: false })} type={status.type} title={status.title} message={status.message} />

      <div className="text-center mb-2">
        <h2 className="text-[34px] font-normal text-white mb-4 font-manrope uppercase tracking-wide">READY TO BEGIN?</h2>
        <p className="text-gray-100 text-[16px] font-light leading-relaxed">
          Pay any amount as a deposit to have our team<br />begin work on this project.
        </p>
      </div>

      <div className="bg-white rounded-[10px] p-6 md:p-10 shadow-2xl mx-auto w-full max-w-[680px]">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-black font-bold text-[18px]">Amount:</h3>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setCurrency("usd")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                currency === "usd" ? "bg-white shadow text-gray-800" : "text-gray-500"
              }`}
            >
              USD
            </button>
            <button
              type="button"
              onClick={() => setCurrency("eur")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                currency === "eur" ? "bg-white shadow text-gray-800" : "text-gray-500"
              }`}
            >
              EUR
            </button>
          </div>
          <div className="flex gap-2 items-center opacity-90 hidden sm:flex">
            <VisaIcon />
            <MastercardIcon />
            <AmexIcon />
          </div>
        </div>

        <div className="flex flex-col gap-[18px] text-[16px] mb-8 md:mb-12">
          <label className="flex items-center gap-[14px] cursor-pointer group">
            <div className={`w-[22px] h-[22px] rounded-full border-[2.5px] flex flex-shrink-0 items-center justify-center transition-colors ${paymentOption === "full" ? "border-black" : "border-gray-400"}`}>
              {paymentOption === "full" && <div className="w-[10px] h-[10px] rounded-full bg-black" />}
            </div>
            <input type="radio" name="paymentOption" className="hidden" checked={paymentOption === "full"} onChange={() => setPaymentOption("full")} />
            <span className={`transition-colors font-medium ${paymentOption === "full" ? "text-black" : "text-gray-800"}`}>Full {formatPaymentLine(payableTotal)}</span>
          </label>

          {halfPrice > 0 && (
            <label className="flex items-center gap-[14px] cursor-pointer group">
              <div className={`w-[22px] h-[22px] rounded-full border-[2.5px] flex flex-shrink-0 items-center justify-center transition-colors ${paymentOption === "half" ? "border-black" : "border-gray-400"}`}>
                {paymentOption === "half" && <div className="w-[10px] h-[10px] rounded-full bg-black" />}
              </div>
              <input type="radio" name="paymentOption" className="hidden" checked={paymentOption === "half"} onChange={() => setPaymentOption("half")} />
              <span className={`transition-colors font-medium ${paymentOption === "half" ? "text-black" : "text-gray-800"}`}>50% {formatPaymentLine(halfPrice)}</span>
            </label>
          )}

          <label className="flex flex-wrap items-center gap-[14px] cursor-pointer group">
            <div className={`w-[22px] h-[22px] rounded-full border-[2.5px] flex flex-shrink-0 items-center justify-center transition-colors ${paymentOption === "custom" ? "border-black" : "border-gray-400"}`}>
              {paymentOption === "custom" && <div className="w-[10px] h-[10px] rounded-full bg-black" />}
            </div>
            <input type="radio" name="paymentOption" className="hidden" checked={paymentOption === "custom"} onChange={() => setPaymentOption("custom")} />
            <span className={`transition-colors font-medium ${paymentOption === "custom" ? "text-black" : "text-gray-800"}`}>Other</span>
            {paymentOption === "custom" && (
              <div className="flex flex-col gap-1">
                <div className="relative w-28 ml-2">
                  <span className={`absolute left-0 top-1/2 -translate-y-1/2 font-medium ${errors.amount ? "text-red-500" : "text-black"}`}>{currency === "eur" ? "€" : "$"}</span>
                  <input type="number" min="1" value={customAmount} onChange={(e) => { setCustomAmount(e.target.value); if (errors.amount) setErrors((p: any) => ({ ...p, amount: "" })); }} className={`w-full border-b ${errors.amount ? "border-red-500" : "border-black"} py-0.5 pl-4 pr-1 text-[16px] font-medium outline-none bg-transparent`} placeholder="Amount" />
                </div>
                {errors.amount && <span className="text-[10px] text-red-500 font-bold ml-2">{errors.amount}</span>}
              </div>
            )}
          </label>
        </div>

        <div className="border border-gray-200 rounded-lg p-4 mb-8 space-y-3">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>Base Amount ({currencyLabel}):</span>
            <span>{formatPaymentLine(baseAmount)}</span>
          </div>
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>VAT ({Math.round(vatRate * 100)}%):</span>
            <span>{formatPaymentLine(vatAmount)}</span>
          </div>
          <hr className="border-gray-200" />
          <div className="flex justify-between items-center text-sm font-bold">
            <span className="text-[#5356ff]">Total Payable:</span>
            <span className="text-[#5356ff]">{formatPaymentLine(totalPayable)}</span>
          </div>
        </div>

        <label className="flex items-center gap-3 mb-8 cursor-pointer">
          <input
            type="checkbox"
            checked={billingSameAsBusiness}
            onChange={(e) => setBillingSameAsBusiness(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-[#5356ff] focus:ring-[#5356ff]"
          />
          <span className="text-sm text-gray-700">Billing address is the same as Business details</span>
        </label>

        <div className="space-y-8 font-sans">
          <div>
            <label className="block text-[16px] font-bold text-black mb-[10px]">Name on the card:</label>
            <input type="text" value={cardholderName} onChange={(e) => { setCardholderName(e.target.value); if (errors.cardHolderName) setErrors((p: any) => ({ ...p, cardHolderName: "" })); }} placeholder="Name on the card" className={`w-full border-b ${errors.cardHolderName ? "border-red-500" : "border-black/80"} py-2.5 bg-transparent outline-none text-black placeholder:text-gray-400 focus:border-black text-[16px] transition-all`} />
            {errors.cardHolderName && <span className="text-[10px] text-red-500 font-bold mt-1 block">{errors.cardHolderName}</span>}
          </div>

          <div>
            <label className="block text-[16px] font-bold text-black mb-[10px]">Card number:</label>
            <div className={`w-full border-b ${errors.cardNumber ? "border-red-500" : "border-black/80"} py-2.5 focus-within:border-black transition-all`}>
              <CardNumberElement options={{ ...stripeElementOptions, showIcon: false }} className="w-full pl-1" onChange={(e) => { setCardStatus((p: any) => ({ ...p, number: { complete: e.complete, error: e.error } })); if (e.complete || !e.error) setErrors((p: any) => ({ ...p, cardNumber: "" })); }} />
            </div>
            {errors.cardNumber && <span className="text-[10px] text-red-500 font-bold mt-1 block">{errors.cardNumber}</span>}
          </div>

          <div className="grid grid-cols-2 gap-10">
            <div>
              <label className="block text-[16px] font-bold text-black mb-[10px]">Expiry date:</label>
              <div className={`w-full border-b ${errors.cardExpiry ? "border-red-500" : "border-black/80"} py-2.5 focus-within:border-black transition-all`}>
                <CardExpiryElement options={stripeElementOptions} className="w-full pl-1" onChange={(e) => { setCardStatus((p: any) => ({ ...p, expiry: { complete: e.complete, error: e.error } })); if (e.complete || !e.error) setErrors((p: any) => ({ ...p, cardExpiry: "" })); }} />
              </div>
              {errors.cardExpiry && <span className="text-[10px] text-red-500 font-bold mt-1 block">{errors.cardExpiry}</span>}
            </div>
            <div>
              <label className="block text-[16px] font-bold text-black mb-[10px]">CVC:</label>
              <div className={`w-full border-b ${errors.cardCvc ? "border-red-500" : "border-black/80"} py-2.5 focus-within:border-black transition-all`}>
                <CardCvcElement options={stripeElementOptions} className="w-full pl-1" onChange={(e) => { setCardStatus((p: any) => ({ ...p, cvc: { complete: e.complete, error: e.error } })); if (e.complete || !e.error) setErrors((p: any) => ({ ...p, cardCvc: "" })); }} />
              </div>
              {errors.cardCvc && <span className="text-[10px] text-red-500 font-bold mt-1 block">{errors.cardCvc}</span>}
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-[16px] text-gray-300 mt-10 max-w-[680px] mx-auto font-sans">Please fill out your business information before paying.</p>

      <div className="bg-white rounded-[10px] p-6 md:p-10 text-black space-y-6 max-w-[680px] mx-auto w-full font-sans shadow-2xl">
        <div>
          <label className="block text-[16px] font-bold mb-2">Contact person&apos;s name: *</label>
          <input type="text" name="personName" value={bizInfo.personName} onChange={(e) => { handleBizChange(e); if (errors.personName) setErrors((p: any) => ({ ...p, personName: "" })); }} placeholder="Your answer" className={`w-full border-b ${errors.personName ? "border-red-500" : "border-black/80"} py-2 bg-transparent outline-none focus:border-black placeholder-gray-400 text-[16px]`} />
          {errors.personName && <span className="text-[10px] text-red-500 font-bold mt-1 block">{errors.personName}</span>}
        </div>
        <div>
          <label className="block text-[16px] font-bold mb-2">Contact person&apos;s email address: *</label>
          <input type="email" name="personEmail" value={bizInfo.personEmail} onChange={(e) => { handleBizChange(e); if (errors.personEmail) setErrors((p: any) => ({ ...p, personEmail: "" })); }} placeholder="Your answer" className={`w-full border-b ${errors.personEmail ? "border-red-500" : "border-black/80"} py-2 bg-transparent outline-none focus:border-black placeholder-gray-400 text-[16px]`} />
          {errors.personEmail && <span className="text-[10px] text-red-500 font-bold mt-1 block">{errors.personEmail}</span>}
        </div>
        <div>
          <label className="block text-[16px] font-bold mb-2">Contact person&apos;s phone number:</label>
          <input type="tel" name="personPhone" value={bizInfo.personPhone} onChange={handleBizChange} placeholder="Your answer" className="w-full border-b border-black/80 py-2 bg-transparent outline-none focus:border-black placeholder-gray-400 text-[16px]" />
        </div>
        <div>
          <label className="block text-[16px] font-bold mb-2">Business name:</label>
          <input type="text" name="businessName" value={bizInfo.businessName} onChange={handleBizChange} placeholder="Your answer" className="w-full border-b border-black/80 py-2 bg-transparent outline-none focus:border-black placeholder-gray-400 text-[16px]" />
        </div>
        <div>
          <label className="block text-[16px] font-bold mb-2">Business email address:</label>
          <input type="email" name="businessEmail" value={bizInfo.businessEmail} onChange={handleBizChange} placeholder="Your answer" className="w-full border-b border-black/80 py-2 bg-transparent outline-none focus:border-black placeholder-gray-400 text-[16px]" />
        </div>
        <div>
          <label className="block text-[16px] font-bold mb-2">Business phone number:</label>
          <input type="tel" name="businessPhone" value={bizInfo.businessPhone} onChange={handleBizChange} placeholder="Your answer" className="w-full border-b border-black/80 py-2 bg-transparent outline-none focus:border-black placeholder-gray-400 text-[16px]" />
        </div>
        <div>
          <label className="block text-[16px] font-bold mb-2">Business address:</label>
          <input type="text" name="businessAddress" value={bizInfo.businessAddress} onChange={handleBizChange} placeholder="Your answer" className="w-full border-b border-black/80 py-2 bg-transparent outline-none focus:border-black placeholder-gray-400 text-[16px]" />
        </div>
        <div>
          <label className="block text-[16px] font-bold mb-2">Business website:</label>
          <input type="url" name="businessWebsite" value={bizInfo.businessWebsite} onChange={handleBizChange} placeholder="Your answer" className="w-full border-b border-black/80 py-2 bg-transparent outline-none focus:border-black placeholder-gray-400 text-[16px]" />
        </div>
        <div>
          <label className="block text-[16px] font-bold mb-2">Business services and description:</label>
          <textarea name="businessDescription" rows={1} value={bizInfo.businessDescription} onChange={handleBizChange} placeholder="Your answer" className="w-full border-b border-black/80 py-2 bg-transparent outline-none focus:border-black placeholder-gray-400 text-[16px] resize-none" />
        </div>
      </div>

      <button type="submit" disabled={isProcessing || !stripe || !elements} className="w-full max-w-[680px] mx-auto py-5 px-6 rounded bg-white text-[#163659] font-black text-[16px] tracking-widest shadow-xl hover:bg-gray-100 transition-all disabled:opacity-70 disabled:cursor-not-allowed uppercase active:scale-[0.98] mt-4">
        {isProcessing ? "PROCESSING..." : `PAY ${paymentOption === "full" ? `${formatPaymentLine(payableTotal)} ` : ""}NOW`}
      </button>
    </form>
  );
};

const WrappedPaymentForm = (props: any) => (
  <Elements stripe={stripePromise}>
    <CalculatorPaymentForm {...props} />
  </Elements>
);

export default function CalculatorPage() {
  const { currency, setCurrency, conversionRate } = useCurrency();

  const formatPriceLocal = (amt: number) =>
    formatCalculatorPrice(amt, currency, conversionRate, selectedCategoryKey ?? undefined);

  const [config, setConfig] = useState<CalculatorConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, CalculatorSelection>>({});
  useEffect(() => {
    (async () => {
      try {
        const res = await priceCalculatorService.getCalculatorConfig();
        setConfig(res);
      } catch (err) {
        console.error("Failed to load calculator config", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const [calculation, setCalculation] = useState<{ totalPrice: number; timeline?: string }>({
    totalPrice: 0,
    timeline: undefined,
  });
  const calcTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedCategory = useMemo(
    () => config?.categories.find((c) => c.categoryKey === selectedCategoryKey) || null,
    [config, selectedCategoryKey]
  );
  const sortedQuestions = useMemo(
    () =>
      selectedCategory
        ? [...selectedCategory.questions].sort((a, b) => (a.order || 0) - (b.order || 0))
        : [],
    [selectedCategory]
  );
  const tier = useMemo(
    () => getSelectedTier(selections, getTierQuestionKey(selectedCategoryKey || "")),
    [selections, selectedCategoryKey]
  );
  const graphicsCategoryKeys = useMemo(
    () => getGraphicsCategoryKeys(selections),
    [selections]
  );
  const seoServiceMode = useMemo(
    () => (selectedCategoryKey === "seo" ? getSeoServiceMode(selections) : undefined),
    [selections, selectedCategoryKey]
  );
  const visibleQuestions = useMemo(
    () => sortedQuestions.filter((q) => isQuestionVisible(q, selections)),
    [sortedQuestions, selections]
  );
  const isMonthlyBilling = isMonthlyBillingCategory(selectedCategoryKey);
  const hasUserSelections = useMemo(
    () => selectionsToArray(selections).length > 0,
    [selections]
  );
  const showPriceBar = useMemo(
    () => (selectedCategory ? shouldShowPriceBar(selectedCategory, selections) : false),
    [selectedCategory, selections]
  );
  const showStickyPriceBar = !!(selectedCategoryKey && showPriceBar && calculation.totalPrice > 0);

  useEffect(() => {
    if (!selectedCategoryKey || !hasUserSelections) {
      setCalculation({ totalPrice: 0, timeline: undefined });
      return;
    }

    if (calcTimerRef.current) clearTimeout(calcTimerRef.current);
    calcTimerRef.current = setTimeout(async () => {
      const result = await priceCalculatorService.calculatePrice(
        selectedCategoryKey,
        selectionsToArray(selections)
      );
      if (result) {
        setCalculation({ totalPrice: result.totalPrice, timeline: result.timeline });
      }
    }, 300);

    return () => {
      if (calcTimerRef.current) clearTimeout(calcTimerRef.current);
    };
  }, [selectedCategoryKey, selections, hasUserSelections]);

  const handleToggleAnswer = (questionKey: string, value: any, type: string) => {
    setSelections(prev => {
      const current = prev[questionKey];
      const currentKeys = current?.answerKeys || [];
      let nextKeys: string[] = [];
      let textValue: string | undefined;
      let numericValue: number | undefined;

      if (type === "single") {
        nextKeys = [value];
      } else if (type === "multi") {
        const keySet = new Set(currentKeys);
        if (keySet.has(value)) keySet.delete(value);
        else keySet.add(value);
        nextKeys = [...keySet];
      } else if (type === "text") {
        textValue = value;
      } else if (type === "number") {
        numericValue = Number(value);
      }

      const next = {
        ...prev,
        [questionKey]: {
          questionKey,
          answerKeys: nextKeys,
          textValue,
          numericValue,
        },
      };

      if (questionKey === "WEB_TIER") {
        delete next.WEB_TIMELINE;
      }
      if (questionKey === "SEO_ITEMS") {
        const keys = next.SEO_ITEMS?.answerKeys || [];
        if (!keys.includes("SEO_ITEM_CONTENT")) delete next.SEO_WORDS;
        if (!keys.includes("SEO_ITEM_BACKLINKS")) delete next.SEO_BACKLINKS;
      }

      return pruneHiddenSelections(next, sortedQuestions);
    });
  };

  const { setBottomOffset } = useChatWidget();
  useEffect(() => {
    if (showStickyPriceBar) {
      setBottomOffset(100);
    } else {
      setBottomOffset(0);
    }
    return () => setBottomOffset(0);
  }, [showStickyPriceBar, setBottomOffset]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6]">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002E8A] mb-4" />
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Loading Calculator...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#00102E] min-h-screen flex flex-col font-sans relative">

      {/* Hero Section */}
      <div className="relative text-white overflow-hidden w-full min-h-[280px] md:min-h-[360px]">
        <Image
          src="/images/home-hero-bg.jpg"
          alt="Price calculator hero background"
          fill
          priority
          className="object-cover object-center"
        />
        <div className="relative z-10 w-full max-w-[1600px] mx-auto px-6 sm:px-5 md:px-8 lg:px-[54px] py-10 sm:py-10 md:py-[40px]">
          <div className="flex flex-row justify-center items-center">
            <div className="w-full text-center md:text-left">
              <h1 className="text-[30px] sm:text-[28px] md:text-[36px] font-semibold mt-6 md:mt-8 mb-[25px] text-white leading-tight md:leading-[2] [font-family:var(--font-poppins)]">
                Instantly create your price quote.
              </h1>
              <p className="text-left text-[14px] sm:text-[16px] md:text-[18px] font-light text-white leading-[1.6] md:leading-relaxed tracking-normal [font-family:var(--font-poppins)] pb-6 md:pb-0">
                Already know the details of your project? There&apos;s an easy way to get started!{" "}
                <span className="hidden md:inline"><br /></span>
                Select your web project below, then fill out the requirements to calculate your price.
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-grow w-full overflow-hidden flex flex-col relative z-10">

        {/* Category Selection Section */}
        <div
          className={`calculator-category-section w-full transition-colors duration-300 ${
            selectedCategoryKey ? "py-6 md:py-10" : "bg-[#002E8A] py-8 md:py-16"
          }`}
          style={selectedCategoryKey ? calculatorDarkBg : undefined}
        >
          <div className="container mx-auto px-[34px] md:px-8 lg:px-[54px] max-w-[1600px]">
            <div className="mb-12 text-left ms-[-8px] mt-2">
              <h2 className="text-[20px] md:text-[24px] pl-[0px] md:pl-0 font-normal leading-none tracking-[0px] mb-0 text-[#f2f2f2] [font-family:var(--font-poppins)]">
                What would you like to create?
              </h2>
              <p className="text-[14px] md:text-[16px] pl-[0px] md:pl-0 font-medium leading-[23px] mt-[15px] uppercase text-white [font-family:var(--font-poppins)]">CLICK ON AN OPTION BELOW</p>
            </div>
            {config && (
              <CategoryGrid
                categories={config.categories}
                selectedCategoryKey={selectedCategoryKey}
                onSelect={(key) => {
                  setSelectedCategoryKey(key);
                  setSelections({});
                }}
              />
            )}
          </div>
        </div>

        {/* Questions Section with radial gradient pattern */}
        {selectedCategoryKey && (
          <>
            <div className="w-full" style={calculatorDarkBg}>
              <div className="container mx-auto px-4 md:px-8 lg:px-[54px] max-w-[1600px] pt-2 md:pt-4 pb-10 md:pb-16 flex flex-col items-center gap-8">
                {visibleQuestions.map((q: any) => (
                  <div key={q.key} className="w-full max-w-[680px]">
                    <QuestionCard
                      question={q}
                      selection={selections[q.key]}
                      onToggleAnswer={handleToggleAnswer}
                      tier={tier}
                      categoryKey={selectedCategoryKey}
                      categorySelections={graphicsCategoryKeys}
                      seoServiceMode={seoServiceMode}
                    />
                  </div>
                ))}
              </div>
            </div>

            {selectedCategory && (
              <div
                className="w-full bg-[#001b54] pb-10 md:pb-20"
                style={{
                  backgroundImage: "radial-gradient(circle, #00287a 1%, transparent 1%)",
                  backgroundSize: "30px 30px",
                }}
              >
                <div className="container mx-auto px-4 md:px-8 lg:px-[54px] max-w-[1600px] pt-8 md:pt-12 flex flex-col items-center w-full">
                  <ProposalPreview
                    category={selectedCategory}
                    selections={selections}
                    totalPrice={calculation.totalPrice}
                    timeline={calculation.timeline}
                    billingType={isMonthlyBilling ? "monthly" : undefined}
                  />
                  <div className="w-full mt-6">
                    <WrappedPaymentForm
                        totalPrice={calculation.totalPrice}
                        timeline={calculation.timeline}
                        categoryKey={selectedCategoryKey || selectedCategory.categoryKey}
                        selections={selections}
                        formatPriceLocal={formatPriceLocal}
                        currency={currency}
                        setCurrency={setCurrency}
                        conversionRate={conversionRate}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Reverted Sticky Bottom Bar to centered production style */}
      {showStickyPriceBar && (
        <div className="fixed bottom-0 left-0 right-0 py-4 md:h-[100px] bg-white shadow-[0_-5px_20px_rgba(0,0,0,0.05)] border-t border-gray-100 flex items-center z-[100]">
          <div className="container mx-auto flex flex-col md:flex-row justify-center items-center gap-4 md:gap-10 px-4">
            <div className="flex items-center gap-4">
              <span className="text-sm md:text-[18px] font-bold text-[#002E8A] uppercase tracking-wide font-sans whitespace-nowrap">PROJECT TOTAL COST:</span>
              <span className="text-2xl md:text-[34px] font-black text-black tracking-tighter">
                {formatPriceLocal(calculation.totalPrice)}
              </span>
            </div>
            <div className="md:pl-8">
              <CurrencyDropdown currency={currency} setCurrency={setCurrency} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
