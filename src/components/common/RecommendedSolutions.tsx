"use client";

import React from "react";
import { getSafeUrl } from "@/lib/utils";

const categoryMap: Record<string, string> = {
  PAID_ADS_MARKETING: "PAID ADS MARKETING",
  PAID_ADS: "PAID ADS MARKETING",
  "PAID ADS MARKETING": "PAID ADS MARKETING",
  "PAID ADS": "PAID ADS MARKETING",
  SEO: "SEO",
  SEARCH_ENGINE_OPTIMIZATION: "SEO",
  "SEARCH ENGINE OPTIMIZATION": "SEO",
  GRAPHIC_DESIGN_AND_BRANDING: "GRAPHIC DESIGN & BRANDING",
  "GRAPHIC DESIGN & BRANDING": "GRAPHIC DESIGN & BRANDING",
  "GRAPHIC DESIGN AND BRANDING": "GRAPHIC DESIGN & BRANDING",
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

export const formatPriceDisplay = (sol: any): string => {
  const normName = (sol.title || sol.name || sol.description || "").toLowerCase();
  const isMonthly = Boolean(
    sol.isMonthly === true ||
    sol.paymentType?.toLowerCase() === "monthly" ||
    sol.billingType?.toLowerCase() === "monthly" ||
    String(sol.duration || "").toLowerCase().includes("month") ||
    String(sol.priceText || "").toLowerCase().includes("month") ||
    String(sol.price || "").toLowerCase().includes("month") ||
    (normName.includes("management") && !normName.includes("audit")) ||
    normName.includes("maintenance") ||
    normName.includes("monthly") ||
    normName.includes("retainer") ||
    normName.includes("seo") ||
    normName.includes("optimization")
  );
  const suffix = isMonthly ? "/month" : "";

  if (sol.minPrice !== undefined && sol.maxPrice !== undefined && (sol.minPrice > 0 || sol.maxPrice > 0)) {
    if (sol.minPrice === sol.maxPrice) {
      return `$${sol.minPrice.toLocaleString("en-US")}${suffix}`;
    }
    return `$${sol.minPrice.toLocaleString("en-US")} - $${sol.maxPrice.toLocaleString("en-US")}${suffix}`;
  }

  if (sol.priceText) {
    let clean = String(sol.priceText).trim();
    if (isMonthly && !clean.toLowerCase().includes("month")) {
      clean = `${clean}/month`;
    }
    return clean;
  }

  const priceVal = sol.price ?? sol.cost ?? sol.amount;
  if (priceVal !== undefined && priceVal !== null && priceVal !== "" && Number(priceVal) > 0) {
    if (typeof priceVal === "number") {
      return `$${priceVal.toLocaleString("en-US")}${suffix}`;
    }
    const str = String(priceVal).trim();
    if (str.startsWith("$") || str.startsWith("€")) {
      return isMonthly && !str.toLowerCase().includes("month") ? `${str}/month` : str;
    }
    return `$${str}${suffix}`;
  }

  // Fallbacks for known package names
  if (normName.includes("google ads") || normName.includes("paid ads management")) {
    return `$750 - $3,000${suffix}`;
  }
  if (normName.includes("youtube")) {
    return `$750 - $975${suffix}`;
  }
  if (normName.includes("seo") || normName.includes("search engine optimization") || normName.includes("search engine")) {
    return `$100 - $150${suffix}`;
  }
  if (normName.includes("shopping") || normName.includes("ecommerce")) {
    return `$499 - $1,499${suffix}`;
  }
  if (normName.includes("audit") || normName.includes("strategy")) {
    return `$1,500 - $6,000${suffix}`;
  }
  if (normName.includes("graphic") || normName.includes("brand")) {
    return `$499 - $1,499${suffix}`;
  }
  if (normName.includes("development") || normName.includes("website dev")) {
    return `$1,499 - $4,999${suffix}`;
  }
  if (normName.includes("maintenance")) {
    return `$199 - $499${suffix}`;
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
}: any) => {
  const itemTitle = title || rawSol?.title || rawSol?.name || rawSol?.description || "Package Solution";
  const itemDescription = description || rawSol?.description || rawSol?.details || "";
  const rawImage = imageUrl || rawSol?.imageUrl || rawSol?.mediumUrl || rawSol?.thumbnailUrl || rawSol?.coverImage || rawSol?.image;
  const safeImg = rawImage ? getSafeUrl(rawImage) : getFallbackPackageImage(itemTitle);
  const isSvg = safeImg ? safeImg.toLowerCase().includes(".svg") : false;

  const displayPrice = rawSol ? formatPriceDisplay(rawSol) : formatPriceDisplay({ price, title: itemTitle });
  const resolvedCat = formatCategoryName(category || rawSol?.category || rawSol?.categorycode, itemTitle);
  const targetLink = link || (packageId ? `/dashboard/new-project/packages/${packageId}` : "#");

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
            className={`w-full h-full transition-transform duration-300 group-hover:scale-105 ${
              isSvg ? "object-contain p-2.5" : "object-cover"
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
}

export default function RecommendedSolutions({ solutions, className = "" }: RecommendedSolutionsProps) {
  if (!solutions || solutions.length === 0) return null;

  return (
    <div className={`w-full ${className}`}>
      <h5 className="text-xs sm:text-sm font-bold text-[#0D1939] mb-3">
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
            />
          );
        })}
      </div>
    </div>
  );
}
