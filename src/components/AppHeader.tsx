"use client";

import React, { useState, useEffect, useRef } from "react";

interface AppHeaderProps {
  children: React.ReactNode;
}

export default function AppHeader({ children }: AppHeaderProps) {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const updateHeader = () => {
      const currentScrollY = window.scrollY;
      const prevScrollY = lastScrollY.current;
      const diff = currentScrollY - prevScrollY;

      // Always show at top of page
      if (currentScrollY <= 15) {
        setIsVisible(true);
      } else if (Math.abs(diff) > 6) {
        // Scroll down threshold: hide header after scrolling down past 80px
        if (diff > 0 && currentScrollY > 80) {
          setIsVisible(false);
        } else if (diff < 0) {
          // Scroll up: show header immediately
          setIsVisible(true);
        }
      }

      lastScrollY.current = Math.max(0, currentScrollY);
      ticking.current = false;
    };

    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(updateHeader);
        ticking.current = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-transform duration-300 ease-in-out ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      {children}
    </header>
  );
}
