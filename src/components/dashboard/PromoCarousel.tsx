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
      title: "Bring Your Ideas To Life",
      subtitle:
        "Connect with top creators and developers to build your next big project.",
      badge: "NEW",
      image: "/images/crousal1.webp",
      link: "/dashboard/new-project",
    },
    {
      title: "Professional Quality, Faster Delivery",
      subtitle:
        "Get high-end results with our streamlined project management tools.",
      badge: "PRO",
      image: "/images/crousal2.webp",
      link: "/dashboard/new-project",
    },
  ];

  const bgImages = [
    "/images/crousal1.webp",
    "/images/crousal2.webp",
    "/images/crousal3.webp",
  ];

  useEffect(() => {
    let isMounted = true;
    const fetchSlides = async () => {
      try {
        const client = new HttpClient();
        const res = await CacheManager.getInstance().getOrFetch(
          "page_home",
          () => client.get("/pages/getpagebyslug/home"),
          30000,
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
            title: s.title || "",
            subtitle: s.subtitle || s.description || "",
            badge: s.badge || s.tag || "",
            image: s.image || s.imageUrl || bgImages[idx % bgImages.length],
            link: s.link || s.btnUrl || s.url || "",
          }));
          setSlides(parsedSlides);
        } else {
          setSlides(defaultSlides);
        }
      } catch (error) {
        console.error("Failed to fetch slides:", error);
        if (isMounted) setSlides(defaultSlides);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchSlides();

    return () => {
      isMounted = false;
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
        className="relative w-full h-[209px] rounded-[8px] overflow-hidden
       flex items-center shadow-[0px_5px_25px_#0000000D] bg-[#0D1939] animate-pulse"
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
      className="relative w-full h-[209px] rounded-[8px] overflow-hidden shadow-[0px_5px_25px_#0000000D] bg-[#0D1939] select-none"
    >
      {/* Track container with GPU-accelerated transform */}
      <div
        className="flex h-full w-full transition-transform duration-500 ease-out will-change-transform"
        style={{
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
              className={`relative w-full h-full flex-shrink-0 flex flex-col justify-center px-8 md:px-10 pb-12 pt-4 ${
                hasLink ? "cursor-pointer" : ""
              }`}
            >
              {/* Slide Background */}
              <Image
                src={slideBg}
                alt={slide.title || "Slide Background"}
                fill
                unoptimized
                sizes="(max-width: 1536px) 100vw, 1200px"
                className="object-cover absolute inset-0 z-0 select-none pointer-events-none"
                priority={i === 0}
              />

              {/* Gradient overlay for readability */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/35 to-transparent z-[1] pointer-events-none" />

              {/* Text Content */}
              <div
                className="relative z-10 w-full max-w-[680px]"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              >
                {slide.badge && (
                  <div className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full mb-2">
                    {slide.badge}
                  </div>
                )}
                <h2 className="text-left font-bold text-lg md:text-[22px] leading-tight md:leading-[28px] tracking-[0px] text-[#FFFFFF] line-clamp-2">
                  {slide.title}
                </h2>
                <p className="text-white text-[13px] md:text-[14px] leading-[20px] md:leading-[22px] opacity-90 mt-1.5 md:mt-2 line-clamp-2">
                  {slide.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Slide Navigation Radio/Dot Buttons */}
      {totalSlides > 1 && (
        <div className="absolute bottom-[47px] left-8 md:left-10 flex gap-3 z-20">
          {activeSlides.map((_, i) => (
            <button
              key={`promo-dot-${i}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex(i);
              }}
              className={`md:w-4 md:h-4 h-2.5 w-2.5 rounded-full transition-all duration-300 cursor-pointer ${
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


