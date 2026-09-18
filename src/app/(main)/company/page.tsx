"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import HttpClient from "@/lib/HttpClient";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";

const httpClient = new HttpClient();

const defaultTestimonials = [
  {
    _id: "1",
    name: "THE EASTERN BLOCK DESIGNS",
    rating: 5,
    content:
      "It's been an amazing experience working with Rick and Romet at Society Web Solutions! If you're looking for business branding & website design, I'd highly recommend their team. The quality of work delivered is just outstanding!",
  },
  {
    _id: "2",
    name: "Terje Van Schaik",
    company: "GreenSpeed USA",
    rating: 5,
    content:
      "Thank you web solutions! They helped our company's online store get more traffic. More customers are coming from Google. So the SEO plan they created worked! It was all very easy for us. They did all the keyword research and search engine optimization. I only had to approve the work. Looking forward to working with you more in the future! - GreenSpeed USA",
  },
  {
    _id: "3",
    name: "Tom Macrokanis",
    rating: 5,
    content:
      "Great team to work with, highly skilled and knowledgeable. Really enjoyed the experience working with them. For anyone looking to take their business to the next level I would highly recommend these guys.",
  },
  {
    _id: "4",
    name: "Jim",
    company: "GreenPro Sanitizing",
    rating: 5,
    content:
      "Rick and his team did great job, There were many challenges along the way, but they rose to get the job done!",
  },
  {
    _id: "5",
    name: "House Of Om",
    rating: 5,
    content:
      "Society Web Solutions team is incredible! So honest, direct & result-oriented. The way they communicate and work is just next level! They don't only bring you results, but actually educate you and show how to make your business thrive. Though their pricing might be higher than the average, then the investment already has returned itself. We were doing different tasks with different people, but they just united it all into one, making our life super easy. Their design & development team make stunning miracles plus their marketing team is absolutely great. Highly-highly recommended!",
  },
  {
    _id: "6",
    name: "Matthew Goodrich",
    company: "TITLE Boxing Club",
    rating: 5,
    content:
      "We have worked with Rick on numerous occasions. He always comes they with high quality work. I highly suggest if you want your website game to go up.. give them a call. You won’t be disappointed",
  },
];

