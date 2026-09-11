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
import UnifiedPaymentForm from "@/components/dashboard/UnifiedPaymentForm";
import { countryService, Country } from "@/lib/countryService";
import { formatPriceWithCurrency } from "@/lib/currencyUtils";

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

// Preset data for Digital Starter Bundle
const DIGITAL_STARTER_BUNDLE = {
  _id: "69c2a62f50da25953be89c85",
  name: "Digital Starter Bundle",
  description:
    "Quick, affordable launch for new or small businesses needing essentials fast. Provides a professional online presence, basic visual identity, ongoing site reliability, local search visibility, and initial social media setup. Ideal for solopreneurs, startups, or local services testing the waters.",
  imageUrl:
    "http://res.cloudinary.com/dgg6e3flf/image/upload/v1785224007/packages/a_professional_high_fidelity_3d_still_life_scene_for_a_digital_starter_bundle.webp",
  columns: [
    { id: "col_starter", title: "Starter", price: 2200, recurringAmount: 1725, timeline: 2 },
    { id: "col_standard", title: "Standard", price: 5000, recurringAmount: 3575, timeline: 6 },
    { id: "col_premium", title: "Premium", price: 10000, recurringAmount: 7150, timeline: 12 },
    { id: "col_custom", title: "Custom", price: "Get A Quote", recurringAmount: 0, timeline: null },
  ],
  features: [
    {
      name: "Small Business Website",
      section: "one-time",
      values: {
        col_starter: "__LINK__:Starter Tier (WordPress + Elementor)|https://societywebsolutions.com/dashboard/new-project/packages/6a67af8ff4538bf364e50b48",
        col_standard: "__LINK__:Standard Tier (Custom WordPress)|https://societywebsolutions.com/dashboard/new-project/packages/6a67af8ff4538bf364e50b48",
        col_premium: "__LINK__:Premium Tier (Fully custom code)|https://societywebsolutions.com/dashboard/new-project/packages/6a67af8ff4538bf364e50b48",
        col_custom: false,
      },
    },
    {
      name: "Logo / Brand Identity",
      section: "one-time",
      values: {
        col_starter: "__LINK__:Starter Tier Logo Design Only|https://societywebsolutions.com/dashboard/new-project/packages/69d8bcab467d0ff3e5f1479f",
        col_standard: "__LINK__:Standard Tier Brand Identity|https://societywebsolutions.com/dashboard/new-project/packages/69d8c2cf467d0ff3e5f1481a",
        col_premium: "__LINK__:Premium Tier Brand Identity|https://societywebsolutions.com/dashboard/new-project/packages/69d8c2cf467d0ff3e5f1481a",
        col_custom: false,
      },
    },
    {
      name: "Website Maintenance",
      section: "monthly",
      values: {
        col_starter: "__LINK__:Starter Tier Essential Maintenance|https://societywebsolutions.com/dashboard/new-project/packages/6a67cf41f4538bf364e5458f",
        col_standard: "__LINK__:Standard Tier Essential Maintenance|https://societywebsolutions.com/dashboard/new-project/packages/6a67cf41f4538bf364e5458f",
        col_premium: "__LINK__:Premium Tier Essential Maintenance|https://societywebsolutions.com/dashboard/new-project/packages/6a67cf41f4538bf364e5458f",
        col_custom: false,
      },
    },
    {
      name: "SEO",
      section: "monthly",
      values: {
        col_starter: "__LINK__:Starter Tier Local SEO|https://societywebsolutions.com/dashboard/new-project/packages/6a67d3f8f4538bf364e548d6",
        col_standard: "__LINK__:Standard Tier Local SEO|https://societywebsolutions.com/dashboard/new-project/packages/6a67d3f8f4538bf364e548d6",
        col_premium: "__LINK__:Premium Tier Local SEO|https://societywebsolutions.com/dashboard/new-project/packages/6a67d3f8f4538bf364e548d6",
        col_custom: false,
      },
    },
    {
      name: "Social Media",
      section: "monthly",
      values: {
        col_starter: "__LINK__:Starter Tier Complete Management|https://societywebsolutions.com/dashboard/new-project/packages/6a67d70bf4538bf364e54b55",
        col_standard: "__LINK__:Standard Tier Complete Management|https://societywebsolutions.com/dashboard/new-project/packages/6a67d70bf4538bf364e54b55",
        col_premium: "__LINK__:Premium Tier Complete Management|https://societywebsolutions.com/dashboard/new-project/packages/6a67d70bf4538bf364e54b55",
        col_custom: false,
      },
    },
  ],
};

function BundleDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const { openChat } = useChatWidget();
  const bundleId = params?.id as string;
  const { currency, setCurrency, conversionRate } = useCurrency();

  const [pkg, setPkg] = useState<any>(bundleId === DIGITAL_STARTER_BUNDLE._id ? DIGITAL_STARTER_BUNDLE : null);
  const [loading, setLoading] = useState(bundleId !== DIGITAL_STARTER_BUNDLE._id);
  const [selectedTier, setSelectedTier] = useState<any>(
    bundleId === DIGITAL_STARTER_BUNDLE._id ? DIGITAL_STARTER_BUNDLE.columns[0] : null
  );
  const [projectNo, setProjectNo] = useState("PF6K60K");
  const [userCredits, setUserCredits] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState({ isOpen: false, type: "success" as "success" | "error", title: "", message: "" });
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("US");
  const [countriesList, setCountriesList] = useState<Country[]>([]);
  const [mountedDate, setMountedDate] = useState<Date | null>(null);

  useEffect(() => {
    setMountedDate(new Date());
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

    const fetchCountries = async () => {
      try {
        const list = await countryService.getAllCountries();
        if (list && list.length > 0) {
          setCountriesList(list);
        }
      } catch (err) {
        console.error("Failed to load countries:", err);
      }
    };

    initUser();
    fetchCountries();
  }, []);

  useEffect(() => {
    const loadPkg = async () => {
      try {
        const res = await packagesService.getBundleById(bundleId);
        if (res?.data) {
          // If bundleId matches DIGITAL_STARTER_BUNDLE, merge to ensure rich links and custom quote tier
          if (bundleId === DIGITAL_STARTER_BUNDLE._id) {
            const rawColumns = res.data.columns && res.data.columns.length > 0 ? res.data.columns : DIGITAL_STARTER_BUNDLE.columns;
            const mergedColumns = rawColumns.map((c: any, idx: number) => {
              const presetCol = DIGITAL_STARTER_BUNDLE.columns.find(
                (dc: any) => dc.id === c.id || dc.title?.toLowerCase() === c.title?.toLowerCase()
              ) || DIGITAL_STARTER_BUNDLE.columns[idx];
              return {
                ...presetCol,
                ...c,
                timeline: c.timeline ?? presetCol?.timeline,
                recurringAmount: c.recurringAmount ?? presetCol?.recurringAmount,
              };
            });
            const merged = {
              ...DIGITAL_STARTER_BUNDLE,
              ...res.data,
              columns: mergedColumns,
              features: res.data.features && res.data.features.length > 0 ? res.data.features : DIGITAL_STARTER_BUNDLE.features,
            };
            setPkg(merged);
            if (!selectedTier) {
              const firstBuy = merged.columns.find(
                (c: any) => (c.price && c.price !== "Get A Quote") || (c.recurringAmount && Number(c.recurringAmount) > 0)
              ) || merged.columns[0];
              setSelectedTier(firstBuy);
            }
          } else {
            setPkg(res.data);
            const firstPaid = (res.data.config?.oneTimeDeliverables?.tiers || res.data.columns)?.find(
              (c: any) =>
                (c.price && c.price !== "Get A Quote") || (c.recurringAmount && Number(c.recurringAmount) > 0)
            );
            if (firstPaid && !selectedTier) setSelectedTier(firstPaid);
          }
        }
      } catch (err) {
        console.error("Failed to load bundle details", err);
        if (bundleId === DIGITAL_STARTER_BUNDLE._id) {
          setPkg(DIGITAL_STARTER_BUNDLE);
          if (!selectedTier) setSelectedTier(DIGITAL_STARTER_BUNDLE.columns[0]);
        }
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
        ...(pkg.config.recurringDeliverables?.features || []).map((f: any) => ({ ...f, section: "monthly" })),
      ];
    }
    return [];
  }, [pkg]);

  const columns = useMemo(() => {
    if (!pkg) return [];
    if (pkg.columns && pkg.columns.length > 0) {
      return pkg.columns.map((col: any, idx: number) => {
        const presetCol = DIGITAL_STARTER_BUNDLE.columns.find(
          (dc: any) => dc.id === col.id || dc.title?.toLowerCase() === col.title?.toLowerCase()
        ) || DIGITAL_STARTER_BUNDLE.columns[idx];
        return {
          ...col,
          timeline: col.timeline ?? presetCol?.timeline,
        };
      });
    }
    if (pkg.config) {
      return (pkg.config.oneTimeDeliverables?.tiers || pkg.config.oneTimeDeliverables?.columns || []).map((col: any, idx: number) => {
        const recurringCol = (pkg.config.recurringDeliverables?.tiers || pkg.config.recurringDeliverables?.columns || [])?.find(
          (rc: any) => rc.id === col.id
        );
        const presetCol = DIGITAL_STARTER_BUNDLE.columns.find(
          (dc: any) => dc.id === col.id || dc.title?.toLowerCase() === col.title?.toLowerCase()
        ) || DIGITAL_STARTER_BUNDLE.columns[idx];
        return {
          ...col,
          timeline: col.timeline ?? presetCol?.timeline,
          recurringAmount: recurringCol?.price || recurringCol?.recurringPrice || 0,
          recurringBillingType: recurringCol?.billingType || recurringCol?.recurringBillingType,
          recurringPeriod: recurringCol?.period || recurringCol?.recurringPeriod,
        };
      });
    }
    return [];
  }, [pkg]);

  const oneTimeFeatures = features
    .filter((f: any) => !f.section || f.section === "one-time")
    .filter((f: any) => f.key !== "timeline" && f.name?.toLowerCase() !== "timeline");
  const recurringFeatures = features
    .filter((f: any) => f.section === "monthly")
    .filter((f: any) => f.key !== "timeline" && f.name?.toLowerCase() !== "timeline");

  const hasRecurring = recurringFeatures.length > 0 || columns.some((c: any) => Number(c.recurringAmount) > 0);

  const formatPrice = (val: any) => {
    const amount = typeof val === "number" ? val : parseFloat(String(val).replace(/[^0-9.]/g, "")) || 0;
    return formatPriceWithCurrency(amount, currency || "USD", "USD", conversionRate);
  };

  const parsePrice = (p: any) => {
    if (typeof p === "number") return p;
    if (!p || typeof p !== "string") return 0;
    return parseFloat(p.replace(/[^0-9.]/g, "")) || 0;
  };

  const getTimelineDisplay = (col: any, featureList: any[] = [], idx: number = 0) => {
    if (!col) return "-";

    // 1. Direct col.timeline or recurringTimeline
    const t = col.timeline ?? col.recurringTimeline;
    if (t !== undefined && t !== null && t !== "") {
      if (typeof t === "object" && t.value !== undefined) {
        const val = t.value;
        const type = t.type || "weeks";
        return `${val} ${val === 1 ? type.replace(/s$/, "") : type}`;
      }
      if (typeof t === "number" && t > 0) {
        return `${t} week${t > 1 ? "s" : ""}`;
      }
      if (typeof t === "string" && t.trim() !== "" && t !== "0" && t !== "-") {
        if (/^\d+$/.test(t.trim())) {
          const num = parseInt(t.trim(), 10);
          return `${num} week${num > 1 ? "s" : ""}`;
        }
        return t;
      }
    }

    // 2. Look in features for a feature with key/name 'timeline'
    const timelineFeature = (featureList || []).find(
      (f: any) => f.key === "timeline" || f.name?.toLowerCase() === "timeline" || /timeline|duration/i.test(f.name)
    );
    if (timelineFeature && timelineFeature.values?.[col.id] != null) {
      const fVal = timelineFeature.values[col.id];
      if (typeof fVal === "number" && fVal > 0) {
        return `${fVal} week${fVal > 1 ? "s" : ""}`;
      }
      if (typeof fVal === "string" && fVal.trim() !== "" && fVal !== "-") {
        if (/^\d+$/.test(fVal.trim())) {
          const num = parseInt(fVal.trim(), 10);
          return `${num} week${num > 1 ? "s" : ""}`;
        }
        return fVal;
      }
    }

    // 3. Fallback for Digital Starter Bundle tiers
    const title = (col.title || col.label || "").toLowerCase();
    if (title.includes("starter") || col.id === "col_starter" || idx === 0) return "2 weeks";
    if (title.includes("standard") || col.id === "col_standard" || idx === 1) return "6 weeks";
    if (title.includes("premium") || col.id === "col_premium" || idx === 2) return "12 weeks";

    return "-";
  };

  const getDurationLabel = (tier?: any) => {
    const t = tier || selectedTier;
    if (!t) return "6 weeks";
    const display = getTimelineDisplay(t, features);
    if (display && display !== "-") return display;
    return t?.period || "6 weeks";
  };

  const handleTierSelect = (tier: any) => {
    setSelectedTier(tier);
    setTimeout(() => {
      const el = document.getElementById("payment-section");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleSaveOrder = async (tier: any) => {
    if (!((tier.price && tier.price !== "Get A Quote") || (tier.recurringAmount && Number(tier.recurringAmount) > 0))) {
      router.push("/dashboard/new-project/custom-quote");
      return;
    }

    setSelectedTier(tier);
    setProcessing(true);
    try {
      const setupPrice = parsePrice(tier.price);
      const recurringPrice = parsePrice(tier.recurringAmount);
      const oneTimeItems = oneTimeFeatures
        .filter((f: any) => {
          const val = f.values?.[tier.id];
          return val && val !== false;
        })
        .map((f: any) => f.name)
        .join(", ");

      const recurringItems = recurringFeatures
        .filter((f: any) => {
          const val = f.values?.[tier.id];
          return val && val !== false;
        })
        .map((f: any) => f.name)
        .join(", ");

      const recurringDuration = tier.recurringTimeline
        ? `${tier.recurringTimeline.value} ${tier.recurringTimeline.type}`
        : "Monthly";

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
          billingType: "mixed",
        },
      });

      if (res.isSuccessful && res.data?.projectId) {
        setStatus({
          isOpen: true,
          type: "success",
          title: "Order Created",
          message: "Invoice generated successfully. Redirecting to your project...",
        });
        setTimeout(() => router.push(`/dashboard/my-projects/${res.data.projectId}/details`), 2000);
      } else {
        throw new Error(res.message || "Failed to create order.");
      }
    } catch (err: any) {
      console.error("Order Error:", err);
      setStatus({
        isOpen: true,
        type: "error",
        title: "Order Failed",
        message: err.message || "Could not generate invoice.",
      });
    } finally {
      setProcessing(false);
    }
  };

  const renderCellValue = (val: any) => {
    if (val === false || val === null || val === undefined) {
      return (
        <div className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center mx-auto">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
    }
    if (val === true) {
      return <CheckIcon />;
    }
    if (typeof val === "string" && val.startsWith("__LINK__:")) {
      const parts = val.replace("__LINK__:", "").split("|");
      const label = parts[0] || "Link";
      const url = parts[1] || "#";
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] font-bold text-blue-600 hover:text-blue-800 underline decoration-blue-200 underline-offset-4 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {label}
        </a>
      );
    }
    return (
      <span className="text-[13px] md:text-[15px] font-bold text-gray-700 text-center block w-full leading-normal">
        {String(val)}
      </span>
    );
  };

  const formatDateWithTime = (d: Date) => {
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getDeadlineDate = (tier?: any) => {
    const t = tier || selectedTier;
    const weeks = Number(t?.timeline) || 6;
    const d = new Date(mountedDate || Date.now());
    d.setDate(d.getDate() + weeks * 7);
    return d;
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-gray-500">Loading...</div>;
  }
  if (!pkg) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-red-500">Bundle not found.</div>;
  }

  const currentDate = mountedDate || new Date();
  const deadlineDate = getDeadlineDate(selectedTier);

  return (
    <div className="bg-white min-h-screen flex flex-col font-sans text-[#404040]">
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
            <h1 className="text-[28px] md:text-[48px] lg:text-[64px] font-bold text-gray-800 leading-[1.1] mb-4 md:mb-6 tracking-tight">
              {pkg.name}
            </h1>
            <p className="text-gray-500 leading-relaxed text-base md:text-lg max-w-xl font-medium">
              {pkg.description ||
                "Quick, affordable launch for new or small businesses needing essentials fast. Provides a professional online presence, basic visual identity, ongoing site reliability, local search visibility, and initial social media setup. Ideal for solopreneurs, startups, or local services testing the waters."}
            </p>
          </div>
          <div className="lg:w-[50%] flex items-center justify-center lg:justify-end">
            <div className="w-full max-w-[620px] aspect-[16/10] bg-[#F0F0F0] rounded-[4px] overflow-hidden shadow-sm border border-gray-200">
              <img
                alt={pkg.name}
                className="w-full h-full object-cover"
                src={
                  pkg.imageUrl ||
                  "http://res.cloudinary.com/dgg6e3flf/image/upload/v1785224007/packages/a_professional_high_fidelity_3d_still_life_scene_for_a_digital_starter_bundle.webp"
                }
              />
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="border border-gray-200 rounded-[4px] overflow-hidden shadow-sm bg-white mb-10 md:mb-16">
          <div className="overflow-x-auto" style={{ cursor: "grab" }}>
            <div className="w-full min-w-[900px]">
              {/* Header: What's Included */}
              <div
                className="grid divide-x divide-gray-100 border-b border-gray-100"
                style={{
                  gridTemplateColumns: `minmax(180px, 260px) repeat(${columns.length}, minmax(210px, 1fr))`,
                }}
              >
                <div className="p-4 md:p-8 flex items-center bg-white">
                  <h3 className="text-lg md:text-[32px] font-bold text-gray-700 leading-[1.1]">
                    What&apos;s
                    <br className="hidden md:block" /> Included?
                  </h3>
                </div>
                {columns.map((col: any, idx: number) => {
                  const isCustom = col.id === "col_custom" || idx === columns.length - 1;
                  const isPaid = (col.price && col.price !== "Get A Quote") || (col.recurringAmount && Number(col.recurringAmount) > 0);
                  return (
                    <div
                      key={idx}
                      className={`px-2 md:px-6 py-4 md:py-8 text-center flex flex-col justify-center items-center ${
                        isCustom ? "bg-[#D9D9D9]" : "bg-[#EAEAEA]"
                      }`}
                    >
                      <span className="text-[11px] md:text-[13px] font-bold text-gray-500 uppercase tracking-widest mb-2 text-center">
                        {col.title}
                      </span>
                      <div className="text-gray-700 w-full px-1 overflow-hidden">
                        {isPaid ? (
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-lg xs:text-xl sm:text-2xl lg:text-[28px] font-bold leading-tight tracking-tight text-center whitespace-nowrap max-w-full text-gray-800">
                              {formatPrice(col.price && col.price !== "Get A Quote" ? col.price : col.recurringAmount)}
                            </span>
                            <span className="text-[10px] md:text-[12px] font-medium text-gray-500 uppercase tracking-tighter mt-1 text-center whitespace-nowrap">
                              {Number(col.price) > 0 ? "Setup Cost" : "Price"}
                            </span>
                          </div>
                        ) : (
                          <div className="text-gray-700 font-bold text-[18px] md:text-[22px] leading-tight text-center whitespace-nowrap">
                            Get A Quote
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* What's Included Deliverables Rows */}
              <div className="divide-y divide-gray-100">
                {oneTimeFeatures.map((feature: any, fIdx: number) => (
                  <div
                    key={fIdx}
                    className="grid divide-x divide-gray-50 hover:bg-gray-50/50 transition-colors"
                    style={{
                      gridTemplateColumns: `minmax(180px, 260px) repeat(${columns.length}, minmax(210px, 1fr))`,
                    }}
                  >
                    <div className="p-4 md:p-5 px-4 md:px-8 font-bold text-gray-600 text-[13px] md:text-[15px] flex items-center">
                      {feature.name}
                    </div>
                    {columns.map((col: any, cIdx: number) => (
                      <div key={cIdx} className="p-4 md:p-5 flex items-center justify-center text-center">
                        {renderCellValue(feature.values?.[col.id])}
                      </div>
                    ))}
                  </div>
                ))}

                {/* Timeline Row */}
                <div
                  className="grid divide-x divide-gray-50 bg-gray-50/30 border-t border-gray-100"
                  style={{
                    gridTemplateColumns: `minmax(180px, 260px) repeat(${columns.length}, minmax(210px, 1fr))`,
                  }}
                >
                  <div className="p-4 md:p-5 px-4 md:px-8 font-bold text-gray-600 text-[13px] md:text-[15px] flex items-center">
                    Timeline
                  </div>
                  {columns.map((col: any, idx: number) => (
                    <div key={idx} className="p-4 md:p-5 flex items-center justify-center text-center">
                      <span className="text-[13px] md:text-[15px] font-bold text-gray-700 text-center block w-full leading-normal">
                        {getTimelineDisplay(col, features, idx)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Buy Now / Get Quote Action Buttons Row */}
              <div
                className="grid divide-x divide-gray-100 border-t border-gray-100 bg-white"
                style={{
                  gridTemplateColumns: `minmax(180px, 260px) repeat(${columns.length}, minmax(210px, 1fr))`,
                }}
              >
                <div className="p-4 md:p-8" />
                {columns.map((col: any, idx: number) => {
                  const isPaid =
                    (col.price && col.price !== "Get A Quote") ||
                    (col.recurringAmount && Number(col.recurringAmount) > 0);
                  const isSelected = selectedTier?.id === col.id;
                  return (
                    <div key={idx} className="p-4 md:p-8 flex items-center justify-center">
                      <button
                        onClick={() =>
                          isPaid ? handleTierSelect(col) : router.push("/dashboard/new-project/custom-quote")
                        }
                        className={`w-full max-w-[150px] py-3.5 px-3 rounded-xl font-extrabold text-[12px] md:text-[13px] uppercase tracking-wider transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 ${
                          isSelected
                            ? "bg-[#2D2DA3] text-white"
                            : "bg-[#EAEAEA] text-[#2D2DA3] hover:bg-[#D9D9D9]"
                        }`}
                      >
                        {isPaid ? "Buy Now" : "Get Quote"}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Monthly Features Section */}
              {hasRecurring && (
                <>
                  <div
                    className="grid divide-x divide-gray-100 border-y border-gray-100"
                    style={{
                      gridTemplateColumns: `minmax(180px, 260px) repeat(${columns.length}, minmax(210px, 1fr))`,
                    }}
                  >
                    <div className="p-4 md:p-8 flex items-center bg-white">
                      <h3 className="text-base md:text-[24px] font-bold text-gray-700 leading-[1.1]">
                        Monthly Features
                      </h3>
                    </div>
                    {columns.map((col: any, idx: number) => {
                      const isCustom = col.id === "col_custom" || idx === columns.length - 1;
                      const hasRec = Number(col.recurringAmount || 0) > 0;
                      return (
                        <div
                          key={idx}
                          className={`px-2 md:px-6 py-4 md:py-8 text-center flex flex-col justify-center items-center ${
                            isCustom ? "bg-[#D9D9D9]" : "bg-[#EAEAEA]"
                          }`}
                        >
                          <span className="text-[11px] md:text-[13px] font-bold text-gray-500 uppercase tracking-widest mb-2 text-center">
                            {col.title}
                          </span>
                          <div className="flex flex-col items-center justify-center w-full px-1 overflow-hidden">
                            {hasRec ? (
                              <>
                                <span className="text-lg xs:text-xl sm:text-2xl lg:text-[28px] font-bold text-gray-800 leading-tight tracking-tight text-center whitespace-nowrap max-w-full">
                                  {formatPrice(Number(col.recurringAmount || 0))}
                                </span>
                                <span className="text-[10px] md:text-[12px] font-medium text-gray-500 uppercase tracking-tighter mt-1 text-center whitespace-nowrap">
                                  Recurring Phase Cost
                                </span>
                              </>
                            ) : (
                              <div className="text-gray-700 font-bold text-[18px] md:text-[22px] leading-tight text-center whitespace-nowrap">
                                Get A Quote
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="divide-y divide-gray-100">
                    {recurringFeatures.map((feature: any, fIdx: number) => (
                      <div
                        key={fIdx}
                        className="grid divide-x divide-gray-50 hover:bg-gray-50/50 transition-colors"
                        style={{
                          gridTemplateColumns: `minmax(180px, 260px) repeat(${columns.length}, minmax(210px, 1fr))`,
                        }}
                      >
                        <div className="p-4 md:p-5 px-4 md:px-8 font-bold text-gray-600 text-[13px] md:text-[15px] flex items-center">
                          {feature.name}
                        </div>
                        {columns.map((col: any, cIdx: number) => (
                          <div key={cIdx} className="p-4 md:p-5 flex items-center justify-center text-center">
                            {renderCellValue(feature.values?.[col.id])}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Payment Section */}
        {selectedTier && (
          <div className="mt-16" id="payment-section">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-600 mb-3">Complete Your Purchase Securely</h2>
              <p className="text-gray-500 text-lg">Your information is protected and your project starts immediately.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Unified Card Container with Project Details & Payment Form */}
                <div className="bg-white border border-gray-300 rounded-[4px] shadow-sm p-6 md:p-8">
                  {/* Top Badges */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div className="bg-gray-200 px-4 py-2 rounded-full w-fit">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-600 font-medium">
                          Start Date: {formatDateWithTime(currentDate)}
                        </span>
                      </div>
                    </div>
                    <div className="bg-gray-200 px-4 py-2 rounded-full w-fit">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-600 font-medium">
                          Estimated Deadline: {formatDateWithTime(deadlineDate)}
                        </span>
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
                    <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-600 leading-tight pr-4" style={{ maxWidth: "100%" }}>
                      {pkg.name} - {selectedTier.title}
                    </h3>
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-end">
                        <div className="text-3xl md:text-4xl font-bold text-gray-700">
                          {formatPrice(parsePrice(selectedTier.price))}
                        </div>
                        <div className="flex flex-col items-end mt-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">One-Time Setup Fee</span>
                          {parsePrice(selectedTier.recurringAmount) > 0 && (
                            <span className="text-xs font-semibold text-blue-600 mt-0.5">
                              + {formatPrice(parsePrice(selectedTier.recurringAmount))}/mo maintenance later
                            </span>
                          )}
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

                  {/* Project Meta Details */}
                  <div className="mb-6 text-sm text-gray-500 flex items-center gap-3 flex-wrap">
                    <span>
                      <strong>Project No:</strong> #{projectNo}
                    </span>
                    <span className="text-gray-400">|</span>
                    <span>
                      <strong>Timeline:</strong> {getDurationLabel(selectedTier)}
                    </span>
                  </div>

                  {/* Description */}
                  <div className="mb-8 text-sm text-gray-500 leading-relaxed">
                    {pkg.description}
                  </div>

                  <div className="border-t border-gray-300 mb-6"></div>

                  {/* Included Deliverables */}
                  <div>
                    <h4 className="text-base font-bold text-gray-700 mb-4">Included:</h4>
                    <ul className="space-y-3">
                      {oneTimeFeatures
                        .filter((f: any) => {
                          const val = f.values?.[selectedTier.id];
                          return val && val !== false;
                        })
                        .map((feature: any, idx: number) => {
                          const rawVal = feature.values?.[selectedTier.id];
                          let label = "";
                          if (typeof rawVal === "string") {
                            if (rawVal.startsWith("__LINK__:")) {
                              label = rawVal.replace("__LINK__:", "").split("|")[0];
                            } else {
                              label = rawVal;
                            }
                          }
                          return (
                            <li key={idx} className="flex items-start gap-3 text-sm text-gray-600">
                              <svg
                                className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.5}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              <span>
                                <strong className="font-bold text-gray-700">{feature.name}</strong>
                                {label ? `: ${label}` : ""}
                              </span>
                            </li>
                          );
                        })}
                    </ul>
                  </div>

                  <div className="border-t border-gray-300 my-8"></div>

                  {/* Payment form rendered cleanly within card */}
                  <UnifiedPaymentForm
                    containerClassName=""
                    hideCurrencyToggle={true}
                    type="BUNDLE"
                    entityId={bundleId}
                    entityNumber={projectNo}
                    title={`${pkg.name} - ${selectedTier.title}`}
                    description={pkg.description}
                    date={new Date().toISOString()}
                    totalCost={parsePrice(selectedTier.price)}
                    deliverableItems={(() => {
                      const oneTimeDetails = oneTimeFeatures
                        .filter((f: any) => {
                          const val = f.values?.[selectedTier.id];
                          return val && val !== false;
                        })
                        .map((f: any) => f.name)
                        .join(", ");

                      const items: any[] = [
                        {
                          description: "Initial Project Setup & Implementation",
                          details: oneTimeDetails || `${pkg.name} (${selectedTier.title} Tier)`,
                          amount: parsePrice(selectedTier.price),
                          duration: getDurationLabel(selectedTier),
                          unit: "",
                          isAddOn: false,
                        },
                      ];
                      if (parsePrice(selectedTier.recurringAmount) > 0) {
                        const recurringDetails = recurringFeatures
                          .filter((f: any) => {
                            const val = f.values?.[selectedTier.id];
                            return val && val !== false;
                          })
                          .map((f: any) => f.name)
                          .join(", ");

                        items.push({
                          description: "Ongoing Maintenance Phase",
                          details: recurringDetails || "Website Maintenance, SEO, Social Media",
                          amount: parsePrice(selectedTier.recurringAmount),
                          duration: selectedTier.recurringTimeline ? `${selectedTier.recurringTimeline.value}` : "1",
                          unit: selectedTier.recurringTimeline ? selectedTier.recurringTimeline.type : "Month",
                          isAddOn: true,
                        });
                      }
                      return items;
                    })()}
                    clientEmail={email}
                    successRedirectUrl="/dashboard/my-projects"
                    amountPaid={0}
                    startDate={new Date().toISOString()}
                    deadline={deadlineDate.toISOString()}
                    nativeCurrency="USD"
                    metadata={{
                      packageId: bundleId,
                      packageName: pkg.name,
                      tierId: selectedTier.id,
                      tierTitle: selectedTier.title,
                      lineItems: oneTimeFeatures
                        .filter((f: any) => {
                          const val = f.values?.[selectedTier.id];
                          return val && val !== false;
                        })
                        .map((f: any) => f.name)
                        .join(", "),
                      recurringLineItems: recurringFeatures
                        .filter((f: any) => {
                          const val = f.values?.[selectedTier.id];
                          return val && val !== false;
                        })
                        .map((f: any) => f.name)
                        .join(", "),
                      recurringAmount: parsePrice(selectedTier.recurringAmount),
                      fullAmount: parsePrice(selectedTier.price),
                      duration: getDurationLabel(selectedTier),
                      recurringDuration: selectedTier.recurringTimeline
                        ? `${selectedTier.recurringTimeline.value} ${selectedTier.recurringTimeline.type}`
                        : "Monthly",
                      billingType: "mixed",
                    }}
                  />
                </div>

                {/* Save Order & Pay Later Button */}
                <div className="mt-6">
                  <button
                    onClick={() => handleSaveOrder(selectedTier)}
                    disabled={processing}
                    className="w-full px-6 py-3 bg-white border border-gray-300 text-gray-600 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 rounded transition-all duration-200 shadow-sm active:scale-95"
                  >
                    {processing ? "Processing..." : "Save Order & Pay Later (Generate Invoice)"}
                  </button>
                </div>
              </div>

              {/* Support Card */}
              <div className="lg:col-span-1">
                <div className="bg-white border border-gray-300 rounded-[4px] shadow-sm p-6 sticky top-28">
                  <h3 className="text-xl font-bold text-gray-600 text-center mb-3">Questions Before You Pay?</h3>
                  <p className="text-sm text-gray-500 text-center mb-6">
                    Our support team is here to help with pricing, payments, or package details—no pressure.
                  </p>
                  <button
                    onClick={openChat}
                    className="w-full px-6 py-3 bg-[#3535b8] hover:bg-[#2a2a9a] text-white font-semibold rounded transition-colors duration-200"
                  >
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