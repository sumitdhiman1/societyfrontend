"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/authService";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const isCustomQuote =
        currentPath === "/dashboard/new-project/custom-quote" ||
        currentPath.startsWith("/dashboard/new-project/custom-quote/");

      const publicRoutePrefixes = [
        "/dashboard/new-project",
        "/dashboard/my-analyses",
      ];
      const isPublicRoute =
        !isCustomQuote &&
        publicRoutePrefixes.some(
          (prefix) =>
            currentPath === prefix || currentPath.startsWith(`${prefix}/`)
        );

      if (!isPublicRoute && !authService.isAuthenticated()) {
        const redirectPath = window.location.pathname + window.location.search;
        router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
        setIsAuthorized(false);
      } else {
        setIsAuthorized(true);
      }
    };

    const timer = setTimeout(() => {
      checkAuth();
    }, 100);

    // Listen for logout events
    const handleLogout = () => router.push("/login");
    window.addEventListener("auth:logout", handleLogout);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("auth:logout", handleLogout);
    };
  }, [router]);

  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#5356ff]"></div>
      </div>
    );
  }

  if (!isAuthorized) return null;

  return (
    <div className="bg-white min-h-screen flex flex-col overflow-x-hidden" style={{ scrollBehavior: "smooth" }}>
      <main className="flex-grow w-full pb-0">
        {children}
      </main>
    </div>
  );
}
