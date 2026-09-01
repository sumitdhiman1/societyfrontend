"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { packagesService } from "@/lib/packagesService";
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

  const sidebarCategories = useMemo(() => [
    { _id: "all", name: "All Packages", slug: "all", categorycode: "ALL" },
    { _id: "bundles", name: "Bundles", slug: "bundles", categorycode: "BUNDLES" },
    ...categories.filter(c => {
      const code = (c.categorycode || "").toUpperCase();
      return code !== "ALL" && code !== "BUNDLES";
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
            const found = [{ _id: "all", categorycode: "ALL" }, ...cats].find(
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

      const queryOptions: any = { page: 1, limit: 100, sortBy: currentSort };
      let fetchedPkgs: any[] = [];

      const extractPackages = (res: any) => {
        if (!res?.data) return [];
        const data = res.data;
        return Array.isArray(data) ? data : data.packages || data.data || [];
      };

      if (isAll) {
        const [allRes, bundlesRes] = await Promise.all([
          packagesService.getAllPackages({ ...queryOptions, categorycode: "ALL" }),
          packagesService.getAllPackages({ ...queryOptions, categorycode: "BUNDLES" })
        ]);
        fetchedPkgs = [...extractPackages(allRes), ...extractPackages(bundlesRes)];
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

      // Update ranges based on fetched data (matching production logic)
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

    return packages.filter(pkg => {
      // Price filter logic matching production
      const pkgPrice = pkg.minPrice != null ? pkg.minPrice : (() => {
        const match = /\$\s*(\d+)/.exec(pkg.amount);
        return match ? parseInt(match[1], 10) : 0;
      })();

      if (minPrice && !isNaN(minP) && pkgPrice < minP) return false;
      if (maxPrice && !isNaN(maxP) && pkgPrice > maxP) return false;

      // Timeline filter logic matching production
      const pkgTimeline = pkg.minTimeline != null ? Math.max(1, Math.round(pkg.minTimeline / 7)) : (() => {
        if (!pkg.columns || pkg.columns.length === 0) return 0;
        const minT = pkg.columns.reduce((acc: any, col: any) =>
          col.timeline && (acc === null || col.timeline < acc) ? col.timeline : acc, null);
        return minT ? Math.max(1, Math.round(minT / 7)) : 0;
      })();

      if (minTimeline && !isNaN(minT) && pkgTimeline < minT) return false;
      if (maxTimeline && !isNaN(maxT) && pkgTimeline > maxT) return false;

      return true;
    });
  }, [packages, minPrice, maxPrice, minTimeline, maxTimeline]);

  if (categoriesLoading) {
    return (
      <div className="bg-[#F8F9FB] min-h-screen flex flex-col font-sans text-[#404040]">
        <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-8 md:pt-12 pb-12">
          <div className="flex flex-col lg:flex-row gap-6">
            <aside className="w-full lg:w-60 flex-shrink-0 flex flex-col gap-8">
              <div className="space-y-4">
                <div className="h-6 w-32 bg-gray-200 animate-pulse rounded" />
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-8 w-full bg-gray-200 animate-pulse rounded" />)}
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-6 w-32 bg-gray-200 animate-pulse rounded" />
                <div className="h-10 w-full bg-gray-100 animate-pulse rounded" />
              </div>
            </aside>
            <div className="flex-grow">
              <div className="flex justify-end mb-8">
                <div className="h-10 w-32 bg-gray-200 animate-pulse rounded" />
              </div>
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
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-[#F8F9FB] min-h-screen flex flex-col font-sans text-[#404040]">
      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-8 md:pt-12 pb-12">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="w-full lg:w-60 flex-shrink-0 flex flex-col gap-6">
            {/* Categories */}
            <div className="bg-transparent">
              <button onClick={() => setShowCategories(!showCategories)} className="flex items-center justify-between w-full mb-4 group">
                <div className="flex items-center gap-2 font-bold text-gray-700 uppercase text-sm tracking-wider">
                  <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 110 4H4a2 2 0 01-2-2z" />
                  </svg>
                  Categories
                </div>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${showCategories ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showCategories && (
                <div className="flex flex-col gap-1 pl-1">
                  {sidebarCategories.map(cat => (
                    <button
                      key={cat._id}
                      onClick={() => setActiveCategoryId(cat._id)}
                      className={`text-left py-2 px-3 rounded-md text-[13px] font-medium transition-colors ${activeCategoryId === cat._id ? "bg-white text-[#404040] shadow-sm border border-gray-100" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100/50"}`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="w-full h-px bg-gray-200 my-2" />

            {/* Price Range */}
            <div className="bg-transparent">
              <button onClick={() => setShowPriceFilter(!showPriceFilter)} className="flex items-center justify-between w-full mb-6 group">
                <div className="flex items-center gap-2 font-bold text-gray-700 uppercase text-sm tracking-wider">
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Price Range
                </div>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${showPriceFilter ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showPriceFilter && (
                <div className="px-1">
                  <div className="relative w-full mb-6">
                    <div className="relative h-1 bg-gray-200 rounded-full">
                      <div
                        className="absolute h-full bg-[#5356ff] rounded-full"
                        style={{
                          left: `${((parseInt(minPrice) || priceRangeMin) - priceRangeMin) / (priceRangeMax - priceRangeMin) * 100}%`,
                          right: `${100 - ((parseInt(maxPrice) || priceRangeMax) - priceRangeMin) / (priceRangeMax - priceRangeMin) * 100}%`
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

            <div className="w-full h-px bg-gray-200 my-2" />

            {/* Timeline Range */}
            <div className="bg-transparent">
              <button onClick={() => setShowTimelineFilter(!showTimelineFilter)} className="flex items-center justify-between w-full mb-6 group">
                <div className="flex items-center gap-2 font-bold text-gray-700 uppercase text-sm tracking-wider">
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Timeline Range
                </div>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${showTimelineFilter ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showTimelineFilter && (
                <div className="px-1">
                  <div className="relative w-full mb-6">
                    <div className="relative h-1 bg-gray-200 rounded-full">
                      <div
                        className="absolute h-full bg-[#5356ff] rounded-full"
                        style={{
                          left: `${((parseInt(minTimeline) || timelineRangeMin) - timelineRangeMin) / (timelineRangeMax - timelineRangeMin) * 100}%`,
                          right: `${100 - ((parseInt(maxTimeline) || timelineRangeMax) - timelineRangeMin) / (timelineRangeMax - timelineRangeMin) * 100}%`
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
                  className="bg-[#5356ff] hover:bg-[#3232b7] text-white text-sm font-medium px-6 py-2.5 rounded flex items-center gap-2 transition-colors"
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
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${sortBy === option.id ? "bg-gray-50 font-semibold text-[#5356ff]" : "text-gray-700"}`}
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
                    <Link
                      key={pkg._id}
                      href={pkg.isBundle || (pkg.categorycode || "").toUpperCase() === "BUNDLES" ? `/dashboard/new-project/bundles/${pkg._id}` : `/dashboard/new-project/packages/${pkg._id}`}
                      className="bg-white rounded-[10px] border border-[#d1d1d1] p-6 hover:shadow-lg transition-shadow duration-300 flex flex-col items-center text-center group cursor-pointer"
                    >
                      <div className="w-full aspect-[16/10] bg-[#d9d9d9] rounded-md mb-6 flex items-center justify-center relative overflow-hidden">
                        {pkg.mediumUrl || pkg.imageUrl ? (
                          <img src={pkg.mediumUrl || pkg.imageUrl} alt={pkg.name} className="w-full h-full object-cover" />
                        ) : (
                          <svg className="w-16 h-16 text-[#646464]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>

                      <span className="text-[11px] font-bold text-[#808080] bg-[#e0e0e0] px-3 py-1 rounded-full uppercase tracking-wide mb-3">
                        {sidebarCategories.find(c => (c.categorycode || "").toUpperCase() === (pkg.categorycode || "").toUpperCase())?.name || (pkg.isBundle ? "Bundle" : "Package")}
                      </span>

                      <h3 className="text-xl font-bold text-[#646464] mb-3 leading-tight">
                        {pkg.name}
                      </h3>

                      <p className="text-[13px] text-[#808080] mb-6 leading-relaxed px-2">
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
                          {minT !== null && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {isMonthly && !isFixed ? "30 days / month" : `${minT} days`}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-200">
                <p className="text-gray-400 font-medium">No packages found matching your filters.</p>
                <button onClick={() => { setMinPrice(""); setMaxPrice(""); setMinTimeline(""); setMaxTimeline(""); setActiveCategoryId("all"); }} className="mt-4 text-[#5356ff] font-bold text-sm hover:underline">
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
