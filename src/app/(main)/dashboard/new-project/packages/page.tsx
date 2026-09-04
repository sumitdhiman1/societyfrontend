"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { packagesService } from "@/lib/packagesService";
import { requestAnalysisService } from "@/lib/requestAnalysisService";
import { useCurrency } from "@/context/CurrencyContext";

const ORDER_ASC = "order_asc";
const NAME_ASC = "name_asc";
const NAME_DESC = "name_desc";
const PRICE_ASC = "price_asc";
const PRICE_DESC = "price_desc";
const NEWEST = "newest";

function PackagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currency } = useCurrency();
  const currencySymbol = currency === "eur" ? "€" : "$";

  const [packages, setPackages] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Accordion sections
  const [showCategories, setShowCategories] = useState(true);
  const [showPriceFilter, setShowPriceFilter] = useState(true);
  const [showTimelineFilter, setShowTimelineFilter] = useState(true);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Derive active category directly from searchParams (Single Source of Truth)
  const categoryCodeParam = (searchParams.get("categorycode") || "ALL").toUpperCase();
  const sortParam = searchParams.get("sortBy") || ORDER_ASC;

  // Filter input states (empty string means not user-filtered)
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minTimeline, setMinTimeline] = useState("");
  const [maxTimeline, setMaxTimeline] = useState("");

  // Slider bounds
  const [priceRangeMin, setPriceRangeMin] = useState(0);
  const [priceRangeMax, setPriceRangeMax] = useState(430);
  const [timelineRangeMin, setTimelineRangeMin] = useState(1);
  const [timelineRangeMax, setTimelineRangeMax] = useState(52);

  const sidebarCategories = useMemo(() => [
    { _id: "all", name: "All Packages", slug: "all", categorycode: "ALL" },
    { _id: "analysis", name: "Analysis", slug: "analysis", categorycode: "ANALYSIS" },
    { _id: "bundles", name: "Bundles", slug: "bundles", categorycode: "BUNDLES" },
    ...categories.filter(c => {
      const code = (c.categorycode || c.slug || "").toUpperCase();
      return code !== "ALL" && code !== "BUNDLES" && code !== "ANALYSIS";
    })
  ], [categories]);

  // Initial categories fetch for sidebar
  useEffect(() => {
    const fetchCategories = async () => {
      setCategoriesLoading(true);
      try {
        const res = await packagesService.listCategories({ page: 1, limit: 100 });
        const cats = res?.data ? (Array.isArray(res.data) ? res.data : res.data.categories || res.data.data || []) : [];
        setCategories(cats);

        const minP = searchParams.get("minPrice");
        const maxP = searchParams.get("maxPrice");
        if (minP) setMinPrice(minP);
        if (maxP) setMaxPrice(maxP);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      } finally {
        setCategoriesLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // Reset filters on category change
  useEffect(() => {
    setMinPrice("");
    setMaxPrice("");
    setMinTimeline("");
    setMaxTimeline("");
  }, [categoryCodeParam]);

  const fetchPackages = useCallback(async (catCode: string, currentSort: string) => {
    setLoading(true);
    try {
      const isAnalysis = catCode === "ANALYSIS";
      const isBundles = catCode === "BUNDLES";
      const isAll = catCode === "ALL";

      const queryOptions: any = { page: 1, limit: 100, sortBy: currentSort };
      let fetchedPkgs: any[] = [];

      const extractPackages = (res: any) => {
        if (!res?.data) return [];
        const data = res.data;
        return Array.isArray(data) ? data : data.packages || data.data || [];
      };

      // Default analysis products with high-resolution images matching screenshots
      let analysisProducts: any[] = [
        {
          _id: "free-website-analysis",
          name: "Free Website Analysis",
          categorycode: "ANALYSIS",
          isAnalysis: true,
          isFree: true,
          amount: "FREE",
          minPrice: 0,
          description: "Our standard free analysis offer covering brand, UI/UX, functionalities, AI potentiality, tech stack.",
          imageUrl: "/images/free_website_analysis.jpg",
          minTimeline: 5,
          columns: [{ timeline: 5 }],
          visibleFormFields: {
            urlToCheck: true,
            whoCompletedWork: false,
            agreementDetails: false,
            whatToLookAt: false,
            shareAccess: false,
            additionalInfo: true,
          },
          order: 1,
        },
        {
          _id: "free-checking-of-work",
          name: "Free Checking of Work",
          categorycode: "ANALYSIS",
          isAnalysis: true,
          isFree: true,
          amount: "FREE",
          minPrice: 0,
          description: "An offer to check the completed work of any other web professionals, including your own in-house team.",
          imageUrl: "/images/free_checking_of_work.jpg",
          minTimeline: 14,
          columns: [{ timeline: 14 }],
          visibleFormFields: {
            urlToCheck: true,
            whoCompletedWork: true,
            agreementDetails: true,
            whatToLookAt: false,
            shareAccess: true,
            additionalInfo: true,
          },
          order: 2,
        },
      ];

      if (isAnalysis || isAll) {
        try {
          const aRes = await requestAnalysisService.getProducts(true);
          const aData = aRes?.data ? (Array.isArray(aRes.data) ? aRes.data : aRes.data.data || []) : (Array.isArray(aRes) ? aRes : []);
          if (aData.length > 0) {
            analysisProducts = aData.map((prod: any, idx: number) => {
              const isCheck = prod.title?.toLowerCase().includes("check");
              return {
                _id: prod._id,
                name: prod.title,
                categorycode: "ANALYSIS",
                isAnalysis: true,
                isFree: prod.isFree !== false || prod.amount === 0,
                amount: (prod.isFree !== false || prod.amount === 0) ? "FREE" : `$${prod.amount}`,
                minPrice: prod.amount || 0,
                description: prod.shortDescription || prod.description || (isCheck 
                  ? "An offer to check the completed work of any other web professionals, including your own in-house team."
                  : "Our standard free analysis offer covering brand, UI/UX, functionalities, AI potentiality, tech stack."),
                imageUrl: prod.coverImage || prod.imageUrl || prod.detailImage || prod.detailImageUrl || (isCheck ? "/images/free_checking_of_work.jpg" : "/images/free_website_analysis.jpg"),
                minTimeline: prod.timelineInDays || (isCheck ? 14 : 5),
                columns: [{ timeline: prod.timelineInDays || (isCheck ? 14 : 5) }],
                visibleFormFields: prod.visibleFormFields || {
                  urlToCheck: true,
                  whoCompletedWork: isCheck,
                  agreementDetails: isCheck,
                  whatToLookAt: false,
                  shareAccess: isCheck,
                  additionalInfo: true,
                },
                order: prod.order !== undefined ? prod.order : idx + 1,
              };
            });
          }
        } catch (err) {
          console.error("Failed to load analysis products:", err);
        }
      }

      if (isAnalysis) {
        fetchedPkgs = analysisProducts;
      } else if (isBundles) {
        const bundlesRes = await packagesService.getAllPackages({ ...queryOptions, categorycode: "BUNDLES" });
        fetchedPkgs = extractPackages(bundlesRes);
      } else if (isAll) {
        const [allRes, bundlesRes] = await Promise.all([
          packagesService.getAllPackages({ ...queryOptions, categorycode: "ALL" }),
          packagesService.getAllPackages({ ...queryOptions, categorycode: "BUNDLES" })
        ]);
        fetchedPkgs = [...analysisProducts, ...extractPackages(allRes), ...extractPackages(bundlesRes)];
      } else {
        queryOptions.categorycode = catCode;
        const res = await packagesService.getAllPackages(queryOptions);
        fetchedPkgs = extractPackages(res);
      }

      // Default sorting if not handled by API
      if (!currentSort || currentSort === ORDER_ASC) {
        fetchedPkgs.sort((a, b) => (a.order || 0) - (b.order || 0));
      }

      setPackages(fetchedPkgs);

      // Derive min and max bounds for sliders
      if (fetchedPkgs.length > 0) {
        const prices = fetchedPkgs.map(p => {
          if (p.isFree || p.amount === "FREE") return 0;
          if (p.minPrice != null && !isNaN(p.minPrice)) return p.minPrice;
          const match = /\$\s*([\d,]+)/.exec(p.amount || "");
          return match ? parseInt(match[1].replace(/,/g, ""), 10) : 0;
        }).filter(p => !isNaN(p));

        const maxFromPrices = prices.length > 0 ? Math.max(...prices) : 0;
        const minFromPrices = prices.length > 0 ? Math.min(...prices) : 0;

        setPriceRangeMin(Math.min(minFromPrices, 0));
        setPriceRangeMax(Math.max(maxFromPrices, 430));

        setTimelineRangeMin(1);
        setTimelineRangeMax(52);
      }
    } catch (error) {
      console.error("Failed to fetch packages:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages(categoryCodeParam, sortParam);
  }, [categoryCodeParam, sortParam, fetchPackages]);

  // Filtered packages
  const filteredPackages = useMemo(() => {
    const minP = minPrice === "" ? NaN : parseInt(minPrice, 10);
    const maxP = maxPrice === "" ? NaN : parseInt(maxPrice, 10);
    const minT = minTimeline === "" ? NaN : parseInt(minTimeline, 10);
    const maxT = maxTimeline === "" ? NaN : parseInt(maxTimeline, 10);

    let result = packages.filter((pkg) => {
      // Price Filter
      if (!isNaN(minP) || !isNaN(maxP)) {
        let pkgPrice = 0;
        if (pkg.isFree || pkg.amount === "FREE") {
          pkgPrice = 0;
        } else if (pkg.minPrice != null && !isNaN(pkg.minPrice)) {
          pkgPrice = pkg.minPrice;
        } else {
          const match = /\$\s*([\d,]+)/.exec(pkg.amount || "");
          if (match) {
            pkgPrice = parseInt(match[1].replace(/,/g, ""), 10) || 0;
          }
        }

        if (!isNaN(minP) && pkgPrice < minP) return false;
        if (!isNaN(maxP) && pkgPrice > maxP) return false;
      }

      // Timeline Filter
      if (!isNaN(minT) || !isNaN(maxT)) {
        let pkgWeeks = 1;
        if (pkg.minTimeline != null && pkg.minTimeline > 0) {
          pkgWeeks = Math.max(1, Math.round(pkg.minTimeline / 7));
        } else if (pkg.columns && pkg.columns.length > 0) {
          const minDays = pkg.columns.reduce((acc: any, col: any) =>
            col.timeline && (acc === null || col.timeline < acc) ? col.timeline : acc, null);
          if (minDays) pkgWeeks = Math.max(1, Math.round(minDays / 7));
        }

        if (!isNaN(minT) && pkgWeeks < minT) return false;
        if (!isNaN(maxT) && pkgWeeks > maxT) return false;
      }

      return true;
    });

    // Sorting
    switch (sortParam) {
      case NAME_ASC:
        result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case NAME_DESC:
        result.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
        break;
      case PRICE_ASC:
        result.sort((a, b) => (a.minPrice || 0) - (b.minPrice || 0));
        break;
      case PRICE_DESC:
        result.sort((a, b) => (b.minPrice || 0) - (a.minPrice || 0));
        break;
      case NEWEST:
        result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        break;
      case ORDER_ASC:
      default:
        result.sort((a, b) => (a.order || 0) - (b.order || 0));
        break;
    }

    return result;
  }, [packages, minPrice, maxPrice, minTimeline, maxTimeline, sortParam]);

  const handleCardClick = (pkg: any) => {
    if (pkg.isAnalysis) {
      router.push(`/dashboard/new-project/analysis/${pkg._id}`);
    } else if (pkg.isBundle || (pkg.categorycode || "").toUpperCase() === "BUNDLES") {
      router.push(`/dashboard/new-project/bundles/${pkg._id}`);
    } else {
      router.push(`/dashboard/new-project/packages/${pkg._id}`);
    }
  };



  // Slider visual positions
  const currentMinPriceVal = minPrice !== "" ? Math.max(priceRangeMin, Math.min(Number(minPrice), priceRangeMax)) : priceRangeMin;
  const currentMaxPriceVal = maxPrice !== "" ? Math.min(priceRangeMax, Math.max(Number(maxPrice), priceRangeMin)) : priceRangeMax;
  const priceMinPercent = Math.max(0, Math.min(100, ((currentMinPriceVal - priceRangeMin) / (priceRangeMax - priceRangeMin || 1)) * 100));
  const priceMaxPercent = Math.max(0, Math.min(100, ((currentMaxPriceVal - priceRangeMin) / (priceRangeMax - priceRangeMin || 1)) * 100));

  const currentMinTimelineVal = minTimeline !== "" ? Math.max(timelineRangeMin, Math.min(Number(minTimeline), timelineRangeMax)) : timelineRangeMin;
  const currentMaxTimelineVal = maxTimeline !== "" ? Math.min(timelineRangeMax, Math.max(Number(maxTimeline), timelineRangeMin)) : timelineRangeMax;
  const timelineMinPercent = Math.max(0, Math.min(100, ((currentMinTimelineVal - timelineRangeMin) / (timelineRangeMax - timelineRangeMin || 1)) * 100));
  const timelineMaxPercent = Math.max(0, Math.min(100, ((currentMaxTimelineVal - timelineRangeMin) / (timelineRangeMax - timelineRangeMin || 1)) * 100));

  return (
    <div className="bg-[#F8FAFC] min-h-screen flex flex-col font-sans">
      <style dangerouslySetInnerHTML={{ __html: `
        input[type=range].slider-thumb::-webkit-slider-thumb {
          pointer-events: auto;
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          background: #4343F0;
          cursor: pointer;
          border: 2.5px solid #ffffff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          transition: transform 0.1s ease;
        }
        input[type=range].slider-thumb::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        input[type=range].slider-thumb::-moz-range-thumb {
          pointer-events: auto;
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          background: #4343F0;
          cursor: pointer;
          border: 2.5px solid #ffffff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }
      `}} />



      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-4 md:pt-12 pb-8 md:pb-12">
        
        {/* Top Header */}
        <div className="flex items-center justify-between gap-3 mb-6 md:mb-10">
          <h1 className="text-lg sm:text-2xl md:text-[32px] font-medium text-primary-100 whitespace-nowrap shrink min-w-0 truncate">
            Browse Packages &amp; Plans
          </h1>

          {/* Sort by Dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="bg-[#4343F0] hover:bg-[#3232b7] text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm whitespace-nowrap cursor-pointer"
            >
              <span>Sort by</span>
              <svg className={`w-3.5 h-3.5 transition-transform ${showSortDropdown ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showSortDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-30">
                {[
                  { id: ORDER_ASC, label: "Default Order" },
                  { id: NEWEST, label: "Newest" },
                  { id: NAME_ASC, label: "Name: A to Z" },
                  { id: NAME_DESC, label: "Name: Z to A" },
                  { id: PRICE_ASC, label: "Price: Low to High" },
                  { id: PRICE_DESC, label: "Price: High to Low" }
                ].map(option => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setShowSortDropdown(false);
                      const params = new URLSearchParams();
                      params.set("categorycode", categoryCodeParam);
                      params.set("sortBy", option.id);
                      router.push(`/dashboard/new-project/packages?${params.toString()}`, { scroll: false });
                    }}
                    className={`w-full text-left px-4 py-2 text-xs sm:text-sm hover:bg-gray-50 transition-colors cursor-pointer ${sortParam === option.id ? "bg-blue-50 font-bold text-[#4343F0]" : "text-gray-700"}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content Layout */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* Sidebar */}
          <aside className="w-full lg:w-60 flex-shrink-0 flex flex-col gap-0">
            <div className="w-full h-px bg-gray-200" />
            
            {/* Categories Section */}
            <div className="bg-transparent">
              <button
                onClick={() => setShowCategories(!showCategories)}
                className="flex items-center justify-between w-full group py-3.5 cursor-pointer"
              >
                <div className="flex items-center gap-2.5 font-bold text-[#404040] text-sm sm:text-[15px]">
                  <img alt="Categories" className="w-5 h-5 shrink-0" src="/assets/Categorysvg.svg" />
                  <span>Categories</span>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showCategories ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showCategories && (
                <div className="flex flex-col gap-1 pl-1 pb-3">
                  {categoriesLoading ? (
                    <div className="space-y-2 animate-pulse">
                      {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-7 bg-gray-200/60 rounded-md" />)}
                    </div>
                  ) : (
                    sidebarCategories.map((cat) => {
                      const catCode = (cat.categorycode || cat.slug || "").toUpperCase();
                      const isActive = categoryCodeParam === "ALL"
                        ? (cat._id === "all" || catCode === "ALL")
                        : catCode === categoryCodeParam;

                      return (
                        <button
                          key={cat._id}
                          onClick={() => {
                            const targetCode = (cat && cat._id !== "all" ? cat.categorycode || cat.slug : "ALL").toUpperCase();
                            const params = new URLSearchParams();
                            params.set("categorycode", targetCode);
                            if (sortParam) params.set("sortBy", sortParam);
                            router.push(`/dashboard/new-project/packages?${params.toString()}`, { scroll: false });
                          }}
                          className={`text-left py-1.5 px-3 rounded-md text-[13px] transition-colors cursor-pointer ${
                            isActive
                              ? "bg-white text-[#404040] shadow-sm border border-gray-100 font-semibold"
                              : "text-gray-400 hover:text-gray-600 hover:bg-gray-100/50 font-medium"
                          }`}
                        >
                          {cat.name}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <div className="w-full h-px bg-gray-200" />

            {/* Price Range Section */}
            <div className="bg-transparent">
              <button
                onClick={() => setShowPriceFilter(!showPriceFilter)}
                className="flex items-center justify-between w-full group py-3.5 cursor-pointer"
              >
                <div className="flex items-center gap-2.5 font-bold text-[#404040] text-sm sm:text-[15px]">
                  <svg className="w-5 h-5 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Price Range</span>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showPriceFilter ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showPriceFilter && (
                <div className="px-1 pb-3">
                  {/* Slider Bar */}
                  <div className="relative w-full mb-6">
                    <div className="relative h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="absolute h-full bg-[#4343F0] rounded-full"
                        style={{
                          left: `${priceMinPercent}%`,
                          right: `${Math.max(0, 100 - priceMaxPercent)}%`,
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min={priceRangeMin}
                      max={priceRangeMax}
                      value={currentMinPriceVal}
                      onChange={(e) => {
                        const val = Math.min(Number(e.target.value), currentMaxPriceVal);
                        setMinPrice(val.toString());
                      }}
                      className="absolute w-full h-1 top-0 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#4343F0] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#4343F0] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:hover:scale-110 [&::-moz-range-thumb]:transition-transform"
                    />
                    <input
                      type="range"
                      min={priceRangeMin}
                      max={priceRangeMax}
                      value={currentMaxPriceVal}
                      onChange={(e) => {
                        const val = Math.max(Number(e.target.value), currentMinPriceVal);
                        setMaxPrice(val.toString());
                      }}
                      className="absolute w-full h-1 top-0 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#4343F0] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#4343F0] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:hover:scale-110 [&::-moz-range-thumb]:transition-transform"
                    />
                  </div>

                  {/* Range labels below slider */}
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                    <span>{currencySymbol}{priceRangeMin.toLocaleString()}</span>
                    <span>{currencySymbol}{priceRangeMax.toLocaleString()}</span>
                  </div>

                  {/* Min / Max Inputs */}
                  <div className="flex gap-2">
                    <div className="border border-gray-300 rounded px-3 py-2 bg-white flex-1">
                      <span className="text-gray-400 text-xs block mb-0.5">Min</span>
                      <input
                        type="number"
                        className="w-full text-sm outline-none text-gray-600 font-medium"
                        placeholder={String(priceRangeMin)}
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                      />
                    </div>
                    <div className="self-center text-gray-400">-</div>
                    <div className="border border-gray-300 rounded px-3 py-2 bg-white flex-1">
                      <span className="text-gray-400 text-xs block mb-0.5">Max</span>
                      <input
                        type="number"
                        className="w-full text-sm outline-none text-gray-600 font-medium"
                        placeholder={String(priceRangeMax)}
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="w-full h-px bg-gray-200" />

            {/* Timeline Range Section */}
            <div className="bg-transparent">
              <button
                onClick={() => setShowTimelineFilter(!showTimelineFilter)}
                className="flex items-center justify-between w-full group py-3.5 cursor-pointer"
              >
                <div className="flex items-center gap-2.5 font-bold text-[#404040] text-sm sm:text-[15px]">
                  <svg className="w-5 h-5 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Timeline Range</span>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showTimelineFilter ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showTimelineFilter && (
                <div className="px-1 pb-3">
                  {/* Slider Bar */}
                  <div className="relative w-full mb-6">
                    <div className="relative h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="absolute h-full bg-[#4343F0] rounded-full"
                        style={{
                          left: `${timelineMinPercent}%`,
                          right: `${Math.max(0, 100 - timelineMaxPercent)}%`,
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min={timelineRangeMin}
                      max={timelineRangeMax}
                      value={currentMinTimelineVal}
                      onChange={(e) => {
                        const val = Math.min(Number(e.target.value), currentMaxTimelineVal);
                        setMinTimeline(val.toString());
                      }}
                      className="absolute w-full h-1 top-0 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#4343F0] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#4343F0] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:hover:scale-110 [&::-moz-range-thumb]:transition-transform"
                    />
                    <input
                      type="range"
                      min={timelineRangeMin}
                      max={timelineRangeMax}
                      value={currentMaxTimelineVal}
                      onChange={(e) => {
                        const val = Math.max(Number(e.target.value), currentMinTimelineVal);
                        setMaxTimeline(val.toString());
                      }}
                      className="absolute w-full h-1 top-0 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#4343F0] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#4343F0] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:hover:scale-110 [&::-moz-range-thumb]:transition-transform"
                    />
                  </div>

                  {/* Range labels below slider */}
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                    <span>{timelineRangeMin} days</span>
                    <span>{timelineRangeMax} days</span>
                  </div>

                  {/* Min / Max Inputs */}
                  <div className="flex gap-2">
                    <div className="border border-gray-300 rounded px-3 py-2 bg-white flex-1">
                      <span className="text-gray-400 text-xs block mb-0.5">Min days</span>
                      <input
                        type="number"
                        className="w-full text-sm outline-none text-gray-600 font-medium"
                        placeholder={String(timelineRangeMin)}
                        value={minTimeline}
                        onChange={(e) => setMinTimeline(e.target.value)}
                      />
                    </div>
                    <div className="self-center text-gray-400">-</div>
                    <div className="border border-gray-300 rounded px-3 py-2 bg-white flex-1">
                      <span className="text-gray-400 text-xs block mb-0.5">Max days</span>
                      <input
                        type="number"
                        className="w-full text-sm outline-none text-gray-600 font-medium"
                        placeholder={String(timelineRangeMax)}
                        value={maxTimeline}
                        onChange={(e) => setMaxTimeline(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="w-full h-px bg-gray-200" />
          </aside>

          {/* Cards Grid Section */}
          <div className="flex-grow w-full">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-opacity duration-200 opacity-100">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-200/80 p-5 space-y-4 animate-pulse">
                    <div className="w-full aspect-[16/10] bg-gray-200 rounded-xl" />
                    <div className="h-4 w-20 bg-gray-200 rounded-full mx-auto" />
                    <div className="h-6 w-3/4 bg-gray-200 rounded mx-auto" />
                    <div className="h-10 w-full bg-gray-100 rounded" />
                  </div>
                ))}
              </div>
            ) : filteredPackages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-opacity duration-200 opacity-100">
                {filteredPackages.map((pkg) => {
                  const minT = pkg.columns && pkg.columns.length > 0 ? pkg.columns.reduce((acc: any, col: any) => col.timeline && (acc === null || col.timeline < acc) ? col.timeline : acc, null) : null;
                  const billingTypes = pkg.columns && pkg.columns.length > 0 ? [...new Set(pkg.columns.map((c: any) => c.billingType).filter(Boolean))] : [];
                  const isMonthly = billingTypes.includes("monthly");
                  const isFixed = billingTypes.includes("fixed");
                  const billingLabel = isMonthly && isFixed ? "Monthly / Fixed" : isMonthly ? "Monthly" : isFixed ? "Fixed Price" : null;

                  const categoryLabel = pkg.isAnalysis
                    ? "ANALYSIS"
                    : sidebarCategories.find(c => (c.categorycode || "").toUpperCase() === (pkg.categorycode || "").toUpperCase())?.name?.toUpperCase() || (pkg.isBundle ? "BUNDLES" : "PACKAGE");

                  return (
                    <div
                      key={pkg._id}
                      onClick={() => handleCardClick(pkg)}
                      className="bg-white rounded-[10px] border border-[#d1d1d1] p-6 hover:shadow-lg transition-shadow duration-300 flex flex-col items-center text-center group cursor-pointer"
                    >
                      {/* Card Image */}
                      <div className="w-full h-48 bg-[#d9d9d9] rounded-md mb-6 flex items-center justify-center relative overflow-hidden">
                        {pkg.imageUrl || pkg.mediumUrl ? (
                          <img
                            src={pkg.imageUrl || pkg.mediumUrl}
                            alt={pkg.name}
                            className="w-full h-full"
                          />
                        ) : (
                          <svg className="w-12 h-12 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>

                      {/* Category Tag */}
                      <span className="text-[11px] font-bold text-[#808080] bg-[#e0e0e0] px-3 py-1 rounded-full uppercase tracking-wide mb-3">
                        {categoryLabel}
                      </span>

                      {/* Title */}
                      <h3 className="text-xl font-bold text-[#646464] mb-3 leading-tight group-hover:text-[#4343F0] transition-colors">
                        {pkg.name}
                      </h3>

                      {/* Description */}
                      <p className="text-[13px] text-[#808080] mb-6 leading-relaxed px-2 line-clamp-2">
                        {pkg.description || "Our standard free analysis offer covering brand, UI/UX, functionalities, AI potentiality, tech stack."}
                      </p>

                      {/* Footer: Price & Timeline */}
                      <div className="mt-auto w-full border-t border-gray-100 pt-4 space-y-2">
                        <div className="text-[22px] font-bold text-[#808080]">
                          {pkg.amount}
                        </div>

                        <div className="flex flex-wrap gap-2 items-center justify-center">
                          {billingLabel && (
                            <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${isMonthly && !isFixed ? "bg-blue-50 text-blue-600" : isFixed && !isMonthly ? "bg-purple-50 text-purple-600" : "bg-gray-100 text-gray-600"}`}>
                              {billingLabel}
                            </span>
                          )}
                          {pkg.isAnalysis ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Timeline: {pkg.minTimeline || 5} days
                            </span>
                          ) : minT !== null && minT > 0 ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {isMonthly && !isFixed ? "30 days / month" : `${minT} days`}
                            </span>
                          ) : null}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200 text-center p-8">
                <p className="text-gray-500 font-medium text-sm mb-2">No packages found matching your filters.</p>
                <button
                  onClick={() => {
                    setMinPrice("");
                    setMaxPrice("");
                    setMinTimeline("");
                    setMaxTimeline("");
                    const params = new URLSearchParams();
                    params.set("categorycode", "ALL");
                    params.set("sortBy", ORDER_ASC);
                    router.push(`/dashboard/new-project/packages?${params.toString()}`, { scroll: false });
                  }}
                  className="text-[#4343F0] font-bold text-xs hover:underline cursor-pointer"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

export default function PackagesPage() {
  return (
    <Suspense fallback={null}>
      <PackagesContent />
    </Suspense>
  );
}
