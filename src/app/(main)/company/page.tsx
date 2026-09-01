"use client";

import React from "react";
import Link from "next/link";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";

export default function CompanyPage() {
  return (
    <div className="flex flex-col min-h-screen font-sans bg-[#050A15] text-white selection:bg-[#5356ff] selection:text-white">
      {/* ── Hero Section ────────────────────────────────────────────── */}
      <main className="flex-grow pt-20 md:pt-24 pb-8 md:pb-12 overflow-hidden">
        <section className="relative min-h-[85vh] flex flex-col items-center justify-center text-center px-4">
          {/* Glowing orb */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] md:w-[800px] h-[600px] md:h-[800px] bg-[#5356ff] rounded-full mix-blend-screen filter blur-[150px] opacity-10 animate-pulse" />

          <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center">
            <h1 className="text-5xl md:text-7xl lg:text-[90px] font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-[#888888] mb-8 leading-[1.05] tracking-tight">
              World Class Websites &{" "}
              <br className="hidden md:block" />
              Digital Marketing.
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl leading-relaxed font-light">
              We don&apos;t just build websites; we create comprehensive digital ecosystems
              designed to dominate search engines and accelerate growth.
            </p>
            <Link href="/help-support/contact-us">
              <button className="px-10 py-5 rounded-2xl bg-white text-[#050A15] font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_60px_rgba(255,255,255,0.25)] flex items-center gap-3 group">
                Start Your Project
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </Link>
          </div>
        </section>

        {/* ── Stats Bar ───────────────────────────────────────────────── */}
        <section className="py-12 md:py-16 bg-[#0A0F1C] border-y border-white/5 relative z-20">
          <div className="container mx-auto px-4 max-w-[1600px]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4 divide-y md:divide-y-0 md:divide-x divide-white/5 text-center">
              <div className="flex flex-col items-center justify-center pt-8 md:pt-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-4xl md:text-5xl font-black text-white">5.0</span>
                  <svg className="w-8 h-8 text-[#5356ff]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <span className="text-gray-500 uppercase tracking-[0.2em] text-[10px] font-bold">Google Rating (53+ Reviews)</span>
              </div>
              <div className="flex flex-col items-center justify-center pt-8 md:pt-0">
                <span className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">100%</span>
                <span className="text-gray-500 uppercase tracking-[0.2em] text-[10px] font-bold">Money-Back Guarantee</span>
              </div>
              <div className="flex flex-col items-center justify-center pt-8 md:pt-0">
                <span className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">∞</span>
                <span className="text-gray-500 uppercase tracking-[0.2em] text-[10px] font-bold">Unlimited Revisions</span>
              </div>
              <div className="flex flex-col items-center justify-center pt-8 md:pt-0">
                <span className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">24/7</span>
                <span className="text-gray-500 uppercase tracking-[0.2em] text-[10px] font-bold">Active Support Team</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Our DNA Section ─────────────────────────────────────────── */}
        <section className="py-16 md:py-32 relative">
          <div className="container mx-auto px-4 md:px-8 lg:px-[54px] max-w-[1600px]">
            <div className="mb-10 md:mb-20 max-w-2xl">
              <h2 className="text-[#5356ff] font-bold uppercase tracking-[0.3em] text-xs mb-4 block">Our DNA</h2>
              <h3 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                Built on strong foundations. Delivered with precision.
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-auto md:auto-rows-[320px]">
              {/* Card 1 – wide */}
              <div className="md:col-span-2 relative rounded-[2rem] overflow-hidden group bg-white/5 border border-white/5 p-10 flex flex-col justify-end min-h-[320px]">
                <div className="absolute inset-0 bg-gradient-to-t from-[#050A15] via-[#050A15]/60 to-transparent z-10 transition-opacity group-hover:opacity-80" />
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#5356ff_1px,transparent_1px)] [background-size:20px_20px] mix-blend-overlay" />
                <div className="relative z-20">
                  <h4 className="text-3xl font-bold text-white mb-4">Dedicated to Your Success</h4>
                  <p className="text-gray-400 text-lg max-w-xl font-light">
                    We provide each of our clients with a custom web presence that is built to reach their individual goals and surpass the competition.
                  </p>
                </div>
              </div>

              {/* Card 2 */}
              <div className="relative rounded-[2rem] bg-[#0A0F1C] border border-white/5 p-10 flex flex-col justify-between group overflow-hidden min-h-[320px]">
                <div className="absolute inset-0 bg-gradient-to-br from-[#5356ff]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-[#5356ff]/50 transition-colors">
                  <svg className="w-7 h-7 text-[#5356ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="relative z-10">
                  <h4 className="text-2xl font-bold text-white mb-3">Total Transparency</h4>
                  <p className="text-gray-400 font-light leading-relaxed">Integrity and absolute clarity in every single project milestone and deliverable.</p>
                </div>
              </div>

              {/* Card 3 – full width */}
              <div className="md:col-span-3 relative rounded-[2rem] bg-[#0A0F1C] border border-white/5 p-10 flex flex-col md:flex-row items-start md:items-center justify-between group overflow-hidden min-h-[320px]">
                <div className="absolute right-0 top-0 h-full w-2/3 bg-gradient-to-l from-[#5356ff]/10 via-[#5356ff]/5 to-transparent skew-x-[-15deg] transform translate-x-10 group-hover:translate-x-0 transition-transform duration-700" />
                <div className="relative z-10 max-w-md mb-8 md:mb-0">
                  <h4 className="text-3xl font-bold text-white mb-4">Unlimited Potential</h4>
                  <p className="text-gray-400 text-lg font-light leading-relaxed">
                    From complete rebranding to massive e-commerce builds, you get an elite dedicated in-house team for it all.
                  </p>
                </div>
                <div className="relative z-10 hidden md:flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md group-hover:border-[#5356ff]/30 group-hover:rotate-45 transition-all duration-500">
                  <svg className="w-10 h-10 text-white group-hover:text-[#5356ff] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Global Presence Section ──────────────────────────────────── */}
        <section className="py-16 md:py-32 relative border-t border-white/5">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#5356ff]/50 to-transparent" />
          <div className="container mx-auto px-4 md:px-8 lg:px-[54px] max-w-[1600px] relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-12 md:mb-20">
              <span className="text-[#5356ff] font-bold uppercase tracking-[0.3em] text-xs mb-4 block">World Class Agency</span>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Global Presence</h2>
              <p className="text-gray-400 text-lg font-light leading-relaxed">
                Society Web Solutions operates internationally with premier physical headquarters located in the US and Europe.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* US Office */}
              <div className="relative p-[1px] rounded-[2rem] bg-gradient-to-b from-white/10 to-transparent hover:from-[#5356ff]/50 transition-colors duration-500 group">
                <div className="flex flex-col p-12 bg-[#0A0F1C] rounded-[2rem] h-full overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#5356ff] to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex justify-between items-start mb-16">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-white group-hover:bg-[#5356ff] group-hover:border-[#5356ff] transition-colors shadow-lg shadow-black/50">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="px-4 py-1 rounded-full bg-white/5 text-gray-400 text-[10px] font-bold tracking-[0.2em] uppercase border border-white/5 group-hover:border-[#5356ff]/30 group-hover:text-white transition-colors">
                      HQ Office
                    </span>
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-4">United States</h3>
                  <div className="mt-auto space-y-2 text-gray-500 font-light text-lg">
                    <p>1645 Palm Beach Lakes Blvd</p>
                    <p>West Palm Beach, FL, US</p>
                    <a href="tel:+15619353359" className="inline-block pt-6 text-white hover:text-[#5356ff] font-medium transition-colors text-xl">
                      +1 (561) 935-3359
                    </a>
                  </div>
                </div>
              </div>

              {/* Europe Office */}
              <div className="relative p-[1px] rounded-[2rem] bg-gradient-to-b from-white/10 to-transparent hover:from-[#5356ff]/50 transition-colors duration-500 group">
                <div className="flex flex-col p-12 bg-[#0A0F1C] rounded-[2rem] h-full overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-purple-600 to-[#5356ff] opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex justify-between items-start mb-16">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-white group-hover:bg-[#5356ff] group-hover:border-[#5356ff] transition-colors shadow-lg shadow-black/50">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.204 11h9.792c-.105-1.293-.111-2.614.05-3.89h-6.84a30.012 30.012 0 0110.027-4.143 8.01 8.01 0 01-1.077 8.033A10.003 10.003 0 0113.84 21m-6-10v5.8c0 .267.14.506.37.62l1.63.8v4.28a.5.5 0 00.785.41l3.59-2.62" />
                      </svg>
                    </div>
                    <span className="px-4 py-1 rounded-full bg-white/5 text-gray-400 text-[10px] font-bold tracking-[0.2em] uppercase border border-white/5 group-hover:border-[#5356ff]/30 group-hover:text-white transition-colors">
                      INT&apos;L BRANCH
                    </span>
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-4">Europe</h3>
                  <div className="mt-auto space-y-2 text-gray-500 font-light text-lg">
                    <p>Viru Väljak 2</p>
                    <p>Tallinn, Estonia</p>
                    <a href="tel:+37256813501" className="inline-block pt-6 text-white hover:text-[#5356ff] font-medium transition-colors text-xl">
                      +372 5681 3501
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA Section ─────────────────────────────────────────────── */}
        <section className="py-16 md:py-32 relative overflow-hidden group bg-gradient-to-b from-transparent to-[#050A15]">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#5356ff] rounded-full mix-blend-screen filter blur-[200px] opacity-[0.15] group-hover:opacity-[0.25] transition-opacity duration-1000" />
          <div className="container mx-auto px-4 md:px-8 lg:px-[54px] max-w-[1600px] relative z-10 text-center">
            <h2 className="text-5xl md:text-7xl font-bold text-white mb-8 tracking-tight">
              Ready to{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5356ff] to-[#8a8aff]">accelerate</span>{" "}
              your growth?
            </h2>
            <p className="text-gray-400 text-xl md:text-2xl font-light mb-12 max-w-2xl mx-auto leading-relaxed">
              Schedule a free consultation with our experts today and let&apos;s craft something truly outstanding.
            </p>
            <Link href="/help-support/contact-us">
              <button className="px-12 py-6 bg-white text-[#050A15] active:scale-95 rounded-2xl font-black transition-all shadow-[0_20px_40px_rgba(255,255,255,0.05)] hover:shadow-[0_20px_60px_rgba(255,255,255,0.15)] uppercase tracking-widest text-sm hover:scale-105">
                Connect With Us
              </button>
            </Link>
          </div>
        </section>

        {/* ── Newsletter Section ───────────────────────────────────────── */}
        <section className="py-12 md:py-20 relative z-20">
          <div className="container mx-auto px-4 md:px-8 lg:px-[54px] max-w-[1600px]">
            <SupportNewsletter />
          </div>
        </section>
      </main>
    </div>
  );
}
