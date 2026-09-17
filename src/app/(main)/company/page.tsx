"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import HttpClient from "@/lib/HttpClient";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";

const httpClient = new HttpClient();

const defaultTestimonials = [
  {
    _id: "1",
    name: "Jim",
    company: "GreenPro Sanitizing",
    rating: 5,
    content: "Rick and his team did great job, There were many challenges along the way, but they rose to get the job done!",
  },
  {
    _id: "2",
    name: "House Of Om",
    rating: 5,
    content: "Society Web Solutions team is incredible! So honest, direct & result-oriented. The way they communicate and work is just next level! They don't only bring you results, but actually educate you and show how to make your business thrive. Though their pricing might be higher than the average, then the investment already has returned itself. We were doing different tasks with different people, but they just united it all into one, making our life super easy. Their design & development team make stunning miracles plus their marketing team is absolutely great. Highly-highly recommended!",
  },
  {
    _id: "3",
    name: "Matthew Goodrich",
    company: "TITLE Boxing Club",
    rating: 5,
    content: "We have worked with Rick on numerous occasions. He always comes they with high quality work. I highly suggest if you want your website game to go up.. give them a call. You won’t be disappointed",
  },
  {
    _id: "4",
    name: "THE EASTERN BLOCK DESIGNS",
    rating: 5,
    content: "It's been an amazing experience working with Rick and Romet at Society Web Solutions! If you're looking for business branding & website design, I'd highly recommend their team. The quality of work delivered is just outstanding!",
  },
  {
    _id: "5",
    name: "Terje Van Schaik",
    company: "GreenSpeed USA",
    rating: 5,
    content: "Thank you web solutions! They helped our company's online store get more traffic. More customers are coming from Google. So the SEO plan they created worked! It was all very easy for us. They did all the keyword research and search engine optimization. I only had to approve the work. Looking forward to working with you more in the future!",
  },
  {
    _id: "6",
    name: "Tom Macrokanis",
    rating: 5,
    content: "Great team to work with, highly skilled and knowledgeable. Really enjoyed the experience working with them. For anyone looking to take their business to the next level I would highly recommend these guys.",
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
        className={`w-[16.66px] h-[16.66px] ${
          idx < starsCount ? "text-[#D1AC40] fill-current" : "text-gray-300 fill-current"
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
          <div className="absolute inset-0 bg-gradient-to-b from-[#00102E] to-[#0E2549]/0 to-transparent z-0"></div>
          <div className="max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] relative z-10 text-left w-full flex flex-col items-start gap-[16px]">
            <span className="text-[#A3A3A3] text-lg sm:text-[22px] font-bold leading-normal sm:leading-[30px]">About us</span>
            <h1 className="text-3xl sm:text-4xl md:text-[56px] font-bold text-white leading-tight sm:leading-[48px] md:leading-[64px]">
              World class websites and <br /> online marketing.
            </h1>
            <p className="text-[#A3A3A3] text-base sm:text-[18px] font-normal leading-relaxed sm:leading-[26px] mt-2">
              Society Web Solutions provides an all-in-one business class
              <br className="hidden sm:block" />
              service oriented around web presence success.
            </p>
          </div>
        </section>

        {/* ── Our Company Section ──────────────────────────────────────── */}
        <section className="bg-white text-gray-800 py-12 md:py-[70px]">
          <div className="max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] w-full flex flex-col gap-10 md:gap-[30px]">
            <div className="flex flex-col lg:flex-row w-full justify-between">
              <div className="flex flex-col gap-[21px] lg:w-[40%] shrink-0">
                <span className="text-[#4343F0] font-normal text-[16px] uppercase leading-[27px]">Our Company</span>
                <h2 className="text-2xl sm:text-3xl md:text-[48px] font-bold text-[#363636] leading-tight sm:leading-[40px] md:leading-[58px]">
                  True dedication to the success of each client
                </h2>
                <p className="text-[#363636] text-base sm:text-[18px] leading-relaxed sm:leading-[28px] font-medium">
                  Our company is all about a process of building your business' web presence to complete excellence. We create completely custom recommendations for each business based on the business' goals, budget, timeline, competition, and other factors involved.
                </p>
              </div>
              <div className="flex flex-col gap-[13px] text-[#363636] text-[16px] leading-[27px] font-normal lg:w-[52.5%] lg:pt-[48px]">
                <p>Often our clients first need to create a consistent brand style between their logo, website, social media, advertising, etc. Our graphic design team is excellent at working directly with business owners to create quick concepts and revisions until the right design direction is found. For custom website development projects we're ready to create preliminary designs before any commitments.</p>
                <p>Once we've set up consistent branding and a professional website, our team will move to monthly marketing and management tasks. We'll use our expertise and extensive network of web contacts to build up website traffic.</p>
                <p>We'll be there for guidance or support when you need us, from the early stages of discussion &amp; concept design all the way to launch and online marketing. Take an in-depth look at the process-to-success that we have built and integrated into the core of our company.</p>
              </div>
            </div>
            <div className="flex flex-col md:flex-row items-center w-full justify-between gap-6 md:gap-0">
              <div className="relative w-full md:w-[70%] lg:w-[71.5%] h-[200px] sm:h-[300px] lg:h-[458px] rounded-[20px] overflow-hidden shadow-lg shrink-0">
                <img src="/images/Code.webp" className="object-cover company1" alt="Code development" />
              </div>
              <div className="relative w-full md:w-[30%] lg:w-[27%] h-[200px] sm:h-[300px] lg:h-[456px] rounded-[20px] overflow-hidden shadow-lg shrink-0">
                <img src="/images/program.webp" className="object-cover company-set" alt="Programming" />
              </div>
            </div>
          </div>
        </section>

        {/* ── Foundation Section ───────────────────────────────────────── */}
        <section className="bg-[#EBE9FA] text-gray-800 py-12 md:py-[70px]">
          <div className="max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] w-full">
            <div className="flex flex-col lg:flex-row items-start w-full justify-between gap-8 lg:gap-0">
              <div className="w-full lg:w-[33%] flex flex-col gap-[13px] shrink-0">
                <h2 className="text-2xl sm:text-3xl md:text-[48px] font-semibold text-[#363636] leading-tight sm:leading-[40px] md:leading-[58px] tracking-[-0.03em]">
                  Leading the new generation of web companies.
                </h2>
                <p className="font-semibold text-[#363636] text-base sm:text-[18px] leading-relaxed sm:leading-[27px]">We’re not your average web company. We’re your trusted partner for mutual long-term online success.</p>
                <p className="text-[#363636] text-[16px] font-normal leading-[27px]">
                  Society Web Solutions provides a completely client-focused service built on trust and a long-term vision. We'll always be dedicated to your business goals as if they were our own. We're here to adapt to your situation and provide the most efficient solutions possible.
                </p>
              </div>
              <div className="w-full lg:w-[66%] bg-white rounded-[20px] shadow-sm flex flex-col md:flex-row overflow-hidden">
                <div className="relative w-full md:w-[40%] lg:w-[394px] min-h-[220px] md:min-h-0 shrink-0">
                  <img src="/images/Office.webp" className="object-cover company-set" alt="Society Web Solutions office" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center px-6 py-8 md:pl-[44px] md:pr-6 gap-[18px]">
                  <h3 className="text-xl sm:text-[22px] font-bold text-[#363636] leading-snug sm:leading-[27px]">As a strong foundational principal</h3>
                  <p className="text-[#363636] text-[16px] font-normal leading-[27px]">we keep our standard for quality of work very high, constantly improving it where possible. Our custom web solutions are pixel perfect on every device and screen size. Most websites we build now are built with a "mobile-first" design process since more than half of users are accessing websites from mobile devices. We track every click on our websites and find that there's almost always something to improve based on user data. Since the online world is rapidly evolving, we're also here to keep an eye out for emerging new opportunities, strategies, and trends.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Dynamic Testimonials Section ─────────────────────────────── */}
        <section className="bg-[#F4F5FA] text-gray-800 py-12 md:pt-[70px] md:pb-0 flex flex-col items-center">
          <div className="w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] flex flex-col items-center gap-6 md:gap-[25px]">
            <h2 className="w-full text-2xl sm:text-3xl md:text-[50px] font-semibold leading-tight sm:leading-[40px] md:leading-[61px] text-center text-[#363636]">
              See what our business community has to say
            </h2>
            <div className="w-full relative">
              <div
                ref={sliderRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                className="w-full overflow-x-auto hide-scrollbar flex gap-4 md:gap-6 snap-x snap-mandatory cursor-grab active:cursor-grabbing select-none py-4 px-1"
              >
                {testimonials.map((t, index) => (
                  <div
                    key={t._id || t.id || index}
                    className="w-[85vw] sm:w-[360px] md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] flex-shrink-0 snap-start"
                  >
                    <div className="bg-white border border-white rounded-[20px] p-6 md:p-[28px] flex flex-col justify-between h-full shadow-[0px_4px_44px_rgba(194,194,194,0.15)] min-h-[320px]">
                      <div>
                        <h3 className="font-bold text-[#2D2D2D] text-lg sm:text-[20px] leading-snug sm:leading-[24px] m-0 truncate text-left">
                          {getTestimonialTitle(t)}
                        </h3>
                        <div className="flex gap-[2px] mt-[4px]">
                          {renderStars(t.rating)}
                        </div>
                        <p className="text-[#363636] text-[16px] leading-[24px] font-normal mt-5 md:mt-[24px] m-0 whitespace-pre-line text-left">
                          &ldquo;{(t.content || "").replace(/^["“”]|["“”]$/g, "")}&rdquo;
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Slider Navigation Buttons */}
            <div className="flex flex-row items-center justify-center gap-[4px] mt-2 mb-4">
              <button
                type="button"
                onClick={() => handleScroll("left")}
                disabled={!canScrollLeft}
                aria-label="Previous Testimonials"
                className={`w-[58px] h-[58px] flex items-center justify-center transition-all ${
                  canScrollLeft
                    ? "hover:opacity-80 active:scale-95 cursor-pointer"
                    : "opacity-40 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center justify-center text-[#4343F0] rounded-full bg-white shadow-sm slider-btn-cs">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 19l-7-7 7-7" />
                  </svg>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleScroll("right")}
                disabled={!canScrollRight}
                aria-label="Next Testimonials"
                className={`w-[58px] h-[58px] flex items-center justify-center transition-all ${
                  canScrollRight
                    ? "hover:opacity-80 active:scale-95 cursor-pointer"
                    : "opacity-40 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center justify-center text-[#4343F0] rounded-full bg-white shadow-sm slider-btn-cs">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>
          </div>

          <div className="max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] w-full text-center flex flex-col items-center gap-6 md:gap-[47px] mb-8 md:mb-16 pt-[30px]">
            <h2 className="text-2xl sm:text-3xl md:text-[48px] leading-tight sm:leading-[40px] md:leading-[58px] font-semibold text-[#363636]">
              Ready to accelerate your growth?
            </h2>
            <Link className="w-full flex justify-center" href="/help-support/contact-us">
              <button className="w-full max-w-[336px] h-[60px] bg-[#4343F0] hover:bg-[#5c5cf2] shadow-[0_4px_4px_rgba(130,130,130,0.25)] rounded-[10px] text-white font-semibold text-[18px] leading-[22px] flex items-center justify-center transition-colors">
                Start a new project with us!
              </button>
            </Link>
          </div>
        </section>
      </main>

      <main className="flex-grow overflow-hidden bg-[#F4F5FA]">
        {/* ── Newsletter Section ───────────────────────────────────────── */}
        <section className="relative z-20 pb-12">
          <SupportNewsletter />
        </section>
      </main>
    </div>
  );
}
