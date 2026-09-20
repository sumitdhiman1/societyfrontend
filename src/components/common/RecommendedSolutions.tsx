"use client";

import React, { useEffect, useState } from "react";
import { getSafeUrl } from "@/lib/utils";
import { packagesService } from "@/lib/packagesService";
import { useCurrency } from "@/context/CurrencyContext";
import { formatPriceWithCurrency, formatPriceStringWithCurrency, roundToNearest5, convertCurrencyAmount } from "@/lib/currencyUtils";

const categoryMap: Record<string, string> = {
  // Short auto-generated codes
  PAM: "PAID ADS MARKETING",
  GDB: "GRAPHIC DESIGN & BRANDING",
  GD: "GRAPHIC DESIGN & BRANDING",
  WD: "WEBSITES DEVELOPMENT",
  WDE: "WEBSITES DEVELOPMENT",
  WM: "WEBSITE MAINTENANCE",
  SMM: "SOCIAL MEDIA MARKETING",
  SEO: "SEO",
  BUN: "BUNDLES",
  // Full codes with underscores & spaces
  PAID_ADS_MARKETING: "PAID ADS MARKETING",
  PAID_ADS: "PAID ADS MARKETING",
  PAIDADS: "PAID ADS MARKETING",
  "PAID ADS MARKETING": "PAID ADS MARKETING",
  "PAID ADS": "PAID ADS MARKETING",
  SEO_MARKETING: "SEO",
  SEARCH_ENGINE_OPTIMIZATION: "SEO",
  "SEARCH ENGINE OPTIMIZATION": "SEO",
  GRAPHIC_DESIGN_AND_BRANDING: "GRAPHIC DESIGN & BRANDING",
  GRAPHIC_DESIGN_BRANDING: "GRAPHIC DESIGN & BRANDING",
  GRAPHIC_DESIGN: "GRAPHIC DESIGN & BRANDING",
  "GRAPHIC DESIGN & BRANDING": "GRAPHIC DESIGN & BRANDING",
  "GRAPHIC DESIGN AND BRANDING": "GRAPHIC DESIGN & BRANDING",
  "GRAPHIC DESIGN": "GRAPHIC DESIGN & BRANDING",
  WEBSITES_DEVELOPMENT: "WEBSITES DEVELOPMENT",
  WEBSITE_DEVELOPMENT: "WEBSITES DEVELOPMENT",
  "WEBSITES DEVELOPMENT": "WEBSITES DEVELOPMENT",
  "WEBSITE MAINTENANCE": "WEBSITE MAINTENANCE",
  WEBSITE_MAINTENANCE: "WEBSITE MAINTENANCE",
  SOCIAL_MEDIA_MARKETING: "SOCIAL MEDIA MARKETING",
  "SOCIAL MEDIA MARKETING": "SOCIAL MEDIA MARKETING",
  BUNDLES: "BUNDLES",
  BUNDLE: "BUNDLES",
  ANALYSIS: "ANALYSIS",
};

export const formatCategoryName = (cat: any, title?: string): string => {
  if (!cat && !title) return "PAID ADS MARKETING";
  let raw = "";
  if (cat && typeof cat === "object") {
    raw = cat.name || cat.title || cat.categorycode || cat.code || "";
  } else if (cat) {
    raw = String(cat).trim();
  }

  // If raw is an ObjectId or empty, fallback to title matching
  if (!raw || raw.match(/^[0-9a-fA-F]{24}$/)) {
    if (title) {
      const norm = title.toLowerCase();
      if (norm.includes("seo") || norm.includes("search engine")) return "SEO";
      if (norm.includes("ads") || norm.includes("shopping") || norm.includes("audit") || norm.includes("youtube") || norm.includes("google")) return "PAID ADS MARKETING";
      if (norm.includes("graphic") || norm.includes("brand") || norm.includes("logo")) return "GRAPHIC DESIGN & BRANDING";
      if (norm.includes("development") || norm.includes("website dev")) return "WEBSITES DEVELOPMENT";
      if (norm.includes("maintenance")) return "WEBSITE MAINTENANCE";
      if (norm.includes("social media") || norm.includes("smm")) return "SOCIAL MEDIA MARKETING";
    }
    return "RECOMMENDED PACKAGE";
  }

  const upper = raw.toUpperCase().trim();
  const stripped = upper.replace(/-\d+$/, "").trim();

  if (categoryMap[upper]) return categoryMap[upper];
  if (categoryMap[stripped]) return categoryMap[stripped];

  if (upper.includes("_")) {
    const spaced = upper.replace(/_/g, " ");
    if (categoryMap[spaced]) return categoryMap[spaced];
    return spaced.toUpperCase();
  }

  return upper;
};

