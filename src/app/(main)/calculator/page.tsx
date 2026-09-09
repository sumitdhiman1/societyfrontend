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
  findTimelineQuestionKey,
  isTimelineQuestion,
  hasTimelineSelected,
  getMissingRequiredQuestions,
  isTierSourceQuestion,
  getGraphicsCategoryKeys,
  isGraphicsItemsQuestion,
  filterGraphicsAnswers,
  groupAnswersByHeading,
  calculateGraphicsRawTimelineDays,
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
  formatCalculatorDisplayAmount,
  getCalculatorDisplayAmount,
  getCalculatorPayableAmount,
  getCalculatorHalfPayableAmount,
  roundCalculatorPrice,
} from "@/lib/calculatorUtils";
import { downloadCalculatorPdf, getCalculatorPdfBase64 } from "@/lib/calculatorPdfService";
import StatusPopup from "@/components/common/StatusPopup";
type PaymentProcessStep = "idle" | "preparing" | "gateway" | "bank_auth" | "confirming" | "activating" | "success" | "error";
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

const stripeCardNumberOptions = {
  ...stripeElementOptions,
  showIcon: false,
  placeholder: "1234 1234 1234 1234",
};

const stripeCardExpiryOptions = {
  ...stripeElementOptions,
  placeholder: "MM / YY",
};

const stripeCardCvcOptions = {
  ...stripeElementOptions,
  placeholder: "CVC",
};

const EUROPEAN_COUNTRIES = [
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK", "GB", "CH", "NO", "IS", "LI",
];
const VAT_RATE = 0.2;

