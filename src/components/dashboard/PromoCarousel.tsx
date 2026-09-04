"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import HttpClient from "@/lib/HttpClient";
import CacheManager from "@/lib/CacheManager";

export default function PromoCarousel() {
  const [slides, setSlides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const defaultSlides = [
    {
      title: "Bring Your Ideas To Life",
      subtitle:
        "Connect with top creators and developers to build your next big project.",
      badge: "NEW",
    },
    {
      title: "Professional Quality, Faster Delivery",
      subtitle:
        "Get high-end results with our streamlined project management tools.",
      badge: "PRO",
    },
  ];

  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const client = new HttpClient();
        const res = await CacheManager.getInstance().getOrFetch(
          "page_home",
          () => client.get("/pages/getpagebyslug/home"),
          600000,
        );
        const heroSection = res?.data?.sections?.find(
          (s: any) => s.type === "hero_split",
        );
        if (heroSection?.slides && heroSection.slides.length > 0) {
          setSlides(heroSection.slides);
        } else {
          setSlides(defaultSlides);
        }
      } catch (error) {
        console.error("Failed to fetch slides:", error);
        setSlides(defaultSlides);
      } finally {
        setLoading(false);
      }
    };
    fetchSlides();
  }, []);

  const handleScroll = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (scrollRef.current) {
        const { scrollLeft, clientWidth } = scrollRef.current;
        setActiveIndex(Math.round(scrollLeft / clientWidth));
      }
    }, 50);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div
        className="relative w-full h-[209px] rounded-[8px] overflow-hidden
       flex items-center shadow-[0px_5px_25px_#0000000D] bg-[#0D1939] animate-pulse"
      >
        <div className="h-full w-full bg-gray-700/20" />
      </div>
    );
  }

  const activeSlides = slides.length > 0 ? slides : defaultSlides;

  return (
    <div
      className="relative w-full md:min-h-[209px]  rounded-[8px] 
    overflow-hidden flex-col justify-start  flex px-8 md:px-10 snap-center pt-10 pb-16 
     shadow-[0px_5px_25px_#0000000D] bg-[#0D1939] transition-colors"
    >
      <>
        <Image
          src="/images/Brand2.webp"
          alt="Background Pattern"
          fill
          className="object-cover absolute inset-0 z-0 opacity-10 mix-blend-overlay"
          priority
        />
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory h-full  w-full relative z-10"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {activeSlides.map((slide, i) => (
            <div
              key={`promo-slide-${i}`}
              className="w-full shrink-0 h-full flex flex-col
             justify-center snap-center "
            >
              <div
                className="w-full"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              >
                {slide.badge && (
                  <div className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full mb-2">
                    {slide.badge}
                  </div>
                )}
                <h2 className="text-left font-bold text-lg md:text-[24px] leading-tight md:leading-[30px] lg:leading-[28px] tracking-[0px] text-[#FFFFFF]">
                  {slide.title}
                </h2>
                <p className="text-white text-[14px] leading-[22px]  opacity-90 mt-2 lg:mt-2">
                  {slide.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </>

      <div className="absolute bottom-[47px] left-8 md:left-10 flex gap-3 z-20">
        {activeSlides.map((_, i) => (
          <button
            key={`promo-dot-${i}`}
            onClick={() => {
              if (scrollRef.current) {
                scrollRef.current.scrollTo({
                  left: i * scrollRef.current.clientWidth,
                  behavior: "smooth",
                });
              }
            }}
            className={`md:w-4 md:h-4 h-2.5 w-2.5 rounded-full transition-all duration-300 cursor-pointer ${i === activeIndex
              ? "bg-white"
              : "border border-white/50 hover:bg-white/20"
              }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
