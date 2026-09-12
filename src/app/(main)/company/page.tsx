"use client";

import React from "react";
import Link from "next/link";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";

export default function CompanyPage() {
  return (
    <div className="flex flex-col min-h-screen font-sans bg-[#050A15] text-white selection:bg-[#5356ff] selection:text-white">
      {/* ── Hero Section ────────────────────────────────────────────── */}
      <main className="flex-grow overflow-hidden">
        <section className="relative h-[420px] sm:h-[506px] bg-[#00102E] flex items-center overflow-hidden">
          <img src="/images/image.png" className="company-bg absolute right-0 top-0 h-full w-auto object-cover object-right opacity-90 z-0 scale-[1.3] origin-right translate-y-[5%]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#00102E] via-[#00102E]/60 to-transparent z-0"></div>
          <div className="max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] relative z-10 text-left w-full flex flex-col items-start gap-[16px]">
            <span className="text-[#A3A3A3] text-lg sm:text-[22px] font-bold leading-normal sm:leading-[30px]">About us</span>
            <h1 className="text-3xl sm:text-4xl md:text-[56px] font-bold text-white leading-tight sm:leading-[48px] md:leading-[64px]">
              World class websites and <br />  online marketing.
            </h1>
            <p className="text-[#A3A3A3] text-base sm:text-[18px] font-normal leading-relaxed sm:leading-[26px] mt-2">
              Society Web Solutions provides an all-in-one business class
              <br className="hidden sm:block" />
              service oriented around web presence success.
            </p>
          </div>
        </section>
        <section className="bg-white text-gray-800 py-12 md:py-[70px]">
          <div className="max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] w-full flex flex-col gap-10 md:gap-[60px]">
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
                <p>We'll be there for guidance or support when you need us, from the early stages of discussion & concept design all the way to launch and online marketing. Take an in-depth look at the process-to-success that we have built and integrated into the core of our company.</p>
              </div>
            </div>
            <div className="flex flex-col md:flex-row items-center w-full justify-between gap-6 md:gap-0">
              <div className="relative w-full md:w-[70%] lg:w-[71.5%] h-[200px] sm:h-[300px] lg:h-[458px] rounded-[20px] overflow-hidden shadow-lg shrink-0">
                <img src="/images/Code.webp" className="object-cover company1" />
              </div>
              <div className="relative w-full md:w-[30%] lg:w-[27%] h-[200px] sm:h-[300px] lg:h-[456px] rounded-[20px] overflow-hidden shadow-lg shrink-0">
                <img src="/images/program.webp" className="object-cover company-set" />
              </div>
            </div>
          </div>
        </section>
        <section className="bg-[#EBE9FA] text-gray-800 py-12 md:py-[70px]">
          <div className="max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] w-full">
            <div className="flex flex-col lg:flex-row items-start w-full justify-between gap-8 lg:gap-0">
              <div className="w-full lg:w-[31%] flex flex-col gap-[13px] shrink-0">
                <h2 className="text-2xl sm:text-3xl md:text-[48px] font-semibold text-[#363636] leading-tight sm:leading-[40px] md:leading-[58px] tracking-[-0.03em]">
                  Leading the new generation of web companies.
                </h2>
                <p className="font-semibold text-[#363636] text-base sm:text-[18px] leading-relaxed sm:leading-[27px]">font-semibold text-[#363636] text-base sm:text-[18px] leading-relaxed sm:leading-[27px]</p>
                <p className="text-[#363636] text-[16px] font-normal leading-[27px]">
                  Society Web Solutions provides a completely client-focused service built on trust and a long-term vision. We'll always be dedicated to your business goals as if they were our own. We're here to adapt to your situation and provide the most efficient solutions possible.
                </p>
              </div>
              <div className="w-full lg:w-[66%] bg-white rounded-[20px] shadow-sm flex flex-col md:flex-row overflow-hidden">
                <div className="relative w-full md:w-[40%] lg:w-[395px] min-h-[220px] md:min-h-0 shrink-0">
                  <img src="/images/program.webp" className="object-cover company-set" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center px-6 py-8 md:pl-[44px] md:pr-6 gap-[18px]">
                  <h3 className="text-xl sm:text-[22px] font-bold text-[#363636] leading-snug sm:leading-[27px]">As a strong foundational principal</h3>
                  <p className="text-[#363636] text-[16px] font-normal leading-[27px]">we keep our standard for quality of work very high, constantly improving it where possible. Our custom web solutions are pixel perfect on every device and screen size. Most websites we build now are built with a "mobile-first" design process since more than half of users are accessing websites from mobile devices. We track every click on our websites and find that there's almost always something to improve based on user data. Since the online world is rapidly evolving, we're also here to keep an eye out for emerging new opportunities, strategies, and trends.</p>
                </div>
              </div>
            </div>
          </div>

        </section>
        <section className="bg-[#F4F5FA] text-gray-800 py-12 md:pt-[70px] md:pb-0 flex flex-col items-center">
          <div className="w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] flex flex-col items-center gap-6 md:gap-[25px]">
            <h2 className="w-full text-2xl sm:text-3xl md:text-[50px] font-semibold leading-tight sm:leading-[40px] md:leading-[61px] text-center text-[#363636]">
              See what our business community has to say
            </h2>
            <div className="w-full relative">
              <div className="w-full overflow-x-auto hide-scrollbar flex gap-4 md:gap-6 snap-x snap-mandatory scroll-smooth cursor-grab active:cursor-grabbing select-none py-4 px-1">
                <div className="w-[85vw] sm:w-[360px] md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] flex-shrink-0 snap-start">
                  <div className="bg-white border border-white rounded-[20px] p-6 md:p-[28px] flex flex-col justify-between h-full shadow-[0px_4px_44px_rgba(194,194,194,0.15)] min-h-[320px]">
                    <div className="">
                      <h2 className="font-bold text-[#2D2D2D] text-lg sm:text-[20px] leading-snug sm:leading-[24px] m-0 truncate text-left">
                        Jim | GreenPro Sanitizing
                      </h2>
                      <div className="flex gap-[2px] text-[#D1AC40] mt-[4px]">
                        <svg className="w-[16.66px] h-[16.66px] fill-current shrink-0" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        <svg className="w-[16.66px] h-[16.66px] fill-current shrink-0" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        <svg className="w-[16.66px] h-[16.66px] fill-current shrink-0" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        <svg className="w-[16.66px] h-[16.66px] fill-current shrink-0" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        <svg className="w-[16.66px] h-[16.66px] fill-current shrink-0" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                      </div>
                      <p className="text-[#363636] text-[16px] leading-[24px] font-normal mt-5 md:mt-[25px] m-0 whitespace-pre-line text-left">
                        "Rick and his team did great job, There were many challenges along the way, but they rose to get the job done!"
                      </p>
                    </div>
                  </div>
                </div>
                <div className="w-[85vw] sm:w-[360px] md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] flex-shrink-0 snap-start">
                  <div className="bg-white border border-white rounded-[20px] p-6 md:p-[28px] flex flex-col justify-between h-full shadow-[0px_4px_44px_rgba(194,194,194,0.15)] min-h-[320px]">
                    <div className="">
                      <h2 className="font-bold text-[#2D2D2D] text-lg sm:text-[20px] leading-snug sm:leading-[24px] m-0 truncate text-left">
                        House Of Om
                      </h2>
                      <div className="flex gap-[2px] text-[#D1AC40] mt-[4px]">
                        <svg className="w-[16.66px] h-[16.66px] fill-current shrink-0" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        <svg className="w-[16.66px] h-[16.66px] fill-current shrink-0" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        <svg className="w-[16.66px] h-[16.66px] fill-current shrink-0" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        <svg className="w-[16.66px] h-[16.66px] fill-current shrink-0" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        <svg className="w-[16.66px] h-[16.66px] fill-current shrink-0" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                      </div>
                      <p className="text-[#363636] text-[16px] leading-[24px] font-normal mt-5 md:mt-[25px] m-0 whitespace-pre-line text-left">
                        Society Web Solutions team is incredible! So honest, direct & result-oriented. The way they communicate and work is just next level! They don't only bring you results, but actually educate you and show how to make your business thrive. Though their pricing might be higher than the average, then the investment already has returned itself. We were doing different tasks with different people, but they just united it all into one, making our life super easy. Their design & development team make stunning miracles plus their marketing team is absolutely great. Highly-highly recommended!</p>
                    </div>
                  </div>
                </div>
                <div className="w-[85vw] sm:w-[360px] md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] flex-shrink-0 snap-start">
                  <div className="bg-white border border-white rounded-[20px] p-6 md:p-[28px] flex flex-col justify-between h-full shadow-[0px_4px_44px_rgba(194,194,194,0.15)] min-h-[320px]">
                    <div className="">
                      <h2 className="font-bold text-[#2D2D2D] text-lg sm:text-[20px] leading-snug sm:leading-[24px] m-0 truncate text-left">
                        Matthew Goodrich | TITLE Boxing Club
                      </h2>
                      <div className="flex gap-[2px] text-[#D1AC40] mt-[4px]">
                        <svg className="w-[16.66px] h-[16.66px] fill-current shrink-0" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        <svg className="w-[16.66px] h-[16.66px] fill-current shrink-0" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        <svg className="w-[16.66px] h-[16.66px] fill-current shrink-0" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        <svg className="w-[16.66px] h-[16.66px] fill-current shrink-0" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        <svg className="w-[16.66px] h-[16.66px] fill-current shrink-0" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                      </div>
                      <p className="text-[#363636] text-[16px] leading-[24px] font-normal mt-5 md:mt-[25px] m-0 whitespace-pre-line text-left">
                        We have worked with Rick on numerous occasions. He always comes they with high quality work. I highly suggest if you want your website game to go up.. give them a call. You won’t be disappointed
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-row items-center justify-center gap-[4px] mt-2 mb-4">
              <button className="w-[58px] h-[58px] flex items-center justify-center transition-all opacity-40 cursor-not-allowed">
                <div className="flex items-center justify-center text-[#4343F0] rounded-full bg-white shadow-sm slider-btn-cs">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19l-7-7 7-7"></path></svg>
                </div>
              </button>
              <button className="w-[58px] h-[58px] flex items-center justify-center transition-all hover:opacity-80 active:scale-95 cursor-pointer">
                <div className="flex items-center justify-center text-[#4343F0] rounded-full bg-white shadow-sm slider-btn-cs">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5l7 7-7 7"></path></svg>
                </div>
              </button>
            </div>
          </div>
          <div className="max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] w-full text-center flex flex-col items-center gap-6 md:gap-[47px] mb-8 md:mb-16 pt-[30px]">
            <h2 className="text-2xl sm:text-3xl md:text-[48px] leading-tight sm:leading-[40px] md:leading-[58px] font-semibold text-[#363636]">
              Ready to accelerate your growth?
            </h2>
            <a className="w-full flex justify-center" href="">
              <button className="w-full max-w-[336px] h-[60px] bg-[#4343F0] hover:bg-[#5c5cf2] shadow-[0_4px_4px_rgba(130,130,130,0.25)] rounded-[10px] text-white font-semibold text-[18px] leading-[22px] flex items-center justify-center transition-colors">
                Start a new project with us!
              </button>
            </a>
          </div>
        </section>
      </main>
      <main className="flex-grow overflow-hidden bg-[#F4F5FA]">
        {/* <section className="relative min-h-[85vh] flex flex-col items-center justify-center text-center px-4">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] md:w-[800px] h-[600px] md:h-[800px] bg-[#5356ff] rounded-full mix-blend-screen filter blur-[150px] opacity-10 animate-pulse" />

          <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center">
            <h1 className="text-5xl md:text-7xl lg:text-[90px] font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-[#888888] mb-8 leading-[1.05] tracking-tight">
              World Class Websites &{" "}
              <br className="hidden md:block" />
              Digital Marketing.
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl leading-relaxed font-light">
              We don&apos;t just build websites; we create comprehensive digital ecosystems
              designed to dominate search engines and accelerate growth.
            </p>
            <Link href="/help-support/contact-us">
              <button className="px-10 py-5 rounded-2xl bg-white text-[#050A15] font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_60px_rgba(255,255,255,0.25)] flex items-center gap-3 group">
                Start Your Project
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </Link>
          </div>
        </section> */}

        {/* ── Stats Bar ───────────────────────────────────────────────── */}
        {/* <section className="py-12 md:py-16 bg-[#0A0F1C] border-y border-white/5 relative z-20">
          <div className="container mx-auto px-4 max-w-[1600px]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4 divide-y md:divide-y-0 md:divide-x divide-white/5 text-center">
              <div className="flex flex-col items-center justify-center pt-8 md:pt-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-4xl md:text-5xl font-black text-white">5.0</span>
                  <svg className="w-8 h-8 text-[#5356ff]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <span className="text-gray-500 uppercase tracking-[0.2em] text-[10px] font-bold">Google Rating (53+ Reviews)</span>
              </div>
              <div className="flex flex-col items-center justify-center pt-8 md:pt-0">
                <span className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">100%</span>
                <span className="text-gray-500 uppercase tracking-[0.2em] text-[10px] font-bold">Money-Back Guarantee</span>
              </div>
              <div className="flex flex-col items-center justify-center pt-8 md:pt-0">
                <span className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">∞</span>
                <span className="text-gray-500 uppercase tracking-[0.2em] text-[10px] font-bold">Unlimited Revisions</span>
              </div>
              <div className="flex flex-col items-center justify-center pt-8 md:pt-0">
                <span className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">24/7</span>
                <span className="text-gray-500 uppercase tracking-[0.2em] text-[10px] font-bold">Active Support Team</span>
              </div>
            </div>
          </div>
        </section> */}

        {/* ── Our DNA Section ─────────────────────────────────────────── */}
        {/* <section className="py-16 md:py-32 relative">
          <div className="container mx-auto px-4 md:px-8 lg:px-[54px] max-w-[1600px]">
            <div className="mb-10 md:mb-20 max-w-2xl">
              <h2 className="text-[#5356ff] font-bold uppercase tracking-[0.3em] text-xs mb-4 block">Our DNA</h2>
              <h3 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                Built on strong foundations. Delivered with precision.
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-auto md:auto-rows-[320px]">
              <div className="md:col-span-2 relative rounded-[2rem] overflow-hidden group bg-white/5 border border-white/5 p-10 flex flex-col justify-end min-h-[320px]">
                <div className="absolute inset-0 bg-gradient-to-t from-[#050A15] via-[#050A15]/60 to-transparent z-10 transition-opacity group-hover:opacity-80" />
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#5356ff_1px,transparent_1px)] [background-size:20px_20px] mix-blend-overlay" />
                <div className="relative z-20">
                  <h4 className="text-3xl font-bold text-white mb-4">Dedicated to Your Success</h4>
                  <p className="text-gray-400 text-lg max-w-xl font-light">
                    We provide each of our clients with a custom web presence that is built to reach their individual goals and surpass the competition.
                  </p>
                </div>
              </div>
              <div className="relative rounded-[2rem] bg-[#0A0F1C] border border-white/5 p-10 flex flex-col justify-between group overflow-hidden min-h-[320px]">
                <div className="absolute inset-0 bg-gradient-to-br from-[#5356ff]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-[#5356ff]/50 transition-colors">
                  <svg className="w-7 h-7 text-[#5356ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="relative z-10">
                  <h4 className="text-2xl font-bold text-white mb-3">Total Transparency</h4>
                  <p className="text-gray-400 font-light leading-relaxed">Integrity and absolute clarity in every single project milestone and deliverable.</p>
                </div>
              </div>

              <div className="md:col-span-3 relative rounded-[2rem] bg-[#0A0F1C] border border-white/5 p-10 flex flex-col md:flex-row items-start md:items-center justify-between group overflow-hidden min-h-[320px]">
                <div className="absolute right-0 top-0 h-full w-2/3 bg-gradient-to-l from-[#5356ff]/10 via-[#5356ff]/5 to-transparent skew-x-[-15deg] transform translate-x-10 group-hover:translate-x-0 transition-transform duration-700" />
                <div className="relative z-10 max-w-md mb-8 md:mb-0">
                  <h4 className="text-3xl font-bold text-white mb-4">Unlimited Potential</h4>
                  <p className="text-gray-400 text-lg font-light leading-relaxed">
                    From complete rebranding to massive e-commerce builds, you get an elite dedicated in-house team for it all.
                  </p>
                </div>
                <div className="relative z-10 hidden md:flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md group-hover:border-[#5356ff]/30 group-hover:rotate-45 transition-all duration-500">
                  <svg className="w-10 h-10 text-white group-hover:text-[#5356ff] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </section> */}

        {/* ── CTA Section ─────────────────────────────────────────────── */}
        {/* <section className="py-16 md:py-32 relative overflow-hidden group bg-gradient-to-b from-transparent to-[#050A15]">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#5356ff] rounded-full mix-blend-screen filter blur-[200px] opacity-[0.15] group-hover:opacity-[0.25] transition-opacity duration-1000" />
          <div className="container mx-auto px-4 md:px-8 lg:px-[54px] max-w-[1600px] relative z-10 text-center">
            <h2 className="text-5xl md:text-7xl font-bold text-white mb-8 tracking-tight">
              Ready to{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5356ff] to-[#8a8aff]">accelerate</span>{" "}
              your growth?
            </h2>
            <p className="text-gray-400 text-xl md:text-2xl font-light mb-12 max-w-2xl mx-auto leading-relaxed">
              Schedule a free consultation with our experts today and let&apos;s craft something truly outstanding.
            </p>
            <Link href="/help-support/contact-us">
              <button className="px-12 py-6 bg-white text-[#050A15] active:scale-95 rounded-2xl font-black transition-all shadow-[0_20px_40px_rgba(255,255,255,0.05)] hover:shadow-[0_20px_60px_rgba(255,255,255,0.15)] uppercase tracking-widest text-sm hover:scale-105">
                Connect With Us
              </button>
            </Link>
          </div>
        </section> */}

        {/* ── Newsletter Section ───────────────────────────────────────── */}
        <section className="relative z-20">
          <SupportNewsletter />
        </section>
      </main>
    </div>
  );
}