export const getFallbackPackageImage = (title?: string): string => {
  const norm = (title || "").toLowerCase();
  if (norm.includes("seo") || norm.includes("search engine")) {
    return "https://res.cloudinary.com/dzllquuof/image/upload/v1766925617/Website/Services/cfbweuiwymvpzjpcbz6p.png";
  } else if (norm.includes("shopping") || norm.includes("e-commerce") || norm.includes("ecommerce")) {
    return "https://res.cloudinary.com/dgg6e3flf/image/upload/v1785191252/packages/shopping-ecommerce-ads-management-packages.webp";
  } else if (norm.includes("audit") || norm.includes("paid ads") || norm.includes("youtube") || norm.includes("google ads") || norm.includes("ads")) {
    return "https://res.cloudinary.com/dgg6e3flf/image/upload/v1785191377/packages/paid-ads-audit-strategy-setup-packages.webp";
  } else if (norm.includes("graphic") || norm.includes("brand") || norm.includes("logo")) {
    return "https://res.cloudinary.com/dzllquuof/image/upload/v1766925547/Website/Services/q9cdia9ugzrbwqcoshcx.png";
  } else if (norm.includes("development") || norm.includes("website dev")) {
    return "https://res.cloudinary.com/dzllquuof/image/upload/v1766925656/Website/Services/eka2bc78jzyqc29qgtql.png";
  } else if (norm.includes("maintenance")) {
    return "https://res.cloudinary.com/dzllquuof/image/upload/v1766925669/Website/Services/o8hx0iuppsqf1jirki0q.png";
  } else if (norm.includes("social media") || norm.includes("smm")) {
    return "https://res.cloudinary.com/dzllquuof/image/upload/v1766925642/Website/Services/ldi5mje9jw6igxajabmx.png";
  }
  return "https://res.cloudinary.com/dgg6e3flf/image/upload/v1785191377/packages/paid-ads-audit-strategy-setup-packages.webp";
};

// Global in-memory dynamic cache for packages fetched from backend API
let packagesCache: any[] = [];
let fetchPromise: Promise<any[]> | null = null;

export const fetchAllAvailablePackages = async (): Promise<any[]> => {
  if (packagesCache.length > 0) return packagesCache;
  if (fetchPromise) return fetchPromise;
  fetchPromise = (async () => {
    try {
      const [res, bundlesRes] = await Promise.all([
        packagesService.getAllPackages({ page: 1, limit: 100 }),
        packagesService.getAllPackages({ categorycode: "BUNDLES", page: 1, limit: 100 }).catch(() => null),
      ]);
      const pkgs = Array.isArray(res?.data)
        ? res.data
        : (res?.data?.packages || res?.packages || []);
      const bundles = Array.isArray(bundlesRes?.data)
        ? bundlesRes.data
        : (bundlesRes?.data?.packages || bundlesRes?.packages || []);
      packagesCache = [...pkgs, ...bundles];
      return packagesCache;
    } catch (e) {
      console.error("Failed to dynamically fetch packages for RecommendedSolutions:", e);
      return [];
    } finally {
      fetchPromise = null;
    }
  })();
  return fetchPromise;
};

