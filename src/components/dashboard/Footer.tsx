"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import HttpClient from "@/lib/HttpClient";
import { useChatWidget } from "@/context/ChatWidgetContext";

// Icons
import InstagramIcon from "@/components/icons/instagram";
import TwitterIcon from "@/components/icons/twitter";
import YoutubeIcon from "@/components/icons/youtube";
import FacebookIcon from "@/components/icons/facebook";
import VisaIcon from "@/components/icons/visa";
import MastercardIcon from "@/components/icons/mastercard";
import AmexIcon from "@/components/icons/amex";
import DiscoverIcon from "@/components/icons/discover";
import { LinkedIn } from "@/components/icons/linkedin";

const httpClient = new HttpClient();

export default function Footer() {
  const { setBottomOffset, isOpen, toggleChat } = useChatWidget();
  const footerRef = useRef<HTMLElement>(null);
  const [blogs, setBlogs] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  useEffect(() => {
    // Fetch recent blogs
    const fetchBlogs = async () => {
      try {
        const res: any = await httpClient.get("/blogs/list-titles", { page: 1, limit: 2 });
        if (res?.data) {
          setBlogs(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch blogs for footer:", err);
      }
    };

    // Fetch services for footer
    const fetchServices = async () => {
      try {
        const res: any = await httpClient.get("/categories/getallcategories", { page: 1, limit: 20 });
        if (res?.data) {
          const data = Array.isArray(res.data) ? res.data : res.data.categories || [];
          setServices(data.filter((s: any) => s.showOnFooter));
        }
      } catch (err) {
        console.error("Failed to fetch services for footer:", err);
      } finally {
        setLoadingServices(false);
      }
    };

    fetchBlogs();
    fetchServices();
  }, []);

  useEffect(() => {
    const currentFooter = footerRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setBottomOffset(-150); // Hide floating chat when footer is visible (footer has its own button)
        } else {
          setBottomOffset(0);
        }
      },
      { threshold: 0, rootMargin: "0px 0px 50px 0px" }
    );

    if (currentFooter) {
      observer.observe(currentFooter);
    }

    return () => {
      if (currentFooter) observer.unobserve(currentFooter);
      observer.disconnect();
    };
  }, [setBottomOffset]);

  return (
    <footer ref={footerRef} className="w-full bg-primary-400 text-gray-700 pt-8 md:pt-10 pb-5 font-sans">
      <div className="mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] max-w-[1536px] lg:px-[54px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-6 lg:gap-12 mb-10 md:mb-10 lg:mb-16">
          {/* Column 1: Services */}
          <div className="flex flex-col gap-4 md:gap-2">
            <h3 className="text-[#5356ff] font-bold text-xl md:text-lg uppercase tracking-wider mb-2 md:mb-2">
              OUR SERVICES
            </h3>
            <div className="flex flex-col gap-3 md:gap-2">
              {loadingServices ? (
                Array(6).fill(0).map((_, i) => (
                  <div key={i} className="h-5 bg-gray-200 animate-pulse rounded w-3/4" />
                ))
              ) : services.length > 0 ? (
                services.map((service) => (
                  <Link
                    key={service._id}
                    href={`/dashboard/new-project/packages?categorycode=${(service.categorycode || service.slug).toUpperCase()}`}
                    className="text-sm font-medium hover:text-[#5356ff] transition-colors"
                  >
                    {service.name}
                  </Link>
                ))
              ) : (
                <>
                  <Link href="/services/web-development" className="text-sm font-medium hover:text-[#5356ff] transition-colors">Web Development</Link>
                  <Link href="/services/mobile-apps" className="text-sm font-medium hover:text-[#5356ff] transition-colors">Mobile App Development</Link>
                  <Link href="/services/ui-ux-design" className="text-sm font-medium hover:text-[#5356ff] transition-colors">UI/UX Design</Link>
                  <Link href="/services/digital-marketing" className="text-sm font-medium hover:text-[#5356ff] transition-colors">Digital Marketing</Link>
                  <Link href="/services/branding" className="text-sm font-medium hover:text-[#5356ff] transition-colors">Branding & Identity</Link>
                  <Link href="/services/seo" className="text-sm font-medium hover:text-[#5356ff] transition-colors">Search Engine Optimization</Link>
                </>
              )}
            </div>
          </div>

          {/* Column 2: About Us */}
          <div className="flex flex-col gap-4 md:gap-2">
            <h3 className="text-[#5356ff] font-bold text-xl md:text-lg uppercase tracking-wider mb-2 md:mb-2">
              ABOUT US
            </h3>
            <div className="flex flex-col gap-3 md:gap-2">
              <Link href="/company" className="text-sm font-medium hover:text-[#5356ff] transition-colors">Company</Link>
              <Link href="/careers" className="text-sm font-medium hover:text-[#5356ff] transition-colors">Careers</Link>
              <Link href="/blog" className="text-sm font-medium hover:text-[#5356ff] transition-colors">Blog</Link>
              <Link href="/faq" className="text-sm font-medium hover:text-[#5356ff] transition-colors">FAQ</Link>
              <Link href="/help-support/contact-us" className="text-sm font-medium hover:text-[#5356ff] transition-colors">Contact Us</Link>
              <Link href="/help-support" className="text-sm font-medium hover:text-[#5356ff] transition-colors">Help & Support</Link>
            </div>
          </div>

          {/* Column 3: Account */}
          <div className="flex flex-col gap-4 md:gap-2">
            <h3 className="text-[#5356ff] font-bold text-xl md:text-lg uppercase tracking-wider mb-2 md:mb-2">
              ACCOUNT
            </h3>
            <div className="flex flex-col gap-3 md:gap-2">
              <Link href="/dashboard/myAccount" className="text-sm font-medium hover:text-[#5356ff] transition-colors">My Account</Link>
              <Link href="/dashboard/my-projects" className="text-sm font-medium hover:text-[#5356ff] transition-colors">My Projects</Link>
              <Link href="/dashboard/my-quotes" className="text-sm font-medium hover:text-[#5356ff] transition-colors">My Quotes</Link>
              <Link href="/dashboard/payment-history" className="text-sm font-medium hover:text-[#5356ff] transition-colors">My Payments</Link>
              <Link href="/dashboard/renewals" className="text-sm font-medium hover:text-[#5356ff] transition-colors">Renewals</Link>
              <Link href="/dashboard/settings" className="text-sm font-medium hover:text-[#5356ff] transition-colors">Settings</Link>
            </div>
          </div>

          {/* Column 4: Blog Feed */}
          <div className="flex flex-col gap-4 md:gap-2">
            <h3 className="text-[#363636] font-bold text-xl md:text-lg mb-2 md:mb-2">
              Recent From The Blog
            </h3>
            <div className="flex flex-col gap-6 md:gap-4">
              {blogs.length > 0 ? (
                blogs.map((blog) => (
                  <div key={blog.slug} className="group cursor-pointer">
                    <Link href={`/blog/${blog.slug}`}>
                      <h4 className="font-bold text-gray-800 text-sm mb-1 group-hover:text-[#5356ff] transition-colors line-clamp-2 uppercase">
                        {blog.title}
                      </h4>
                    </Link>
                    <div className="flex justify-between items-center text-xs text-gray-400">
                      <span>
                        {blog.publishedAt
                          ? new Date(blog.publishedAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                          : "Recently Published"}
                      </span>
                      <Link href={`/blog/${blog.slug}`} className="text-[#5356ff] font-bold hover:underline">
                        READ MORE
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 italic">No recent blogs found.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer Bottom Row 1: Payment & VAT */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-0 md:mb-2 gap-4">
          <div className="flex items-center gap-4 opacity-70 grayscale hover:grayscale-0 transition-all scale-90 md:scale-100">
            <VisaIcon className="h-6" />
            <MastercardIcon className="h-6" />
            <AmexIcon className="h-6" />
            <DiscoverIcon className="h-6" />
          </div>
          <p className="text-sm text-custom-4 font-semibold">
            Prices exclude VAT
          </p>
        </div>

        {/* Chat Widget Toggle Button */}
        <div className="flex justify-end pb-4">
          <button
            onClick={toggleChat}
            className={`p-4 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center relative ${isOpen ? "bg-red-500 hover:bg-red-600 rotate-90" : "bg-[#5356ff] hover:bg-[#3232b7]"
              }`}
          >
            {isOpen ? (
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            )}
          </button>
        </div>

        <hr className="w-full border-t-2 border-[#707070] opacity-[0.38] my-3" />

        {/* Footer Bottom Row 2: Legal & Social */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-4 text-xs text-gray-600 py-4">
          <div className="flex flex-col gap-4 md:gap-9">
            <div className="flex items-center gap-2">
              <Link href="/legal" className="hover:text-[#5356ff] transition-colors font-semibold">Legal</Link>
              <span className="text-[#5356ff] font-extrabold">|</span>
              <Link href="/privacy-policy" className="hover:text-[#5356ff] transition-colors font-semibold">Privacy</Link>
            </div>
            <span className="font-bold text-[#363636]">© 2024 - Society | All rights reserved</span>
          </div>

          <div className="flex items-center gap-5 text-[#5356ff]">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <FacebookIcon className="w-[34px] h-[34px]" />
            </Link>
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <InstagramIcon className="w-[34px] h-[34px]" />
            </Link>
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <LinkedIn className="w-[34px] h-[34px]" />
            </Link>
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <TwitterIcon className="w-[34px] h-[34px]" />
            </Link>

            <Link href="/" className="hover:opacity-80 transition-opacity">
              <YoutubeIcon className="w-[34px] h-[34px]" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
