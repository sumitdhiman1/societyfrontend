"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { packagesService } from "@/lib/packagesService";
import { useChatWidget } from "@/context/ChatWidgetContext";
import { useCurrency } from "@/context/CurrencyContext";
import { authService } from "@/lib/authService";
import { paymentService } from "@/lib/paymentService";
import { profileService } from "@/lib/profileService";
import StatusPopup from "@/components/common/StatusPopup";
import DashboardSubNav from "@/components/dashboard/DashboardSubNav";
import UnifiedPaymentForm from "@/components/dashboard/UnifiedPaymentForm";

const EUROPEAN_COUNTRIES = [
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK", "GB", "CH", "NO", "IS", "LI"
];
const VAT_RATE = 0.20;


const CheckIcon = () => (
  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center mx-auto">
    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  </div>
);

const CrossIcon = () => (
  <div className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center mx-auto">
    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </div>
);

const BellIcon = () => (
  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" clipRule="evenodd" />
  </svg>
);

const EyeIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const Tooltip = ({ className = "", text = "Time spent waiting for client replies does not count towards project deadlines." }) => {
  const [show, setShow] = useState(false);
  return (
    <div className={`relative inline-block ml-1 ${className}`}>
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="w-4 h-4 rounded-full bg-gray-400 text-white text-[9px] font-bold flex items-center justify-center cursor-help leading-none transition-colors hover:bg-gray-500"
      >
        ?
      </button>
      {show && (
        <div className="absolute left-6 bottom-0 w-64 bg-gray-900 text-white text-[11px] rounded-lg p-2.5 shadow-xl z-[9999] leading-relaxed font-normal normal-case break-words whitespace-normal">
          {text}
        </div>
      )}
    </div>
  );
};

function BundleDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const { openChat } = useChatWidget();
  const bundleId = params?.id as string;
  const { currency, setCurrency, conversionRate } = useCurrency();

  const [pkg, setPkg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<any>(null);
  const [projectNo, setProjectNo] = useState("");
  const [userCredits, setUserCredits] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState({ isOpen: false, type: "success" as "success" | "error", title: "", message: "" });
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("US");

  useEffect(() => {
    setProjectNo(Math.random().toString(36).substring(2, 9).toUpperCase());

    const initUser = async () => {
      const user = authService.getUser();
      if (user) {
        setEmail(user.email || "");
        try {
          const res = await profileService.getMyProfile();
          if (res?.data) {
            setCountry(res.data.country || res.data.billingCountry || "US");
            setUserCredits(res.data.credits || 0);
            authService.updateInternalUser({ credits: res.data.credits || 0 });
          } else if (user.credits !== undefined) {
            setUserCredits(user.credits);
          }
        } catch (err) {
          console.error("Failed to fetch user credits", err);
          if (user.credits !== undefined) setUserCredits(user.credits);
        }
      }
    };
    initUser();
  }, []);

  useEffect(() => {
    const loadPkg = async () => {
      try {
        const res = await packagesService.getBundleById(bundleId);
        if (res?.data) {
          setPkg(res.data);
          const firstPaid = (res.data.config?.oneTimeDeliverables?.tiers || res.data.columns)?.find((c: any) => (c.price && c.price !== "Get A Quote") || (c.recurringAmount && Number(c.recurringAmount) > 0));
          if (firstPaid) setSelectedTier(firstPaid);
        }
      } catch (err) {
        console.error("Failed to load bundle details", err);
      } finally {
        setLoading(false);
      }
    };
    if (bundleId) loadPkg();
  }, [bundleId]);

  const features = useMemo(() => {
    if (!pkg) return [];
    if (pkg.features && pkg.features.length > 0) return pkg.features;
    if (pkg.config) {
      return [
        ...(pkg.config.oneTimeDeliverables?.features || []).map((f: any) => ({ ...f, section: "one-time" })),
        ...(pkg.config.recurringDeliverables?.features || []).map((f: any) => ({ ...f, section: "monthly" }))
      ];
    }
    return [];
  }, [pkg]);

  const columns = useMemo(() => {
    if (!pkg) return [];
    if (pkg.columns && pkg.columns.length > 0) return pkg.columns;
    if (pkg.config) {
      return (pkg.config.oneTimeDeliverables?.tiers || pkg.config.oneTimeDeliverables?.columns || []).map((col: any) => {
        const recurringCol = (pkg.config.recurringDeliverables?.tiers || pkg.config.recurringDeliverables?.columns || [])?.find((rc: any) => rc.id === col.id);
        return {
          ...col,
          recurringAmount: recurringCol?.price || recurringCol?.recurringPrice || 0,
          recurringBillingType: recurringCol?.billingType || recurringCol?.recurringBillingType,
          recurringPeriod: recurringCol?.period || recurringCol?.recurringPeriod
        };
      });
    }
    return [];
  }, [pkg]);

  const oneTimeFeatures = features.filter((f: any) => !f.section || f.section === "one-time").filter((f: any) => f.key !== "timeline" && f.name?.toLowerCase() !== "timeline");
  const recurringFeatures = features.filter((f: any) => f.section === "monthly" && f.key !== "timeline" && f.name?.toLowerCase() !== "timeline");

  const hasOneTime = oneTimeFeatures.length > 0 || columns.some((c: any) => Number(c.price) > 0);
  const hasRecurring = recurringFeatures.length > 0 || columns.some((c: any) => Number(c.recurringAmount) > 0);

  const formatPrice = (val: any) => {
    let amount = typeof val === "number" ? val : parseFloat(String(val).replace(/[^0-9.]/g, "")) || 0;
    const isEur = currency?.toLowerCase() === "eur";
    if (isEur && conversionRate) {
      amount = 10 * Math.round(amount / conversionRate / 10);
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency?.toUpperCase() || "USD",
      minimumFractionDigits: isEur ? 0 : 2,
      maximumFractionDigits: isEur ? 0 : 2
    }).format(amount);
  };

  const getVatAmount = (amount: number) => {
    const isEuropean = EUROPEAN_COUNTRIES.includes(country?.toUpperCase());
    return isEuropean ? amount * VAT_RATE : 0;
  };

  const parsePrice = (p: any) => {
    if (typeof p === "number") return p;
    if (!p || typeof p !== "string") return 0;
    return parseFloat(p.replace(/[^0-9.]/g, "")) || 0;
  };

  const handleTierSelect = (tier: any) => {
    setSelectedTier(tier);
    setTimeout(() => {
      const el = document.getElementById("payment-section");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleSaveOrder = async (tier: any) => {
    if (!(tier.price && tier.price !== "Get A Quote" || tier.recurringAmount && Number(tier.recurringAmount) > 0)) {
      router.push("/dashboard/new-project/custom-quote");
      return;
    }

    setSelectedTier(tier);
    setProcessing(true);
    try {
      const setupPrice = parsePrice(tier.price);
      const recurringPrice = parsePrice(tier.recurringAmount);
      const oneTimeItems = features.filter((f: any) => {
        const val = f.values?.[tier.id];
        return val && val !== false && (!f.section || f.section === "one-time");
      }).map((f: any) => f.name).join(", ");

      const recurringItems = features.filter((f: any) => {
        const val = f.values?.[tier.id];
        return val && val !== false && f.section === "monthly";
      }).map((f: any) => f.name).join(", ");

      const recurringDuration = tier.recurringTimeline ? `${tier.recurringTimeline.value} ${tier.recurringTimeline.type}` : "Monthly";

      const res = await paymentService.createOrder({
        amount: setupPrice,
        currency: currency,
        creditsToApply: 0,
        metadata: {
          type: "BUNDLE",
          packageId: bundleId,
          packageName: pkg.name,
          tierId: tier.id,
          tierTitle: tier.title,
          title: pkg.name,
          description: pkg.description,
          lineItems: oneTimeItems,
          recurringLineItems: recurringItems,
          recurringAmount: recurringPrice,
          fullAmount: setupPrice,
          duration: getDurationLabel(tier),
          recurringDuration: recurringDuration,
          billingType: "mixed"
        }
      });

      if (res.isSuccessful && res.data?.projectId) {
        setStatus({ isOpen: true, type: "success", title: "Order Created", message: "Invoice generated successfully. Redirecting to your project..." });
        setTimeout(() => router.push(`/dashboard/my-projects/${res.data.projectId}/details`), 2000);
      } else {
        throw new Error(res.message || "Failed to create order.");
      }
    } catch (err: any) {
      console.error("Order Error:", err);
      setStatus({ isOpen: true, type: "error", title: "Order Failed", message: err.message || "Could not generate invoice." });
    } finally {
      setProcessing(false);
    }
  };


  const getDurationLabel = (tier?: any) => {
    const t = tier || selectedTier;
    if (!t) return "1 Week";
    const timelineFeature = features.find((f: any) => /Timeline|Delivery|Duration/i.test(f.name));
    const val = t && timelineFeature?.values?.[t.id];
    return t?.timeline ? `${t.timeline} Weeks` : val ? String(val) : t?.period || "1 Week";
  };

  const getIncludedFeatures = (section: "one-time" | "monthly" = "one-time") => {
    if (!selectedTier) return [];
    return features.filter((f: any) => {
      const val = f.values?.[selectedTier.id];
      return val && val !== false && (section === "one-time" ? (!f.section || f.section === "one-time") : (f.section === "monthly"));
    });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white text-gray-500">Loading...</div>;
  if (!pkg) return <div className="min-h-screen flex items-center justify-center bg-white text-red-500">Bundle not found.</div>;


  return (
    <div className="bg-white min-h-screen flex flex-col font-sans text-[#404040]">
      <DashboardSubNav />
      <StatusPopup
        isOpen={status.isOpen}
        onClose={() => setStatus({ ...status, isOpen: false })}
        type={status.type}
        title={status.title}
        message={status.message}
      />

      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-8 md:pt-12 pb-12">
        {/* Hero Section */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-10 md:gap-12 mb-10 md:mb-16">
          <div className="lg:w-[50%] flex flex-col">
            <h1 className="text-[28px] md:text-[48px] lg:text-[64px] font-bold text-gray-800 leading-[1.1] mb-4 md:mb-6 tracking-tight">{pkg.name}</h1>
            <p className="text-gray-500 leading-relaxed text-base md:text-lg max-w-xl font-medium">{pkg.description || "Professional services tailored to your specific business goals and requirements."}</p>
          </div>
          <div className="lg:w-[50%] flex items-center justify-center lg:justify-end">
            <div className="w-full max-w-[620px] aspect-[16/10] bg-[#F0F0F0] rounded-[4px] overflow-hidden shadow-sm border border-gray-200">
              {pkg.imageUrl ? <img src={pkg.imageUrl} alt={pkg.name} className="w-full h-full object-cover" /> : (
                <div className="flex items-center justify-center w-full h-full">
                  <svg className="w-32 h-32 text-gray-400 opacity-60" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="border border-gray-200 rounded-[4px] overflow-hidden shadow-sm bg-white mb-10 md:mb-16">
          <div className="overflow-x-auto">
            <div className="min-w-[1000px]">
              {hasOneTime && (
                <>
                  <div className="grid divide-x divide-gray-100 border-b border-gray-100" style={{ gridTemplateColumns: `minmax(200px, 300px) repeat(${columns.length}, 1fr)` }}>
                    <div className="p-6 md:p-8 flex items-center bg-white">
                      <h3 className="text-xl md:text-[32px] font-bold text-gray-700 leading-[1.1]">What&apos;s<br className="hidden md:block" /> Included?</h3>
                    </div>
                    {columns.map((col: any, idx: number) => (
                      <div key={idx} className={`p-6 md:p-8 text-center flex flex-col justify-center ${col.id === 'col_custom' || idx === columns.length - 1 ? "bg-[#D9D9D9]" : "bg-[#EAEAEA]"}`}>
                        <span className="text-[11px] md:text-[13px] font-bold text-gray-500 uppercase tracking-widest mb-2">{col.title}</span>
                        <div className="text-gray-700">
                          {col.price && col.price !== "Get A Quote" || col.recurringAmount && Number(col.recurringAmount) > 0 ? (
                            <div className="flex flex-col">
                              <span className="text-[32px] md:text-[40px] font-black leading-none">{formatPrice(col.price && col.price !== "Get A Quote" ? col.price : col.recurringAmount)}</span>
                              <span className="text-[10px] md:text-[12px] font-bold text-gray-500 uppercase tracking-tighter mt-1">{Number(col.price) > 0 ? "Setup Cost" : "Price"}</span>
                            </div>
                          ) : (
                            <div className="text-gray-700 font-extrabold text-[20px] md:text-[28px] leading-tight">Get A Quote</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="divide-y divide-gray-100">
                    {oneTimeFeatures.map((feature: any, fIdx: number) => (
                      <div key={fIdx} className="grid divide-x divide-gray-50 hover:bg-gray-50/50 transition-colors" style={{ gridTemplateColumns: `minmax(200px, 300px) repeat(${columns.length}, 1fr)` }}>
                        <div className="p-4 md:p-5 px-6 md:px-8 font-bold text-gray-600 text-[13px] md:text-[15px] flex items-center">{feature.name}</div>
                        {columns.map((col: any, cIdx: number) => {
                          const val = feature.values?.[col.id];
                          return (
                            <div key={cIdx} className="p-5 flex items-center justify-center">
                              {typeof val === "boolean" ? (
                                val ? <CheckIcon /> : <CrossIcon />
                              ) : typeof val === "string" && val.startsWith("__LINK__:") ? (
                                (() => {
                                  const parts = val.replace("__LINK__:", "").split("|");
                                  const label = parts[0] || "Link";
                                  const url = parts[1] || "#";
                                  return (
                                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-[13px] font-bold text-blue-600 hover:text-blue-800 underline decoration-blue-200 underline-offset-4 transition-colors" onClick={(e) => e.stopPropagation()}>
                                      {label}
                                    </a>
                                  );
                                })()
                              ) : val == null ? (
                                <span className="text-gray-300">N/A</span>
                              ) : (
                                <span className="text-[15px] font-bold text-gray-700">{String(val)}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    {columns.some((c: any) => c.timeline) && (
                      <div className="grid divide-x divide-gray-50 bg-gray-50/30 border-t border-gray-100" style={{ gridTemplateColumns: `minmax(200px, 300px) repeat(${columns.length}, 1fr)` }}>
                        <div className="p-4 md:p-5 px-6 md:px-8 font-bold text-gray-600 text-[13px] uppercase tracking-wider flex items-center gap-2">Timeline</div>
                        {columns.map((col: any, idx: number) => (
                          <div key={idx} className="p-5 flex items-center justify-center">
                            <span className="text-[15px] font-bold text-gray-700">{col.timeline ? `${col.timeline} Weeks` : "N/A"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
              {hasOneTime && (
                <div className="grid divide-x divide-gray-100 border-t border-gray-100 bg-white" style={{ gridTemplateColumns: `minmax(200px, 300px) repeat(${columns.length}, 1fr)` }}>
                  <div className="p-6 md:p-8" />
                  {columns.map((col: any, idx: number) => (
                    <div key={idx} className="p-6 md:p-8 flex items-center justify-center">
                      <button
                        onClick={() => col.price && col.price !== "Get A Quote" || col.recurringAmount && Number(col.recurringAmount) > 0 ? handleTierSelect(col) : router.push("/dashboard/new-project/custom-quote")}
                        className={`w-full max-w-[160px] py-4 rounded-xl font-black text-[13px] uppercase tracking-widest transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 ${selectedTier?.id === col.id ? "bg-[#2D2DA3] text-white" : "bg-[#EAEAEA] text-[#2D2DA3] hover:bg-[#D9D9D9]"}`}
                      >
                        {col.price && col.price !== "Get A Quote" || col.recurringAmount && Number(col.recurringAmount) > 0 ? "Buy Now" : "Get Quote"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {hasRecurring && (
                <>
                  <div className="grid divide-x divide-gray-100 border-y border-gray-100" style={{ gridTemplateColumns: `minmax(200px, 300px) repeat(${columns.length}, 1fr)` }}>
                    <div className="p-6 md:p-8 flex items-center bg-white">
                      <h3 className="text-lg md:text-[24px] font-bold text-gray-700 leading-[1.1]">Monthly Features</h3>
                    </div>
                    {columns.map((col: any, idx: number) => (
                      <div key={idx} className={`p-6 md:p-8 text-center flex flex-col justify-center ${col.id === 'col_custom' || idx === columns.length - 1 ? "bg-[#D9D9D9]" : "bg-[#EAEAEA]"}`}>
                        <span className="text-[11px] md:text-[13px] font-bold text-gray-500 uppercase tracking-widest mb-2">{col.title}</span>
                        <div className="flex flex-col items-center">
                          <span className="text-[32px] md:text-[40px] font-black text-gray-700 leading-none">{formatPrice(Number(col.recurringAmount || 0))}</span>
                          <span className="text-[10px] md:text-[12px] font-bold text-gray-500 uppercase tracking-tighter mt-1">Recurring Phase Cost</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="divide-y divide-gray-100">
                    {recurringFeatures.map((feature: any, fIdx: number) => (
                      <div key={fIdx} className="grid divide-x divide-gray-50 hover:bg-gray-50/50 transition-colors" style={{ gridTemplateColumns: `minmax(200px, 300px) repeat(${columns.length}, 1fr)` }}>
                        <div className="p-4 md:p-5 px-6 md:px-8 font-bold text-gray-600 text-[13px] md:text-[15px] flex items-center">{feature.name}</div>
                        {columns.map((col: any, cIdx: number) => {
                          const val = feature.values?.[col.id];
                          return (
                            <div key={cIdx} className="p-5 flex items-center justify-center">
                              {typeof val === "boolean" ? (
                                val ? <CheckIcon /> : <CrossIcon />
                              ) : val == null ? (
                                <span className="text-gray-300">N/A</span>
                              ) : (
                                <span className="text-[15px] font-bold text-gray-700">{String(val)}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    {columns.some((c: any) => c.recurringPeriod) && (
                      <div className="grid divide-x divide-gray-50 bg-green-50/30 border-t border-gray-100" style={{ gridTemplateColumns: `minmax(200px, 300px) repeat(${columns.length}, 1fr)` }}>
                        <div className="p-4 md:p-5 px-6 md:px-8 font-bold text-gray-600 text-[13px] uppercase tracking-wider flex items-center gap-2">Timeline</div>
                        {columns.map((col: any, idx: number) => (
                          <div key={idx} className="p-5 flex items-center justify-center">
                            <span className="text-[15px] font-bold text-gray-700">{col.recurringPeriod ? `${col.recurringPeriod}` : "N/A"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Payment Section */}
        {selectedTier && (
          <div className="mt-16" id="payment-section">

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              <div className="lg:col-span-2">
                {/* Project Summary Card */}
                <div className="bg-white border border-gray-300 rounded-[4px] shadow-sm p-6 md:p-8 mb-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div className="bg-gray-200 px-4 py-2 rounded-full w-fit">
                      <span className="text-xs text-gray-600 font-medium">Start Date: {new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}</span>
                    </div>
                    <div className="bg-gray-200 px-4 py-2 rounded-full w-fit">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-600 font-medium">
                          Estimated Deadline: {(() => {
                            const weeks = Number(selectedTier?.timeline) || 1;
                            const d = new Date();
                            d.setDate(d.getDate() + (weeks * 7));
                            return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
                          })()}
                        </span>
                        <Tooltip />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                    <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-600 leading-tight pr-4" style={{ maxWidth: "100%" }}>
                      {pkg.name} - {selectedTier.title}
                    </h3>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-4">
                        <div className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-600">
                          {formatPrice(parsePrice(selectedTier.price) + getVatAmount(parsePrice(selectedTier.price)))}
                        </div>
                        <select
                          value={currency.toUpperCase()}
                          onChange={(e) => setCurrency(e.target.value.toLowerCase())}
                          className="ml-2 bg-gray-50 border border-gray-300 text-gray-700 font-medium rounded-md px-3 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
                        >
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                        </select>
                      </div>
                      {getVatAmount(parsePrice(selectedTier.price)) > 0 && (
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                          Inc. 20% VAT ({formatPrice(getVatAmount(parsePrice(selectedTier.price)))})
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-6 text-sm text-gray-500 flex items-center gap-3 flex-wrap">
                    <span><strong>Project No:</strong> #{projectNo}</span>
                    <span className="text-gray-400">|</span>
                    <span><strong>Timeline:</strong> {getDurationLabel(selectedTier)}</span>
                  </div>

                  <div className="mb-8 text-sm text-gray-500 leading-relaxed">
                    {pkg.description}
                  </div>

                  <div className="border-t border-gray-300 mb-6" />

                  {getIncludedFeatures("one-time").length > 0 && (
                    <div>
                      <h4 className="text-base font-bold text-gray-700 mb-4">Included :</h4>
                      <ul className="space-y-3">
                        {getIncludedFeatures("one-time").map((feature: any, idx: number) => (
                          <li key={idx} className="flex items-start gap-3 text-sm text-gray-600">
                            <svg className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>
                              {feature.name}
                              {typeof feature.values[selectedTier.id] === "string" && (
                                <span className="text-gray-400 font-medium">({feature.values[selectedTier.id]})</span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {getIncludedFeatures("monthly").length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-base font-bold text-[#5356ff] mb-4">Monthly Phase :</h4>
                      <ul className="space-y-3">
                        {getIncludedFeatures("monthly").map((feature: any, idx: number) => (
                          <li key={idx} className="flex items-start gap-3 text-sm text-gray-600">
                            <svg className="w-4 h-4 text-[#5356ff] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>{feature.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <UnifiedPaymentForm
                  type="BUNDLE"
                  entityId={bundleId}
                  entityNumber={projectNo}
                  title={`${pkg.name} - ${selectedTier.title}`}
                  description={pkg.description}
                  date={new Date().toISOString()}
                  totalCost={parsePrice(selectedTier.price)}
                  deliverableItems={(() => {
                    const items = [
                      {
                        description: "Initial Project Setup & Implementation",
                        details: `${pkg.name} (${selectedTier.title} Tier)`,
                        amount: parsePrice(selectedTier.price),
                        duration: getDurationLabel(selectedTier),
                        unit: "",
                        isAddOn: false
                      }
                    ];
                    if (parsePrice(selectedTier.recurringAmount) > 0) {
                      const recurringFeaturesText = features.filter((f: any) => {
                        const val = f.values?.[selectedTier.id];
                        return val && val !== false && f.section === "monthly";
                      }).map((f: any) => f.name).join(", ");

                      items.push({
                        description: "Ongoing Maintenance Phase",
                        details: recurringFeaturesText || "Standard Maintenance Items",
                        amount: parsePrice(selectedTier.recurringAmount),
                        duration: selectedTier.recurringTimeline ? `${selectedTier.recurringTimeline.value}` : "1",
                        unit: selectedTier.recurringTimeline ? selectedTier.recurringTimeline.type : "Month",
                        isAddOn: true
                      });
                    }
                    return items;
                  })()}
                  clientEmail={email}
                  successRedirectUrl="/dashboard/my-projects"
                  amountPaid={0}
                  startDate={new Date().toISOString()}
                  deadline={(() => {
                    const weeks = Number(selectedTier?.timeline) || 1;
                    const d = new Date();
                    d.setDate(d.getDate() + (weeks * 7));
                    return d.toISOString();
                  })()}
                  nativeCurrency="USD"
                  metadata={{
                    packageId: bundleId,
                    packageName: pkg.name,
                    tierId: selectedTier.id,
                    tierTitle: selectedTier.title,
                    lineItems: getIncludedFeatures("one-time").map((f: any) => f.name).join(", "),
                    recurringLineItems: getIncludedFeatures("monthly").map((f: any) => f.name).join(", "),
                    recurringAmount: parsePrice(selectedTier.recurringAmount),
                    fullAmount: parsePrice(selectedTier.price),
                    duration: getDurationLabel(selectedTier),
                    recurringDuration: selectedTier.recurringTimeline ? `${selectedTier.recurringTimeline.value} ${selectedTier.recurringTimeline.type}` : "Monthly",
                    billingType: "mixed"
                  }}
                />

                <div className="mt-4">
                  <button
                    onClick={() => handleSaveOrder(selectedTier)}
                    disabled={processing}
                    className="w-full px-6 py-3 bg-white border border-gray-300 text-gray-600 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    {processing ? "Processing..." : "Save Order & Pay Later (Generate Invoice)"}
                  </button>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-white border border-gray-300 rounded-xl shadow-sm p-8 sticky top-8">
                  <h3 className="text-xl font-bold text-gray-800 text-center mb-4">Questions Before You Pay?</h3>
                  <p className="text-sm text-gray-500 text-center mb-8 leading-relaxed">Our support team is here to help with pricing, payments, or package details—no pressure.</p>
                  <button onClick={openChat} className="w-full px-6 py-4 bg-[#3535b8] hover:bg-[#2a2a9a] text-white font-bold rounded-lg transition-all shadow-md active:scale-95">
                    Contact Support
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


      </main>
    </div>
  );
}

export default function BundleDetailsPage() {
  return <BundleDetailsContent />;
}