// Find matching package dynamically from available packages list
export const findMatchingPackage = (sol: any, availablePackages: any[] = packagesCache) => {
  if (!sol || !availablePackages || availablePackages.length === 0) return null;
  const solId = String(sol.packageId || sol._id || sol.id || "").trim();
  const solName = (sol.title || sol.name || sol.description || "").trim().toLowerCase();

  return (
    availablePackages.find((p: any) => {
      if (!p) return false;
      const pId = String(p._id || p.id || "").trim();
      if (solId && pId && pId === solId) return true;
      const pName = (p.name || p.title || "").trim().toLowerCase();
      if (solName && pName && (solName === pName || pName.includes(solName) || solName.includes(pName))) return true;
      return false;
    }) || null
  );
};

export const formatPriceDisplay = (
  sol: any,
  availablePackages: any[] = packagesCache,
  targetCurrency: string = "usd",
  conversionRate: number = 1.08
): string => {
  if (!sol) return "";

  const match = findMatchingPackage(sol, availablePackages);

  // Determine monthly recurrence dynamically from package or solution properties
  const isMonthly = (() => {
    if (sol.isMonthly === true || match?.isMonthly === true) return true;
    if (sol.isMonthly === false || match?.isMonthly === false) return false;

    // Check if amount or priceText already explicitly mentions month
    const explicitStr = String(match?.amount || sol.amount || sol.priceText || "");
    if (explicitStr.toLowerCase().includes("/month")) return true;

    // Check active column billingType or period
    const cols =
      (Array.isArray(match?.columns) && match.columns.length > 0 ? match.columns : null) ||
      (Array.isArray(sol.columns) && sol.columns.length > 0 ? sol.columns : null);
    if (cols) {
      const hasMonthlyCol = cols.some(
        (c: any) =>
          c.billingType?.toLowerCase() === "monthly" ||
          c.period?.toLowerCase() === "month" ||
          c.paymentType?.toLowerCase() === "monthly"
      );
      const hasFixedCol = cols.some((c: any) => c.billingType?.toLowerCase() === "fixed");
      if (hasMonthlyCol) return true;
      if (hasFixedCol) return false;
    }

    if (sol.billingType?.toLowerCase() === "monthly" || match?.billingType?.toLowerCase() === "monthly") return true;
    if (sol.billingType?.toLowerCase() === "fixed" || match?.billingType?.toLowerCase() === "fixed") return false;

    if (String(sol.duration || "").toLowerCase().includes("month")) return true;

    return false;
  })();

  const suffix = isMonthly ? "/month" : "";

  // Helper to format a single amount rounded to nearest 5
  const formatVal = (num: number) => {
    const converted = convertCurrencyAmount(num, targetCurrency, "usd", conversionRate);
    const rounded = roundToNearest5(converted);
    const targetCurr = (targetCurrency || "usd").toLowerCase();
    const symbol = targetCurr === "eur" ? "€" : "$";
    return `${symbol}${rounded.toLocaleString("en-US")}`;
  };

  const fmt = (num: number) => {
    return `${formatVal(num)}${suffix}`;
  };

  // 1. Dynamic range check from pre-calculated amount / priceText (rounded to nearest 5)
  const candidateRange =
    (match?.amount && String(match.amount).includes("-") ? String(match.amount) : null) ||
    (sol.amount && String(sol.amount).includes("-") ? String(sol.amount) : null) ||
    (sol.priceText && String(sol.priceText).includes("-") ? String(sol.priceText) : null);

  if (candidateRange) {
    let clean = candidateRange.replace(/(?:[\$€£])?\s*(\d+(?:,\d{3})*(?:\.\d+)?)/g, (matchStr, numStr) => {
      const cleanNum = parseFloat(numStr.replace(/,/g, ""));
      if (isNaN(cleanNum)) return matchStr;
      const converted = convertCurrencyAmount(cleanNum, targetCurrency, "usd", conversionRate);
      const rounded = roundToNearest5(converted);
      const targetCurr = (targetCurrency || "usd").toLowerCase();
      const symbol = targetCurr === "eur" ? "€" : "$";
      return `${symbol}${rounded.toLocaleString("en-US")}`;
    }).replace(/\s*-\s*/, " - ").trim();
    if (isMonthly && !clean.toLowerCase().includes("month")) {
      clean = `${clean}/month`;
    }
    return clean;
  }

  // 2. Dynamic minPrice & maxPrice check (rounded to nearest 5)
  const min = match?.minPrice ?? sol.minPrice;
  const max = match?.maxPrice ?? sol.maxPrice;
  if (min !== undefined && max !== undefined && (Number(min) > 0 || Number(max) > 0)) {
    const minNum = Number(min);
    const maxNum = Number(max);
    if (minNum === maxNum) {
      return fmt(minNum);
    }
    const minFmt = formatVal(minNum);
    const maxFmt = formatVal(maxNum);
    return `${minFmt} - ${maxFmt}${suffix}`;
  }

  // 3. Dynamic columns check (calculate min/max across columns rounded to nearest 5)
  const cols =
    (Array.isArray(match?.columns) && match.columns.length > 0 ? match.columns : null) ||
    (Array.isArray(sol.columns) && sol.columns.length > 0 ? sol.columns : null);

  if (cols && cols.length > 0) {
    const numericPrices = cols
      .map((c: any) => {
        const p = Number(c.price ?? c.recurringPrice ?? c.amount);
        return !isNaN(p) && p > 0 ? p : null;
      })
      .filter((p: any): p is number => p !== null);

    if (numericPrices.length > 0) {
      const colMin = Math.min(...numericPrices);
      const colMax = Math.max(...numericPrices);
      if (colMin === colMax) {
        return fmt(colMin);
      }
      const minFmt = formatVal(colMin);
      const maxFmt = formatVal(colMax);
      return `${minFmt} - ${maxFmt}${suffix}`;
    }
  }

  // 4. Single value fallback (derived dynamically from match or sol rounded to nearest 5)
  const singleVal = match?.amount ?? sol.priceText ?? sol.amount ?? sol.price ?? sol.cost;
  if (singleVal !== undefined && singleVal !== null && singleVal !== "") {
    if (typeof singleVal === "number") {
      return fmt(singleVal);
    }
    const str = String(singleVal).trim();
    if (str.toUpperCase() === "FREE") return "FREE";
    if (str.startsWith("$") || str.startsWith("€") || str.startsWith("£") || /\d/.test(str)) {
      let convertedStr = str.replace(/(?:[\$€£])?\s*(\d+(?:,\d{3})*(?:\.\d+)?)/g, (matchStr, numStr) => {
        const cleanNum = parseFloat(numStr.replace(/,/g, ""));
        if (isNaN(cleanNum)) return matchStr;
        const converted = convertCurrencyAmount(cleanNum, targetCurrency, "usd", conversionRate);
        const rounded = roundToNearest5(converted);
        const targetCurr = (targetCurrency || "usd").toLowerCase();
        const symbol = targetCurr === "eur" ? "€" : "$";
        return `${symbol}${rounded.toLocaleString("en-US")}`;
      });
      return isMonthly && !convertedStr.toLowerCase().includes("month") ? `${convertedStr}/month` : convertedStr;
    }
    const num = Number(str);
    if (!isNaN(num) && num > 0) {
      return fmt(num);
    }
    return isMonthly && !str.toLowerCase().includes("month") ? `${str}/month` : str;
  }

  return "";
};

