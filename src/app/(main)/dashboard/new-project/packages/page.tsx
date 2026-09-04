"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
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

  const initialCatParam = searchParams.get("categorycode");
  const initialSortParam = searchParams.get("sortBy");

  const [activeCategoryId, setActiveCategoryId] = useState(() => {
    if (initialCatParam) {
      const norm = initialCatParam.toUpperCase();
      if (norm === "ANALYSIS") return "analysis";
      if (norm === "BUNDLES") return "bundles";
      if (norm === "ALL") return "all";
      return norm.toLowerCase();
    }
    return "all";
  });
  const [sortBy, setSortBy] = useState(() => initialSortParam || ORDER_ASC);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

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
      const code = (c.categorycode || "").toUpperCase();
      return code !== "ALL" && code !== "BUNDLES" && code !== "ANALYSIS";
    })
  ], [categories]);

  // Initial categories fetch
  useEffect(() => {
    const fetchCategories = async () => {
      setCategoriesLoading(true);
      try {
        const res = await packagesService.listCategories({ page: 1, limit: 100 });
        const cats = res?.data ? (Array.isArray(res.data) ? res.data : res.data.categories || res.data.data || []) : [];
        setCategories(cats);

        const catParam = searchParams.get("categorycode");
        const sortParam = searchParams.get("sortBy");
        const minP = searchParams.get("minPrice");
        const maxP = searchParams.get("maxPrice");

        if (catParam) {
          const normalized = catParam.toUpperCase();
          const allCats = [
            { _id: "all", name: "All Packages", slug: "all", categorycode: "ALL" },
            { _id: "analysis", name: "Analysis", slug: "analysis", categorycode: "ANALYSIS" },
            { _id: "bundles", name: "Bundles", slug: "bundles", categorycode: "BUNDLES" },
            ...cats,
          ];
          const found = allCats.find(
            c => (c.categorycode || "").toUpperCase() === normalized || (c.slug || "").toUpperCase() === normalized
          );
          if (found) setActiveCategoryId(found._id);
        }
        if (sortParam) setSortBy(sortParam);
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

  // Update active category from URL
  useEffect(() => {
    const catParam = searchParams.get("categorycode");
    if (!catParam) return;

    const normalized = catParam.toUpperCase();
    const found = sidebarCategories.find(
      c => (c.categorycode || "").toUpperCase() === normalized || (c.slug || "").toUpperCase() === normalized
    );
    if (found && found._id !== activeCategoryId) {
      setActiveCategoryId(found._id);
    }
  }, [searchParams, sidebarCategories, activeCategoryId]);

  // Reset filters on category change
  useEffect(() => {
    setMinPrice("");
    setMaxPrice("");
    setMinTimeline("");
    setMaxTimeline("");
  }, [activeCategoryId]);

  const fetchPackages = async (catId: string, cats: any[], currentSort: string) => {
    setLoading(true);
    try {
      const selectedCat = cats.find(c => c._id === catId);
      const isAnalysis =
        catId === "analysis" ||
        (selectedCat?.categorycode || "").toUpperCase() === "ANALYSIS" ||
        (selectedCat?.slug || "").toUpperCase() === "ANALYSIS";

      const isBundles =
        catId === "bundles" ||
        (selectedCat?.categorycode || "").toUpperCase() === "BUNDLES" ||
        (selectedCat?.slug || "").toUpperCase() === "BUNDLES";

      const isAll = !isAnalysis && !isBundles && (catId === "all" || !selectedCat || (selectedCat.categorycode || "").toUpperCase() === "ALL");

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
            whatToLookAt: true,
            shareAccess: false,
            additionalInfo: false,
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
            whatToLookAt: true,
            shareAccess: true,
            additionalInfo: false,
          },
          order: 2,
        },
      ];

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
                whatToLookAt: true,
                shareAccess: isCheck,
                additionalInfo: false,
              },
              order: prod.order !== undefined ? prod.order : idx + 1,
            };
          });
        }
      } catch (err) {
        console.error("Failed to load analysis products:", err);
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
        queryOptions.categorycode = selectedCat?.categorycode || selectedCat?.slug;
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
  };

  useEffect(() => {
    fetchPackages(activeCategoryId, sidebarCategories, sortBy);
  }, [activeCategoryId, sortBy, sidebarCategories]);

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
    switch (sortBy) {
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
  }, [packages, minPrice, maxPrice, minTimeline, maxTimeline, sortBy]);

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



      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] py-10">
        
        {/* Top Header */}
        <div className="flex flex-row items-center justify-between gap-4 mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[#0D1939] tracking-tight">
            Browse Packages &amp; Plans
          </h1>

          {/* Sort by Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="bg-[#4343F0] hover:bg-[#3232b7] text-white text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-xs cursor-pointer"
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
                      setSortBy(option.id);
                      setShowSortDropdown(false);
                      const cat = sidebarCategories.find(c => c._id === activeCategoryId);
                      const targetCode = (cat && cat._id !== "all" ? cat.categorycode || cat.slug : "ALL").toUpperCase();
                      const params = new URLSearchParams();
                      params.set("categorycode", targetCode);
                      params.set("sortBy", option.id);
                      router.replace(`/dashboard/new-project/packages?${params.toString()}`, { scroll: false });
                    }}
                    className={`w-full text-left px-4 py-2 text-xs sm:text-sm hover:bg-gray-50 transition-colors cursor-pointer ${sortBy === option.id ? "bg-blue-50 font-bold text-[#4343F0]" : "text-gray-700"}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content Layout */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Sidebar */}
          <aside className="w-full lg:w-[250px] shrink-0">
            
            {/* Categories Section */}
            <div className="mb-6">
              <button
                onClick={() => setShowCategories(!showCategories)}
                className="w-full flex items-center justify-between font-bold text-gray-800 text-xs sm:text-sm mb-3 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  Categories
                </span>
                <svg className={`w-3.5 h-3.5 text-gray-500 transition-transform ${showCategories ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showCategories && (
                <div className="space-y-0.5">
                  {categoriesLoading ? (
                    <div className="space-y-2 animate-pulse">
                      {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-7 bg-gray-200/60 rounded" />)}
                    </div>
                  ) : (
                    sidebarCategories.map((cat) => {
                      const isActive = activeCategoryId === cat._id;
                      return (
                        <button
                          key={cat._id}
                          onClick={() => {
                            setActiveCategoryId(cat._id);
                            const targetCode = (cat && cat._id !== "all" ? cat.categorycode || cat.slug : "ALL").toUpperCase();
                            const params = new URLSearchParams();
                            params.set("categorycode", targetCode);
                            if (sortBy) params.set("sortBy", sortBy);
                            router.replace(`/dashboard/new-project/packages?${params.toString()}`, { scroll: false });
                          }}
                          className={`w-full text-left px-3.5 py-2 rounded-xl text-xs sm:text-sm transition-all cursor-pointer ${
                            isActive
                              ? "bg-white font-bold text-[#0D1939] shadow-xs border border-gray-200/80"
                              : "text-[#64748B] hover:text-[#0D1939] font-medium hover:bg-gray-100/50"
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

            {/* Horizontal Divider */}
            <div className="border-t border-gray-200/80 my-5" />

            {/* Price Range Section */}
            <div className="mb-6">
              <button
                onClick={() => setShowPriceFilter(!showPriceFilter)}
                className="w-full flex items-center justify-between font-bold text-gray-800 text-xs sm:text-sm mb-4 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border border-gray-500 flex items-center justify-center text-[10px] text-gray-600 font-bold">$</span>
                  Price Range
                </span>
                <svg className={`w-3.5 h-3.5 text-gray-500 transition-transform ${showPriceFilter ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showPriceFilter && (
                <div>
                  {/* Slider Bar */}
                  <div className="relative w-full h-5 flex items-center mb-1">
                    <div className="absolute w-full h-1 bg-gray-200 rounded-full" />
                    <div
                      className="absolute h-1 bg-[#4343F0] rounded-full pointer-events-none"
                      style={{
                        left: `${priceMinPercent}%`,
                        width: `${Math.max(0, priceMaxPercent - priceMinPercent)}%`,
                      }}
                    />
                    <input
                      type="range"
                      min={priceRangeMin}
                      max={priceRangeMax}
                      value={currentMinPriceVal}
                      onChange={(e) => {
                        const val = Math.min(Number(e.target.value), currentMaxPriceVal);
                        setMinPrice(val.toString());
                      }}
                      className="slider-thumb absolute w-full h-1 appearance-none bg-transparent pointer-events-none z-20"
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
                      className="slider-thumb absolute w-full h-1 appearance-none bg-transparent pointer-events-none z-10"
                    />
                  </div>

                  {/* Range labels below slider */}
                  <div className="flex items-center justify-between text-xs text-gray-400 font-medium mb-3">
                    <span>{currencySymbol}{priceRangeMin}</span>
                    <span>{currencySymbol}{priceRangeMax}</span>
                  </div>

                  {/* Min / Max Inputs with Dash */}
                  <div className="flex items-center gap-2">
                    <div className="border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white flex-1 flex flex-col">
                      <span className="text-gray-400 text-[10px] font-normal leading-tight mb-0.5">Min</span>
                      <input
                        type="number"
                        className="w-full text-xs sm:text-sm font-semibold text-gray-700 outline-none bg-transparent"
                        placeholder={String(priceRangeMin)}
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                      />
                    </div>
                    <span className="text-gray-400 font-medium">-</span>
                    <div className="border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white flex-1 flex flex-col">
                      <span className="text-gray-400 text-[10px] font-normal leading-tight mb-0.5">Max</span>
                      <input
                        type="number"
                        className="w-full text-xs sm:text-sm font-semibold text-gray-700 outline-none bg-transparent"
                        placeholder={String(priceRangeMax)}
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Horizontal Divider */}
            <div className="border-t border-gray-200/80 my-5" />

            {/* Timeline Range Section */}
            <div className="mb-6">
              <button
                onClick={() => setShowTimelineFilter(!showTimelineFilter)}
                className="w-full flex items-center justify-between font-bold text-gray-800 text-xs sm:text-sm mb-4 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Timeline Range
                </span>
                <svg className={`w-3.5 h-3.5 text-gray-500 transition-transform ${showTimelineFilter ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showTimelineFilter && (
                <div>
                  {/* Slider Bar */}
                  <div className="relative w-full h-5 flex items-center mb-1">
                    <div className="absolute w-full h-1 bg-gray-200 rounded-full" />
                    <div
                      className="absolute h-1 bg-[#4343F0] rounded-full pointer-events-none"
                      style={{
                        left: `${timelineMinPercent}%`,
                        width: `${Math.max(0, timelineMaxPercent - timelineMinPercent)}%`,
                      }}
                    />
                    <input
                      type="range"
                      min={timelineRangeMin}
                      max={timelineRangeMax}
                      value={currentMinTimelineVal}
                      onChange={(e) => {
                        const val = Math.min(Number(e.target.value), currentMaxTimelineVal);
                        setMinTimeline(val.toString());
                      }}
                      className="slider-thumb absolute w-full h-1 appearance-none bg-transparent pointer-events-none z-20"
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
                      className="slider-thumb absolute w-full h-1 appearance-none bg-transparent pointer-events-none z-10"
                    />
                  </div>

                  {/* Range labels below slider */}
                  <div className="flex items-center justify-between text-xs text-gray-400 font-medium mb-3">
                    <span>{timelineRangeMin} wks</span>
                    <span>{timelineRangeMax} wks</span>
                  </div>

                  {/* Min wks / Max wks Inputs with Dash */}
                  <div className="flex items-center gap-2">
                    <div className="border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white flex-1 flex flex-col">
                      <span className="text-gray-400 text-[10px] font-normal leading-tight mb-0.5">Min wks</span>
                      <input
                        type="number"
                        className="w-full text-xs sm:text-sm font-semibold text-gray-700 outline-none bg-transparent"
                        placeholder={String(timelineRangeMin)}
                        value={minTimeline}
                        onChange={(e) => setMinTimeline(e.target.value)}
                      />
                    </div>
                    <span className="text-gray-400 font-medium">-</span>
                    <div className="border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white flex-1 flex flex-col">
                      <span className="text-gray-400 text-[10px] font-normal leading-tight mb-0.5">Max wks</span>
                      <input
                        type="number"
                        className="w-full text-xs sm:text-sm font-semibold text-gray-700 outline-none bg-transparent"
                        placeholder={String(timelineRangeMax)}
                        value={maxTimeline}
                        onChange={(e) => setMaxTimeline(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Horizontal Divider */}
            <div className="border-t border-gray-200/80 my-5" />

          </aside>

          {/* Cards Grid Section */}
          <div className="flex-grow w-full">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                            className="w-full h-full object-cover"
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
                  onClick={() => { setMinPrice(""); setMaxPrice(""); setMinTimeline(""); setMaxTimeline(""); setActiveCategoryId("all"); }}
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
