"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authService } from "@/lib/authService";

const navItems = [
  { name: "Account Details", href: "/dashboard/myAccount" },
  { name: "Billing Details", href: "/dashboard/billing" },
  { name: "Payment History", href: "/dashboard/payment-history" },
  { name: "Renewals", href: "/dashboard/renewals" },
  { name: "Credits", href: "/dashboard/credits" },
  { name: "Referrals", href: "/dashboard/referrals" },
  { name: "Notification Settings", href: "/dashboard/settings" },
];

export default function DashboardSubNav({ hideMenu = false }: { hideMenu?: boolean }) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    setIsAuthenticated(authService.isAuthenticated());
  }, []);

  if (!isAuthenticated || hideMenu || pathname === "/calculator") return null;

  return (
    <div className="w-full bg-gray-100 font-sans">
      <div className="max-w-[1536px] mx-auto px-4 md:px-8 lg:px-0 lg:pl-[54px] lg:pr-[62px] py-4 flex overflow-x-auto hide-scrollbar flex-nowrap md:flex-wrap gap-8">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`text-base font-medium transition-colors relative flex-shrink-0 whitespace-nowrap ${
                isActive ? "text-black font-bold" : "text-gray-600 hover:text-black"
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
