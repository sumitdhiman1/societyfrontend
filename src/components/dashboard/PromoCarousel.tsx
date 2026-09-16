"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import HttpClient from "@/lib/HttpClient";
import CacheManager from "@/lib/CacheManager";

export default function PromoCarousel() {
  const router = useRouter();
  const [slides, setSlides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Touch / swipe tracking
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  const defaultSlides = [
    {
      title: "New Project Tracking and Support Tools Are Here!",
      subtitle:
        "Follow updates, share feedback, and get support directly inside your project workspace. Sign up to gain access!",
      badge: "",
      image: "https://res.cloudinary.com/dgg6e3flf/image/upload/v1786970418/cms-assets/Frame_2920.webp",
      link: "/register",
    },
    {
      title: "Already Have a Project Idea in Mind? Try Building Your Own Quote!",
      subtitle:
        "Jump into the price calculator and create a custom package in minutes. Click here!",
      badge: "",
      image: "https://res.cloudinary.com/dgg6e3flf/image/upload/v1786970167/cms-assets/Frame_2918_1.webp",
      link: "/calculator",
    },
    {
      title: "Our Web Experts Are Here for You. Get a Free Second Opinion!",
      subtitle:
        "We’ll check your current website or another agency’s work — no cost, no commitment. Click here to begin.",
      badge: "",
      image: "https://res.cloudinary.com/dgg6e3flf/image/upload/v1786970169/cms-assets/Frame_2919_1.webp",
      link: "/dashboard/new-project/packages?categorycode=ANALYSIS&sortBy=order_asc",
    },
  ];

  const bgImages = [
    "https://res.cloudinary.com/dgg6e3flf/image/upload/v1786970418/cms-assets/Frame_2920.webp",
    "https://res.cloudinary.com/dgg6e3flf/image/upload/v1786970167/cms-assets/Frame_2918_1.webp",
    "https://res.cloudinary.com/dgg6e3flf/image/upload/v1786970169/cms-assets/Frame_2919_1.webp",
  ];

  useEffect(() => {
    let isMounted = true;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    const fetchSlides = async (attempt = 0) => {
      try {
        const client = new HttpClient();
        const res = await CacheManager.getInstance().getOrFetch(
          "page_home",
          () => client.get("/pages/getpagebyslug/home"),
          5 * 60 * 1000, // 5 minutes — CMS data is mostly static
        );

        if (!isMounted) return;

        const sections = res?.data?.sections || [];
        const heroSection = sections.find(
          (s: any) =>
            s.type === "hero_slider" ||
            s.type === "hero_split" ||
            s.id === "slider" ||
            s.type === "slider",
        );

        const rawSlides =
          heroSection?.slides ||
          heroSection?.data?.slides ||
          heroSection?.data?.items;

        if (Array.isArray(rawSlides) && rawSlides.length > 0) {
          const parsedSlides = rawSlides.map((s: any, idx: number) => ({
            id: s.id || `slide-${idx}`,
            title: s.title || defaultSlides[idx % defaultSlides.length]?.title || "",
            subtitle: s.subtitle || s.description || defaultSlides[idx % defaultSlides.length]?.subtitle || "",
            badge: s.badge || s.tag || "",
            image: s.image || s.imageUrl || bgImages[idx % bgImages.length],
            link: s.link || s.btnUrl || s.url || defaultSlides[idx % defaultSlides.length]?.link || "",
          }));
          if (isMounted) setSlides(parsedSlides);
        } else {
          if (isMounted) setSlides(defaultSlides);
        }
      } catch (error) {
        console.error(`Failed to fetch slides (attempt ${attempt + 1}):`, error);
        if (isMounted) {
          if (attempt < 2) {
            // Auto-retry up to 2 more times with backoff (1s, 2s)
            retryTimeout = setTimeout(() => fetchSlides(attempt + 1), (attempt + 1) * 1000);
          } else {
            // After 3 total attempts, fall back to default slides
            setSlides(defaultSlides);
          }
        }
      } finally {
        if (isMounted && retryTimeout === null) setLoading(false);
      }
    };

    fetchSlides();

    return () => {
      isMounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, []);

  const activeSlides = slides.length > 0 ? slides : defaultSlides;
  const totalSlides = activeSlides.length;

  const goToNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const goToPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  // Auto-play every 6 seconds when not hovered
  useEffect(() => {
    if (isHovered || totalSlides <= 1) return;
    const interval = setInterval(goToNext, 6000);
    return () => clearInterval(interval);
  }, [isHovered, totalSlides, goToNext]);

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current !== null) {
      touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
    }
  };

  const handleTouchEnd = () => {
    if (touchDeltaX.current > 40) {
      goToPrev();
    } else if (touchDeltaX.current < -40) {
      goToNext();
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
  };

  // Mouse drag handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    touchStartX.current = e.clientX;
    touchDeltaX.current = 0;
    isDragging.current = true;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current && touchStartX.current !== null) {
      touchDeltaX.current = e.clientX - touchStartX.current;
    }
  };

  const handleMouseUp = () => {
    if (isDragging.current) {
      if (touchDeltaX.current > 50) {
        goToPrev();
      } else if (touchDeltaX.current < -50) {
        goToNext();
      }
      isDragging.current = false;
      touchStartX.current = null;
      touchDeltaX.current = 0;
    }
  };

  const handleSlideClick = (slide: any) => {
    // If user dragged more than 10px, don't trigger click
    if (Math.abs(touchDeltaX.current) > 10) return;

    const targetLink = slide.link || slide.btnUrl || slide.url;
    if (!targetLink) return;

    if (targetLink.startsWith("http://") || targetLink.startsWith("https://")) {
      window.open(targetLink, "_self");
    } else {
      router.push(targetLink);
    }
  };

  if (loading) {
    return (
      <div
        className="relative w-full rounded-[8px] overflow-hidden shadow-[0px_5px_25px_#0000000D] bg-[#0D1939] animate-pulse"
        style={{ minHeight: "209px", borderRadius: "8px" }}
      >
        <div className="h-full w-full bg-gray-700/20" />
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        isDragging.current = false;
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="relative w-full rounded-[8px] overflow-hidden shadow-[0px_5px_25px_#0000000D] bg-[#0D1939] transition-colors select-none"
      style={{
        minHeight: "209px",
        maskImage: "-webkit-radial-gradient(center, white, black)",
        isolation: "isolate",
        transform: "translateZ(0px)",
        borderRadius: "8px",
      }}
    >
      {/* Slide Track */}
      <div
        className="flex w-full h-full relative z-10 transition-transform duration-500 ease-out will-change-transform"
        style={{
          minHeight: "209px",
          transform: `translateX(-${activeIndex * 100}%)`,
        }}
      >
        {activeSlides.map((slide, i) => {
          const slideBg =
            slide.image ||
            slide.imageUrl ||
            bgImages[i % bgImages.length] ||
            bgImages[0];
          const hasLink = Boolean(slide.link || slide.btnUrl || slide.url);

          return (
            <div
              key={slide.id || `slide-${i}`}
              onClick={() => handleSlideClick(slide)}
              className={`w-full shrink-0 flex flex-col justify-start px-8 md:px-10 snap-center pt-10 pb-16 relative rounded-[8px] ${
                hasLink ? "cursor-pointer" : ""
              }`}
              style={{
                minHeight: "209px",
                borderRadius: "8px",
                backgroundImage: `url("${slideBg}")`,
                backgroundSize: "cover",
                backgroundPosition: "center center",
              }}
            >
              <div
                className="w-full relative z-[2]"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              >
                <h2 className="text-left font-bold text-lg md:text-[24px] leading-tight md:leading-[30px] lg:leading-[28px] tracking-[0px] text-[#FFFFFF]">
                  {slide.title}
                </h2>
                <p className="text-white text-[14px] leading-[22px] font-semibold opacity-90 mt-2 lg:mt-2">
                  {slide.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Slide Navigation Dots */}
      {totalSlides > 1 && (
        <div className="absolute bottom-8 md:bottom-9 lg:bottom-12 left-8 md:left-10 flex gap-3 z-20">
          {activeSlides.map((_, i) => (
            <button
              key={`promo-dot-${i}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex(i);
              }}
              className={`w-4 h-4 rounded-full transition-all duration-300 cursor-pointer ${
                i === activeIndex
                  ? "bg-white"
                  : "border border-white/50 hover:bg-white/20"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}


