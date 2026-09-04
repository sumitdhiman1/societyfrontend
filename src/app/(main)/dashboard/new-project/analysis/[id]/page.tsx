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
    additionalInfo: vf.additionalInfo !== undefined ? vf.additionalInfo : (product?.showAdditionalComments !== undefined ? product.showAdditionalComments : true),
    whatToLookAt: vf.whatToLookAt !== undefined ? vf.whatToLookAt : (product?.showScopeOfWork !== undefined ? product.showScopeOfWork : false),
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
                      {priceDisplay}
                    </div>
                  </div>
                </div>

                <div className="mb-6 text-sm text-gray-500 flex items-center gap-3 flex-wrap">
                  <span><strong>Project No:</strong> {projectNo}</span>
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

            <div className="lg:col-span-1">
              <div className="bg-white border border-gray-300 rounded-[4px] shadow-sm p-6">
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
