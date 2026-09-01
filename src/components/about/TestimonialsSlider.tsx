"use client";

import React, { useState } from "react";

const testimonials = [
  {
    name: "THE EASTERN BLOCK DESIGNS",
    stars: 5,
    text: "It's been an amazing experience working with Rick and Romet at Society Web Solutions! If you're looking for business branding & website design, I'd highly recommend their team. The quality of work delivered is just outstanding!",
  },
  {
    name: "Terje Van Schaik",
    stars: 5,
    text: "Thank you web solutions! They helped our company's online store get more traffic. More customers are coming from Google. So the SEO plan they created worked! It was all very easy for us. They did all the keyword research and search engine optimization. I only had to approve the work. Looking forward to working with you more in the future! - GreenSpeed USA",
  },
  {
    name: "Tom Macrokanis",
    stars: 5,
    text: "Great team to work with, highly skilled and knowledgeable. Really enjoyed the experience working with them. For anyone looking to take their business to the next level I would highly recommend these guys.",
  },
  {
    name: "Sarah Johnson",
    stars: 5,
    text: "Society Web Solutions completely transformed our online presence. Their team is professional, responsive, and truly understands what businesses need. Our website traffic has doubled since working with them!",
  },
  {
    name: "Michael Chen",
    stars: 5,
    text: "Exceptional service from start to finish. The team at Society Web Solutions delivered exactly what we needed — a modern, fast, and mobile-friendly website. Couldn't be happier with the results!",
  },
  {
    name: "Amanda Williams",
    stars: 5,
    text: "Working with Society Web Solutions was a game changer for our business. They took the time to understand our goals and delivered a solution that exceeded our expectations. Highly recommend!",
  },
];

const VISIBLE_COUNT = 3;

export default function TestimonialsSlider() {
  const [index, setIndex] = useState(0);

  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () =>
    setIndex((i) => Math.min(testimonials.length - VISIBLE_COUNT, i + 1));

  const visibleCards = testimonials.slice(index, index + VISIBLE_COUNT);
  const canPrev = index > 0;
  const canNext = index < testimonials.length - VISIBLE_COUNT;

  return (
    <section className="w-full py-[70px] px-4 sm:px-8 lg:px-[55px] flex flex-col gap-[25px]" style={{ backgroundColor: '#F4F5FA' }}>
      {/* Heading */}
      <h2
        className="text-center text-[28px] sm:text-[36px] lg:text-[50px] font-semibold leading-[100%] tracking-[0em]"
        style={{ color: "#363636" }}
      >
        See what our business community has to say
      </h2>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {visibleCards.map((t, i) => (
          <div
            key={index + i}
            className={`rounded-[20px] p-6 flex flex-col gap-3 lg:min-h-[352px] xl:min-h-[280px] bg-white
              ${i === 1 ? 'hidden sm:flex' : ''}
              ${i === 2 ? 'hidden lg:flex' : ''}
            `}
            style={{ boxShadow: '0px 4px 44px 0px rgba(194, 194, 194, 0.25)' }}
          >
            <p className="text-[20px] font-bold leading-[100%] tracking-[0em] uppercase opacity-80" style={{ color: '#363636' }}>
              {t.name}
            </p>
            <div className="flex gap-[2px]">
              {Array.from({ length: t.stars }).map((_, j) => (
                <span key={j} className="text-[#F5A623] text-lg leading-none">
                  ★
                </span>
              ))}
            </div>
            <p className="text-[18px] font-normal leading-[27px] tracking-[0em]" style={{ color: '#363636' }}>
              {t.text}
            </p>
          </div>
        ))}
      </div>

      {/* Navigation arrows */}
      <div className="flex justify-center gap-4 mt-2">
        <button
          onClick={prev}
          disabled={!canPrev}
          aria-label="Previous"
          className="flex items-center justify-center rounded-full bg-white transition hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            width: '44.71px',
            height: '44.71px',
            boxShadow: '0px 2px 12px 0px rgba(0,0,0,0.12)',
          }}
        >
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 1L1 7L7 13" stroke={canPrev ? '#4343F0' : '#9E9E9E'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          onClick={next}
          disabled={!canNext}
          aria-label="Next"
          className="flex items-center justify-center rounded-full bg-white transition hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            width: '44.71px',
            height: '44.71px',
            boxShadow: '0px 2px 12px 0px rgba(0,0,0,0.12)',
          }}
        >
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L7 7L1 13" stroke={canNext ? '#4343F0' : '#9E9E9E'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </section>
  );
}