export default function CompanyPage() {
  const [testimonials, setTestimonials] = useState<any[]>(defaultTestimonials);
  const [loading, setLoading] = useState(true);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const res: any = await httpClient.get("/testimonials");
        const list = res?.data || (Array.isArray(res) ? res : []);
        if (Array.isArray(list) && list.length > 0) {
          setTestimonials(list);
        }
      } catch (err) {
        console.error("Failed to fetch testimonials for company page:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, []);

  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftPos = useRef(0);

  const updateScrollButtons = () => {
    if (sliderRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 15);
    }
  };

  useEffect(() => {
    updateScrollButtons();
    const currentSlider = sliderRef.current;
    if (currentSlider) {
      currentSlider.addEventListener("scroll", updateScrollButtons, { passive: true });
      window.addEventListener("resize", updateScrollButtons);
    }
    return () => {
      if (currentSlider) {
        currentSlider.removeEventListener("scroll", updateScrollButtons);
      }
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [testimonials]);

  const handleScroll = (direction: "left" | "right") => {
    const slider = sliderRef.current;
    if (!slider) return;

    const cards = Array.from(slider.children) as HTMLElement[];
    if (!cards.length) return;

    const containerLeft = slider.getBoundingClientRect().left;

    if (direction === "right") {
      // Find the first card whose left edge is clearly beyond the container's left edge
      const nextCard = cards.find((card) => {
        const cardLeft = card.getBoundingClientRect().left - containerLeft;
        return cardLeft > 25;
      });

      if (nextCard) {
        const target = nextCard.offsetLeft - slider.offsetLeft;
        slider.scrollTo({ left: target, behavior: "smooth" });
      } else {
        slider.scrollTo({ left: slider.scrollWidth, behavior: "smooth" });
      }
    } else {
      // Find all cards whose left edge is behind the container start
      const prevCards = cards.filter((card) => {
        const cardLeft = card.getBoundingClientRect().left - containerLeft;
        return cardLeft < -25;
      });

      if (prevCards.length > 0) {
        const prevCard = prevCards[prevCards.length - 1];
        const target = prevCard.offsetLeft - slider.offsetLeft;
        slider.scrollTo({ left: target, behavior: "smooth" });
      } else {
        slider.scrollTo({ left: 0, behavior: "smooth" });
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!sliderRef.current) return;
    isDragging.current = true;
    startX.current = e.pageX - sliderRef.current.offsetLeft;
    scrollLeftPos.current = sliderRef.current.scrollLeft;
  };

  const handleMouseLeave = () => {
    isDragging.current = false;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !sliderRef.current) return;
    e.preventDefault();
    const x = e.pageX - sliderRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    sliderRef.current.scrollLeft = scrollLeftPos.current - walk;
  };

  const getTestimonialTitle = (t: any) => {
    if (t.company && t.name && !t.name.toLowerCase().includes(t.company.toLowerCase())) {
      return `${t.name} | ${t.company}`;
    }
    return t.name || t.company || "Client Review";
  };

  const renderStars = (rating: number = 5) => {
    const starsCount = Math.max(1, Math.min(5, Math.round(Number(rating) || 5)));
    return Array.from({ length: 5 }).map((_, idx) => (
      <svg
        key={idx}
        className={`w-[16.66px] h-[16.66px] ${idx < starsCount ? "text-[#D1AC40] fill-current" : "text-gray-300 fill-current"
          } shrink-0`}
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  return (
    <div className="flex flex-col min-h-screen font-sans bg-[#050A15] text-white selection:bg-[#5356ff] selection:text-white">
      {/* ── Hero Section ────────────────────────────────────────────── */}
      <main className="flex-grow overflow-hidden">
        <section className="relative h-[420px] sm:h-[436px] bg-[#00102E] flex items-center overflow-hidden">
          <img src="/images/image.png" className="company-bg absolute right-0 top-[33%] h-full w-auto object-cover object-right opacity-90 z-0 scale-[2] origin-right translate-y-[5%]" alt="Hero background" />
          <div className="company-bg-overlay absolute inset-0 bg-gradient-to-b from-[#00102E] to-[#0E2549]/0 to-transparent z-0"></div>
          <div className="max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] relative z-10 text-left w-full flex flex-col items-start gap-[16px]">
            <span className="text-[#FFFFFF] text-lg sm:text-[22px] font-bold leading-normal sm:leading-[30px]">About us</span>
            <h1 className="text-3xl sm:text-4xl md:text-[56px] font-bold text-white leading-tight sm:leading-[48px] md:leading-[64px]">
              World class websites and <br /> online marketing.
            </h1>
            <p className="text-[#FFFFFF] text-base sm:text-[18px] font-normal leading-relaxed sm:leading-[26px] mt-2">
              Society Web Solutions provides an all-in-one business class
              <br className="hidden sm:block" />
              service oriented around web presence success.
            </p>
          </div>
        </section>

        {/* ── Our Company Section ──────────────────────────────────────── */}
        <section className="bg-[#f3f4f6] text-[#363636] py-12 md:py-[70px]">
          <div className="max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] w-full flex flex-col gap-8 md:gap-[30px]">
            <div className="flex flex-col lg:flex-row w-full justify-between gap-8 lg:gap-12">
              <div className="flex flex-col gap-[21px] w-full lg:w-[42%] lg:max-w-[530px] shrink-0">
                <span className="text-[#4343F0] font-normal text-[16px] uppercase leading-[27px] tracking-[0em]">
                  Our Company
                </span>
                <h2 className="text-2xl sm:text-3xl md:text-[40px] lg:text-[48px] font-bold text-[#363636] leading-tight sm:leading-[40px] md:leading-[54px] lg:leading-[58px]">
                  True dedication to the success of each client
                </h2>
                <p className="text-[#363636] text-base sm:text-[18px] leading-relaxed sm:leading-[28px] font-medium">
                  Our company is all about a process of building your business&apos; web presence to complete excellence. We create completely custom recommendations for each business based on the business&apos; goals, budget, timeline, competition, and other factors involved.
                </p>
              </div>
              <div className="flex flex-col gap-[13px] text-[#363636] text-[16px] leading-[27px] font-normal w-full lg:w-[55%] lg:pt-[44px]">
                <p>
                  Often our clients first need to create a consistent brand style between their logo, website, social media, advertising, etc. Our graphic design team is excellent at working directly with business owners to create quick concepts and revisions until the right design direction is found. For custom web development projects we&apos;re ready to create preliminary designs before any commitments.
                </p>
                <p>
                  Once we&apos;ve set up consistent branding and a professional website, our team will move to monthly marketing and management tasks. We&apos;ll use our expertise and extensive network of web contacts to build up website traffic.
                </p>
                <p>
                  We&apos;ll be there for guidance or support when you need us, from the early stages of discussion &amp; concept design all the way to launch and online marketing. Take an in-depth look at the process-to-success that we have built and integrated into the core of our company.
                </p>
              </div>
            </div>

            {/* Images row */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 sm:gap-5 mt-2">
              <div className="relative w-full sm:flex-[886] h-[240px] sm:h-[340px] lg:h-[458px] rounded-[20px] overflow-hidden shadow-sm">
                <Image
                  src="/assets/company/leftsideimage.png"
                  alt="Development workspace"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="relative w-full sm:flex-[423] h-[240px] sm:h-[340px] lg:h-[456px] rounded-[20px] overflow-hidden shadow-sm">
                <Image
                  src="/assets/company/rightsideimage.png"
                  alt="AI Actions and Code"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Foundation Section ───────────────────────────────────────── */}
        <section className="bg-[#EBE9FA] text-[#363636] py-12 md:py-[70px]">
          <div className="max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] w-full">
            <div className="flex flex-col lg:flex-row lg:items-center w-full justify-between gap-8 lg:gap-8">
              {/* Left text block */}
              <div className="w-full lg:flex-1 flex flex-col gap-4 shrink-0">
                <h2 className="text-2xl sm:text-3xl md:text-[38px] lg:text-[42px] font-semibold text-[#363636] leading-tight md:leading-[48px] tracking-[-0.03em]">
                  Leading the new generation of web companies.
                </h2>
                <p className="text-[18px] font-semibold text-[#363636] leading-relaxed sm:leading-[27px]">
                  We&apos;re not your average web company.
                  <br />
                  We&apos;re your trusted partner for mutual
                  <br />
                  long-term online success.
                </p>
                <p className="text-[16px] text-[#363636] font-normal leading-[27px]">
                  Society Web Solutions provides a completely client-focused service built on trust and a long-term vision. We&apos;ll always be dedicated to your business goals as if they were our own. We&apos;re here to adapt to your situation and provide the most efficient solutions possible.
                </p>
              </div>

              {/* Right white card */}
              <div className="w-full lg:w-[878px] lg:h-[416px] bg-white rounded-[20px] shadow-sm flex flex-col sm:flex-row overflow-hidden shrink-0">
                <div className="relative w-full sm:w-[395px] h-[220px] sm:h-full shrink-0">
                  <Image
                    src="/assets/company/foundationimage.jpg"
                    alt="Innovative classroom"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center px-6 py-8 md:p-8 lg:pt-[37px] lg:px-8 lg:pb-8 gap-[18px]">
                  <h3 className="text-xl sm:text-[22px] font-bold text-[#363636] leading-snug sm:leading-[27px]">
                    As a strong foundational principal
                  </h3>
                  <p className="text-[#363636] text-[16px] font-normal leading-[27px]">
                    we keep our standard for quality of work very high, constantly improving it where possible. Our custom web solutions are pixel perfect on every device and screen size. Most websites we build now are built with a &quot;mobile-first&quot; design process since more than half of users are accessing websites from mobile devices. We track every click on our websites and find that there&apos;s almost always something to improve based on user data. Since the online world is rapidly evolving, we&apos;re also here to keep an eye out for emerging new opportunities, strategies, and trends.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Dynamic Testimonials & CTA Section ────────────────────────── */}
        <section className="bg-[#f3f4f6] text-[#363636] pt-12 md:pt-[70px] pb-0 flex flex-col items-center">
          <div className="w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] flex flex-col items-center gap-6 md:gap-[25px]">
            <h2 className="w-full text-2xl sm:text-3xl md:text-[40px] lg:text-[50px] font-semibold leading-tight sm:leading-[44px] md:leading-[60px] text-center text-[#363636]">
              See what our business community has to say
            </h2>

            <div className="w-full relative">
              <div
                ref={sliderRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                className="w-full overflow-x-auto hide-scrollbar flex gap-4 md:gap-5 snap-x snap-mandatory cursor-grab active:cursor-grabbing select-none py-4 px-1"
              >
                {testimonials.map((t, index) => (
                  <div
                    key={t._id || t.id || index}
                    className="w-[85vw] sm:w-[360px] md:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)] flex-shrink-0 snap-start"
                  >
                    <div
                      className="bg-white rounded-[20px] p-6 lg:p-[28px] flex flex-col gap-3 min-h-[300px] lg:min-h-[340px] h-full"
                      style={{
                        boxShadow: "0px 4px 44px 0px rgba(194, 194, 194, 0.25)",
                      }}
                    >
                      <h3 className="font-bold text-[#363636] text-lg sm:text-[20px] leading-snug uppercase opacity-80 truncate text-left m-0">
                        {getTestimonialTitle(t)}
                      </h3>
                      <div className="flex gap-[2px]">
                        {renderStars(t.rating || t.stars)}
                      </div>
                      <p className="text-[#363636] text-[16px] lg:text-[18px] leading-[27px] font-normal mt-2 m-0 whitespace-pre-line text-left">
                        {(t.content || t.text || "").replace(/^["“”]|["“”]$/g, "")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation arrows matching PDF */}
            <div className="flex justify-center gap-4 mt-2">
              <button
                type="button"
                onClick={() => handleScroll("left")}
                disabled={!canScrollLeft}
                aria-label="Previous Testimonials"
                className="flex items-center justify-center rounded-full bg-white transition hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                style={{
                  width: "44.71px",
                  height: "44.71px",
                  boxShadow: "0px 2px 12px 0px rgba(0,0,0,0.12)",
                }}
              >
                <svg
                  width="8"
                  height="14"
                  viewBox="0 0 8 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7 1L1 7L7 13"
                    stroke={canScrollLeft ? "#4343F0" : "#9E9E9E"}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => handleScroll("right")}
                disabled={!canScrollRight}
                aria-label="Next Testimonials"
                className="flex items-center justify-center rounded-full bg-white transition hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                style={{
                  width: "44.71px",
                  height: "44.71px",
                  boxShadow: "0px 2px 12px 0px rgba(0,0,0,0.12)",
                }}
              >
                <svg
                  width="8"
                  height="14"
                  viewBox="0 0 8 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1 1L7 7L1 13"
                    stroke={canScrollRight ? "#4343F0" : "#9E9E9E"}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* CTA Section */}
          <div className="max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] w-full text-center flex flex-col items-center gap-6 md:gap-[36px] pt-12 md:pt-16 pb-[80px]">
            <h2
              className="text-[32px] sm:text-[48px] md:text-[60px] lg:text-[70px] font-semibold leading-tight lg:leading-[82px] text-center text-[#363636]"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                color: "#363636",
              }}
            >
              Ready to accelerate your growth?
            </h2>
            <Link href="/dashboard/new-project">
              <button
                type="button"
                className="w-[336px] max-w-full h-[60px] bg-[#4343F0] hover:bg-[#3838dc] active:scale-[0.98] rounded-[10px] text-white font-semibold text-[18px] leading-[100%] flex items-center justify-center transition-all cursor-pointer shadow-md"
              >
                Start a new project with us!
              </button>
            </Link>
          </div>
        </section>
      </main>

      <main className="flex-grow overflow-hidden bg-[#F4F5FA]">
        {/* ── Newsletter Section ───────────────────────────────────────── */}
        <section className="relative z-20 pb-12">
          <SupportNewsletter gridClassName="!mt-0" />
        </section>
      </main>
    </div>
  );
}
