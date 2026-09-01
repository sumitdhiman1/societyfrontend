"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface ProjectSubNavProps {
  projectId: string;
}

export default function ProjectSubNav({ projectId }: ProjectSubNavProps) {
  const pathname = usePathname();

  const navItems = [
    { name: "Details", href: `/dashboard/my-projects/${projectId}/details` },
    { name: "Files", href: `/dashboard/my-projects/${projectId}/files` },
    { name: "Payments", href: `/dashboard/my-projects/${projectId}/payments` },
  ];

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 mb-8 pb-1">
      <div className="flex gap-8">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`text-base font-medium pb-2 transition-colors relative ${
                isActive
                  ? "text-gray-900 border-b-2 border-gray-900 cursor-default"
                  : "text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300"
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
