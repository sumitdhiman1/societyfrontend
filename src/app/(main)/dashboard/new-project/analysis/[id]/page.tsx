"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { requestAnalysisService } from "@/lib/requestAnalysisService";
import { authService } from "@/lib/authService";
import { useChatWidget } from "@/context/ChatWidgetContext";
import StatusPopup from "@/components/common/StatusPopup";

const SpinnerIcon = ({ size = 18 }: { size?: number }) => (
  <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const CheckIcon = ({ className = "w-4 h-4 text-gray-700" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const HelpIcon = () => (
  <span className="w-3.5 h-3.5 rounded-full bg-gray-300 text-gray-700 text-[10px] font-bold flex items-center justify-center cursor-help">
    ?
  </span>
);

export default function AnalysisOrderPage() {
  const params = useParams();
  const router = useRouter();
  const { openChat } = useChatWidget();
  const productId = params?.id as string;

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [projectNo, setProjectNo] = useState("");

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
    setProjectNo("#" + Math.random().toString(36).substring(2, 9).toUpperCase());

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

  const startDateFormatted = useMemo(() => {
    const d = new Date();
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  }, []);

  const deadlineFormatted = useMemo(() => {
    const d = new Date(Date.now() + timelineDays * 24 * 60 * 60 * 1000);
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  }, [timelineDays]);

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
    "Our standard free analysis offer covering brand, UI/UX, functionalities, AI potentiality, tech stack, speed, and SEO.";
  const longDescription =
    product?.longDescription ||
    product?.description ||
    "Our classic free analysis offer covering branding, UI/UX, functionalities, AI potentiality, tech stack, speed, and SEO. A manual review using a custom process created by Society Web Solutions, checking every important part of your website. Delivered as a custom PDF report within 5 days.";
  
  const imageSrc =
    product?.detailImage ||
    product?.detailImageUrl ||
    product?.coverImage ||
    product?.imageUrl ||
    (title.toLowerCase().includes("check")
      ? "/images/free_checking_of_work.jpg"
      : "/images/free_website_analysis.jpg");

  const vf = product?.visibleFormFields || {};
  const visibleFields = {
    urlToCheck: vf.urlToCheck !== undefined ? vf.urlToCheck : (product?.showWebsiteUrl !== undefined ? product.showWebsiteUrl : true),
    whatToLookAt: vf.whatToLookAt !== undefined ? vf.whatToLookAt : (product?.showScopeOfWork !== undefined ? product.showScopeOfWork : false),
    additionalInfo: vf.additionalInfo !== undefined ? vf.additionalInfo : (product?.showAdditionalComments !== undefined ? product.showAdditionalComments : false),
    whoCompletedWork: vf.whoCompletedWork !== undefined ? vf.whoCompletedWork : (product?.showWhoCompletedWork !== undefined ? product.showWhoCompletedWork : false),
    agreementDetails: vf.agreementDetails !== undefined ? vf.agreementDetails : (product?.showAgreementDetails !== undefined ? product.showAgreementDetails : false),
    shareAccess: vf.shareAccess !== undefined ? vf.shareAccess : (product?.showLoginsDetails !== undefined ? product.showLoginsDetails : false),
  };

  const isFree = product?.isFree !== false && (product?.amount === 0 || product?.amount === undefined);
  const priceDisplay = isFree ? "FREE" : `$${product?.amount || 0}`;

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

      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:px-[60px] pt-8 md:pt-12 pb-16">
        {/* 1. TOP PRODUCT OVERVIEW SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start mb-12">
          {/* Left Column: Title and Long Description */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0D1939] tracking-tight leading-tight">
              {title}
            </h1>
            <p className="text-base sm:text-lg text-gray-500 mt-6 leading-relaxed font-normal whitespace-pre-line">
              {longDescription}
            </p>
          </div>

          {/* Right Column: Detail Image */}
          <div className="lg:col-span-5">
            <div className="w-full aspect-[16/10] bg-white rounded-2xl overflow-hidden shadow-xs border border-gray-200/80 flex items-center justify-center">
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-gray-300">No Image Available</div>
              )}
            </div>
          </div>
        </div>

        {/* 2. ORDER FORM CARD (Fill out the form to order:) */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-10 shadow-xs mb-12">
          <h2 className="text-lg font-bold text-gray-900 mb-6 tracking-tight">
            Fill out the form to order:
          </h2>

          <form id="analysis-order-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* URL(s) to check: */}
              {visibleFields.urlToCheck !== false && (
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    URL(s) to check:
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="e.g. https://yourwebsite.com"
                    value={formData.targetWebsiteUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, targetWebsiteUrl: e.target.value })
                    }
                    className="w-full p-4 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#5356ff] focus:ring-1 focus:ring-[#5356ff] transition-all resize-none shadow-2xs"
                  />
                </div>
              )}

              {/* What specifically do you want us to look at? */}
              {visibleFields.whatToLookAt !== false && (
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    What specifically do you want us to look at?
                  </label>
                  <textarea
                    rows={4}
                    placeholder="e.g. design, functionality, SEO, speed, mobile, conversions, etc."
                    value={formData.scopeOfWork}
                    onChange={(e) =>
                      setFormData({ ...formData, scopeOfWork: e.target.value })
                    }
                    className="w-full p-4 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#5356ff] focus:ring-1 focus:ring-[#5356ff] transition-all resize-none shadow-2xs"
                  />
                </div>
              )}

              {/* Provide any additional required information: */}
              {visibleFields.additionalInfo !== false && (
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    Provide any additional required information:
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Any extra information you'd like to share"
                    value={formData.additionalComments}
                    onChange={(e) =>
                      setFormData({ ...formData, additionalComments: e.target.value })
                    }
                    className="w-full p-4 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#5356ff] focus:ring-1 focus:ring-[#5356ff] transition-all resize-none shadow-2xs"
                  />
                </div>
              )}

              {/* Who was the work completed by? */}
              {visibleFields.whoCompletedWork && (
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    Who was the work completed by?
                  </label>
                  <textarea
                    rows={4}
                    placeholder="e.g. Freelancer, agency, internal team, etc."
                    value={formData.whoCompletedWork}
                    onChange={(e) =>
                      setFormData({ ...formData, whoCompletedWork: e.target.value })
                    }
                    className="w-full p-4 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#5356ff] focus:ring-1 focus:ring-[#5356ff] transition-all resize-none shadow-2xs"
                  />
                </div>
              )}

              {/* What was the agreement for this work? */}
              {visibleFields.agreementDetails && (
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    What was the agreement for this work?
                  </label>
                  <textarea
                    rows={4}
                    placeholder="e.g. timeline, deliverables, milestones, etc."
                    value={formData.agreementDetails}
                    onChange={(e) =>
                      setFormData({ ...formData, agreementDetails: e.target.value })
                    }
                    className="w-full p-4 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#5356ff] focus:ring-1 focus:ring-[#5356ff] transition-all resize-none shadow-2xs"
                  />
                </div>
              )}

              {/* Please share required access with our email: */}
              {visibleFields.shareAccess && (
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    Please share required access with our email:
                  </label>
                  <textarea
                    rows={4}
                    placeholder="e.g. staging link, login credentials, collaborator invites, etc."
                    value={formData.loginsDetails}
                    onChange={(e) =>
                      setFormData({ ...formData, loginsDetails: e.target.value })
                    }
                    className="w-full p-4 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#5356ff] focus:ring-1 focus:ring-[#5356ff] transition-all resize-none font-mono shadow-2xs"
                  />
                </div>
              )}
            </div>
          </form>
        </div>

        {/* 3. COMPLETE YOUR PURCHASE SECURELY SECTION */}
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0D1939] tracking-tight">
            Complete Your Purchase Securely
          </h2>
          <p className="text-sm text-gray-500 mt-2 font-normal">
            Your information is protected and your project starts immediately.
          </p>
        </div>

        {/* 2-Column Summary Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mb-8">
          {/* Left Card: Purchase & Deliverables Summary */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200/90 p-6 sm:p-8 shadow-xs flex flex-col justify-between">
            <div>
              {/* Badges */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <span className="inline-flex items-center px-3.5 py-1 bg-gray-100/90 text-gray-600 rounded-full text-xs font-semibold">
                  Start Date: {startDateFormatted}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-gray-100/90 text-gray-600 rounded-full text-xs font-semibold">
                  Estimated Deadline: {deadlineFormatted}
                  <HelpIcon />
                </span>
              </div>

              {/* Title & Price */}
              <div className="flex items-baseline justify-between gap-4 mt-2">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0D1939] tracking-tight">
                  {title}
                </h3>
                <span className="text-2xl sm:text-3xl font-extrabold text-[#0D1939] tracking-tight">
                  {priceDisplay}
                </span>
              </div>

              {/* Metadata */}
              <div className="text-xs text-gray-500 font-semibold mt-2 flex items-center gap-2">
                <span>Project No: {projectNo}</span>
                <span>|</span>
                <span>Timeline: {timelineDays} Days</span>
              </div>

              {/* Short Description */}
              <p className="text-xs sm:text-sm text-gray-500 mt-4 leading-relaxed font-normal">
                {shortDescription}
              </p>
            </div>

            {/* Included Deliverables */}
            <div className="border-t border-gray-100 pt-6 mt-6">
              <h4 className="text-sm font-bold text-gray-900 mb-3 tracking-tight">
                Included :
              </h4>
              <ul className="space-y-2.5">
                <li className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-700 font-medium">
                  <CheckIcon className="w-4 h-4 text-gray-800 flex-shrink-0" />
                  <span>Comprehensive Website Review</span>
                </li>
                <li className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-700 font-medium">
                  <CheckIcon className="w-4 h-4 text-gray-800 flex-shrink-0" />
                  <span>Detailed PDF Report</span>
                </li>
                <li className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-700 font-medium">
                  <CheckIcon className="w-4 h-4 text-gray-800 flex-shrink-0" />
                  <span>Key Performance Issues Identified</span>
                </li>
                <li className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-700 font-medium">
                  <CheckIcon className="w-4 h-4 text-gray-800 flex-shrink-0" />
                  <span>Actionable Recommendations</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Card: Questions Before You Pay? */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200/90 p-6 sm:p-8 shadow-xs text-center flex flex-col justify-center items-center">
            <h3 className="text-lg font-bold text-[#0D1939] tracking-tight mb-2">
              Questions Before You Pay?
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-6 max-w-xs font-normal">
              Our support team is here to help with pricing, payments, or package details—no pressure.
            </p>
            <button
              type="button"
              onClick={openChat}
              className="w-full py-3.5 bg-[#2A37D8] hover:bg-[#1E2BB8] text-white font-bold rounded-xl text-sm transition-all shadow-md active:scale-[0.98] cursor-pointer"
            >
              Contact Support
            </button>
          </div>
        </div>

        {/* 4. FREE ANALYSIS / SUBMIT ACTION CARD */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-8 sm:p-10 shadow-xs text-center flex flex-col items-center justify-center">
          {/* Top Green Check Circle */}
          <div className="w-12 h-12 rounded-full bg-[#E8F8EE] text-[#1EAA55] flex items-center justify-center mb-4 shadow-2xs">
            <CheckIcon className="w-6 h-6 text-[#1EAA55]" />
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-1">
            Free Analysis
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mb-6 font-normal">
            This analysis is completely free. We will review your website and notify you within {timelineDays} days.
          </p>

          <button
            type="button"
            onClick={(e) => handleSubmit(e as any)}
            disabled={submitting}
            className="w-full max-w-3xl py-3.5 bg-[#2A37D8] hover:bg-[#1E2BB8] text-white font-bold rounded-xl text-sm transition-all shadow-md active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          >
            {submitting && <SpinnerIcon size={16} />}
            <span>{submitting ? "Submitting..." : "Submit Request"}</span>
          </button>
        </div>
      </main>
    </div>
  );
}
