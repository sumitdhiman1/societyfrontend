"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { packagesService } from "@/lib/packagesService";
import { requestAnalysisService } from "@/lib/requestAnalysisService";
import { useCurrency } from "@/context/CurrencyContext";
import { authService } from "@/lib/authService";
import StatusPopup from "@/components/common/StatusPopup";

const CloseIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const SpinnerIcon = ({ size = 16 }: { size?: number }) => (
  <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const ORDER_ASC = "order_asc";
const NAME_ASC = "name_asc";
const NAME_DESC = "name_desc";
const PRICE_ASC = "price_asc";
const PRICE_DESC = "price_desc";
const NEWEST = "newest";

function PackagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currency, conversionRate } = useCurrency();

  const [packages, setPackages] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // States matching production chunk
  const [showCategories, setShowCategories] = useState(true);
  const [showPriceFilter, setShowPriceFilter] = useState(true);
  const [showTimelineFilter, setShowTimelineFilter] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState("all");
  const [sortBy, setSortBy] = useState(ORDER_ASC);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minTimeline, setMinTimeline] = useState("");
  const [maxTimeline, setMaxTimeline] = useState("");

  // Ranges derived from data in production
  const [priceRangeMin, setPriceRangeMin] = useState(0);
  const [priceRangeMax, setPriceRangeMax] = useState(500);
  const [timelineRangeMin, setTimelineRangeMin] = useState(1);
  const [timelineRangeMax, setTimelineRangeMax] = useState(52);

  // Analysis Request Modal State
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const [analysisForm, setAnalysisForm] = useState({
    targetWebsiteUrl: "",
    whoCompletedWork: "",
    agreementDetails: "",
    scopeOfWork: "",
    loginsDetails: "",
    additionalComments: "",
    email: "",
    fullName: "",
  });
  const [submittingAnalysis, setSubmittingAnalysis] = useState(false);
  const [statusPopup, setStatusPopup] = useState<{ isOpen: boolean; type: "success" | "error"; title: string; message: string } | null>(null);

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
        if (res?.data) {
          const cats = Array.isArray(res.data) ? res.data : res.data.categories || res.data.data || [];
          setCategories(cats);

          const catParam = searchParams.get("categorycode");
          const sortParam = searchParams.get("sortBy");
          const minP = searchParams.get("minPrice");
          const maxP = searchParams.get("maxPrice");

          if (catParam) {
            const normalized = catParam.toUpperCase();
            const found = [{ _id: "all", categorycode: "ALL" }, { _id: "analysis", categorycode: "ANALYSIS" }, ...cats].find(
              c => (c.categorycode || "").toUpperCase() === normalized || (c.slug || "").toUpperCase() === normalized
            );
            if (found) setActiveCategoryId(found._id);
          }
          if (sortParam) setSortBy(sortParam);
          if (minP) setMinPrice(minP);
          if (maxP) setMaxPrice(maxP);
        }
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
    if (categoriesLoading) return;
    const catParam = searchParams.get("categorycode");
    if (!catParam) return;

    const normalized = catParam.toUpperCase();
    const found = sidebarCategories.find(
      c => (c.categorycode || "").toUpperCase() === normalized || (c.slug || "").toUpperCase() === normalized
    );
    if (found && found._id !== activeCategoryId) {
      setActiveCategoryId(found._id);
    }
  }, [searchParams, categoriesLoading]);

  // Reset filters on category change
  useEffect(() => {
    setMinPrice("");
    setMaxPrice("");
    setMinTimeline("");
    setMaxTimeline("");
    setPriceRangeMin(0);
    setPriceRangeMax(500);
    setTimelineRangeMin(1);
    setTimelineRangeMax(52);
  }, [activeCategoryId]);

  const fetchPackages = async (catId: string, cats: any[], currentSort: string) => {
    setLoading(true);
    try {
      const selectedCat = cats.find(c => c._id === catId);
      const isAll = !selectedCat || (selectedCat.categorycode || "").toUpperCase() === "ALL";
      const isAnalysis = (selectedCat?.categorycode || "").toUpperCase() === "ANALYSIS" || catId === "analysis";

      const queryOptions: any = { page: 1, limit: 100, sortBy: currentSort };
      let fetchedPkgs: any[] = [];

      const extractPackages = (res: any) => {
        if (!res?.data) return [];
        const data = res.data;
        return Array.isArray(data) ? data : data.packages || data.data || [];
      };

      // Fetch analysis products
      let analysisProducts: any[] = [];
      try {
        const aRes = await requestAnalysisService.getProducts(true);
        const aData = aRes?.data ? (Array.isArray(aRes.data) ? aRes.data : aRes.data.data || []) : (Array.isArray(aRes) ? aRes : []);
        analysisProducts = aData.map((prod: any, idx: number) => ({
          _id: prod._id,
          name: prod.title,
          categorycode: "ANALYSIS",
          isAnalysis: true,
          isFree: prod.isFree !== false || prod.amount === 0,
          amount: (prod.isFree !== false || prod.amount === 0) ? "FREE" : `$${prod.amount}`,
          minPrice: prod.amount || 0,
          description: prod.shortDescription || prod.description || "Our standard free analysis offer covering brand, UI/UX, functionalities, AI potentiality, tech stack.",
          imageUrl: prod.coverImage || prod.detailImage || (prod.title?.toLowerCase().includes("check") ? "/images/browse_packages_card_1770345523802.png" : "/images/browse_packages_card_v2_1770345592512.png"),
          minTimeline: prod.timelineInDays || 0,
          columns: [{ timeline: prod.timelineInDays || 0 }],
          visibleFormFields: prod.visibleFormFields || {
            urlToCheck: true,
            whoCompletedWork: prod.title?.toLowerCase().includes("check"),
            agreementDetails: prod.title?.toLowerCase().includes("check"),
            whatToLookAt: true,
            shareAccess: prod.title?.toLowerCase().includes("check"),
            additionalInfo: false,
          },
          order: prod.order || idx - 100,
        }));
      } catch (err) {
        console.error("Failed to load analysis products:", err);
      }

      if (isAnalysis) {
        fetchedPkgs = analysisProducts;
      } else if (isAll) {
        const [allRes, bundlesRes] = await Promise.all([
          packagesService.getAllPackages({ ...queryOptions, categorycode: "ALL" }),
          packagesService.getAllPackages({ ...queryOptions, categorycode: "BUNDLES" })
        ]);
        fetchedPkgs = [...analysisProducts, ...extractPackages(allRes), ...extractPackages(bundlesRes)];
      } else {
        queryOptions.categorycode = selectedCat.categorycode;
        const res = await packagesService.getAllPackages(queryOptions);
        fetchedPkgs = extractPackages(res);
      }

      // Default sorting if not handled by API
      if (!currentSort || currentSort === ORDER_ASC) {
        fetchedPkgs.sort((a, b) => (a.order || 0) - (b.order || 0));
      }

      setPackages(fetchedPkgs);

      // Update ranges based on fetched data
      if (fetchedPkgs.length > 0) {
        const prices = fetchedPkgs.map(p => {
          if (p.minPrice != null) return p.minPrice;
          const match = /\$\s*(\d+)/.exec(p.amount);
          return match ? parseInt(match[1], 10) : 0;
        }).filter(p => !isNaN(p) && p > 0);

        if (prices.length > 0) {
          const min = Math.min(...prices);
          const max = Math.max(...prices);
          if (min === max) {
            const buffer = Math.max(Math.round(min * 0.2), 10);
            setPriceRangeMin(Math.max(0, min - buffer));
            setPriceRangeMax(max + buffer);
          } else {
            setPriceRangeMin(min);
            setPriceRangeMax(max);
          }
        }

        const timelines = fetchedPkgs.map(p => {
          if (p.minTimeline != null) return Math.max(1, Math.round(p.minTimeline / 7));
          if (!p.columns || p.columns.length === 0) return 0;
          const minT = p.columns.reduce((acc: any, col: any) =>
            col.timeline && (acc === null || col.timeline < acc) ? col.timeline : acc, null);
          return minT ? Math.max(1, Math.round(minT / 7)) : 0;
        }).filter(t => t > 0);

        if (timelines.length > 0) {
          const min = Math.min(...timelines);
          const max = Math.max(...timelines);
          if (min === max) {
            setTimelineRangeMin(Math.max(1, min - 1));
            setTimelineRangeMax(max + 2);
          } else {
            setTimelineRangeMin(min);
            setTimelineRangeMax(max);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch packages:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (categoriesLoading) return;

    const cat = sidebarCategories.find(c => c._id === activeCategoryId);
    const targetCode = (cat && cat._id !== "all" ? cat.categorycode || cat.slug : "ALL").toUpperCase();
    const urlCode = (searchParams.get("categorycode") || "ALL").toUpperCase();
    const urlSort = searchParams.get("sortBy") || ORDER_ASC;

    if (targetCode !== urlCode || sortBy !== urlSort) {
      const params = new URLSearchParams();
      params.set("categorycode", targetCode);
      if (sortBy) params.set("sortBy", sortBy);
      router.replace(`/dashboard/new-project/packages?${params.toString()}`, { scroll: false });
    }

    fetchPackages(activeCategoryId, sidebarCategories, sortBy);
  }, [activeCategoryId, sortBy, categoriesLoading]);

  const filteredPackages = useMemo(() => {
    const minP = parseInt(minPrice);
    const maxP = parseInt(maxPrice);
    const minT = parseInt(minTimeline);
    const maxT = parseInt(maxTimeline);

    let result = packages.filter((pkg) => {
      // Price Filter
      if (!isNaN(minP) || !isNaN(maxP)) {
        const pkgPrice = pkg.minPrice ?? 0;
        if (!isNaN(minP) && pkgPrice < minP) return false;
        if (!isNaN(maxP) && pkgPrice > maxP) return false;
      }

      // Timeline Filter
      if (!isNaN(minT) || !isNaN(maxT)) {
        let pkgWeeks = 0;
        if (pkg.minTimeline != null) {
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
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case NAME_DESC:
        result.sort((a, b) => b.name.localeCompare(a.name));
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

  const handleSubmitAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!analysisForm.email) {
      setStatusPopup({
        isOpen: true,
        type: "error",
        title: "Email Required",
        message: "Please provide your email address to receive the analysis.",
      });
      return;
    }

    setSubmittingAnalysis(true);
    try {
      const payload = {
        productId: selectedAnalysis._id,
        targetWebsiteUrl: analysisForm.targetWebsiteUrl || "https://clientwebsite.com",
        whoCompletedWork: analysisForm.whoCompletedWork,
        agreementDetails: analysisForm.agreementDetails,
        scopeOfWork: analysisForm.scopeOfWork,
        loginsDetails: analysisForm.loginsDetails,
        additionalComments: analysisForm.additionalComments,
        clientEmail: analysisForm.email,
        clientName: analysisForm.fullName || "Client",
      };

      const res: any = await requestAnalysisService.createProject(payload);
      if (res && (res.isSuccessful || res.statusCode === 201 || res.data)) {
        const newProjId = res.data?._id || res._id;
        setSelectedAnalysis(null);
        setStatusPopup({
          isOpen: true,
          type: "success",
          title: "Analysis Request Received!",
          message: "We've received your request and our team is already on it! You will receive updates via email.",
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
          message: res?.message || "Failed to submit analysis request. Please try again.",
        });
      }
    } catch (error: any) {
      console.error("Failed to submit analysis request:", error);
      setStatusPopup({
        isOpen: true,
        type: "error",
        title: "Error",
        message: error?.message || "An unexpected error occurred.",
      });
    } finally {
      setSubmittingAnalysis(false);
    }
  };

  return (
    <div className="bg-[#F4F5FA] min-h-screen flex flex-col font-sans">
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
        <h1 className="text-[28px] md:text-[32px] font-medium text-primary-100 mb-8">
          Browse Packages & Plans
        </h1>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full lg:w-[280px] flex-shrink-0 space-y-6">
            {/* Categories Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <button
                onClick={() => setShowCategories(!showCategories)}
                className="w-full flex items-center justify-between font-bold text-gray-700 text-sm mb-4"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  Categories
                </span>
                <svg className={`w-4 h-4 transition-transform ${showCategories ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showCategories && (
                <div className="space-y-1">
                  {categoriesLoading ? (
                    <div className="space-y-2 animate-pulse">
                      {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-8 bg-gray-100 rounded" />)}
                    </div>
                  ) : (
                    sidebarCategories.map((cat) => {
                      const isActive = activeCategoryId === cat._id;
                      return (
                        <button
                          key={cat._id}
                          onClick={() => setActiveCategoryId(cat._id)}
                          className={`w-full text-left px-3 py-2 rounded text-sm transition-colors cursor-pointer ${
                            isActive ? "bg-gray-100 font-bold text-primary-100" : "text-gray-500 hover:text-gray-900"
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

            {/* Price Range Filter */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <button
                onClick={() => setShowPriceFilter(!showPriceFilter)}
                className="w-full flex items-center justify-between font-bold text-gray-700 text-sm mb-4"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Price Range
                </span>
                <svg className={`w-4 h-4 transition-transform ${showPriceFilter ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showPriceFilter && (
                <div>
                  <div className="relative mb-4">
                    <div className="h-1 bg-gray-200 rounded-full">
                      <div
                        className="h-1 bg-[#5356ff] rounded-full absolute"
                        style={{
                          left: `${(((parseInt(minPrice) || priceRangeMin) - priceRangeMin) / (priceRangeMax - priceRangeMin || 1)) * 100}%`,
                          right: `${100 - (((parseInt(maxPrice) || priceRangeMax) - priceRangeMin) / (priceRangeMax - priceRangeMin || 1)) * 100}%`
                        }}
                      />
                    </div>
                    <input
                      type="range" min={priceRangeMin} max={priceRangeMax} value={minPrice || priceRangeMin}
                      onChange={e => { const val = e.target.value; if (parseInt(val) <= (parseInt(maxPrice) || priceRangeMax)) setMinPrice(val); }}
                      className="absolute w-full h-1 top-0 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#5356ff] [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                    <input
                      type="range" min={priceRangeMin} max={priceRangeMax} value={maxPrice || priceRangeMax}
                      onChange={e => { const val = e.target.value; if (parseInt(val) >= (parseInt(minPrice) || priceRangeMin)) setMaxPrice(val); }}
                      className="absolute w-full h-1 top-0 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#5356ff] [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                    <span>${priceRangeMin}</span><span>${priceRangeMax}</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="border border-gray-300 rounded px-3 py-2 bg-white flex-1">
                      <span className="text-gray-400 text-xs block mb-0.5">Min</span>
                      <input type="number" className="w-full text-sm outline-none text-gray-600" placeholder={String(priceRangeMin)} value={minPrice} onChange={e => setMinPrice(e.target.value)} />
                    </div>
                    <div className="border border-gray-300 rounded px-3 py-2 bg-white flex-1">
                      <span className="text-gray-400 text-xs block mb-0.5">Max</span>
                      <input type="number" className="w-full text-sm outline-none text-gray-600" placeholder={String(priceRangeMax)} value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Timeline Filter */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <button
                onClick={() => setShowTimelineFilter(!showTimelineFilter)}
                className="w-full flex items-center justify-between font-bold text-gray-700 text-sm mb-4"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Timeline Range
                </span>
                <svg className={`w-4 h-4 transition-transform ${showTimelineFilter ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showTimelineFilter && (
                <div>
                  <div className="relative mb-4">
                    <div className="h-1 bg-gray-200 rounded-full">
                      <div
                        className="h-1 bg-[#5356ff] rounded-full absolute"
                        style={{
                          left: `${(((parseInt(minTimeline) || timelineRangeMin) - timelineRangeMin) / (timelineRangeMax - timelineRangeMin || 1)) * 100}%`,
                          right: `${100 - (((parseInt(maxTimeline) || timelineRangeMax) - timelineRangeMin) / (timelineRangeMax - timelineRangeMin || 1)) * 100}%`
                        }}
                      />
                    </div>
                    <input
                      type="range" min={timelineRangeMin} max={timelineRangeMax} value={minTimeline || timelineRangeMin}
                      onChange={e => { const val = e.target.value; if (parseInt(val) <= (parseInt(maxTimeline) || timelineRangeMax)) setMinTimeline(val); }}
                      className="absolute w-full h-1 top-0 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#5356ff] [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                    <input
                      type="range" min={timelineRangeMin} max={timelineRangeMax} value={maxTimeline || timelineRangeMax}
                      onChange={e => { const val = e.target.value; if (parseInt(val) >= (parseInt(minTimeline) || timelineRangeMin)) setMaxTimeline(val); }}
                      className="absolute w-full h-1 top-0 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#5356ff] [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                    <span>{timelineRangeMin} wks</span><span>{timelineRangeMax} wks</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="border border-gray-300 rounded px-3 py-2 bg-white flex-1">
                      <span className="text-gray-400 text-xs block mb-0.5">Min wks</span>
                      <input type="number" className="w-full text-sm outline-none text-gray-600" placeholder={String(timelineRangeMin)} value={minTimeline} onChange={e => setMinTimeline(e.target.value)} />
                    </div>
                    <div className="border border-gray-300 rounded px-3 py-2 bg-white flex-1">
                      <span className="text-gray-400 text-xs block mb-0.5">Max wks</span>
                      <input type="number" className="w-full text-sm outline-none text-gray-600" placeholder={String(timelineRangeMax)} value={maxTimeline} onChange={e => setMaxTimeline(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>

          <div className="flex-grow">
            {/* Sort Dropdown */}
            <div className="flex justify-end mb-8">
              <div className="relative">
                <button
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="bg-[#5356ff] hover:bg-[#3232b7] text-white text-sm font-medium px-6 py-2.5 rounded flex items-center gap-2 transition-colors cursor-pointer"
                >
                  Sort by
                  <svg className={`w-4 h-4 transition-transform ${showSortDropdown ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showSortDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                    {[
                      { id: NEWEST, label: "Newest" },
                      { id: ORDER_ASC, label: "Default Order" },
                      { id: NAME_ASC, label: "Name: A to Z" },
                      { id: NAME_DESC, label: "Name: Z to A" },
                      { id: PRICE_ASC, label: "Price: Low to High" },
                      { id: PRICE_DESC, label: "Price: High to Low" }
                    ].map(option => (
                      <button
                        key={option.id}
                        onClick={() => { setSortBy(option.id); setShowSortDropdown(false); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors cursor-pointer ${sortBy === option.id ? "bg-gray-50 font-semibold text-[#5356ff]" : "text-gray-700"}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="bg-white rounded-[10px] border border-gray-200 p-6 space-y-6">
                    <div className="w-full aspect-[16/10] bg-gray-100 animate-pulse rounded-md" />
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-4 w-20 bg-gray-100 animate-pulse rounded-full" />
                      <div className="h-6 w-40 bg-gray-200 animate-pulse rounded" />
                      <div className="h-12 w-full bg-gray-100 animate-pulse rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredPackages.length > 0 ? (
              <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-opacity duration-200 ${loading ? "opacity-50" : "opacity-100"}`}>
                {filteredPackages.map((pkg) => {
                  const minT = pkg.columns && pkg.columns.length > 0 ? pkg.columns.reduce((acc: any, col: any) => col.timeline && (acc === null || col.timeline < acc) ? col.timeline : acc, null) : null;
                  const billingTypes = pkg.columns && pkg.columns.length > 0 ? [...new Set(pkg.columns.map((c: any) => c.billingType).filter(Boolean))] : [];
                  const isMonthly = billingTypes.includes("monthly");
                  const isFixed = billingTypes.includes("fixed");
                  const billingLabel = isMonthly && isFixed ? "Monthly / Fixed" : isMonthly ? "Monthly" : isFixed ? "Fixed Price" : null;

                  return (
                    <div
                      key={pkg._id}
                      onClick={() => handleCardClick(pkg)}
                      className="bg-white rounded-[10px] border border-[#d1d1d1] p-6 hover:shadow-lg transition-shadow duration-300 flex flex-col items-center text-center group cursor-pointer"
                    >
                      <div className="w-full aspect-[16/10] bg-[#d9d9d9] rounded-md mb-6 flex items-center justify-center relative overflow-hidden">
                        {pkg.mediumUrl || pkg.imageUrl ? (
                          <img src={pkg.mediumUrl || pkg.imageUrl} alt={pkg.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <svg className="w-16 h-16 text-[#646464]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>

                      <span className="text-[11px] font-bold text-[#808080] bg-[#e0e0e0] px-3 py-1 rounded-full uppercase tracking-wide mb-3">
                        {pkg.isAnalysis ? "ANALYSIS" : sidebarCategories.find(c => (c.categorycode || "").toUpperCase() === (pkg.categorycode || "").toUpperCase())?.name || (pkg.isBundle ? "Bundle" : "Package")}
                      </span>

                      <h3 className={`text-xl font-bold mb-3 leading-tight ${pkg.isAnalysis ? "text-[#5356ff]" : "text-[#646464]"}`}>
                        {pkg.name}
                      </h3>

                      <p className="text-[13px] text-[#808080] mb-6 leading-relaxed px-2 line-clamp-3">
                        {pkg.description || "Professional services tailored to your specific business requirements."}
                      </p>

                      <div className="mt-auto w-full border-t border-gray-100 pt-4 space-y-2">
                        <div className="text-[22px] font-bold text-[#808080]">
                          {pkg.amount}
                        </div>
                        <div className="flex flex-wrap gap-2 items-center justify-center">
                          {billingLabel && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isMonthly && !isFixed ? "bg-blue-100 text-blue-700" : isFixed && !isMonthly ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
                              {billingLabel}
                            </span>
                          )}
                          {minT !== null && minT > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {isMonthly && !isFixed ? "30 days / month" : `${minT} days`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-200">
                <p className="text-gray-400 font-medium">No packages found matching your filters.</p>
                <button onClick={() => { setMinPrice(""); setMaxPrice(""); setMinTimeline(""); setMaxTimeline(""); setActiveCategoryId("all"); }} className="mt-4 text-[#5356ff] font-bold text-sm hover:underline cursor-pointer">
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Analysis Request Intake Modal */}
      {selectedAnalysis && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto font-sans">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
              onClick={() => setSelectedAnalysis(null)} 
            />

            <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 w-full max-w-lg animate-scale-in">
              {/* Header */}
              <div className="px-6 py-5 bg-[#0D1939] text-white flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {selectedAnalysis.name}
                  </h3>
                  <p className="text-xs text-gray-300 mt-0.5">
                    {selectedAnalysis.amount === "FREE" ? "Free Analysis Service" : `Price: ${selectedAnalysis.amount}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAnalysis(null)}
                  className="p-1 rounded-md text-gray-300 hover:text-white transition-colors cursor-pointer"
                >
                  <CloseIcon size={20} />
                </button>
              </div>

              {/* Form Body with Dynamic visibleFormFields */}
              <form onSubmit={handleSubmitAnalysis} className="p-6 space-y-4 max-h-[calc(100vh-14rem)] overflow-y-auto">
                {/* Email (Always Required) */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Your Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="you@company.com"
                    value={analysisForm.email}
                    onChange={(e) => setAnalysisForm({ ...analysisForm, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-[#5356ff] transition-all"
                  />
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={analysisForm.fullName}
                    onChange={(e) => setAnalysisForm({ ...analysisForm, fullName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-[#5356ff] transition-all"
                  />
                </div>

                {/* Target Website URL (Controlled by visibleFormFields.urlToCheck) */}
                {(selectedAnalysis.visibleFormFields?.urlToCheck !== false) && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Target Website URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="https://example.com"
                      value={analysisForm.targetWebsiteUrl}
                      onChange={(e) => setAnalysisForm({ ...analysisForm, targetWebsiteUrl: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-[#5356ff] transition-all"
                    />
                  </div>
                )}

                {/* Who was the work completed by? (Controlled by visibleFormFields.whoCompletedWork) */}
                {selectedAnalysis.visibleFormFields?.whoCompletedWork && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Who was the work completed by?
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Freelancer, Agency, In-house developer"
                      value={analysisForm.whoCompletedWork}
                      onChange={(e) => setAnalysisForm({ ...analysisForm, whoCompletedWork: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-[#5356ff] transition-all"
                    />
                  </div>
                )}

                {/* What was the agreement for this work? (Controlled by visibleFormFields.agreementDetails) */}
                {selectedAnalysis.visibleFormFields?.agreementDetails && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      What was the agreement for this work?
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Briefly describe what was promised or agreed upon..."
                      value={analysisForm.agreementDetails}
                      onChange={(e) => setAnalysisForm({ ...analysisForm, agreementDetails: e.target.value })}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-[#5356ff] transition-all resize-none"
                    />
                  </div>
                )}

                {/* What specifically do you want us to look at? (Controlled by visibleFormFields.whatToLookAt) */}
                {selectedAnalysis.visibleFormFields?.whatToLookAt && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      What specifically do you want us to look at?
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Page speed, mobile responsiveness, SEO rankings, bugs..."
                      value={analysisForm.scopeOfWork}
                      onChange={(e) => setAnalysisForm({ ...analysisForm, scopeOfWork: e.target.value })}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-[#5356ff] transition-all resize-none"
                    />
                  </div>
                )}

                {/* Please share required access with our email (Controlled by visibleFormFields.shareAccess) */}
                {selectedAnalysis.visibleFormFields?.shareAccess && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Logins / Access Details (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Staging URL, testing account credentials or instructions..."
                      value={analysisForm.loginsDetails}
                      onChange={(e) => setAnalysisForm({ ...analysisForm, loginsDetails: e.target.value })}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-[#5356ff] transition-all resize-none font-mono text-xs"
                    />
                  </div>
                )}

                {/* Provide any additional required information (Controlled by visibleFormFields.additionalInfo) */}
                {selectedAnalysis.visibleFormFields?.additionalInfo && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Additional Information
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Any other details or questions you have..."
                      value={analysisForm.additionalComments}
                      onChange={(e) => setAnalysisForm({ ...analysisForm, additionalComments: e.target.value })}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-[#5356ff] transition-all resize-none"
                    />
                  </div>
                )}

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setSelectedAnalysis(null)}
                    className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAnalysis}
                    className="px-6 py-2.5 bg-[#5356ff] hover:bg-[#3232b7] text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 shadow-md active:scale-[0.98] cursor-pointer flex items-center gap-2"
                  >
                    {submittingAnalysis && <SpinnerIcon size={16} />}
                    <span>{submittingAnalysis ? "Submitting..." : "Submit Analysis Request"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
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
