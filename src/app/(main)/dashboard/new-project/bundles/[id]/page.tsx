"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { packagesService } from "@/lib/packagesService";
import { useChatWidget } from "@/context/ChatWidgetContext";
import { useCurrency } from "@/context/CurrencyContext";
import { authService } from "@/lib/authService";
import { packageBundlePaymentService } from "@/lib/packageBundlePaymentService";
import { profileService } from "@/lib/profileService";
import StatusPopup from "@/components/common/StatusPopup";
import PackageBundlePaymentForm from "@/components/dashboard/PackageBundlePaymentForm";
import { countryService, Country } from "@/lib/countryService";
import {
  formatPackageBundlePriceWithCurrency as formatPriceWithCurrency,
  convertPackageBundleCurrencyAmount,
} from "@/lib/currencyUtils";

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
    { id: "starter", title: "Starter", price: 2200, recurringAmount: 1725, recurringPrice: 1725, timeline: 2 },
    { id: "professional", title: "Standard", price: 5000, recurringAmount: 3575, recurringPrice: 3575, timeline: 6 },
    { id: "premium", title: "Premium", price: 10000, recurringAmount: 7150, recurringPrice: 7150, timeline: 12 },
    { id: "tier_1787673409959", title: "Custom", price: "Get A Quote", recurringAmount: 0, recurringPrice: 0, timeline: null },
  ],
  features: [
    {
      key: "small-business-website",
      name: "Small Business Website",
      section: "one-time",
      values: {
        starter: "__LINK__:Starter Tier (WordPress + Elementor)|https://societywebsolutions.com/dashboard/new-project/packages/6a67af8ff4538bf364e50b48",
        professional: "__LINK__:Standard Tier (Custom WordPress)|https://societywebsolutions.com/dashboard/new-project/packages/6a67af8ff4538bf364e50b48",
        premium: "__LINK__:Premium Tier (Fully custom code)|https://societywebsolutions.com/dashboard/new-project/packages/6a67af8ff4538bf364e50b48",
        tier_1787673409959: false,
        col_starter: "__LINK__:Starter Tier (WordPress + Elementor)|https://societywebsolutions.com/dashboard/new-project/packages/6a67af8ff4538bf364e50b48",
        col_standard: "__LINK__:Standard Tier (Custom WordPress)|https://societywebsolutions.com/dashboard/new-project/packages/6a67af8ff4538bf364e50b48",
        col_premium: "__LINK__:Premium Tier (Fully custom code)|https://societywebsolutions.com/dashboard/new-project/packages/6a67af8ff4538bf364e50b48",
        col_custom: false,
      },
    },
    {
      key: "logo-brand-identity",
      name: "Logo / Brand Identity",
      section: "one-time",
      values: {
        starter: "__LINK__:Starter Tier Logo Design Only|https://societywebsolutions.com/dashboard/new-project/packages/69d8bcab467d0ff3e5f1479f",
        professional: "__LINK__:Standard Tier Brand Identity|https://societywebsolutions.com/dashboard/new-project/packages/69d8c2cf467d0ff3e5f1481a",
        premium: "__LINK__:Premium Tier Brand Identity|https://societywebsolutions.com/dashboard/new-project/packages/69d8c2cf467d0ff3e5f1481a",
        tier_1787673409959: false,
        col_starter: "__LINK__:Starter Tier Logo Design Only|https://societywebsolutions.com/dashboard/new-project/packages/69d8bcab467d0ff3e5f1479f",
        col_standard: "__LINK__:Standard Tier Brand Identity|https://societywebsolutions.com/dashboard/new-project/packages/69d8c2cf467d0ff3e5f1481a",
        col_premium: "__LINK__:Premium Tier Brand Identity|https://societywebsolutions.com/dashboard/new-project/packages/69d8c2cf467d0ff3e5f1481a",
        col_custom: false,
      },
    },
    {
      key: "website-maintenance",
      name: "Website Maintenance",
      section: "monthly",
      values: {
        starter: "__LINK__:Starter Tier Essential Maintenance|https://societywebsolutions.com/dashboard/new-project/packages/6a67cf41f4538bf364e5458f",
        professional: "__LINK__:Standard Tier Essential Maintenance|https://societywebsolutions.com/dashboard/new-project/packages/6a67cf41f4538bf364e5458f",
        premium: "__LINK__:Premium Tier Essential Maintenance|https://societywebsolutions.com/dashboard/new-project/packages/6a67cf41f4538bf364e5458f",
        tier_1787673409959: false,
        col_starter: "__LINK__:Starter Tier Essential Maintenance|https://societywebsolutions.com/dashboard/new-project/packages/6a67cf41f4538bf364e5458f",
        col_standard: "__LINK__:Standard Tier Essential Maintenance|https://societywebsolutions.com/dashboard/new-project/packages/6a67cf41f4538bf364e5458f",
        col_premium: "__LINK__:Premium Tier Essential Maintenance|https://societywebsolutions.com/dashboard/new-project/packages/6a67cf41f4538bf364e5458f",
        col_custom: false,
      },
    },
    {
      key: "seo",
      name: "SEO",
      section: "monthly",
      values: {
        starter: "__LINK__:Starter Tier Local SEO|https://societywebsolutions.com/dashboard/new-project/packages/6a67d3f8f4538bf364e548d6",
        professional: "__LINK__:Standard Tier Local SEO|https://societywebsolutions.com/dashboard/new-project/packages/6a67d3f8f4538bf364e548d6",
        premium: "__LINK__:Premium Tier Local SEO|https://societywebsolutions.com/dashboard/new-project/packages/6a67d3f8f4538bf364e548d6",
        tier_1787673409959: false,
        col_starter: "__LINK__:Starter Tier Local SEO|https://societywebsolutions.com/dashboard/new-project/packages/6a67d3f8f4538bf364e548d6",
        col_standard: "__LINK__:Standard Tier Local SEO|https://societywebsolutions.com/dashboard/new-project/packages/6a67d3f8f4538bf364e548d6",
        col_premium: "__LINK__:Premium Tier Local SEO|https://societywebsolutions.com/dashboard/new-project/packages/6a67d3f8f4538bf364e548d6",
        col_custom: false,
      },
    },
    {
      key: "social-media",
      name: "Social Media",
      section: "monthly",
      values: {
        starter: "__LINK__:Starter Tier Complete Management|https://societywebsolutions.com/dashboard/new-project/packages/6a67d70bf4538bf364e54b55",
        professional: "__LINK__:Standard Tier Complete Management|https://societywebsolutions.com/dashboard/new-project/packages/6a67d70bf4538bf364e54b55",
        premium: "__LINK__:Premium Tier Complete Management|https://societywebsolutions.com/dashboard/new-project/packages/6a67d70bf4538bf364e54b55",
        tier_1787673409959: false,
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

  const parsePrice = (p: any) => {
    if (typeof p === "number") return p;
    if (!p || typeof p !== "string") return 0;
    return parseFloat(p.replace(/[^0-9.]/g, "")) || 0;
  };

  useEffect(() => {
    const loadPkg = async () => {
      try {
        const res = await packagesService.getBundleById(bundleId);
        if (res?.data) {
          const rawColumns = res.data.columns && res.data.columns.length > 0 ? res.data.columns : DIGITAL_STARTER_BUNDLE.columns;
          const mergedColumns = rawColumns.map((c: any, idx: number) => {
            const presetCol = DIGITAL_STARTER_BUNDLE.columns.find(
              (dc: any) => dc.id === c.id || dc.title?.toLowerCase() === c.title?.toLowerCase()
            ) || DIGITAL_STARTER_BUNDLE.columns[idx];
            return {
              ...presetCol,
              ...c,
              id: c.id || presetCol?.id,
              title: c.title || presetCol?.title,
              price: c.price ?? presetCol?.price,
              timeline: c.timeline ?? presetCol?.timeline,
              recurringAmount: c.recurringAmount ?? c.recurringPrice ?? presetCol?.recurringAmount ?? 0,
              recurringPrice: c.recurringPrice ?? c.recurringAmount ?? presetCol?.recurringPrice ?? 0,
            };
          });

          const merged = {
            ...(bundleId === DIGITAL_STARTER_BUNDLE._id ? DIGITAL_STARTER_BUNDLE : {}),
            ...res.data,
            columns: mergedColumns,
            features: res.data.features && res.data.features.length > 0 ? res.data.features : DIGITAL_STARTER_BUNDLE.features,
          };
          setPkg(merged);

          // Find best matching selected tier
          setSelectedTier((prev: any) => {
            if (prev) {
              const matched = mergedColumns.find(
                (c: any) => c.id === prev.id || c.title?.toLowerCase() === prev.title?.toLowerCase()
              );
              if (matched) return matched;
            }
            const firstBuy = mergedColumns.find(
              (c: any) => parsePrice(c.price) > 0 || parsePrice(c.recurringAmount ?? c.recurringPrice) > 0
            ) || mergedColumns[0];
            return firstBuy;
          });
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
          recurringAmount: col.recurringAmount ?? col.recurringPrice ?? presetCol?.recurringAmount ?? 0,
          recurringPrice: col.recurringPrice ?? col.recurringAmount ?? presetCol?.recurringPrice ?? 0,
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
        const recPrice = recurringCol?.price || recurringCol?.recurringPrice || 0;
        return {
          ...col,
          timeline: col.timeline ?? presetCol?.timeline,
          recurringAmount: recPrice,
          recurringPrice: recPrice,
          recurringBillingType: recurringCol?.billingType || recurringCol?.recurringBillingType,
          recurringPeriod: recurringCol?.period || recurringCol?.recurringPeriod,
        };
      });
    }
    return [];
  }, [pkg]);

  const getFeatureValue = (feature: any, tier: any, colIdx?: number) => {
    if (!feature || !feature.values || !tier) return undefined;
    const values = feature.values;

    // 1. Direct tier.id lookup
    if (tier.id && values[tier.id] !== undefined) {
      return values[tier.id];
    }

    // 2. Direct tier.key lookup
    if (tier.key && values[tier.key] !== undefined) {
      return values[tier.key];
    }

    // 3. Lookup by title / label
    const title = (tier.title || tier.name || tier.label || "").toLowerCase().trim();
    if (title && values[title] !== undefined) {
      return values[title];
    }

    // 4. Aliases
    const aliasMap: Record<string, string[]> = {
      starter: ["starter", "col_starter", "tier_starter", "col1", "tier_1"],
      col_starter: ["starter", "col_starter", "tier_starter", "col1", "tier_1"],
      standard: ["standard", "professional", "col_standard", "tier_standard", "col2", "tier_2"],
      professional: ["standard", "professional", "col_standard", "tier_standard", "col2", "tier_2"],
      col_standard: ["standard", "professional", "col_standard", "tier_standard", "col2", "tier_2"],
      premium: ["premium", "col_premium", "tier_premium", "col3", "tier_3"],
      col_premium: ["premium", "col_premium", "tier_premium", "col3", "tier_3"],
      custom: ["custom", "col_custom", "tier_custom", "col4", "tier_4", "tier_1787673409959"],
      col_custom: ["custom", "col_custom", "tier_custom", "col4", "tier_4", "tier_1787673409959"],
    };

    const idKey = (tier.id || "").toLowerCase().trim();
    const searchKeys = [
      ...(idKey ? (aliasMap[idKey] || [idKey]) : []),
      ...(title ? (aliasMap[title] || [title]) : []),
    ];

    for (const k of searchKeys) {
      if (values[k] !== undefined) {
        return values[k];
      }
    }

    // 5. Index-based match
    if (colIdx !== undefined && colIdx >= 0) {
      const keys = Object.keys(values);
      if (keys[colIdx] !== undefined && values[keys[colIdx]] !== undefined) {
        return values[keys[colIdx]];
      }
    }

    return undefined;
  };

  const oneTimeFeatures = features
    .filter((f: any) => !f.section || f.section === "one-time")
    .filter((f: any) => f.key !== "timeline" && f.name?.toLowerCase() !== "timeline");
  const recurringFeatures = features
    .filter((f: any) => f.section === "monthly")
    .filter((f: any) => f.key !== "timeline" && f.name?.toLowerCase() !== "timeline");

  const hasRecurring = recurringFeatures.length > 0 || columns.some((c: any) => parsePrice(c.recurringAmount ?? c.recurringPrice) > 0);

  const getIncludedFeatures = (section: "one-time" | "monthly" = "one-time", tier?: any) => {
    const activeTier = tier || selectedTier;
    if (!activeTier) return [];
    const targetFeatures = section === "one-time" ? oneTimeFeatures : recurringFeatures;
    return targetFeatures
      .map((feature: any) => {
        const colIdx = columns.findIndex((c: any) => c.id === activeTier.id || c.title?.toLowerCase() === activeTier.title?.toLowerCase());
        const val = getFeatureValue(feature, activeTier, colIdx >= 0 ? colIdx : undefined);
        return { feature, val };
      })
      .filter((item: { feature: any; val: any }) => item.val && item.val !== false && item.val !== "false" && item.val !== "-")
      .map((item: { feature: any; val: any }) => {
        let label = "";
        if (typeof item.val === "string") {
          if (item.val.startsWith("__LINK__:")) {
            label = item.val.replace("__LINK__:", "").split("|")[0];
          } else {
            label = item.val;
          }
        }
        return {
          ...item.feature,
          displayLabel: label,
        };
      });
  };

  const formatPrice = (val: any) => {
    const amount = typeof val === "number" ? val : parseFloat(String(val).replace(/[^0-9.]/g, "")) || 0;
    return formatPriceWithCurrency(amount, currency || "USD", "USD", conversionRate);
  };

  const formatDurationText = (daysOrObj: any): string => {
    if (daysOrObj === undefined || daysOrObj === null || daysOrObj === "" || daysOrObj === "-") return "-";
    if (typeof daysOrObj === "object") {
      const val = Number(daysOrObj.value);
      if (isNaN(val) || val <= 0) return "-";
      const unit = (daysOrObj.type || daysOrObj.unit || "days").toLowerCase();
      if (unit.startsWith("month")) return `${val} ${val === 1 ? "month" : "months"}`;
      if (unit.startsWith("week")) return `${val} ${val === 1 ? "week" : "weeks"}`;
      return `${val} ${val === 1 ? "day" : "days"}`;
    }

    if (typeof daysOrObj === "string" && !/^\d+$/.test(daysOrObj.trim())) {
      return daysOrObj.replace(/\bWeeks\b/g, "weeks").replace(/\bWeek\b/g, "week");
    }

    const days = typeof daysOrObj === "number" ? daysOrObj : parseInt(String(daysOrObj).trim(), 10);
    if (isNaN(days) || days <= 0) return "-";

    if (days % 30 === 0) {
      const months = days / 30;
      return `${months} ${months === 1 ? "month" : "months"}`;
    }
    if (days % 7 === 0) {
      const weeks = days / 7;
      return `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
    }
    return `${days} ${days === 1 ? "day" : "days"}`;
  };

  const getTimelineDays = (col: any): number => {
    if (!col) return 14;
    const t = col.timeline ?? col.recurringTimeline;
    if (typeof t === "number" && t > 0) return t;
    if (typeof t === "object" && t?.value) {
      const val = Number(t.value);
      const unit = (t.type || t.unit || "days").toLowerCase();
      if (unit.startsWith("month")) return val * 30;
      if (unit.startsWith("week")) return val * 7;
      return val;
    }
    if (typeof t === "string") {
      if (/^\d+$/.test(t.trim())) return parseInt(t.trim(), 10) || 14;
      const weeksMatch = /(\d+)\s*Week/i.exec(t);
      if (weeksMatch) return parseInt(weeksMatch[1], 10) * 7;
      const monthMatch = /(\d+)\s*Month/i.exec(t);
      if (monthMatch) return parseInt(monthMatch[1], 10) * 30;
      const daysMatch = /(\d+)\s*Day/i.exec(t);
      if (daysMatch) return parseInt(daysMatch[1], 10);
    }
    return 14;
  };

  const getTimelineDisplay = (col: any, featureList: any[] = [], idx: number = 0) => {
    if (!col) return "-";

    // 1. Direct col.timeline or recurringTimeline
    const t = col.timeline ?? col.recurringTimeline;
    if (t !== undefined && t !== null && t !== "") {
      const formatted = formatDurationText(t);
      if (formatted !== "-") return formatted;
    }

    // 2. Look in features for a feature with key/name 'timeline'
    const timelineFeature = (featureList || []).find(
      (f: any) => f.key === "timeline" || f.name?.toLowerCase() === "timeline" || /timeline|duration/i.test(f.name)
    );
    if (timelineFeature) {
      const fVal = getFeatureValue(timelineFeature, col, idx);
      if (fVal) {
        const formatted = formatDurationText(fVal);
        if (formatted !== "-") return formatted;
      }
    }

    // 3. Fallback for Digital Starter Bundle tiers
    const title = (col.title || col.label || "").toLowerCase();
    if (title.includes("starter") || col.id === "col_starter" || col.id === "starter" || idx === 0) return "2 weeks";
    if (title.includes("standard") || col.id === "col_standard" || col.id === "professional" || idx === 1) return "6 weeks";
    if (title.includes("premium") || col.id === "col_premium" || col.id === "premium" || idx === 2) return "12 weeks";

    return "-";
  };

  const getDurationLabel = (tier?: any) => {
    const t = tier || selectedTier;
    if (!t) return "6 weeks";
    const display = getTimelineDisplay(t, features);
    if (display && display !== "-") return display;
    return t?.period ? String(t.period).replace(/\bWeeks\b/g, "weeks").replace(/\bWeek\b/g, "week") : "6 weeks";
  };

  const handleTierSelect = (tier: any) => {
    const colIdx = columns.findIndex((c: any) => c.id === tier.id || c.title?.toLowerCase() === tier.title?.toLowerCase());
    const enrichedTier = colIdx >= 0 ? columns[colIdx] : tier;
    const isPaid =
      (enrichedTier.price && enrichedTier.price !== "Get A Quote" && parsePrice(enrichedTier.price) > 0) ||
      (parsePrice(enrichedTier.recurringAmount ?? enrichedTier.recurringPrice) > 0);
    if (!isPaid) {
      router.push("/dashboard/new-project/custom-quote");
      return;
    }
    setSelectedTier(enrichedTier);
    setTimeout(() => {
      const el = document.getElementById("payment-section");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleSaveOrder = async (tier: any) => {
    if (!authService.isAuthenticated()) {
      authService.redirectToLogin();
      return;
    }
    const rawRecPrice = parsePrice(tier.recurringAmount ?? tier.recurringPrice);
    const rawSetupPrice = parsePrice(tier.price);
    if (!(rawSetupPrice > 0 || rawRecPrice > 0)) {
      router.push("/dashboard/new-project/custom-quote");
      return;
    }

    setSelectedTier(tier);
    setProcessing(true);
    try {
      const user = authService.getUser();
      const userCountry = user?.country || "";
      const isEstonia = ["ee", "est", "estonia"].includes(String(userCountry).toLowerCase().trim());
      const vatRate = isEstonia ? 24 : 0;

      const convertedSetupPrice = convertPackageBundleCurrencyAmount(
        rawSetupPrice,
        currency,
        "USD",
        conversionRate
      );

      const convertedRecPrice = rawRecPrice > 0
        ? convertPackageBundleCurrencyAmount(rawRecPrice, currency, "USD", conversionRate)
        : 0;

      const vatAmount = vatRate > 0 ? Math.round(convertedSetupPrice * (vatRate / 100) * 100) / 100 : 0;
      const totalWithVat = Math.round((convertedSetupPrice + vatAmount) * 100) / 100;

      const oneTimeList = getIncludedFeatures("one-time", tier);
      const oneTimeItems = oneTimeList.map((f: any) => f.name).join(", ");

      const recurringList = getIncludedFeatures("monthly", tier);
      const recurringItems = recurringList.map((f: any) => f.name).join(", ");

      const recurringDuration = tier.recurringTimeline
        ? (typeof tier.recurringTimeline === "object" ? `${tier.recurringTimeline.value} ${tier.recurringTimeline.type}` : "Monthly")
        : "Monthly";

      const duration = getDurationLabel(tier);

      const deliverableItems = [
        {
          description: "Initial Project Setup & Implementation",
          details: oneTimeItems || `${pkg.name} (${tier.title} Tier)`,
          amount: convertedSetupPrice,
          duration: duration,
          unit: "",
          isAddOn: false,
        },
      ];

      const res = await packageBundlePaymentService.createOrder({
        amount: totalWithVat,
        currency: currency.toUpperCase(),
        creditsToApply: 0,
        metadata: {
          type: "BUNDLE",
          packageId: bundleId,
          packageName: pkg?.name || "",
          tierId: tier?.id || "",
          tierTitle: tier?.title || "",
          title: pkg?.name ? `${pkg.name} - ${tier?.title || ""}` : (tier?.title || "Bundle"),
          description: pkg?.description || "",
          deliverableItems: deliverableItems,
          lineItems: oneTimeItems,
          recurringLineItems: recurringItems,
          recurringAmount: convertedRecPrice,
          subtotal: convertedSetupPrice,
          vatRate: vatRate,
          vatAmount: vatAmount,
          fullAmount: totalWithVat,
          duration: duration,
          totalDuration: duration,
          recurringDuration: recurringDuration,
          billingType: "mixed",
          exchangeRate: conversionRate,
          conversionRate: conversionRate,
          clientCountry: userCountry,
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
        if (authService.isUnauthorizedError(res)) {
          authService.redirectToLogin();
          return;
        }
        throw new Error(res.message || "Failed to create order.");
      }
    } catch (err: any) {
      console.error("Order Error:", err);
      if (authService.isUnauthorizedError(err)) {
        authService.redirectToLogin();
        return;
      }
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
    if (val === false || val === null || val === undefined || val === "false") {
      return (
        <div className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center mx-auto">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
    }
    if (val === true || val === "true") {
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
    const days = getTimelineDays(t);
    const d = new Date(mountedDate || Date.now());
    d.setDate(d.getDate() + days);
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
  const recurringAmount = parsePrice(selectedTier?.recurringAmount ?? selectedTier?.recurringPrice);

  return (
    <div className="bg-[#f3f4f6] min-h-screen flex flex-col font-sans text-[#404040]">
      <StatusPopup
        isOpen={status.isOpen}
        onClose={() => setStatus({ ...status, isOpen: false })}
        type={status.type}
        title={status.title}
        message={status.message}
      />

      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-8 md:pt-12 pb-8 md:pb-12">
        {/* Hero Section */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8 md:gap-12 mb-8 md:mb-16">
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
            <div
              className="w-full max-w-[620px] aspect-[16/10] bg-[#F0F0F0] overflow-hidden shadow-sm border border-gray-200"
            // style={{ borderRadius: "10px" }}
            >
              <img
                alt={pkg.name}
                className="w-full h-full object-cover"
                // style={{ borderRadius: "10px" }}
                src={
                  pkg.imageUrl ||
                  "http://res.cloudinary.com/dgg6e3flf/image/upload/v1785224007/packages/a_professional_high_fidelity_3d_still_life_scene_for_a_digital_starter_bundle.webp"
                }
              />
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="border border-gray-200 rounded-[10px] overflow-hidden shadow-sm bg-white mb-8 md:mb-16">
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
                  const isCustom = col.id === "col_custom" || col.id === "tier_1787673409959" || idx === columns.length - 1;
                  const isPaid = (col.price && col.price !== "Get A Quote" && parsePrice(col.price) > 0) || (parsePrice(col.recurringAmount ?? col.recurringPrice) > 0);
                  return (
                    <div
                      key={idx}
                      onClick={() => !isPaid && router.push("/dashboard/new-project/custom-quote")}
                      className={`px-2 md:px-6 py-4 md:py-8 text-center flex flex-col justify-center items-center ${!isPaid ? "cursor-pointer group hover:bg-[#D0D0D0] transition-colors" : ""} ${isCustom ? "bg-[#D9D9D9]" : "bg-[#EAEAEA]"
                        }`}
                    >
                      <span className="text-[11px] md:text-[13px] font-bold text-gray-500 uppercase tracking-widest mb-2 text-center">
                        {col.title}
                      </span>
                      <div className="text-gray-700 w-full px-1 overflow-hidden">
                        {isPaid ? (
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-lg xs:text-xl sm:text-2xl lg:text-[28px] font-bold leading-tight tracking-tight text-center whitespace-nowrap max-w-full text-gray-800">
                              {formatPrice(col.price && col.price !== "Get A Quote" ? col.price : (col.recurringAmount ?? col.recurringPrice))}
                            </span>
                            <span className="text-[10px] md:text-[12px] font-medium text-gray-500 uppercase tracking-tighter mt-1 text-center whitespace-nowrap">
                              {parsePrice(col.price) > 0 ? "Setup Cost" : "Price"}
                            </span>
                          </div>
                        ) : (
                          <div className="text-gray-700 group-hover:text-primary-300 font-bold text-[18px] md:text-[22px] leading-tight text-center whitespace-nowrap transition-colors">
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
                        {renderCellValue(getFeatureValue(feature, col, cIdx))}
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
                    (col.price && col.price !== "Get A Quote" && parsePrice(col.price) > 0) ||
                    (parsePrice(col.recurringAmount ?? col.recurringPrice) > 0);
                  const isSelected = selectedTier?.id === col.id || selectedTier?.title?.toLowerCase() === col.title?.toLowerCase();
                  return (
                    <div key={idx} className="p-4 md:p-8 flex items-center justify-center">
                      <button
                        onClick={() =>
                          isPaid ? handleTierSelect(col) : router.push("/dashboard/new-project/custom-quote")
                        }
                        className={`w-full max-w-[150px] py-3.5 px-3 rounded-[10px] font-extrabold text-[12px] md:text-[13px] uppercase tracking-wider transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 ${isSelected
                          ? "bg-[#4343f1] text-white"
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
                      const isCustom = col.id === "col_custom" || col.id === "tier_1787673409959" || idx === columns.length - 1;
                      const hasRec = parsePrice(col.recurringAmount ?? col.recurringPrice) > 0;
                      return (
                        <div
                          key={idx}
                          onClick={() => !hasRec && router.push("/dashboard/new-project/custom-quote")}
                          className={`px-2 md:px-6 py-4 md:py-8 text-center flex flex-col justify-center items-center ${!hasRec ? "cursor-pointer group hover:bg-[#D0D0D0] transition-colors" : ""} ${isCustom ? "bg-[#D9D9D9]" : "bg-[#EAEAEA]"
                            }`}
                        >
                          <span className="text-[11px] md:text-[13px] font-bold text-gray-500 uppercase tracking-widest mb-2 text-center">
                            {col.title}
                          </span>
                          <div className="flex flex-col items-center justify-center w-full px-1 overflow-hidden">
                            {hasRec ? (
                              <>
                                <span className="text-lg xs:text-xl sm:text-2xl lg:text-[28px] font-bold text-gray-800 leading-tight tracking-tight text-center whitespace-nowrap max-w-full">
                                  {formatPrice(parsePrice(col.recurringAmount ?? col.recurringPrice))}
                                </span>
                                <span className="text-[10px] md:text-[12px] font-medium text-gray-500 uppercase tracking-tighter mt-1 text-center whitespace-nowrap">
                                  Recurring Phase Cost
                                </span>
                              </>
                            ) : (
                              <div className="text-gray-700 group-hover:text-primary-300 font-bold text-[18px] md:text-[22px] leading-tight text-center whitespace-nowrap transition-colors">
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
                            {renderCellValue(getFeatureValue(feature, col, cIdx))}
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
          <div className="mt-8 md:mt-16" id="payment-section">
            <div className="text-center mb-5 md:mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-3">Complete Your Purchase Securely</h2>
              <p className="text-gray-500 text-lg">Your information is protected and your project starts immediately.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6">
              <div className="lg:col-span-2 space-y-8 lg:space-y-6">
                {/* Unified Card Container with Project Details & Payment Form */}
                <div className="bg-white border border-gray-300 rounded-[10px] shadow-sm p-6 md:p-8">
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
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                    <div className="flex flex-col gap-4">
                      <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 leading-tight pr-4" style={{ maxWidth: "100%" }}>
                        {pkg.name} - {selectedTier.title}
                      </h3>
                      <div className="mb-6 text-sm text-gray-500 flex items-center gap-3 flex-wrap justify-between">
                        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                          <span>
                            <strong>Project No:</strong> #{projectNo}
                          </span>
                          <span className="hidden sm:inline text-gray-300">|</span>
                          <span>
                            <strong>Timeline:</strong> {getDurationLabel(selectedTier)}
                          </span>
                        </div>
                      </div>

                    </div>
                    <div className="items-center gap-6 block md:flex">
                      <div className="flex flex-col mb-6 md:mb-0">
                        <div className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-800">
                          {formatPrice(parsePrice(selectedTier.price))}
                        </div>
                        <div className="flex flex-col text-left md:text-right mt-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">One-Time Setup Fee</span>
                          {recurringAmount > 0 && (
                            <span className="text-xs font-semibold text-blue-600 mt-0.5">
                              + {formatPrice(recurringAmount)}/mo maintenance later
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


                  {/* Description */}
                  <div className="mb-6 text-sm text-gray-500 leading-relaxed">
                    {pkg.description}
                  </div>

                  <div className="border-t border-gray-300 mb-6"></div>

                  {/* Included Deliverables */}
                  <div>
                    <h4 className="text-base font-bold text-gray-700 mb-4">Included:</h4>
                    <ul className="space-y-3">
                      {getIncludedFeatures("one-time").map((feature: any, idx: number) => (
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
                            {feature.displayLabel ? `: ${feature.displayLabel}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border-t border-gray-300 my-6"></div>

                  {/* Payment form rendered cleanly within card */}
                  <PackageBundlePaymentForm
                    containerClassName=""
                    hideCurrencyToggle={true}
                    type="BUNDLE"
                    entityId={bundleId}
                    entityNumber={projectNo}
                    title={pkg?.name ? `${pkg.name} - ${selectedTier?.title || ""}` : (selectedTier?.title || "Bundle")}
                    description={pkg?.description || ""}
                    date={new Date().toISOString()}
                    totalCost={parsePrice(selectedTier?.price)}
                    depositAmount={parsePrice(selectedTier?.price) > 0 ? parsePrice(selectedTier?.price) / 2 : undefined}
                    deliverableItems={(() => {
                      const oneTimeList = getIncludedFeatures("one-time");
                      const oneTimeDetails = oneTimeList.map((f: any) => f.name).join(", ");

                      return [
                        {
                          description: "Initial Project Setup & Implementation",
                          details: oneTimeDetails || `${pkg?.name || "Bundle"} (${selectedTier?.title || "Plan"} Tier)`,
                          amount: parsePrice(selectedTier?.price),
                          duration: getDurationLabel(selectedTier),
                          unit: "",
                          isAddOn: false,
                        },
                      ];
                    })()}
                    clientEmail={email}
                    successRedirectUrl="/dashboard/my-projects"
                    amountPaid={0}
                    startDate={new Date().toISOString()}
                    deadline={deadlineDate.toISOString()}
                    nativeCurrency="USD"
                    metadata={{
                      packageId: bundleId,
                      packageName: pkg?.name || "",
                      tierId: selectedTier?.id || "",
                      tierTitle: selectedTier?.title || "",
                      lineItems: getIncludedFeatures("one-time")
                        .map((f: any) => f.name)
                        .join(", "),
                      recurringLineItems: getIncludedFeatures("monthly")
                        .map((f: any) => f.name)
                        .join(", "),
                      recurringAmount: recurringAmount,
                      fullAmount: parsePrice(selectedTier.price),
                      duration: getDurationLabel(selectedTier),
                      recurringDuration: selectedTier.recurringTimeline
                        ? `${selectedTier.recurringTimeline.value || selectedTier.recurringTimeline} ${selectedTier.recurringTimeline.type || "Month"}`
                        : "Monthly",
                      billingType: "mixed",
                    }}
                  />
                  <div className="mt-6">
                    <button
                      onClick={() => handleSaveOrder(selectedTier)}
                      disabled={processing}
                      className="w-full px-6 py-3 bg-white border border-gray-300 text-gray-600 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 rounded-[10px] transition-all duration-200 shadow-sm active:scale-95"
                    >
                      {processing ? "Processing..." : "Save Order & Pay Later (Generate Invoice)"}
                    </button>
                  </div>
                </div>

                {/* Save Order & Pay Later Button */}
                {/* <div className="mt-6">
                  <button
                    onClick={() => handleSaveOrder(selectedTier)}
                    disabled={processing}
                    className="w-full px-6 py-3 bg-white border border-gray-300 text-gray-600 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 rounded-[10px] transition-all duration-200 shadow-sm active:scale-95"
                  >
                    {processing ? "Processing..." : "Save Order & Pay Later (Generate Invoice)"}
                  </button>
                </div> */}
              </div>

              {/* Support Card */}
              <div className="lg:col-span-1">
                <div className="bg-white border border-gray-300 rounded-[10px] shadow-sm p-6 sticky top-28">
                  <h3 className="text-xl font-bold text-gray-800 text-center mb-3">Questions Before You Pay?</h3>
                  <p className="text-sm text-gray-500 text-center mb-6">
                    Our support team is here to help with pricing, payments, or package details—no pressure.
                  </p>
                  <button
                    onClick={openChat}
                    className="w-full px-6 py-3 bg-[#3535b8] hover:bg-[#2a2a9a] text-white font-semibold rounded-[10px] transition-colors duration-200"
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