export const PackageCard = ({
  packageId,
  title,
  price,
  imageUrl,
  category,
  description,
  link,
  rawSol,
  availablePackages,
}: any) => {
  const { currency, conversionRate } = useCurrency();
  const match = findMatchingPackage(rawSol || { packageId, title, price }, availablePackages);

  const itemTitle = title || rawSol?.title || rawSol?.name || match?.name || match?.title || rawSol?.description || "Package Solution";
  const itemDescription = description || rawSol?.description || rawSol?.details || match?.description || "";
  const rawImage = imageUrl || rawSol?.imageUrl || rawSol?.mediumUrl || rawSol?.thumbnailUrl || rawSol?.coverImage || rawSol?.image || match?.imageUrl || match?.mediumUrl;
  const safeImg = rawImage ? getSafeUrl(rawImage) : getFallbackPackageImage(itemTitle);
  const isSvg = safeImg ? safeImg.toLowerCase().includes(".svg") : false;

  const displayPrice = formatPriceDisplay(rawSol || { price, title: itemTitle, packageId }, availablePackages, currency, conversionRate);
  const resolvedCat = formatCategoryName(category || rawSol?.category || rawSol?.categorycode || match?.categorycode || match?.category, itemTitle);
  const targetId = packageId || rawSol?._id || rawSol?.id || match?._id;
  const targetLink = link || (targetId ? `/dashboard/new-project/packages/${targetId}` : "#");

  return (
    <a
      href={targetLink}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all group w-[230px] sm:w-[240px] md:w-[245px] shrink-0 no-underline text-left"
    >
      <div className="h-32 bg-gray-50 relative overflow-hidden flex items-center justify-center">
        {safeImg ? (
          <img
            src={safeImg}
            alt={itemTitle}
            className={`w-full h-full transition-transform duration-300 group-hover:scale-105 ${isSvg ? "object-contain p-2.5" : "object-cover"
              }`}
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src.startsWith("http:") && !target.src.includes("localhost") && !target.src.includes("127.0.0.1")) {
                target.src = target.src.replace("http:", "https:");
              } else {
                target.src = getFallbackPackageImage(itemTitle);
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
      </div>

      <div className="p-3.5 sm:p-4 flex flex-col flex-1 bg-white">
        {resolvedCat && (
          <span className="text-[9px] sm:text-[9.5px] font-bold text-gray-500 bg-[#EBEBEB] px-2.5 py-0.5 rounded-full uppercase tracking-wider w-fit mb-2">
            {resolvedCat}
          </span>
        )}
        <h4 className="font-bold text-[#0D1939] text-xs sm:text-sm leading-snug mb-1 group-hover:text-blue-600 transition-colors line-clamp-2">
          {itemTitle}
        </h4>
        {itemDescription && (
          <p className="text-[11px] text-gray-500 leading-relaxed mb-3 line-clamp-2">
            {itemDescription}
          </p>
        )}
        <div className="mt-auto pt-2 flex items-center justify-between border-t border-gray-100">
          <span className="font-bold text-gray-800 text-xs sm:text-sm">
            {displayPrice}
          </span>
        </div>
      </div>
    </a>
  );
};

interface RecommendedSolutionsProps {
  solutions: any[];
  className?: string;
  availablePackages?: any[];
}

export default function RecommendedSolutions({ solutions, className = "", availablePackages }: RecommendedSolutionsProps) {
  const [dynamicPkgs, setDynamicPkgs] = useState<any[]>(availablePackages || packagesCache);

  useEffect(() => {
    if (availablePackages && availablePackages.length > 0) {
      setDynamicPkgs(availablePackages);
      return;
    }
    if (packagesCache.length > 0) {
      setDynamicPkgs(packagesCache);
      return;
    }
    fetchAllAvailablePackages().then((pkgs) => {
      if (pkgs && pkgs.length > 0) {
        setDynamicPkgs(pkgs);
      }
    });
  }, [availablePackages]);

  if (!solutions || solutions.length === 0) return null;

  return (
    <div className={`w-full ${className}`}>
      <h5 className="text-sm font-bold text-gray-700 mb-3">
        Recommended Solutions
      </h5>
      <div className="border-t border-gray-200 mb-4" />
      <div className="flex flex-wrap sm:flex-nowrap sm:overflow-x-auto pb-2 gap-4 scrollbar-hide">
        {solutions.map((sol: any, j: number) => {
          const packageId = sol.packageId || sol._id || sol.id;
          return (
            <PackageCard
              key={(packageId || j) + "-" + j}
              packageId={packageId}
              title={sol.title || sol.name}
              price={sol.price || sol.cost || sol.amount}
              imageUrl={sol.imageUrl || sol.mediumUrl || sol.thumbnailUrl || sol.coverImage}
              category={sol.category || sol.categorycode}
              description={sol.description || sol.details}
              link={sol.link || (packageId ? `/dashboard/new-project/packages/${packageId}` : undefined)}
              rawSol={sol}
              availablePackages={dynamicPkgs}
            />
          );
        })}
      </div>
    </div>
  );
}
