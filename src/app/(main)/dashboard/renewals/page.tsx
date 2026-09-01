"use client";

import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import DashboardSubNav from "@/components/dashboard/DashboardSubNav";
import StripeCheckout from "@/components/dashboard/StripeCheckout";
import { projectService } from "@/lib/projectService";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

const GlobeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-300">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const ChevronDown = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export default function RenewalsPage() {
  const [renewals, setRenewals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const res = await projectService.getRenewals();
        if (res?.data) {
          setRenewals(res.data);
        }
      } catch (e) {
        console.error("Failed to fetch renewals:", e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="bg-white min-h-screen flex flex-col font-sans">
      <DashboardSubNav />
      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-8 md:pt-12 pb-12">
        <h1 className="text-[28px] md:text-[32px] font-medium text-primary-100 mb-8 md:mb-12">
          Renewals
        </h1>

        {isLoading ? (
          <div className="flex flex-col gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-gray-200 rounded-[4px] h-32 animate-pulse bg-gray-50" />
            ))}
          </div>
        ) : renewals.length === 0 ? (
          <div className="border border-gray-300 rounded-[4px] p-20 flex flex-col items-center justify-center text-center bg-gray-50/30">
            <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center mb-6">
              <GlobeIcon />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No projects due for renewal</h3>
            <p className="text-sm text-gray-500 max-w-sm">Your monthly subscription projects and maintenance plans will appear here when they are close to expiry.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {renewals.map((project) => {
              const isExpanded = expandedId === project._id;
              const renewalPrice = typeof project.renewalPrice === "number" ? project.renewalPrice : parseFloat(String(project.renewalPrice || 0).replace(/[^0-9.]/g, ""));

              return (
                <div
                  key={project._id}
                  className={`border border-gray-300 rounded-[4px] overflow-hidden transition-all duration-300 ${isExpanded ? "ring-1 ring-primary-300 shadow-md" : "hover:bg-gray-50"}`}
                >
                  <div
                    className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer"
                    onClick={() => toggleExpand(project._id)}
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-gray-100 rounded-[4px] flex items-center justify-center text-primary-300">
                        <GlobeIcon />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{project.title}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{project.packageName || "Maintenance"}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300 hidden sm:block" />
                          <span className="text-xs font-bold text-primary-300 uppercase tracking-wider">
                            Next Renewal: {formatDate(project.nextRenewalDate)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-8 justify-between md:justify-end">
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Renewal Cost</p>
                        <p className="text-xl font-black text-gray-800">
                          {new Intl.NumberFormat("en-US", { style: "currency", currency: project.currency || "USD" }).format(renewalPrice)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <button
                          className={`px-8 py-2.5 rounded-[4px] text-xs font-bold transition-all ${isExpanded ? "bg-gray-200 text-gray-700" : "bg-[#5356ff] text-white hover:bg-[#3232b7]"}`}
                        >
                          {isExpanded ? "Collapse" : "Renew Now"}
                        </button>
                        <ChevronDown className={`text-gray-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-[#F9FAFB] p-6 md:p-12 animate-in slide-in-from-top-4 duration-300">
                      <Elements stripe={stripePromise}>
                        <StripeCheckout
                          type="PROJECT"
                          entityId={project._id}
                          entityNumber={project.projectNumber || project._id.slice(-6).toUpperCase()}
                          title={`Renewal: ${project.title}`}
                          description={`Monthly maintenance renewal for ${project.title}`}
                          date={project.nextRenewalDate || new Date().toISOString()}
                          totalCost={renewalPrice}
                          amountPaid={0}
                          lineItems={project.deliverableItems || ["Standard Monthly Maintenance"]}
                          nativeCurrency={project.currency || "usd"}
                          successRedirectUrl="/dashboard/payment-history"
                          hideCurrencyToggle={false}
                        />
                      </Elements>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