const CurrencyPillToggle = ({
  currency,
  setCurrency,
}: {
  currency: string;
  setCurrency: (c: "usd" | "eur") => void;
}) => (
  <div className="flex bg-gray-100 rounded-lg p-1  mx-2">
    <button
      type="button"
      onClick={() => setCurrency("usd")}
      className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${currency === "usd" ? "text-gray-500 hover:text-gray-700 " : "text-gray-500 hover:text-gray-700"
        }`}
    >
      USD
    </button>
    <button
      type="button"
      onClick={() => setCurrency("eur")}
      className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${currency === "eur" ? "text-gray-500 hover:text-gray-700" : "text-gray-500 hover:text-gray-700"
        }`}
    >
      EUR
    </button>
  </div>
);

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
      ? "text-[16px] font-bold text-[#002E8A] uppercase tracking-wide font-sans "
      : "text-sm text-[12px] md:text-[14px] font-bold text-[#002e8a] uppercase tracking-wide ";
  const valueClass =
    size === "sm"
      ? "text-[16px] font-bold text-black uppercase font-sans"
      : "font-bold text-[14px] font-black text-black uppercase tracking-wide font-sans";

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
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 xl:gap-8 items-start">
    {categories.map((cat: CalculatorCategory) => {
      const isSelected = selectedCategoryKey === cat.categoryKey;
      return (
        <button
          key={cat.categoryKey}
          onClick={() => onSelect(cat.categoryKey)}
          className={`group relative bg-white rounded-[6px] shadow-[0px_10px_30px_rgba(0,0,0,0.1)] border-0 transition-all duration-300 transform hover:-translate-y-1 flex flex-col w-full  focus:outline-none focus:ring-2 focus:ring-white/20 ${isSelected ? "" : ""
            }`}
        >
          <div className="w-full border-rs-cs flex-1 flex items-center justify-center px-6 pt-4 pb-4 bg-white min-h-[160px] rounded-t-[4px]">
            <img
              src={getCategoryIllustration(cat.categoryKey, cat.image)}
              alt={cat.categoryName}
              className="max-w-full max-h-[130px] w-auto object-contain transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          <div className="w-full border-rs-cs min-h-[65px] px-6 pb-4 flex items-center justify-start bg-white">
            <h3 className="font-bold text-[#1F2937] uppercase tracking-[0.01em] text-[14px] md:text-[15px] leading-snug text-left">
              {getCategoryDisplayName(cat.categoryKey, cat.categoryName)}
            </h3>
          </div>
          {isSelected && (
            <div className="w-full selected-cs bg-[#4A5568] text-white py-2.5 text-center text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-300">
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
  <div className="flex items-center gap-6 flex-wrap">
    <div className="flex items-center gap-0 bg-gray-50 border border-gray-300 rounded-xl overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-12 h-14 flex items-center justify-center text-gray-600 hover:text-[#4F46E5] hover:bg-gray-200/60 transition-all text-xl font-bold select-none"
      >
        −
      </button>
      <div className="w-20 h-14 bg-white text-[#334155] text-2xl font-bold flex items-center justify-center outline-none focus:bg-blue-50/50 transition-all border-x border-gray-200 tabular-nums">{value}</div>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-12 h-14 flex items-center justify-center text-gray-600 hover:text-[#4F46E5] hover:bg-gray-200/60 transition-all text-xl font-bold select-none"
      >
        +
      </button>
    </div>
  </div>
);

const QuestionCard = ({
  question,
  selection,
  onToggleAnswer,
  tier,
  categoryKey,
  categorySelections,
  baselineDays,
  seoServiceMode,
  error,
}: {
  question: any;
  selection: any;
  onToggleAnswer: any;
  tier: string;
  categoryKey?: string | null;
  categorySelections?: string[];
  baselineDays?: number;
  seoServiceMode?: string;
  error?: string;
}) => {
  const [textVal, setTextVal] = useState(selection?.textValue || "");
  const numVal = selection?.numericValue ?? 0;

  useEffect(() => {
    setTextVal(selection?.textValue || "");
  }, [selection?.textValue]);

  const activeKeys = selection?.answerKeys || [];
  const filteredQuestion = filterQuestionAnswers(question, tier);
  let visibleAnswers = filteredQuestion.answers || [];
  if (isGraphicsItemsQuestion(question)) {
    if (!categorySelections || categorySelections.length === 0) {
      return null;
    }
    visibleAnswers = filterGraphicsAnswers(visibleAnswers, categorySelections);
    if (visibleAnswers.length === 0) {
      return null;
    }
  }
  if (question.key === "SEO_SERVICE_TYPE") {
    visibleAnswers = visibleAnswers.filter((a: any) => a.key !== "SEO_TYPE_COMBO");
  }
  const answerGroups = groupAnswersByHeading(visibleAnswers);

  return (
    <div
      id={`question-${question.key}`}
      data-question-key={question.key}
      tabIndex={-1}
      className={`animate-in fade-in duration-700 bg-white p-8 md:p-12 rounded-2xl shadow-xl text-left max-w-[680px] mx-auto scroll-mt-28 focus:outline-none transition-all duration-300 ${error
        ? "border-2 border-red-500 ring-4 ring-red-100/80 shadow-red-100"
        : "border border-gray-100/80"
        }`}
    >
      <div className="flex flex-col mb-6 md:mb-8">
        <h2
          className={`text-[20px] md:text-[22px] font-medium tracking-normal leading-snug transition-colors ${error ? "text-red-900 font-semibold" : "text-[#475569]"
            }`}
        >
          {formatCalculatorQuestionText(question.text, question.isRequired, question.type, categoryKey ?? undefined)}
        </h2>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-600 font-semibold bg-red-50 border border-red-200 px-3.5 py-2.5 rounded-xl animate-in fade-in slide-in-from-top-1">
            <svg className="w-4 h-4 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}
      </div>

      {question.type === "text" && (
        <textarea
          value={textVal}
          onChange={(e) => setTextVal(e.target.value)}
          onBlur={() => onToggleAnswer(question.key, textVal, "text")}
          placeholder="Enter your response here..."
          className="w-full p-4 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:border-[#4F46E5] focus:bg-white focus:outline-none min-h-[120px] resize-vertical placeholder:text-gray-400 font-sans text-[16px]"
        />
      )}

      {question.type === "number" && (
        <NumberStepper
          value={numVal}
          min={question.config?.minValue ?? 0}
          onChange={(n) => onToggleAnswer(question.key, n, "number")}
        />
      )}

      {(question.type === "single" || question.type === "multi") &&
        answerGroups.map((group, gIdx) => (
          <div key={gIdx} className={gIdx > 0 ? "mt-8" : ""}>
            {group.heading && (
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-[#64748B] mb-3 mt-4 pt-4 border-t border-gray-100 first:mt-0 first:pt-0 first:border-none">
                {group.heading}
              </h3>
            )}
            <div className="grid grid-cols-1 gap-1 multiple-radio">
              {group.answers.map((ans: any) => {
                const isSelected = activeKeys.includes(ans.key);
                return (
                  <button
                    key={ans.key}
                    type="button"
                    onClick={() => onToggleAnswer(question.key, ans.key, question.type)}
                    className="w-full flex items-center gap-4 cursor-pointer group outline-none text-left py-1.5 mb-3 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      {question.type === "multi" ? (
                        <div
                          className={`w-5 h-5 rounded-[4px] border-2 flex items-center justify-center transition-all ${isSelected
                            ? "bg-[#4F46E5] border-[#4F46E5]"
                            : "border-[#CBD5E1] bg-white group-hover:border-[#4F46E5]"
                            }`}
                          aria-hidden
                        >
                          {isSelected && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      ) : (
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected
                            ? "bg-[#4F46E5] border-[#4F46E5]"
                            : "border-[#CBD5E1] bg-white group-hover:border-[#4F46E5]"
                            }`}
                          aria-hidden
                        >
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                        </div>
                      )}
                    </div>
                    <div className="text-[16px] md:text-[17px] leading-relaxed transition-colors text-[#475569] font-normal group-hover:text-[#334155]">
                      {formatCalculatorAnswerLabel(ans.text, question.key, {
                        categoryKey: categoryKey ?? undefined,
                        roleId: question.roleId,
                        metadata: ans.metadata,
                        baselineDays,
                      })}
                    </div>
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
  onValidateRequired,
}: any) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const { currency, conversionRate } = useCurrency();

  const formatPriceLocal = (amt: number) =>
    formatCalculatorPrice(amt, currency, conversionRate, category.categoryKey);

  const isMonthly = billingType === "monthly";

  const sortedQuestions = [...(category.questions || [])].sort(
    (a: any, b: any) => (a.order || 0) - (b.order || 0)
  );
  const tier = getSelectedTier(
    selections,
    getTierQuestionKey(category.categoryKey || ""),
    sortedQuestions
  );
  const firstQuestionKey = sortedQuestions[0]?.key;
  let subtitle = "";
  const breakdown: { question: string; answers: string[] }[] = [];

  sortedQuestions.forEach((q: any) => {
    if (!isQuestionVisible(q, selections, sortedQuestions)) return;

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
        if (ans) {
          ansTexts.push(
            formatCalculatorAnswerLabel(ans.text, q.key, {
              categoryKey: category.categoryKey,
              roleId: q.roleId,
              metadata: ans.metadata,
              baselineDays: category.categoryKey === "graphics" ? calculateGraphicsRawTimelineDays(sortedQuestions.find((sq: any) => isGraphicsItemsQuestion(sq)), selections, tier) : undefined,
            })
          );
        }
      });
    }

    if (ansTexts.length > 0) {
      breakdown.push({
        question: formatCalculatorQuestionText(q.text, q.isRequired, q.type, category.categoryKey),
        answers: ansTexts,
      });
    }
  });

  const displayName = getCategoryProposalName(category.categoryKey, category.categoryName);
  const hasTimeline = hasTimelineSelected(category.questions || [], selections);
  const displayTimeline = hasTimeline
    ? (timeline || getDefaultCategoryTimeline(category.categoryKey, category.timeline))
    : "Please select a timeline option above";

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (onValidateRequired && !onValidateRequired()) return;
    if (isDownloading) return;
    setIsDownloading(true);
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
    } finally {
      setIsDownloading(false);
    }
  };

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);

  useEffect(() => {
    const user = authService.getUser();
    if (user?.email && !emailInput) {
      setEmailInput(user.email);
    }
  }, []);

  const openEmailModal = () => {
    if (onValidateRequired && !onValidateRequired()) return;
    const user = authService.getUser();
    if (user?.email) setEmailInput(user.email);
    setEmailError("");
    setEmailSentSuccess(false);
    setIsEmailModalOpen(true);
  };

  const handleSendEmailProposal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = emailInput.trim();
    if (!cleanEmail) {
      setEmailError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    setEmailError("");
    setIsSendingEmail(true);

    try {
      const subject = `Estimate: ${category.categoryName}`;
      let body = `Hello,\n\nHere is your project estimate breakdown:\n\n* Category: ${category.categoryName}\n${subtitle ? `* Subtitle: ${subtitle}\n` : ""}`;

      breakdown.forEach(item => {
        body += `\n- ${item.question}:\n  ${item.answers.join(", ")}`;
      });

      body += `\n\nTotal Price: ${formatPriceLocal(totalPrice)}\nTimeline: ${displayTimeline || "TBA"}\n\nAttached is your detailed proposal PDF.\n\nGenerated via Society Web Solutions Calculator.`;

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
          email: cleanEmail,
          subject,
          messageBody: body,
          pdfBase64
        })
      });

      if (res.ok) {
        setEmailSentSuccess(true);
      } else {
        const errorData = await res.json().catch(() => null);
        const errorMsg =
          errorData?.message ||
          errorData?.error ||
          "Failed to send proposal via email. Please check the address or download the PDF.";
        setEmailError(Array.isArray(errorMsg) ? errorMsg.join(", ") : errorMsg);
      }
    } catch (err) {
      console.error("Error emailing proposal:", err);
      setEmailError("An unexpected error occurred while sending the proposal.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="w-full max-w-[680px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 my-6">
      <h2 className="text-[24px] md:text-[26px] font-medium text-white text-center mb-8 tracking-normal">YOUR PROPOSAL</h2>
      <div className="bg-white rounded-[10px] p-8 md:p-10 shadow-2xl text-left border border-white">
        <h3 className="text-[#111827] font-bold text-[24px] md:text-[26px] mb-1 leading-tight">
          {displayName}
        </h3>
        {subtitle && (
          <p className="text-[#64748B] text-[15px] font-normal mb-8 leading-normal font-sans">
            {subtitle}
          </p>
        )}
        {!subtitle && <div className="mb-10" />}

        <div className="space-y-7">
          {breakdown.map((item, idx) => (
            <div key={idx} className="font-sans">
              <h4 className="text-[#334155] font-bold text-[17px] mb-2">
                {item.question}
              </h4>
              {item.answers.length === 1 ? (
                <p className="text-[#475569] text-[16px] font-normal leading-relaxed pl-5">
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

        <div className="mt-10 mb-6">
          <h3 className="text-[#111827] text-[24px] md:text-[26px] font-bold tracking-tight mb-1">
            PROJECT TOTAL COST:{" "}
            <span className="text-[#4F46E5] font-black font-bold">{formatPriceLocal(totalPrice)}</span>
          </h3>
          {isMonthly && <p className="text-[#363636] text-[13px] font-medium mt-1 opacity-75">First month billed on start. Then auto-renewed monthly.</p>}
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[#374151] text-[16px] font-medium">Estimated Deadline</span>
            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="w-4 h-4 rounded-full bg-gray-300 text-gray-700 text-[11px] font-bold flex items-center justify-center cursor-help leading-none"
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
          <p className={`text-[16px] font-bold ${hasTimeline ? "text-[#111827]" : "text-amber-600 italic font-semibold"}`}>
            {displayTimeline}
          </p>
        </div>

        <div className="bg-[#EEF2FF] border border-[#C7D2FE] rounded-xl p-4 mb-8 text-sm text-[#4338CA] leading-relaxed">
          <strong>📋 Timeline Note:</strong> The estimated deadline does not count time when your response is pending — including approvals, content submissions, or payment deadlines. Your project manager will notify you if the project timeline is paused.
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold py-3.5 px-6 rounded-[6px] transition-all flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg ${isDownloading ? "opacity-80 cursor-not-allowed" : "cursor-pointer"
              }`}
          >
            {isDownloading ? (
              <>
                <svg
                  className="w-5 h-5 animate-spin text-white flex-shrink-0"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span className="text-[16px] font-semibold tracking-normal">Processing...</span>
              </>
            ) : (
              <>
                <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span className="text-[16px] font-semibold tracking-normal">Download PDF</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={openEmailModal}
            className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-[#374151] font-semibold py-3.5 px-6 rounded-[6px] transition-all flex items-center justify-center gap-2.5 shadow-sm cursor-pointer"
          >
            <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1 0.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <span className="text-[16px] font-semibold text-[#374151] tracking-normal">Email Proposal</span>
          </button>
        </div>
      </div>

      {/* Website Email Proposal Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#00102E]/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="fixed inset-0 cursor-default"
            onClick={() => {
              if (!isSendingEmail) setIsEmailModalOpen(false);
            }}
          />
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-100 z-10 animate-in zoom-in-95 duration-200 text-left">
            <button
              type="button"
              onClick={() => setIsEmailModalOpen(false)}
              disabled={isSendingEmail}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {emailSentSuccess ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-200">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Proposal Sent!</h3>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                  We&apos;ve sent the complete project proposal PDF to <span className="font-semibold text-gray-900">{emailInput}</span>.
                </p>
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-md"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendEmailProposal}>
                <div className="flex items-center gap-3.5 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-[#4F46E5] flex items-center justify-center flex-shrink-0 border border-indigo-100">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1 0.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 leading-tight">Email Proposal</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Receive detailed breakdown and PDF proposal</p>
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      if (emailError) setEmailError("");
                    }}
                    placeholder="name@example.com"
                    autoFocus
                    className={`w-full px-4 py-3 rounded-xl border bg-gray-50/50 text-gray-900 text-sm outline-none transition-all placeholder:text-gray-400 ${emailError
                      ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                      : "border-gray-200 focus:border-[#4F46E5] focus:bg-white focus:ring-2 focus:ring-indigo-100"
                      }`}
                  />
                  {emailError && (
                    <p className="text-xs text-red-600 font-medium mt-1.5 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      {emailError}
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEmailModalOpen(false)}
                    disabled={isSendingEmail}
                    className="w-1/3 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingEmail}
                    className="w-2/3 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed text-sm cursor-pointer"
                  >
                    {isSendingEmail ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      "Send Proposal"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const CalculatorPaymentForm = ({
  totalPrice,
  timeline,
  categoryKey,
  category,
  selections,
  formatPriceLocal,
  currency,
  setCurrency,
  conversionRate,
  onValidateRequired,
}: any) => {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const payableTotal = getCalculatorPayableAmount(totalPrice, currency, conversionRate, categoryKey);
  const halfPrice = getCalculatorHalfPayableAmount(payableTotal, categoryKey);

  const [paymentOption, setPaymentOption] = useState("full");
  const [customAmount, setCustomAmount] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [billingSameAsBusiness, setBillingSameAsBusiness] = useState(true);
  const [billingAddress, setBillingAddress] = useState({
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
  });
  const [userCountry, setUserCountry] = useState("US");
  const [isAuth, setIsAuth] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated();
      setIsAuth(authenticated);
      if (authenticated) {
        const user = authService.getUser();
        if (user) {
          setIsEmailVerified(!!user.isEmailVerified);
          if (user.fullName) {
            setCardholderName(user.fullName);
          }
          (async () => {
            try {
              const { profileService } = await import("@/lib/profileService");
              const profile = await profileService.getMyProfile();
              if (profile?.data) {
                setUserCountry(profile.data.country || profile.data.billingCountry || (currency === "eur" ? "DE" : "US"));
              }
            } catch {
              setUserCountry(currency === "eur" ? "DE" : "US");
            }
          })();
        }
      }
    };

    checkAuth();
    const handleAuthChange = () => checkAuth();
    window.addEventListener("auth:login", handleAuthChange);
    window.addEventListener("auth:logout", handleAuthChange);
    return () => {
      window.removeEventListener("auth:login", handleAuthChange);
      window.removeEventListener("auth:logout", handleAuthChange);
    };
  }, [currency]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<PaymentProcessStep>("idle");
  const [status, setStatus] = useState({ isOpen: false, type: "success" as any, title: "", message: "" });
  const [errors, setErrors] = useState<any>({});
  const [cardStatus, setCardStatus] = useState<any>({
    number: { complete: false, error: null },
    expiry: { complete: false, error: null },
    cvc: { complete: false, error: null },
  });
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const focusFirstFieldError = (errs: Record<string, string>) => {
    const order = [
      "amount",
      "cardHolderName",
      "cardNumber",
      "cardExpiry",
      "cardCvc",
    ];
    const firstKey = order.find((key) => errs[key]);
    if (!firstKey) return;

    fieldRefs.current[firstKey]?.scrollIntoView({ behavior: "smooth", block: "center" });

    if (elements) {
      if (firstKey === "cardNumber") {
        elements.getElement(CardNumberElement)?.focus();
        return;
      }
      if (firstKey === "cardExpiry") {
        elements.getElement(CardExpiryElement)?.focus();
        return;
      }
      if (firstKey === "cardCvc") {
        elements.getElement(CardCvcElement)?.focus();
        return;
      }
    }

    const input = fieldRefs.current[firstKey];
    if (input && "focus" in input) {
      (input as HTMLInputElement).focus();
    }
  };

  const vatRate = 0;
  const currencyLabel = currency.toUpperCase();
  const requiresVerification = !isEmailVerified;
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
    formatCalculatorDisplayAmount(amt, currencyLabel, categoryKey);

  const getPayableAmount = () => totalPayable;

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    // Redirect guests directly to login without checking validations
    if (!authService.isAuthenticated()) {
      try {
        sessionStorage.setItem(
          "pending_calculator_state",
          JSON.stringify({ categoryKey, selections })
        );
      } catch {}
      router.push("/login?redirect=/calculator");
      return;
    }

    if (!stripe || !elements) return;

    // Validate required questions and timeline selection inline without popup
    if (onValidateRequired && !onValidateRequired()) {
      return;
    }

    if (requiresVerification) {
      setStatus({
        isOpen: true,
        type: "error",
        title: "Email Verification Required",
        message:
          "To protect your financial security, payments are restricted for unverified accounts. Please verify your email using the banner at the top of your dashboard to continue.",
      });
      return;
    }

    const errs: any = {};
    const amount = getPayableAmount();

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
      requestAnimationFrame(() => focusFirstFieldError(errs));
      return;
    }

    setIsProcessing(true);
    setPaymentStep("preparing");
    try {
      // Enrich selections with human-readable question/answer text from the loaded category config
      const rawSelections = selectionsToArray(selections);
      const enrichedSelections = rawSelections.map((sel: any) => {
        const question = category?.questions?.find((q: any) => q.key === sel.questionKey);
        const questionText = question?.text || sel.questionText || sel.questionKey;
        const answerTexts: string[] = [];
        if (sel.answerKeys && sel.answerKeys.length > 0 && question?.answers) {
          sel.answerKeys.forEach((k: string) => {
            const ans = question.answers.find((a: any) => a.key === k);
            if (ans?.text) answerTexts.push(ans.text);
          });
        }
        return {
          ...sel,
          questionText,
          answerTexts: answerTexts.length > 0 ? answerTexts : sel.answerTexts,
        };
      });

      const user = authService.getUser();
      const proposalData = {
        categoryKey,
        selections: enrichedSelections,
        calculatedPrice: totalPrice,
        totalPrice,
        estimatedTimeline: timeline,
        timeline,
        personName: cardholderName || user?.fullName || "Valued Customer",
        personEmail: user?.email || "customer@example.com",
      };

      const submitRes = await priceCalculatorService.submitQuote(proposalData);
      if (!submitRes.isSuccessful || !submitRes.data?.quote) {
        throw new Error(submitRes.message || "Failed to submit proposal request.");
      }

      const quote = submitRes.data.quote;
      const quoteId = quote._id || quote.id;
      const quoteNum = quote.quoteNumber || "Q-PENDING";

      // Always pass the USD base price so the backend can normalize regardless of which
      // currency the user chose to pay in.
      const usdBaseAmount = totalPrice; // totalPrice is always the raw USD amount from the calculator

      setPaymentStep("gateway");
      const intentRes = await paymentService.createPaymentIntent({
        amount,          // actual charge amount in chosen currency (may be EUR-converted)
        currency,        // "usd" or "eur"
        useCredits: false,
        metadata: {
          type: "QUOTE",
          quoteId,
          quoteNumber: quoteNum,
          // fullAmount is the USD base price so backend always compares like-for-like
          fullAmount: usdBaseAmount,
          calculatedPrice: usdBaseAmount,
          // store conversion rate so backend can normalise EUR payments back to USD
          conversionRate: String(conversionRate),
          paymentCurrency: currency,
        },
      });

      if (!intentRes.isSuccessful || !intentRes.data) {
        throw new Error(intentRes.message || "Failed to initialize payment.");
      }

      const { clientSecret, transactionId } = intentRes.data;
      const cardElement = elements.getElement(CardNumberElement);
      if (!cardElement) throw new Error("Card element not found.");

      setPaymentStep("bank_auth");
      const confirmRes = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: cardholderName || user?.fullName || "Valued Customer",
            email: user?.email || undefined,
          },
        },
      });

      if (confirmRes.error) throw new Error(confirmRes.error.message);

      if (confirmRes.paymentIntent?.status === "succeeded") {
        setPaymentStep("confirming");
        const confirmResult = await paymentService.confirmPayment({ transactionId });
        if (confirmResult.isSuccessful) {
          setPaymentStep("activating");
          await new Promise((r) => setTimeout(r, 600));
          setPaymentStep("success");

          setStatus({ isOpen: true, type: "success", title: "Payment Successful", message: "Your project has been started successfully!" });
          // Redirect to project page if created, otherwise fall back to quote page
          const projectId = confirmResult.data?.project?._id || confirmResult.data?.project?.id;
          setTimeout(() => router.push(
            projectId ? `/dashboard/my-projects/${projectId}` : `/dashboard/my-quotes/${quoteId}`
          ), 2200);
        } else {
          throw new Error("Payment succeeded but server confirmation failed. Please contact support.");
        }
      }

    } catch (err: any) {
      console.error("Payment Error:", err);
      setPaymentStep("error");
      setStatus({ isOpen: true, type: "error", title: "Payment Failed", message: err.message || "An unexpected error occurred." });
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
      }, 500);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="animate-in fade-in duration-500 w-full flex flex-col gap-8">
      <StatusPopup
        isOpen={status.isOpen}
        onClose={() => setStatus({ ...status, isOpen: false })}
        type={status.type}
        title={status.title}
        message={status.message}
      />

      <div className="text-center mb-6">
        <h2 className="text-[24px] md:text-[26px] font-medium text-white mb-3 tracking-normal">READY TO BEGIN?</h2>
        <p className="text-gray-300 text-[15px] font-light leading-relaxed max-w-[450px] mx-auto">
          Pay any amount as a deposit to have our team<br />begin work on this project.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 md:p-10 shadow-2xl mx-auto w-full max-w-[680px] border border-white">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-[#111827] font-bold text-[18px]">Amount:</h3>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setCurrency("usd")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${currency === "usd" ? "bg-white shadow text-gray-800" : "text-gray-500"
                }`}
            >
              USD
            </button>
            <button
              type="button"
              onClick={() => setCurrency("eur")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${currency === "eur" ? "bg-white shadow text-gray-800" : "text-gray-500"
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

        <div className="flex flex-col gap-4 text-[16px] mb-8 md:mb-10">
          <label className="flex items-center gap-3.5 cursor-pointer group">
            <div className={`w-[20px] h-[20px] rounded-full border-2 flex flex-shrink-0 items-center justify-center transition-all ${paymentOption === "full" ? "border-[#4F46E5] " : "border-[#CBD5E1] group-hover:border-[#4F46E5]"}`}>
              {paymentOption === "full" && (
                <div className={`w-[10px] h-[10px] rounded-full transition-colors ${paymentOption === "full" ? "bg-[#4F46E5]" : "bg-black"}`} />
              )}
            </div>
            <input type="radio" name="paymentOption" className="hidden" checked={paymentOption === "full"} onChange={() => setPaymentOption("full")} />
            <span className={`transition-colors font-normal text-[16px] ${paymentOption === "full" ? "text-black" : "text-[#475569]"}`}>Full {formatPaymentLine(payableTotal)}</span>
          </label>

          {halfPrice > 0 && (
            <label className="flex items-center gap-[14px] cursor-pointer group">
              <div className={`w-[20px] h-[20px] rounded-full border-2 flex flex-shrink-0 items-center justify-center transition-all  ${paymentOption === "half" ? "border-[#4F46E5]" : "border-[#CBD5E1] group-hover:border-[#4F46E5]"}`}>
                {paymentOption === "half" && (
                  <div className={`w-[10px] h-[10px] rounded-full transition-colors ${paymentOption === "half" ? "bg-[#4F46E5]" : "bg-black"}`} />
                )}
              </div>
              <input type="radio" name="paymentOption" className="hidden" checked={paymentOption === "half"} onChange={() => setPaymentOption("half")} />
              <span className={`transition-colors font-normal text-[16px] ${paymentOption === "half" ? "text-black" : "text-[#475569]"}`}>50% {formatPaymentLine(halfPrice)}</span>
            </label>
          )}

          <label className="flex flex-wrap items-center gap-[14px] cursor-pointer group">
            <div className={`w-[20px] h-[20px] rounded-full border-2 flex flex-shrink-0 items-center justify-center transition-all  ${paymentOption === "custom" ? "border-[#4F46E5]" : "border-[#CBD5E1] group-hover:border-[#4F46E5]"}`}>
              {paymentOption === "custom" && (
                <div className={`w-[10px] h-[10px] rounded-full transition-colors ${paymentOption === "custom" ? "bg-[#4F46E5]" : "bg-black"}`} />
              )}
            </div>
            <input type="radio" name="paymentOption" className="hidden" checked={paymentOption === "custom"} onChange={() => setPaymentOption("custom")} />
            <span className={`transition-colors font-normal text-[16px] ${paymentOption === "custom" ? "text-black" : "text-[#475569]"}`}>Other</span>
            {paymentOption === "custom" && (
              <div className="flex flex-col gap-1" ref={(el) => { fieldRefs.current.amount = el; }} data-field="amount">
                <div className="relative w-28 ml-2">
                  <span className={`absolute left-0 top-1/2 -translate-y-1/2 font-medium ${errors.amount ? "text-red-500" : "text-[#475569]"}`}>{currency === "eur" ? "€" : "$"}</span>
                  <input
                    type="number"
                    min="1"
                    value={customAmount}
                    onChange={(e) => { setCustomAmount(e.target.value); if (errors.amount) setErrors((p: any) => ({ ...p, amount: "" })); }}
                    className={`w-full border-b focus:border-[#4F46E5] ${errors.amount ? "border-red-500" : "border-gray-300"} py-0.5 pl-4 pr-1 placeholder-[#8b8b8b] text-[16px] text-[#171717] font-medium outline-none bg-transparent`}
                    placeholder="Amount"
                  />
                </div>
                {errors.amount && <span className="text-xs text-red-600 font-medium ml-2">{errors.amount}</span>}
              </div>
            )}
          </label>
        </div>

        <div className="mt-4 mb-8 p-5 bg-gray-50/80 rounded-xl border border-gray-200 text-sm font-sans space-y-2.5">
          <div className="flex justify-between text-[15px]">
            <span className="text-gray-600">Base Amount ({currencyLabel}):</span>
            <span className="font-semibold text-gray-800">{formatPaymentLine(baseAmount)}</span>
          </div>
          <div className="flex justify-between text-[15px]">
            <span className="text-gray-600">VAT ({Math.round(vatRate * 100)}%):</span>
            <span className="font-semibold text-gray-800">{formatPaymentLine(vatAmount)}</span>
          </div>
          <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-base font-bold text-gray-900">
            <span className="">Total Payable:</span>
            <span className="text-[#4F46E5] text-lg font-black">{formatPaymentLine(totalPayable)}</span>
          </div>
        </div>

        {!isAuth ? (
          <div className="p-6 bg-[#f8fafc] border border-gray-200 rounded-xl text-center space-y-2">
            <div className="w-10 h-10 bg-indigo-50 text-[#4F46E5] rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h4 className="text-[16px] font-bold text-[#111827]">Account Required</h4>
            <p className="text-[14px] text-gray-600 max-w-md mx-auto">
              Please log in or sign up to enter your payment details and begin your project.
            </p>
          </div>
        ) : (
          <div className="space-y-6 font-sans">
            <div data-field="cardHolderName">
              <label className="block text-[15px] font-medium text-[#111827] mb-2">Name on the card:</label>
              <input
                ref={(el) => { fieldRefs.current.cardHolderName = el; }}
                type="text"
                value={cardholderName}
                onChange={(e) => { setCardholderName(e.target.value); if (errors.cardHolderName) setErrors((p: any) => ({ ...p, cardHolderName: "" })); }}
                placeholder="Name on the card"
                className={`w-full border-b ${errors.cardHolderName ? "border-red-500" : "border-[#e5e7eb]"} py-2.5 bg-transparent outline-none placeholder-gray-400 focus:border-[#4F46E5] text-[15px] transition-all`}
              />
              {errors.cardHolderName && <span className="text-xs text-red-600 font-medium mt-1 block">{errors.cardHolderName}</span>}
            </div>

            <div ref={(el) => { fieldRefs.current.cardNumber = el; }} data-field="cardNumber">
              <label className="block text-[15px] font-medium text-[#111827] mb-2">Card number:</label>
              <div className={`w-full border-b ${errors.cardNumber ? "border-red-500" : "border-gray-200"} py-2.5 focus-within:border-[#4F46E5] transition-all`}>
                <CardNumberElement options={stripeCardNumberOptions} className="w-full pl-1" onChange={(e) => { setCardStatus((p: any) => ({ ...p, number: { complete: e.complete, error: e.error } })); if (e.complete || !e.error) setErrors((p: any) => ({ ...p, cardNumber: "" })); }} />
              </div>
              {errors.cardNumber && <span className="text-xs text-red-600 font-medium mt-1 block">{errors.cardNumber}</span>}
            </div>

            <div className="grid grid-cols-2 gap-10">
              <div ref={(el) => { fieldRefs.current.cardExpiry = el; }} data-field="cardExpiry">
                <label className="block text-[15px] font-medium text-[#111827] mb-2">Expiry date:</label>
                <div className={`w-full border-b ${errors.cardExpiry ? "border-red-500" : "border-gray-200"} py-2.5 focus-within:border-[#4F46E5] transition-all`}>
                  <CardExpiryElement options={stripeCardExpiryOptions} className="w-full pl-1" onChange={(e) => { setCardStatus((p: any) => ({ ...p, expiry: { complete: e.complete, error: e.error } })); if (e.complete || !e.error) setErrors((p: any) => ({ ...p, cardExpiry: "" })); }} />
                </div>
                {errors.cardExpiry && <span className="text-xs text-red-600 font-medium mt-1 block">{errors.cardExpiry}</span>}
              </div>
              <div ref={(el) => { fieldRefs.current.cardCvc = el; }} data-field="cardCvc">
                <label className="block text-[15px] font-medium text-[#111827] mb-2">CVC:</label>
                <div className={`w-full border-b ${errors.cardCvc ? "border-red-500" : "border-gray-200"} py-2.5 focus-within:border-[#4F46E5] transition-all`}>
                  <CardCvcElement options={stripeCardCvcOptions} className="w-full pl-1" onChange={(e) => { setCardStatus((p: any) => ({ ...p, cvc: { complete: e.complete, error: e.error } })); if (e.complete || !e.error) setErrors((p: any) => ({ ...p, cardCvc: "" })); }} />
                </div>
                {errors.cardCvc && <span className="text-xs text-red-600 font-medium mt-1 block">{errors.cardCvc}</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isProcessing || (isAuth && (!stripe || !elements))}
        className="w-full max-w-[680px] mx-auto py-4 px-6 rounded-[6px] bg-[#4343F0] text-white font-extrabold text-[16px] tracking-widest shadow-xl hover:bg-[#3232b7] transition-all disabled:opacity-75 disabled:cursor-not-allowed uppercase active:scale-[0.98] mt-4 flex items-center justify-center gap-3"
      >
        {isProcessing ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>
              {paymentStep === "preparing" && "PREPARING..."}
              {paymentStep === "gateway" && "CONNECTING..."}
              {paymentStep === "bank_auth" && "AUTHORIZING..."}
              {paymentStep === "confirming" && "CONFIRMING..."}
              {paymentStep === "activating" && "ACTIVATING..."}
              {paymentStep === "success" && "SUCCESS!"}
              {(paymentStep === "idle" || paymentStep === "error") && "PROCESSING..."}
            </span>
          </>
        ) : !isAuth ? (
          "LOG IN OR SIGN UP TO PAY"
        ) : (
          `PAY ${formatPaymentLine(totalPayable)} NOW`
        )}
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
  const [questionErrors, setQuestionErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    (async () => {
      try {
        const res = await priceCalculatorService.getCalculatorConfig();
        setConfig(res);
        try {
          const saved = sessionStorage.getItem("pending_calculator_state");
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.categoryKey) setSelectedCategoryKey(parsed.categoryKey);
            if (parsed.selections) setSelections(parsed.selections);
            sessionStorage.removeItem("pending_calculator_state");
          }
        } catch {}
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
    () =>
      getSelectedTier(
        selections,
        getTierQuestionKey(selectedCategoryKey || ""),
        sortedQuestions
      ),
    [selections, selectedCategoryKey, sortedQuestions]
  );
  const graphicsCategoryKeys = useMemo(
    () => getGraphicsCategoryKeys(selections, sortedQuestions),
    [selections, sortedQuestions]
  );
  const graphicsItemsQuestion = useMemo(
    () => sortedQuestions.find((q) => isGraphicsItemsQuestion(q)),
    [sortedQuestions]
  );
  const graphicsRawTimelineDays = useMemo(
    () => calculateGraphicsRawTimelineDays(graphicsItemsQuestion, selections, tier),
    [graphicsItemsQuestion, selections, tier]
  );
  const seoServiceMode = useMemo(
    () => (selectedCategoryKey === "seo" ? getSeoServiceMode(selections) : undefined),
    [selections, selectedCategoryKey]
  );
  const visibleQuestions = useMemo(
    () => sortedQuestions.filter((q) => isQuestionVisible(q, selections, sortedQuestions)),
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

  const validateRequiredSelections = () => {
    if (!selectedCategory) return false;
    const missingQuestions = getMissingRequiredQuestions(selectedCategory.questions || [], selections);
    if (missingQuestions.length > 0) {
      const newErrors: Record<string, string> = {};
      missingQuestions.forEach((q) => {
        const isTimeline = isTimelineQuestion(q);
        newErrors[q.key] = isTimeline
          ? "Please select a project timeline."
          : "This selection is required.";
      });
      setQuestionErrors(newErrors);

      const firstMissing = missingQuestions[0];
      const missingElem =
        (document.getElementById(`question-${firstMissing.key}`) ||
          document.querySelector(`[data-question-key="${firstMissing.key}"]`)) as HTMLElement | null;
      if (missingElem) {
        missingElem.scrollIntoView({ behavior: "smooth", block: "center" });
        const interactive = missingElem.querySelector<HTMLElement>(
          "input, textarea, select, button:not([disabled])"
        );
        if (interactive) {
          setTimeout(() => interactive.focus(), 200);
        } else {
          missingElem.focus();
        }
      }
      return false;
    }
    setQuestionErrors({});
    return true;
  };

  const handleToggleAnswer = (questionKey: string, value: any, type: string) => {
    setQuestionErrors((prev) => {
      if (!prev[questionKey]) return prev;
      const next = { ...prev };
      delete next[questionKey];
      return next;
    });

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

      const changedQuestion = sortedQuestions.find((q) => q.key === questionKey);
      if (changedQuestion && isTierSourceQuestion(changedQuestion, selectedCategoryKey)) {
        const timelineKey = findTimelineQuestionKey(sortedQuestions);
        if (timelineKey) delete next[timelineKey];
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
      <div className="relative flex items-center text-white overflow-hidden w-full min-h-[280px] md:min-h-[406px]">
        <Image
          src="/images/calculator_hero.jpg"
          alt="Price calculator hero background"
          fill
          priority
          className="object-cover object-center opacity-[.85]"
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#00102E] via-[#00102E]/60 to-transparent"></div>
        <div className="mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] text-left relative z-10 max-w-[1536px] w-full">
          <div className="flex flex-row justify-center items-center">
            <div className="w-full text-center md:text-left">
              <p className="text-gray-300 text-sm md:text-base font-medium mb-3">Calculator</p>
              <h1 className="text-4xl md:text-[52px] font-bold mb-4 leading-tight tracking-tight text-white">
                Instantly create your price quote.
              </h1>
              <p className="text-base md:text-xl text-gray-200 font-normal leading-relaxed max-w-2xl">
                Already know the details of your project? There&apos;s an easy way to get started!{" "}
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-grow w-full overflow-x-clip flex flex-col relative z-10">

        {/* Category Selection Section */}
        <div
          className={`calculator-category-section w-full transition-colors duration-300 ${selectedCategoryKey ? "py-6 md:py-10" : "bg-[#00102E] py-8 md:py-20"
            }`}
          style={selectedCategoryKey ? calculatorDarkBg : undefined}
        >
          <div className="mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] max-w-[1536px] w-full">
            <div className="mb-8 text-left">
              <h2 className="text-[24px] md:text-[28px] font-semibold text-white mb-1.5 leading-snug">
                What would you like to create?
              </h2>
              <p className="text-[11px] font-black text-white/70 uppercase tracking-[0.2em]">CLICK ON AN OPTION BELOW</p>
            </div>
            {config && (
              <CategoryGrid
                categories={config.categories}
                selectedCategoryKey={selectedCategoryKey}
                onSelect={(key) => {
                  setSelectedCategoryKey(key);
                  setSelections({});
                  setQuestionErrors({});
                }}
              />
            )}
          </div>
        </div>

        {/* Questions Section with radial gradient pattern */}
        {selectedCategoryKey && (
          <>
            <div className="w-full" style={calculatorDarkBg}>
              <div className="mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] max-w-[1536px] w-full py-10 md:py-16 flex flex-col items-center gap-10 min-h-[480px]">
                {visibleQuestions.map((q: any) => (
                  <div key={q.key} className="w-full max-w-[680px]">
                    <QuestionCard
                      question={q}
                      selection={selections[q.key]}
                      onToggleAnswer={handleToggleAnswer}
                      tier={tier}
                      categoryKey={selectedCategoryKey}
                      categorySelections={graphicsCategoryKeys}
                      baselineDays={selectedCategoryKey === "graphics" ? graphicsRawTimelineDays : undefined}
                      seoServiceMode={seoServiceMode}
                      error={questionErrors[q.key]}
                    />
                  </div>
                ))}
              </div>
            </div>

            {selectedCategory && (
              <div
                className="w-full bg-[#00102e] pb-10 md:pb-20"
                style={{
                  backgroundImage: "radial-gradient(circle, #00287a 1%, transparent 1%)",
                  backgroundSize: "30px 30px",
                }}
              >
                <div className="mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] max-w-[1536px] w-full pt-8 md:pt-12 flex flex-col items-center">
                  <ProposalPreview
                    category={selectedCategory}
                    selections={selections}
                    totalPrice={calculation.totalPrice}
                    timeline={calculation.timeline}
                    billingType={isMonthlyBilling ? "monthly" : undefined}
                    onValidateRequired={validateRequiredSelections}
                  />
                  <div className="w-full mt-6">
                    <WrappedPaymentForm
                      totalPrice={calculation.totalPrice}
                      timeline={calculation.timeline}
                      categoryKey={selectedCategoryKey || selectedCategory.categoryKey}
                      category={selectedCategory}
                      selections={selections}
                      formatPriceLocal={formatPriceLocal}
                      currency={currency}
                      setCurrency={setCurrency}
                      conversionRate={conversionRate}
                      onValidateRequired={validateRequiredSelections}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Sticky Bottom Bar */}
      {showStickyPriceBar && (
        <div className="sticky bottom-0 left-0 right-0 w-full border-t border-gray-200 shadow-lg z-40 h-20 bg-white shadow-[0_-5px_20px_rgba(0,0,0,0.08)] flex items-center transition-all duration-300">
          <div className="mx-auto max-w-[1536px] flex flex-col md:flex-row justify-center items-center gap-4 md:gap-10 px-4">
            <div className="flex items-center gap-4">
              <span className="text-[12px] md:text-[14px] uppercase text-[#002e8a] tracking-[0.1em] font-semibold">PROJECT TOTAL COST:</span>
              <span className="text-2xl md:text-3xl font-black text-black font-bold">
                {formatCalculatorDisplayAmount(
                  getCalculatorDisplayAmount(
                    calculation.totalPrice,
                    currency,
                    conversionRate,
                    selectedCategoryKey ?? undefined
                  ),
                  currency,
                  selectedCategoryKey ?? undefined
                )}
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