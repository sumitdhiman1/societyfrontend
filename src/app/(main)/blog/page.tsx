"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { blogService } from "@/lib/blogService";
import { useSearchParams } from "next/navigation";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";

interface Blog {
  _id: string;
  slug: string;
  title: string;
  excerpt?: string;
  content?: string;
  thumbnail?: string;
  coverImage?: string;
  featuredImage?: string;
  publishedAt?: string;
  createdAt?: string;
  author?: {
    name?: string;
    avatar?: string;
  };
  tags?: string[];
  category?: string;
}

function BlogContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category") || searchParams.get("tab") || "blog";
  const isUserGuide = categoryParam === "user-guides" || categoryParam === "user_guide";

  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 9;

  useEffect(() => {
    setPage(1);
  }, [categoryParam]);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        setIsLoading(true);
        const requestedCategory = isUserGuide ? "user_guide" : "blog";
        const response: any = await blogService.getBlogs(page, limit, requestedCategory);

        let list: Blog[] = [];
        if (Array.isArray(response)) {
          list = response;
        } else if (Array.isArray(response?.data)) {
          list = response.data;
        } else if (Array.isArray(response?.data?.data)) {
          list = response.data.data;
        } else if (Array.isArray(response?.data?.blogs)) {
          list = response.data.blogs;
        } else if (Array.isArray(response?.blogs)) {
          list = response.blogs;
        }

        // Fallback: If no explicit category blogs returned, filter from all published
        if (list.length === 0) {
          const fallbackRes: any = await blogService.getBlogs(page, limit);
          const raw = Array.isArray(fallbackRes)
            ? fallbackRes
            : Array.isArray(fallbackRes?.data)
            ? fallbackRes.data
            : fallbackRes?.data?.data || fallbackRes?.data?.blogs || fallbackRes?.blogs || [];
          if (Array.isArray(raw) && raw.length > 0) {
            if (isUserGuide) {
              list = raw.filter(
                (b: any) =>
                  b.category?.toLowerCase() === "user_guide" ||
                  b.category?.toLowerCase() === "guide" ||
                  b.category?.toLowerCase() === "user guides"
              );
            } else {
              list = raw.filter(
                (b: any) =>
                  b.category?.toLowerCase() !== "user_guide" &&
                  b.category?.toLowerCase() !== "guide" &&
                  b.category?.toLowerCase() !== "user guides"
              );
            }
          }
        }

        setBlogs(list);

        const totalP =
          response?.pagination?.totalPages ||
          response?.data?.totalPages ||
          response?.totalPages ||
          1;
        setTotalPages(totalP);
        setError(null);
      } catch (err) {
        console.error("Error fetching blogs:", err);
        setError("Failed to load blog posts. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchBlogs();
  }, [page, isUserGuide, categoryParam]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "26 Aug 2026";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="bg-[#041235] min-h-screen flex flex-col font-sans text-gray-600">
      {/* Hero Section */}
      <div className="bg-[#041235] text-white pt-28 pb-0 shadow-sm">
        <div className="max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] flex flex-col items-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-24 text-center text-white">
            Our Blog
          </h1>
          <div className="flex justify-center items-center gap-12 relative">
            <Link
              href="/blog?category=user-guides"
              scroll={false}
              className={`text-base sm:text-lg pb-3 transition-all font-medium border-b-2 rounded-none cursor-pointer ${
                isUserGuide
                  ? "text-white border-[#5b63d3]"
                  : "text-gray-400 hover:text-gray-200 border-transparent"
              }`}
            >
              User Guides
            </Link>
            <Link
              href="/blog"
              scroll={false}
              className={`text-base sm:text-lg pb-3 transition-all font-medium border-b-2 rounded-none cursor-pointer ${
                !isUserGuide
                  ? "text-white border-[#5b63d3]"
                  : "text-gray-400 hover:text-gray-200 border-transparent"
              }`}
            >
              Blog
            </Link>
          </div>
        </div>
      </div>

      <main className="bg-[#041235] flex-grow w-full max-w-[1600px] mx-auto pt-16 pb-20">
        {isLoading ? (
          <div className="flex justify-center items-center py-24">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5356ff] mx-auto mb-4"></div>
              <p className="text-gray-400 font-medium">
                Loading {isUserGuide ? "user guides" : "blog posts"}...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center py-24">
            <div className="text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-[#5356ff] hover:bg-[#3232b7] text-white px-6 py-2 rounded-md font-bold transition-all cursor-pointer"
              >
                Retry
              </button>
            </div>
          </div>
        ) : blogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              {isUserGuide ? "No User Guides Yet" : "No Blog Posts Yet"}
            </h2>
            <p className="text-gray-400 text-sm max-w-md">
              Check back soon! We're working on publishing great content for you.
            </p>
          </div>
        ) : (
          <>
            <div className="max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 xl:gap-10">
                {blogs.map((blog) => {
                  const imageSrc = blog.coverImage || blog.featuredImage || blog.thumbnail;
                  return (
                    <Link
                      key={blog._id}
                      href={`/blog/${blog.slug}`}
                      className="bg-white rounded-xl shadow-xl overflow-hidden flex flex-col h-full transition-transform hover:-translate-y-1 duration-300 group cursor-pointer"
                    >
                      {/* Thumbnail */}
                      <div className="relative h-[240px] w-full bg-gray-100">
                        {imageSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imageSrc}
                            alt={blog.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary-300/20 to-primary-100/30 flex items-center justify-center">
                            <svg className="w-12 h-12 text-primary-300/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                            </svg>
                          </div>
                        )}
                        <span className="absolute -bottom-[18px] left-1/2 transform -translate-x-1/2 bg-[#042060] text-white text-[13px] font-semibold px-6 py-1.5 rounded-[4px] shadow-md z-10 whitespace-nowrap">
                          {formatDate(blog.publishedAt || blog.createdAt)}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="pt-10 pb-8 px-6 sm:px-8 flex flex-col items-center text-center flex-grow">
                        <h2 className="text-xl sm:text-2xl font-bold text-[#042060] leading-snug text-center hover:text-[#5b63d3] transition-colors line-clamp-2 min-h-[56px] flex items-center justify-center">
                          {blog.title}
                        </h2>
                        <span className="text-[#a1a1aa] text-[13px] font-normal mb-4 text-center block">
                          Society Web Solutions
                        </span>
                        {blog.excerpt && (
                          <div className="mb-6 flex-grow flex">
                            <p className="text-[#4a5568] text-[14px] items-center leading-relaxed text-center line-clamp-3 px-1 font-normal min-h-[63px] flex">
                              {blog.excerpt}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-auto border-gray-100">
                          <span className="bg-[#042060] hover:bg-[#082a7a] text-white text-[13px] font-bold py-2.5 px-7 rounded-[4px] uppercase tracking-wider transition-colors shadow-sm">
                            Read more
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 mt-12 mb-16">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-bold border border-white/20 text-white rounded-md hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-300 font-medium">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm font-bold border border-white/20 text-white rounded-md hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* Support & Newsletter Section */}
        <SupportNewsletter />
      </main>
    </div>
  );
}

export default function BlogPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-[#041235] min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5356ff]"></div>
        </div>
      }
    >
      <BlogContent />
    </Suspense>
  );
}
