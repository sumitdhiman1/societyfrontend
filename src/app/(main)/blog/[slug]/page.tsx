"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { use } from "react";
import { blogService } from "@/lib/blogService";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";

interface BlogPost {
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
    fullName?: string;
    avatar?: string;
  };
  tags?: string[];
  category?: string;
}

export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setIsLoading(true);
        const response: any = await blogService.getBlogBySlug(slug);
        const data = response?.data || response;
        if (data && (data._id || data.title)) {
          setPost(data);
          setError(null);
        } else {
          setError("Blog post not found.");
        }
      } catch (err) {
        console.error("Error fetching blog post:", err);
        setError("Failed to load the blog post. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPost();
  }, [slug]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "August 26, 2026";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="bg-[#041235] min-h-screen flex flex-col font-sans text-gray-300">
        <div className="flex-grow flex items-center justify-center py-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5356ff] mx-auto mb-4"></div>
            <p className="text-gray-400">Loading article...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="bg-[#041235] min-h-screen flex flex-col font-sans text-gray-300">
        <div className="flex-grow flex items-center justify-center py-32">
          <div className="text-center px-4">
            <p className="text-red-400 mb-4">{error || "Post not found."}</p>
            <Link
              href="/blog"
              className="bg-[#5356ff] hover:bg-[#3232b7] text-white px-6 py-2.5 rounded-xl font-bold transition-all inline-block shadow-md"
            >
              Back to Blog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const bgImage = post.coverImage || post.featuredImage || post.thumbnail;

  return (
    <div className="bg-[#041235] min-h-screen flex flex-col font-sans text-gray-300">
      {/* Hero Banner with Background Image and Dark Overlay */}
      <div
        className="relative h-[45vh] min-h-[360px] w-full bg-cover bg-center flex items-center justify-center"
        style={{
          backgroundImage: bgImage ? `url("${bgImage}")` : undefined,
        }}
      >
        <div className="absolute inset-0 bg-[#0d1939]/85 z-10" />
        <div className="relative z-20 text-center px-4 max-w-4xl mx-auto">
          <p className="text-gray-300 text-sm md:text-base font-medium mb-4 uppercase tracking-wider">
            {formatDate(post.publishedAt || post.createdAt)}
          </p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight drop-shadow-md">
            {post.title}
          </h1>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-grow w-full py-6 md:py-10">
        <div className="max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px]">
          <div className="max-w-5xl mx-auto w-full">
            {/* Breadcrumb Navigation */}
            <div className="mb-6 w-full text-sm text-gray-400">
              <Link className="hover:text-blue-400 transition-colors" href="/">
                Home
              </Link>
              <span className="mx-2 text-gray-600">/</span>
              <Link className="hover:text-blue-400 transition-colors" href="/blog">
                Blog
              </Link>
              <span className="mx-2 text-gray-600">/</span>
              <span className="text-gray-200 line-clamp-1 inline-block max-w-[300px] sm:max-w-none align-bottom">
                {post.title}
              </span>
            </div>

            {/* Article Content */}
            {post.content ? (
              <article
                className="blog-content prose prose-lg prose-invert w-full max-w-none text-gray-300
                        prose-headings:text-white prose-headings:font-bold
                        prose-h2:text-2xl md:prose-h2:text-3xl prose-h2:mt-8 prose-h2:mb-4
                        prose-h3:text-xl md:prose-h3:text-2xl prose-h3:mt-6 prose-h3:mb-3
                        prose-p:leading-relaxed prose-p:mb-5
                        prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
                        prose-strong:text-white
                        prose-ul:list-disc prose-ul:pl-6 prose-ul:mb-5
                        prose-ol:list-decimal prose-ol:pl-6 prose-ol:mb-5
                        prose-li:mb-2
                        prose-img:rounded-xl prose-img:max-w-full prose-img:mx-auto prose-img:block prose-img:shadow-lg
                        prose-pre:overflow-x-auto prose-pre:max-w-full prose-pre:rounded-xl
                        prose-table:w-full prose-table:overflow-x-auto
                        [&_*]:max-w-full [&_img]:h-auto [&_pre]:whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            ) : (
              <p className="text-gray-400 italic text-sm py-8">No content available for this post.</p>
            )}

            {/* Related Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-10 pt-6 border-t border-gray-800/80 w-full">
                <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-3">Related Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-[#1a233a] text-blue-300 px-3 py-1 rounded-full text-xs font-medium border border-blue-800/40 hover:border-blue-500/60 transition-colors"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Support & Newsletter Section */}
        <div className="max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] mt-12 md:mt-16 pb-12 md:pb-16">
          <SupportNewsletter noPadding={true} />
        </div>
      </main>
    </div>
  );
}
