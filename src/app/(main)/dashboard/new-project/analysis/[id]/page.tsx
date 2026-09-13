"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { requestAnalysisService } from "@/lib/requestAnalysisService";
import { authService } from "@/lib/authService";
import { paymentService } from "@/lib/paymentService";
import { useChatWidget } from "@/context/ChatWidgetContext";
import { useCurrency } from "@/context/CurrencyContext";
import StatusPopup from "@/components/common/StatusPopup";
import UnifiedPaymentForm from "@/components/dashboard/UnifiedPaymentForm";
import { formatPriceWithCurrency } from "@/lib/currencyUtils";

const SpinnerIcon = ({ size = 18 }: { size?: number }) => (
  <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export default function AnalysisOrderPage() {
  const params = useParams();
  const router = useRouter();
  const { openChat } = useChatWidget();
  const { currency, setCurrency, conversionRate } = useCurrency();
  const productId = params?.id as string;

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [analysisNo, setAnalysisNo] = useState("");
  const [mountedDate, setMountedDate] = useState<Date | null>(null);

  const [formData, setFormData] = useState({
    targetWebsiteUrl: "",
    whoCompletedWork: "",
    agreementDetails: "",
    scopeOfWork: "",
    loginsDetails: "",
    additionalComments: "",
    email: "",
    fullName: "",
  });

  const [statusPopup, setStatusPopup] = useState<{
    isOpen: boolean;
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    setMountedDate(new Date());
    setAnalysisNo("#" + Math.random().toString(36).substring(2, 9).toUpperCase());

    const currentUser = authService.getUser();
    if (currentUser) {
      setUser(currentUser);
      setFormData((prev) => ({
        ...prev,
        email: currentUser.email || "",
        fullName: currentUser.fullName || currentUser.username || "",
      }));
    }

    // Restore saved formData if returning from login
    try {
      const saved = typeof window !== 'undefined' ? sessionStorage.getItem(`pending_analysis_${productId}`) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData((prev) => ({ ...prev, ...parsed }));
        sessionStorage.removeItem(`pending_analysis_${productId}`);
      }
    } catch (e) {}

    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res: any = await requestAnalysisService.getProduct(productId);
        if (res?.data) {
          setProduct(res.data);
        } else if (res && !res.statusCode) {
          setProduct(res);
        }
      } catch (error) {
        console.error("Failed to fetch analysis product details:", error);
        try {
          const listRes: any = await requestAnalysisService.getProducts(true);
          const list = Array.isArray(listRes?.data) ? listRes.data : listRes?.data?.data || [];
          const found = list.find((p: any) => p._id === productId);
          if (found) setProduct(found);
        } catch (e) {
          console.error("Fallback failed:", e);
        }
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  const timelineDays = product?.timelineInDays || 5;

  const currentDate = useMemo(() => mountedDate || new Date(), [mountedDate]);

  const deadlineDate = useMemo(() => {
    return new Date(currentDate.getTime() + timelineDays * 24 * 60 * 60 * 1000);
  }, [currentDate, timelineDays]);

  const formatDateWithTime = (d: Date) => {
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  };

  const startDateFormatted = useMemo(() => {
    return formatDateWithTime(currentDate);
  }, [currentDate]);

  const deadlineFormatted = useMemo(() => {
    return formatDateWithTime(deadlineDate);
  }, [deadlineDate]);

  const isFree = product?.isFree === true || (product?.isFree !== false && (product?.amount === 0 || product?.amount === undefined));
  const price = product?.amount || 0;

  const formatPrice = (amt: number) => {
    return formatPriceWithCurrency(amt, currency, "USD", conversionRate);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.targetWebsiteUrl && visibleFields.urlToCheck !== false) {
      setStatusPopup({
        isOpen: true,
        type: "error",
        title: "URL Required",
        message: "Please enter the URL(s) to check.",
      });
      return;
    }

    // Check authentication: If not logged in, save form and redirect to login
    if (!authService.isAuthenticated()) {
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(`pending_analysis_${productId}`, JSON.stringify(formData));
        }
      } catch (err) {}
      router.push(`/login?redirect=/dashboard/new-project/analysis/${productId}`);
      return;
    }

    const currentUser = authService.getUser();
    const clientEmail = formData.email || currentUser?.email;
    setSubmitting(true);
    try {
      const payload = {
        productId: product?._id || productId,
        targetWebsiteUrl: formData.targetWebsiteUrl || "https://clientwebsite.com",
        whoCompletedWork: formData.whoCompletedWork,
        agreementDetails: formData.agreementDetails,
        scopeOfWork: formData.scopeOfWork,
        loginsDetails: formData.loginsDetails,
        additionalComments: formData.additionalComments,
        clientEmail: clientEmail,
        clientName: formData.fullName || currentUser?.fullName || currentUser?.username || "Client",
        origin: typeof window !== "undefined" ? window.location.origin : undefined,
      };

      const res: any = await requestAnalysisService.createProject(payload);
      if (res && (res.isSuccessful || res.statusCode === 201 || res.data)) {
        const newProjId = res.data?._id || res._id;
        setStatusPopup({
          isOpen: true,
          type: "success",
          title: "Request Submitted Successfully!",
          message: "We've received your analysis request. Our team will start reviewing your website immediately.",
        });
        setTimeout(() => {
          if (newProjId) {
            router.push(`/dashboard/my-analyses/${newProjId}/details`);
          } else {
            router.push("/dashboard/my-analyses");
          }
        }, 1800);
      } else {
        setStatusPopup({
          isOpen: true,
          type: "error",
          title: "Submission Error",
          message: res?.message || "Failed to submit request. Please try again.",
        });
      }
    } catch (error: any) {
      console.error("Failed to submit analysis order:", error);
      setStatusPopup({
        isOpen: true,
        type: "error",
        title: "Error",
        message: error?.message || "An unexpected error occurred. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveOrder = async () => {
    if (!authService.isAuthenticated()) {
      try {
        if (typeof window !== "undefined") {
          sessionStorage.setItem(`pending_analysis_${productId}`, JSON.stringify(formData));
        }
      } catch (err) {}
      router.push(`/login?redirect=/dashboard/new-project/analysis/${productId}`);
      return;
    }

    if (!formData.targetWebsiteUrl && visibleFields.urlToCheck !== false) {
      setStatusPopup({
        isOpen: true,
        type: "error",
        title: "URL Required",
        message: "Please enter the URL(s) to check before saving your order.",
      });
      return;
    }

    setProcessing(true);
    try {
      const res = await paymentService.createOrder({
        amount: price,
        currency: currency,
        creditsToApply: 0,
        metadata: {
          type: "ANALYSIS",
          analysisId: productId,
          productId: productId,
          title: title,
          description: shortDescription,
          fullAmount: price,
          duration: `${timelineDays} Days`,
          targetWebsiteUrl: formData.targetWebsiteUrl || "https://clientwebsite.com",
          whoCompletedWork: formData.whoCompletedWork || "",
          agreementDetails: formData.agreementDetails || "",
          scopeOfWork: formData.scopeOfWork || "",
          loginsDetails: formData.loginsDetails || "",
          additionalComments: formData.additionalComments || "",
          clientEmail: formData.email || user?.email || "",
          clientName: formData.fullName || user?.fullName || user?.username || "Client",
          origin: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });

      if (res.isSuccessful && res.data?.projectId) {
        setStatusPopup({
          isOpen: true,
          type: "success",
          title: "Order Created",
          message: "Invoice generated successfully. Redirecting to your analysis...",
        });
        setTimeout(() => router.push(`/dashboard/my-analyses/${res.data.projectId}/details`), 1800);
      } else {
        throw new Error(res.message || "Failed to create order.");
      }
    } catch (err: any) {
      console.error("Order Error:", err);
      setStatusPopup({
        isOpen: true,
        type: "error",
        title: "Order Failed",
        message: err.message || "Could not generate invoice. Please try again.",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#F8F9FD] min-h-screen flex items-center justify-center p-8 font-sans">
        <div className="flex flex-col items-center gap-3">
          <SpinnerIcon size={32} />
          <span className="text-gray-500 font-medium text-sm">Loading product details...</span>
        </div>
      </div>
    );
  }

  const title = product?.title || "Free Website Analysis";
  const shortDescription =
    product?.shortDescription ||
    "Our standard analysis offer covering brand, UI/UX, functionalities, AI potentiality, tech stack, speed, and SEO.";
  const longDescription =
    product?.longDescription ||
    product?.description ||
    "Our classic analysis offer covering branding, UI/UX, functionalities, AI potentiality, tech stack, speed, and SEO. A manual review using a custom process created by Society Web Solutions, checking every important part of your website. Delivered as a custom PDF report within 5 days.";
  
  const imageSrc =
    product?.detailImage ||
    product?.detailImageUrl ||
    product?.coverImage ||
    product?.imageUrl ||
    (title.toLowerCase().includes("check")
      ? "/images/free_checking_of_work.jpg"
      : "/images/free_website_analysis.jpg");

  const isCheckingOfWork = title.toLowerCase().includes("check") || title.toLowerCase().includes("work");

  const vf = product?.visibleFormFields || {};
  const isFieldVisible = (vfKey: string, rootKey?: string, defaultForCheck: boolean = false) => {
    // 1. If explicitly configured in visibleFormFields
    if (vf && typeof vf === 'object' && vf[vfKey] !== undefined) {
      if (vf[vfKey] === true || vf[vfKey] === 'true' || vf[vfKey] === 1) return true;
      if (vf[vfKey] === false || vf[vfKey] === 'false' || vf[vfKey] === 0) {
        // If rootKey is true, allow it
        if (rootKey && product && (product[rootKey] === true || product[rootKey] === 'true' || product[rootKey] === 1)) {
          return true;
        }
        return false;
      }
    }
    // 2. If root-level flag is present
    if (rootKey && product && product[rootKey] !== undefined) {
      if (product[rootKey] === true || product[rootKey] === 'true' || product[rootKey] === 1) return true;
      if (product[rootKey] === false || product[rootKey] === 'false' || product[rootKey] === 0) return false;
    }
    // 3. Fallback for Checking of Work
    if (isCheckingOfWork) {
      return defaultForCheck;
    }
    // 4. Default: URL and Additional Info are visible by default
    return vfKey === 'urlToCheck' || vfKey === 'additionalInfo';
  };

  const visibleFields = {
    urlToCheck: isFieldVisible('urlToCheck', 'showWebsiteUrl', true),
    whoCompletedWork: isFieldVisible('whoCompletedWork', 'showWhoCompletedWork', true),
    agreementDetails: isFieldVisible('agreementDetails', 'showAgreementDetails', true),
    whatToLookAt: isFieldVisible('whatToLookAt', 'showScopeOfWork', true),
    shareAccess: isFieldVisible('shareAccess', 'showLoginsDetails', true),
    additionalInfo: isFieldVisible('additionalInfo', 'showAdditionalComments', true),
  };

  return (
    <div className="bg-[#F8F9FD] min-h-screen flex flex-col font-sans">
      {statusPopup && (
        <StatusPopup
          isOpen={statusPopup.isOpen}
          onClose={() => setStatusPopup(null)}
          type={statusPopup.type}
          title={statusPopup.title}
          message={statusPopup.message}
        />
      )}

      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-8 md:pt-12 pb-12">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-10 md:gap-12 mb-10 md:mb-16">
          <div className="lg:w-[50%] flex flex-col">
            <h1 className="text-[28px] md:text-[48px] lg:text-[64px] font-bold text-gray-800 leading-[1.1] mb-4 md:mb-6 tracking-tight">
              {title}
            </h1>
            <p className="text-gray-500 leading-relaxed text-base md:text-lg max-w-xl font-medium">
              {longDescription}
            </p>
          </div>
          <div className="lg:w-[50%] flex items-center justify-center lg:justify-end">
            <div className="w-full max-w-[620px] aspect-[16/10] bg-[#F0F0F0] rounded-[4px] overflow-hidden shadow-sm border border-gray-200">
              {imageSrc ? (
                <img
                  alt={title}
                  className="w-full h-full object-cover"
                  src={imageSrc}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No Image Available
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-[#fcfcfc] border border-gray-200 rounded-[4px] shadow-sm p-6 md:p-8 mb-10 md:mb-16">
          <h2 className="text-xl font-bold text-gray-700 mb-6">Fill out the form to order:</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visibleFields.urlToCheck !== false && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">URL(s) to check:</label>
                <textarea
                  id="field-targetUrl"
                  className="w-full min-h-[120px] bg-white border border-gray-300 rounded-[4px] p-3 text-sm outline-none focus:border-blue-500"
                  placeholder="e.g. https://yourwebsite.com"
                  value={formData.targetWebsiteUrl}
                  onChange={(e) => setFormData({ ...formData, targetWebsiteUrl: e.target.value })}
                />
              </div>
            )}
            {visibleFields.additionalInfo !== false && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Provide any additional required information:</label>
                <textarea
                  className="w-full min-h-[120px] bg-white border border-gray-300 rounded-[4px] p-3 text-sm outline-none focus:border-blue-500"
                  placeholder="Any extra information you'd like to share"
                  value={formData.additionalComments}
                  onChange={(e) => setFormData({ ...formData, additionalComments: e.target.value })}
                />
              </div>
            )}
            {visibleFields.whatToLookAt && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">What specifically do you want us to look at?</label>
                <textarea
                  className="w-full min-h-[120px] bg-white border border-gray-300 rounded-[4px] p-3 text-sm outline-none focus:border-blue-500"
                  placeholder="e.g. design, functionality, SEO, speed, mobile, conversions, etc."
                  value={formData.scopeOfWork}
                  onChange={(e) => setFormData({ ...formData, scopeOfWork: e.target.value })}
                />
              </div>
            )}
            {visibleFields.whoCompletedWork && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Who was the work completed by?</label>
                <textarea
                  className="w-full min-h-[120px] bg-white border border-gray-300 rounded-[4px] p-3 text-sm outline-none focus:border-blue-500"
                  placeholder="e.g. Freelancer, agency, internal team, etc."
                  value={formData.whoCompletedWork}
                  onChange={(e) => setFormData({ ...formData, whoCompletedWork: e.target.value })}
                />
              </div>
            )}
            {visibleFields.agreementDetails && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">What was the agreement for this work?</label>
                <textarea
                  className="w-full min-h-[120px] bg-white border border-gray-300 rounded-[4px] p-3 text-sm outline-none focus:border-blue-500"
                  placeholder="e.g. timeline, deliverables, milestones, etc."
                  value={formData.agreementDetails}
                  onChange={(e) => setFormData({ ...formData, agreementDetails: e.target.value })}
                />
              </div>
            )}
            {visibleFields.shareAccess && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Please share required access with our email:</label>
                <textarea
                  className="w-full min-h-[120px] bg-white border border-gray-300 rounded-[4px] p-3 text-sm outline-none focus:border-blue-500 font-mono"
                  placeholder="e.g. staging link, login credentials, collaborator invites, etc."
                  value={formData.loginsDetails}
                  onChange={(e) => setFormData({ ...formData, loginsDetails: e.target.value })}
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-16" id="payment-section">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-600 mb-3">Complete Your Purchase Securely</h2>
            <p className="text-gray-500 text-lg">Your information is protected and your project starts immediately.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Free Analysis Flow */}
            {isFree ? (
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white border border-gray-300 rounded-[4px] shadow-sm p-6 md:p-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div className="bg-gray-200 px-4 py-2 rounded-full w-fit">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-600 font-medium">Start Date: {startDateFormatted}</span>
                      </div>
                    </div>
                    <div className="bg-gray-200 px-4 py-2 rounded-full w-fit">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-600 font-medium">Estimated Deadline: {deadlineFormatted}</span>
                        <span className="relative inline-block ml-1 group">
                          <button
                            type="button"
                            className="w-4 h-4 rounded-full bg-gray-400 text-white text-[9px] font-bold flex items-center justify-center cursor-help leading-none transition-colors hover:bg-gray-500"
                            aria-label="About estimated deadline"
                            tabIndex={0}
                          >
                            ?
                          </button>
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 w-full h-2 pointer-events-auto"></span>
                          <span
                            role="tooltip"
                            className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-900 text-white text-[11px] rounded-lg p-2.5 shadow-xl z-[9999] leading-relaxed font-normal normal-case break-words whitespace-normal opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 origin-bottom"
                          >
                            Time spent waiting for client replies does not count towards project deadlines.
                            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></span>
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                    <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-600 leading-tight pr-4">
                      {title}
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-600">
                        FREE
                      </div>
                    </div>
                  </div>

                  <div className="mb-6 text-sm text-gray-500 flex items-center gap-3 flex-wrap">
                    <span><strong>Analysis No:</strong> {analysisNo}</span>
                    <span className="text-gray-400">|</span>
                    <span><strong>Timeline:</strong> {timelineDays} Days</span>
                  </div>

                  <div className="mb-8 text-sm text-gray-500 leading-relaxed">
                    {shortDescription}
                  </div>

                  <div className="border-t border-gray-300 mb-6"></div>

                  <div>
                    <h4 className="text-base font-bold text-gray-700 mb-4">Included :</h4>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Comprehensive Website Review</span>
                      </li>
                      <li className="flex items-start gap-3 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Detailed PDF Report</span>
                      </li>
                      <li className="flex items-start gap-3 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Key Performance Issues Identified</span>
                      </li>
                      <li className="flex items-start gap-3 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Actionable Recommendations</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-white border border-gray-300 rounded-[4px] shadow-sm p-6 md:p-8 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Free Analysis</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    This analysis is completely free. We will review your website and notify you within {timelineDays} days.
                  </p>
                  <button
                    type="button"
                    onClick={(e) => handleSubmit(e as any)}
                    disabled={submitting}
                    className="w-full px-6 py-3.5 bg-[#3535b8] hover:bg-[#2a2a9a] text-white font-semibold rounded transition-colors duration-200 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {submitting && <SpinnerIcon size={16} />}
                    <span>{submitting ? "Submitting..." : "Submit Request"}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white border border-gray-300 rounded-[4px] shadow-sm p-6 md:p-8">
                  {/* Top Badges */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div className="bg-gray-200 px-4 py-2 rounded-full w-fit">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-600 font-medium">Start Date: {startDateFormatted}</span>
                      </div>
                    </div>
                    <div className="bg-gray-200 px-4 py-2 rounded-full w-fit">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-600 font-medium">Estimated Deadline: {deadlineFormatted}</span>
                        <span className="relative inline-block ml-1 group">
                          <button
                            type="button"
                            className="w-4 h-4 rounded-full bg-gray-400 text-white text-[9px] font-bold flex items-center justify-center cursor-help leading-none transition-colors hover:bg-gray-500"
                            aria-label="About estimated deadline"
                            tabIndex={0}
                          >
                            ?
                          </button>
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 w-full h-2 pointer-events-auto"></span>
                          <span
                            role="tooltip"
                            className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-900 text-white text-[11px] rounded-lg p-2.5 shadow-xl z-[9999] leading-relaxed font-normal normal-case break-words whitespace-normal opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 origin-bottom"
                          >
                            Time spent waiting for client replies does not count towards project deadlines.
                            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></span>
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Title & Price Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                    <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-600 leading-tight pr-4">
                      {title}
                    </h3>
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-end">
                        <div className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-600">
                          {formatPrice(price)}
                        </div>
                        <div className="flex flex-col items-end mt-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">One-Time Fee</span>
                        </div>
                      </div>
                      <select
                        value={currency.toUpperCase()}
                        onChange={(e) => setCurrency(e.target.value.toLowerCase())}
                        className="bg-gray-50 border border-gray-300 text-gray-700 font-medium rounded-md px-3 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                      </select>
                    </div>
                  </div>

                  {/* Meta Details */}
                  <div className="mb-6 text-sm text-gray-500 flex items-center gap-3 flex-wrap">
                    <span><strong>Analysis No:</strong> {analysisNo}</span>
                    <span className="text-gray-400">|</span>
                    <span><strong>Timeline:</strong> {timelineDays} Days</span>
                  </div>

                  {/* Short Description */}
                  <div className="mb-8 text-sm text-gray-500 leading-relaxed">
                    {shortDescription}
                  </div>

                  <div className="border-t border-gray-300 mb-6"></div>

                  {/* Included Deliverables */}
                  <div>
                    <h4 className="text-base font-bold text-gray-700 mb-4">Included :</h4>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Comprehensive Website Review</span>
                      </li>
                      <li className="flex items-start gap-3 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Detailed PDF Report</span>
                      </li>
                      <li className="flex items-start gap-3 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Key Performance Issues Identified</span>
                      </li>
                      <li className="flex items-start gap-3 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Actionable Recommendations</span>
                      </li>
                    </ul>
                  </div>

                  <div className="border-t border-gray-300 my-8"></div>

                  {/* Payment form rendered cleanly within card */}
                  <UnifiedPaymentForm
                    containerClassName=""
                    hideCurrencyToggle={true}
                    type="ANALYSIS"
                    entityId={productId}
                    entityNumber={analysisNo.replace("#", "")}
                    title={title}
                    description={shortDescription}
                    date={currentDate.toISOString()}
                    totalCost={price}
                    depositAmount={price > 0 ? price / 2 : undefined}
                    deliverableItems={[
                      {
                        description: "Initial Analysis Setup & Implementation",
                        details: "Comprehensive Website Review, Detailed PDF Report, Key Performance Issues Identified, Actionable Recommendations",
                        amount: price,
                        duration: `${timelineDays} Days`,
                        unit: "",
                        isAddOn: false,
                      },
                    ]}
                    clientEmail={formData.email || user?.email || ""}
                    successRedirectUrl="/dashboard/my-analyses"
                    amountPaid={0}
                    startDate={currentDate.toISOString()}
                    deadline={deadlineDate.toISOString()}
                    nativeCurrency="USD"
                    metadata={{
                      type: "ANALYSIS",
                      analysisId: productId,
                      productId: productId,
                      title: title,
                      description: shortDescription,
                      fullAmount: price,
                      duration: `${timelineDays} Days`,
                      targetWebsiteUrl: formData.targetWebsiteUrl,
                      whoCompletedWork: formData.whoCompletedWork,
                      agreementDetails: formData.agreementDetails,
                      scopeOfWork: formData.scopeOfWork,
                      loginsDetails: formData.loginsDetails,
                      additionalComments: formData.additionalComments,
                      clientEmail: formData.email || user?.email || "",
                      clientName: formData.fullName || user?.fullName || user?.username || "Client",
                    }}
                  />
                </div>

                {/* Save Order & Pay Later Button */}
                <div className="mt-6">
                  <button
                    onClick={handleSaveOrder}
                    disabled={processing}
                    className="w-full px-6 py-3 bg-white border border-gray-300 text-gray-600 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 rounded transition-all duration-200 shadow-sm active:scale-95 cursor-pointer"
                  >
                    {processing ? "Processing..." : "Save Order & Pay Later (Generate Invoice)"}
                  </button>
                </div>
              </div>
            )}

            <div className="lg:col-span-1">
              <div className="bg-white border border-gray-300 rounded-[4px] shadow-sm p-6 sticky top-28">
                <h3 className="text-xl font-bold text-gray-600 text-center mb-3">Questions Before You Pay?</h3>
                <p className="text-sm text-gray-500 text-center mb-6">
                  Our support team is here to help with pricing, payments, or package details—no pressure.
                </p>
                <button
                  type="button"
                  onClick={openChat}
                  className="w-full px-6 py-3 bg-[#3535b8] hover:bg-[#2a2a9a] text-white font-semibold rounded transition-colors duration-200 cursor-pointer"
                >
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
