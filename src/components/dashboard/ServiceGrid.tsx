"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { packagesService } from "@/lib/packagesService";

export default function ServiceGrid() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await packagesService.listCategories({
          page: 1,
          limit: 100,
        });
        if (res?.data) {
          const data = Array.isArray(res.data)
            ? res.data
            : res.data.categories || [];
          setCategories(data.filter((c: any) => c.showOnHomepage));
        }
      } catch (error) {
        console.error("Failed to fetch services:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 lg:gap-x-[22px] lg:gap-y-[22px] gap-[24px] font-sans pt-1">
        {["s1", "s2", "s3", "s4", "s5", "s6"].map((key) => (
          <div
            key={key}
            className="bg-white rounded-[8px] shadow-[0px_5px_25px_#0000000D] animate-pulse"
          >
            <div className="aspect-[461/133] bg-gray-200 rounded-t-[8px]" />
            <div className="px-5 py-[19px]">
              <div className="h-5 bg-gray-200 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 lg:gap-x-[22px] lg:gap-y-[22px] gap-[24px] font-sans pt-1"
      style={{ fontFamily: "var(--font-inter), sans-serif" }}
    >
      {categories.map((category) => (
        <Link
          key={category._id}
          href={`/dashboard/new-project/packages?categorycode=${(category.categorycode || category.slug).toUpperCase()}`}
          prefetch={false}
          className="bg-white rounded-[8px] shadow-[0px_5px_25px_#0000000D] hover:shadow-md transition-shadow group cursor-pointer flex flex-col overflow-hidden"
        >
          <div className="aspect-[461/133] relative overflow-hidden bg-gray-100">
            {category.mediumUrl || category.imageUrl ? (
              <Image
                src={category.mediumUrl || category.imageUrl}
                alt={category.name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-gray-300"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
          <div className="px-5 md:py-[19px] py-[14px] flex-1 flex items-center justify-between bg-white">
            <h3 className="text-left md:font-bold font-semibold text-[16px] md:text-[20px] leading-[24px] tracking-[0px] text-[#363636] font-sans">
              {category.name}
            </h3>
          </div>
        </Link>
      ))}
    </div>
  );
}
