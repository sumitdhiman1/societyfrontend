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
import Toast from "@/components/common/Toast";
import { countryService, Country } from "@/lib/countryService";

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

const Tooltip = ({ className = "", text = "Timeline is an estimate based on average project delivery." }) => {
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

function PackageDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const { openChat } = useChatWidget();
  const packageId = params?.id as string;
  const { currency, setCurrency, conversionRate } = useCurrency();

  const [pkg, setPkg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<any>(null);
  const [projectNo, setProjectNo] = useState("");
  const [showVerifyPopup, setShowVerifyPopup] = useState(false);
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<any>(null);
  const [userCredits, setUserCredits] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState({ isOpen: false, type: "success" as "success" | "error", title: "", message: "" });
  const [country, setCountry] = useState("US");
  const [countriesList, setCountriesList] = useState<Country[]>([]);

  useEffect(() => {
    setProjectNo(Math.random().toString(36).substring(2, 9).toUpperCase());
    
    const initUser = async () => {
      const currentUser = authService.getUser();
      if (currentUser) {
        setUser(currentUser);
        setEmail(currentUser.email || "");
        try {
          const res = await profileService.getMyProfile();
          if (res?.data) {
            setCountry(res.data.country || res.data.billingCountry || "US");
            setUserCredits(res.data.credits || 0);
            authService.updateInternalUser({ credits: res.data.credits || 0 });
          } else if (currentUser.credits !== undefined) {
            setUserCredits(currentUser.credits);
          }
        } catch (err) {
          console.error("Failed to fetch user credits", err);
          if (currentUser.credits !== undefined) setUserCredits(currentUser.credits);
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
        const res = await packagesService.getPackageById(packageId);
        if (res?.data) {
          setPkg(res.data);
          if (res.data.entityNumber) setProjectNo(res.data.entityNumber);
          const firstPaid = (res.data.columns || [])?.find((c: any) => parsePrice(c.price) > 0 || parsePrice(c.recurringAmount) > 0);
          if (firstPaid) setSelectedTier(firstPaid);
          else if (res.data.columns?.length > 0) setSelectedTier(res.data.columns[0]);
        }
      } catch (err) {
        console.error("Failed to load package details", err);
      } finally {
        setLoading(false);
      }
    };
    if (packageId) loadPkg();
  }, [packageId]);

  const features = useMemo(() => {
    if (!pkg) return [];
    if (pkg.features && pkg.features.length > 0) return pkg.features;
    return [];
  }, [pkg]);

  const columns = useMemo(() => {
    if (!pkg) return [];
    if (pkg.columns && pkg.columns.length > 0) return pkg.columns;
    return [];
  }, [pkg]);

  const handleTierSelect = (tier: any) => {
    setSelectedTier(tier);
    setTimeout(() => {
      const el = document.getElementById("payment-section");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleSaveOrder = async (tier: any) => {
    if (!(parsePrice(tier.price) > 0 || parsePrice(tier.recurringAmount) > 0)) {
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
      
      const res = await paymentService.createOrder({
        amount: setupPrice,
        currency: currency,
        creditsToApply: 0,
        metadata: {
          type: "PACKAGE",
          packageId: packageId,
          packageName: pkg.name,
          tierId: tier.id,
          tierTitle: tier.title,
          title: pkg.name,
          description: pkg.description,
          lineItems: oneTimeItems,
          recurringAmount: recurringPrice,
          fullAmount: setupPrice,
          duration: getDurationLabel(tier),
          billingType: tier.billingType || "fixed"
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

  const getIncludedFeatures = (section: "one-time" | "monthly" = "one-time") => {
    if (!selectedTier) return [];
    return features.filter((f: any) => {
      const val = f.values?.[selectedTier.id];
      return val && val !== false && (section === "one-time" ? (!f.section || f.section === "one-time") : (f.section === "monthly"));
    });
  };

  const formatPrice = (amount: number) => {
    const isEur = currency?.toLowerCase() === "eur";
    let displayAmount = amount;
    if (isEur && conversionRate) {
      displayAmount = 10 * Math.round(amount / conversionRate / 10);
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency?.toUpperCase() || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(displayAmount);
  };

  const getVatRate = () => {
    if (!country) return 0;
    const directRate = countryService.getVatRateSync(country);
    if (directRate !== undefined && directRate > 0) return directRate;
    const found = countriesList.find(
      (c) =>
        c.iso2?.toUpperCase() === country.toUpperCase() ||
        c.iso3?.toUpperCase() === country.toUpperCase() ||
        c.name?.toLowerCase() === country.toLowerCase()
    );
    return found ? (Number(found.vatRate) || 0) : 0;
  };

  const getVatAmount = (amount: number) => {
    const rate = getVatRate();
    return rate > 0 ? (amount * rate) / 100 : 0;
  };

  const getDurationLabel = (tier: any) => {
    if (!tier) return "1 Week";
    if (tier.timeline) return `${tier.timeline} Week${tier.timeline > 1 ? "s" : ""}`;
    return tier.period || "1 Week";
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB] text-gray-400 font-bold uppercase tracking-widest text-sm">Loading Checkout...</div>;
  if (!pkg) return <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB] text-red-500 font-bold">Package not found.</div>;

  return (
    <div className="bg-[#F8F9FB] min-h-screen flex flex-col font-sans text-[#404040]">
      <DashboardSubNav />
      <StatusPopup
        isOpen={status.isOpen}
        onClose={() => setStatus({ ...status, isOpen: false })}
        type={status.type}
        title={status.title}
        message={status.message}
      />
      
      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-8 md:pt-12 pb-20">
        
        {/* Hero Section */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-10 md:gap-12 mb-10 md:mb-16">
          <div className="lg:w-[50%] flex flex-col">
            <h1 className="text-[28px] md:text-[48px] lg:text-[64px] font-bold text-[#363636] leading-[1.1] mb-4 md:mb-6 tracking-tight">{pkg.name}</h1>
            <p className="text-[#808080] leading-relaxed text-base md:text-lg max-w-xl font-medium">{pkg.description || "Professional standalone services designed for quick turnaround and high-quality results."}</p>
          </div>
          <div className="lg:w-[50%] flex items-center justify-center lg:justify-end">
            <div className="w-full max-w-[620px] aspect-[16/10] bg-[#e0e0e0] rounded-[4px] overflow-hidden shadow-sm border border-gray-200 relative">
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

        {columns.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-[10px] shadow-[0px_5px_25px_#0000000D] p-8 md:p-12 text-center max-w-2xl mx-auto my-12">
            <div className="w-16 h-16 bg-blue-50 text-[#3535b8] rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-[#3535b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#363636] mb-4">Custom Scope Service</h2>
            <p className="text-[#808080] text-base leading-relaxed mb-8 max-w-lg mx-auto">
              This service is tailored specifically to your unique business goals, requirements, and budget. Request a custom quote today and our expert team will deliver a personalized plan for you.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={() => router.push("/dashboard/new-project/custom-quote")}
                className="px-8 py-4 bg-[#3535b8] hover:bg-[#2a2a9a] text-white rounded-lg font-bold text-sm tracking-wider uppercase transition-all shadow-md active:scale-[0.98] cursor-pointer"
              >
                Request Custom Quote
              </button>
              <button
                onClick={openChat}
                className="px-8 py-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-bold text-sm tracking-wider uppercase transition-all active:scale-[0.98] cursor-pointer"
              >
                Contact Support
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Comparison Table */}
            <div className="border border-gray-200 rounded-[10px] overflow-hidden shadow-[0px_5px_25px_#0000000D] bg-white mb-10 md:mb-16">
              <div className="overflow-x-auto">
                <div className="min-w-[1000px]">
                  <div className="grid divide-x divide-gray-100 border-b border-gray-100" style={{ gridTemplateColumns: `minmax(200px, 300px) repeat(${columns.length}, 1fr)` }}>
                    <div className="p-6 md:p-8 flex items-center bg-white">
                      <h3 className="text-xl md:text-[32px] font-bold text-[#646464] leading-[1.1]">What&apos;s<br className="hidden md:block" /> Included?</h3>
                    </div>
                    {columns.map((col: any, idx: number) => (
                      <div key={idx} className={`p-6 md:p-8 text-center flex flex-col justify-center ${col.id === 'col_custom' || idx === columns.length - 1 ? "bg-[#f5f5f5]" : "bg-[#fafafa]"}`}>
                        <span className="text-[11px] md:text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-2">{col.title}</span>
                        <div className="text-[#646464]">
                          {parsePrice(col.price) > 0 || parsePrice(col.recurringAmount) > 0 ? (
                            <div className="flex flex-col">
                              <span className="text-[32px] md:text-[40px] font-black leading-none">{formatPrice(parsePrice(col.price || col.recurringAmount))}</span>
                              <span className="text-[10px] md:text-[12px] font-bold text-gray-400 uppercase tracking-tighter mt-1">{col.billingType === 'monthly' ? "Per Month" : "Starting Price"}</span>
                            </div>
                          ) : (
                            <div className="text-[#646464] font-extrabold text-[20px] md:text-[28px] leading-tight">{col.price || "Get A Quote"}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="divide-y divide-gray-100">
                    {features.map((feature: any, fIdx: number) => (
                      <div key={fIdx} className="grid divide-x divide-gray-50 hover:bg-gray-50/50 transition-colors" style={{ gridTemplateColumns: `minmax(200px, 300px) repeat(${columns.length}, 1fr)` }}>
                        <div className="p-4 md:p-5 px-6 md:px-8 font-bold text-[#808080] text-[13px] md:text-[15px] flex items-center">{feature.name}</div>
                        {columns.map((col: any, cIdx: number) => {
                          const val = feature.values?.[col.id];
                          return (
                            <div key={cIdx} className="p-5 flex items-center justify-center">
                              {typeof val === "boolean" ? (
                                val ? <CheckIcon /> : <CrossIcon />
                              ) : val == null ? (
                                <span className="text-gray-300">-</span>
                              ) : (
                                <span className="text-[15px] font-bold text-[#646464]">{String(val)}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  <div className="grid divide-x divide-gray-100 border-t border-gray-100 bg-white" style={{ gridTemplateColumns: `minmax(200px, 300px) repeat(${columns.length}, 1fr)` }}>
                    <div className="p-6 md:p-8" />
                    {columns.map((col: any, idx: number) => (
                      <div key={idx} className="p-6 md:p-8 flex items-center justify-center">
                        <button
                          onClick={() => handleTierSelect(col)}
                          className={`w-full max-w-[160px] py-4 rounded-xl font-black text-[13px] uppercase tracking-widest transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 ${selectedTier?.id === col.id ? "bg-[#3535b8] text-white" : "bg-[#e0e0e0] text-[#3535b8] hover:bg-gray-200"}`}
                        >
                          {parsePrice(col.price) > 0 || parsePrice(col.recurringAmount) > 0 ? "Buy Now" : "Get Quote"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            {selectedTier && (
              <div className="animate-in slide-in-from-bottom duration-700" id="payment-section">
                <div className="text-center mb-12">
                  <h1 className="text-[32px] md:text-[42px] font-bold text-[#363636] mb-3">Complete Your Purchase Securely</h1>
                  <p className="text-[#808080] text-lg">Your information is protected and your project starts immediately.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                  <div className="lg:col-span-2">
                    {/* Project Summary Card */}
                    <div className="bg-white border border-gray-200 rounded-[10px] shadow-[0px_5px_25px_#0000000D] p-8 mb-8 relative">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div className="bg-[#e0e0e0] px-4 py-1.5 rounded-full w-fit">
                          <span className="text-[11px] text-[#808080] font-bold uppercase tracking-wider">Start Date: {new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}</span>
                        </div>
                        <div className="bg-[#e0e0e0] px-4 py-1.5 rounded-full w-fit flex items-center gap-2">
                          <span className="text-[11px] text-[#808080] font-bold uppercase tracking-wider">
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

                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                        <div className="flex-1">
                          <h3 className="text-2xl md:text-3xl font-bold text-[#646464] leading-tight mb-3">
                            {pkg.name} - {selectedTier?.title || "Select a plan"}
                          </h3>
                          <div className="text-[13px] text-[#808080] font-bold flex items-center gap-2">
                            <span>Project No: #{projectNo}</span>
                            <span className="text-gray-300">|</span>
                            <span>Timeline: {getDurationLabel(selectedTier)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-4">
                            <div className="text-[42px] md:text-[48px] font-black text-[#646464] leading-none">
                              {formatPrice(parsePrice(selectedTier?.price || selectedTier?.recurringAmount || 0) + getVatAmount(parsePrice(selectedTier?.price || selectedTier?.recurringAmount || 0)))}
                            </div>
                            <div className="relative">
                              <select 
                                value={currency.toUpperCase()} 
                                onChange={(e) => setCurrency(e.target.value.toLowerCase())}
                                className="bg-white border border-gray-300 text-[#646464] text-xs font-bold rounded px-3 py-2 outline-none appearance-none pr-8 cursor-pointer shadow-sm hover:border-gray-400 transition-colors"
                              >
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                              </select>
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                          {getVatAmount(parsePrice(selectedTier?.price || selectedTier?.recurringAmount || 0)) > 0 && (
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                              Inc. {getVatRate()}% VAT ({formatPrice(getVatAmount(parsePrice(selectedTier?.price || selectedTier?.recurringAmount || 0)))})
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-[14px] text-[#808080] leading-relaxed mb-8 border-t border-gray-100 pt-6">
                        {pkg.description || "Professional standalone services designed for quick turnaround and high-quality results."}
                      </p>

                      <div className="border-t border-gray-100 pt-6">
                        <h4 className="text-xs font-bold text-[#808080] uppercase tracking-widest mb-4">Features Included in this Tier:</h4>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4">
                          {getIncludedFeatures("one-time").map((f: any, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 text-[13px] text-[#646464]">
                              <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>{f.name}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <UnifiedPaymentForm
                      type="PACKAGE"
                      entityId={packageId}
                      entityNumber={projectNo}
                      title={`${pkg.name} - ${selectedTier?.title || ""}`}
                      description={pkg.description}
                      date={new Date().toISOString()}
                      totalCost={parsePrice(selectedTier?.price || selectedTier?.recurringAmount || 0)}
                      deliverableItems={[
                        {
                          description: "Service Delivery",
                          details: `${pkg.name} - ${selectedTier?.title}`,
                          amount: parsePrice(selectedTier?.price || selectedTier?.recurringAmount || 0),
                          duration: getDurationLabel(selectedTier),
                          unit: "",
                          isAddOn: false
                        }
                      ]}
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
                      hideHeader={true}
                      metadata={{
                        packageId,
                        packageName: pkg.name,
                        tierTitle: selectedTier?.title,
                        projectNo
                      }}
                    />

                    <div className="mt-4">
                      <button
                        onClick={() => handleSaveOrder(selectedTier)}
                        disabled={processing}
                        className="w-full px-6 py-3 bg-white border border-gray-300 text-[#808080] font-bold text-xs uppercase tracking-widest hover:bg-gray-50 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                      >
                        {processing ? "Processing..." : "Save Order & Pay Later (Generate Invoice)"}
                      </button>
                    </div>
                  </div>

                  {/* Sidebar Section */}
                  <div className="bg-white border border-gray-200 rounded-[10px] shadow-[0px_5px_25px_#0000000D] p-8 text-center sticky top-28">
                    <h3 className="text-xl font-bold text-[#646464] mb-3">Questions Before You Pay?</h3>
                    <p className="text-[13px] text-[#808080] mb-8 leading-relaxed">
                      Our support team is here to help with pricing, payments, or package details—no pressure.
                    </p>
                    <button 
                      onClick={openChat} 
                      className="w-full bg-[#3535b8] hover:bg-[#2a2a9a] text-white py-3.5 rounded-md font-bold text-sm transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      Contact Support
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <Toast
          isOpen={showVerifyPopup}
          onClose={() => setShowVerifyPopup(false)}
          type="info"
          message="Please verify your email to access full checkout features."
        />
      </main>
    </div>
  );
}

export default function PackageDetailsPage() {
  return (
    <PackageDetailsContent />
  );
}
