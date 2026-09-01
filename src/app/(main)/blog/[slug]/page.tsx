"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { use } from "react";
import { blogService } from "@/lib/blogService";

interface BlogPost {
  _id: string;
  slug: string;
  title: string;
  excerpt?: string;
  content?: string;
  thumbnail?: string;
  coverImage?: string;
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
        const response = await blogService.getBlogBySlug(slug);
        if (response?.data) {
          setPost(response.data);
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
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white min-h-screen flex flex-col font-sans text-gray-600">
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5356ff] mx-auto mb-4"></div>
            <p className="text-gray-500">Loading post...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="bg-white min-h-screen flex flex-col font-sans text-gray-600">
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center px-4">
            <p className="text-red-500 mb-4">{error || "Post not found."}</p>
            <Link
              href="/blog"
              className="bg-[#5356ff] hover:bg-[#3232b7] text-white px-6 py-2 rounded-md font-bold transition-all"
            >
              Back to Blog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const authorName = post.author?.fullName || post.author?.name || "Society";

  return (
    <div className="bg-white min-h-screen flex flex-col font-sans text-gray-600">
      {/* Hero Section */}
      <div className="bg-primary-100 border-[3px] border-gray-600">
        <div className="container mx-auto px-4 md:px-8 lg:px-[54px] py-16 max-w-[1536px]">
          <div className="flex items-center gap-2 text-white/70 text-sm mb-4">
            <Link href="/blog" className="hover:text-white transition-colors">
              Blog
            </Link>
            <span>/</span>
            {post.category && (
              <>
                <span className="hover:text-white transition-colors">{post.category}</span>
                <span>/</span>
              </>
            )}
            <span className="text-white font-medium line-clamp-1">{post.title}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight max-w-4xl">
            {post.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 mt-4 text-white/80 text-sm">
            {authorName && (
              <div className="flex items-center gap-2">
                {post.author?.avatar ? (
                  <img
                    src={post.author.avatar}
                    alt={authorName}
                    className="w-7 h-7 rounded-full object-cover border border-white/30"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                <span className="font-medium">{authorName}</span>
              </div>
            )}
            {(post.publishedAt || post.createdAt) && (
              <span>{formatDate(post.publishedAt || post.createdAt)}</span>
            )}
            {post.category && (
              <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide">
                {post.category}
              </span>
            )}
          </div>
        </div>
      </div>

      <main className="flex-grow w-full max-w-[1600px] mx-auto px-4 md:px-8 lg:px-[54px] py-16">
        <div className="max-w-4xl mx-auto">
          {/* Cover Image */}
          {(post.thumbnail || post.coverImage) && (
            <div className="mb-10 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
              <img
                src={post.thumbnail || post.coverImage}
                alt={post.title}
                className="w-full max-h-[480px] object-cover"
              />
            </div>
          )}

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-lg text-gray-500 leading-relaxed mb-8 border-l-4 border-[#5356ff] pl-5 italic">
              {post.excerpt}
            </p>
          )}

          {/* Content */}
          {post.content ? (
            <div
              className="prose prose-gray max-w-none text-gray-600 text-sm leading-relaxed
                prose-headings:font-bold prose-headings:text-gray-800
                prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                prose-p:mb-4 prose-p:leading-relaxed
                prose-a:text-[#5356ff] prose-a:no-underline hover:prose-a:underline
                prose-strong:text-gray-800 prose-strong:font-bold
                prose-ul:list-disc prose-ul:pl-5 prose-ol:list-decimal prose-ol:pl-5
                prose-li:mb-1
                prose-blockquote:border-l-4 prose-blockquote:border-[#5356ff] prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-500
                prose-img:rounded-lg prose-img:shadow-sm"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          ) : (
            <p className="text-gray-400 italic text-sm">No content available for this post.</p>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-12 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-[#5356ff] hover:text-white transition-colors cursor-default"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Back to Blog */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#5356ff] hover:underline transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to all posts
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
