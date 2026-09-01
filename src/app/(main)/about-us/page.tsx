import Image from "next/image";
import aboutUsHero from "../../../../public/assets/company/aboutus.png";
import leftSideImage from "../../../../public/assets/company/leftsideimage.png";
import rightSideImage from "../../../../public/assets/company/rightsideimage.png";
import foundationImage from "../../../../public/assets/company/foundationimage.jpg";
import TestimonialsSlider from "@/components/about/TestimonialsSlider";

export default function AboutUsPage() {
    return (
        <div>
            {/* Hero Section */}
            <section className="relative w-full h-[280px] sm:h-[360px] lg:h-[436px] overflow-hidden">
                {/* Background image */}
                <Image
                    src={aboutUsHero}
                    alt="About us hero"
                    fill
                    className="object-cover object-[70%_top]"
                    priority
                />

                {/* Gradient overlay: dark left → transparent right */}
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            "linear-gradient(to right, #00102E 35%, #00102Ecc 55%, transparent 75%)",
                    }}
                />

                {/* Text content */}
                <div className="relative z-10 h-full flex flex-col justify-center pl-6 sm:pl-10 lg:pl-[60px] pr-4 sm:pr-8 max-w-[518px] gap-[25px]">
                    <p className="text-white text-[25px] font-bold leading-[100%] tracking-[-0.03em] opacity-60">About us</p>
                    <div className="w-[896px]">
                        <h1 className="text-white text-2xl sm:text-[32px] lg:text-[48px] font-bold leading-15">
                            World class websites and
                            <br />
                            online marketing.
                        </h1>
                    </div>
                    <p className="text-white/80 text-xs sm:text-sm leading-relaxed max-w-[518px]">
                        Society Web Solutions provides an all-in-one business class service
                        oriented around web presence success.
                    </p>
                </div>
            </section>

            {/* Company Section */}
            <section className="w-full bg-white py-[70px] px-4 sm:px-8 lg:px-[55px] flex flex-col gap-[10px]">

                {/* Top row: left heading column + right paragraphs column */}
                <div className="flex flex-col lg:flex-row lg:justify-between gap-8 lg:gap-0">

                    {/* Left column */}
                    <div className="flex flex-col gap-[21px] w-full lg:w-[528px] lg:max-w-[528px] lg:shrink-0 overflow-hidden">
                        <p className="text-[16px] font-normal leading-[27px] tracking-[0em] uppercase" style={{ color: '#4343F0' }}>
                            Our Company
                        </p>
                        <h2 className="text-[28px] sm:text-[36px] lg:text-[48px] font-bold leading-[100%] tracking-[0em]" style={{ color: '#363636' }}>
                            True dedication to the success of each client
                        </h2>
                        <p className="text-[18px] font-medium leading-[28px] tracking-[0em]" style={{ color: '#363636' }}>
                            Our company is all about a process of building your business&apos;
                            web presence to complete excellence. We create completely custom
                            recommendations for each business based on the business&apos;
                            goals, budget, timeline, competition, and other factors involved.
                        </p>
                    </div>

                    {/* Right column */}
                    <div className="flex flex-col gap-[13px] w-full lg:w-[696px] lg:max-w-[696px] lg:shrink-0">
                        <p className="text-[16px] font-normal leading-[27px] tracking-[0em] text-[#363636]">
                            Often our clients first need to create a consistent brand style
                            between their logo, website, social media, advertising, etc. Our
                            graphic design team is excellent at working directly with business
                            owners to create quick concepts and revisions until the right
                            design direction is found. For custom web development projects
                            we&apos;re ready to create preliminary designs before any
                            commitments.
                        </p>
                        <p className="text-[16px] font-normal leading-[27px] tracking-[0em] text-[#363636]">
                            Once we&apos;ve set up consistent branding and a professional
                            website, our team will move to monthly marketing and management
                            tasks. We&apos;ll use our expertise and extensive network of web
                            contacts to build up website traffic.
                        </p>
                        <p className="text-[16px] font-normal leading-[27px] tracking-[0em] text-[#363636]">
                            We&apos;ll be there for guidance or support when you need us, from
                            the early stages of discussion &amp; concept design all the way to
                            launch and online marketing. Take an in-depth look at the
                            process-to-success that we have built and integrated into the core
                            of our company.
                        </p>
                    </div>
                </div>

                {/* Images row */}
                <div className="flex flex-col sm:flex-row justify-between gap-4 sm:gap-5 mt-2">
                    {/* Left image — 886×458 */}
                    <div className="relative w-full sm:flex-[886] h-[260px] sm:h-[360px] lg:h-[458px] rounded-[20px] overflow-hidden">
                        <Image
                            src={leftSideImage}
                            alt="Development workspace"
                            fill
                            className="object-cover"
                        />
                    </div>
                    {/* Right image — 423×456 */}
                    <div className="relative w-full sm:flex-[423] h-[260px] sm:h-[360px] lg:h-[456px] rounded-[20px] overflow-hidden">
                        <Image
                            src={rightSideImage}
                            alt="Code on screen"
                            fill
                            className="object-cover"
                        />
                    </div>
                </div>

            </section>

            {/* Foundation / Leading Section */}
            <section
                className="w-full py-[70px] px-4 sm:px-8 lg:px-[54px] flex flex-col gap-[10px]"
                style={{ backgroundColor: '#EBE9FA' }}
            >
                <div className="w-full flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-8">

                    {/* Left text block */}
                    <div className="flex flex-col gap-4 w-full lg:flex-1">
                        <h2 className="text-[28px] sm:text-[36px] lg:text-[40px] font-semibold leading-[100%] tracking-[-0.03em]" style={{ color: '#363636' }}>
                            Leading the new generation of web companies.
                        </h2>
                        <p className="text-[18px] font-semibold leading-[27px] tracking-[0em]" style={{ color: '#363636' }}>
                            We&apos;re not your average web company. We&apos;re your trusted
                            partner for mutual long-term online success.
                        </p>
                        <p className="text-[16px] font-normal leading-[27px] tracking-[0em]" style={{ color: '#363636' }}>
                            Society Web Solutions provides a completely client-focused service
                            built on trust and a long-term vision. We&apos;ll always be
                            dedicated to your business goals as if they were our own.
                            We&apos;re here to adapt to your situation and provide the most
                            efficient solutions possible.
                        </p>
                    </div>

                    {/* Right white card: image + text combined (878×416) */}
                    <div className="w-full lg:w-[878px] lg:h-[416px] lg:shrink-0 bg-white rounded-[20px] overflow-hidden flex flex-col sm:flex-row">

                        {/* Image — 395×416, only top-left & bottom-left radius */}
                        <div className="relative w-full sm:w-[395px] sm:shrink-0 h-[220px] sm:h-full rounded-tl-[20px] rounded-bl-[20px] sm:rounded-tr-none sm:rounded-br-none overflow-hidden">
                            <Image
                                src={foundationImage}
                                alt="Innovative futuristic classroom"
                                fill
                                className="object-cover"
                            />
                        </div>

                        {/* Text content — 411px, pt-37px, gap-18px */}
                        <div className="flex flex-col gap-[18px] flex-1 pt-[37px] px-6 pb-6 lg:px-8 lg:pb-8">
                            <h3 className="text-[22px] font-bold leading-[27px] tracking-[0em]" style={{ color: '#363636' }}>
                                As a strong foundational principal
                            </h3>
                            <p className="text-[16px] font-normal leading-[27px] tracking-[0em]" style={{ color: '#363636' }}>
                                we keep our standard for quality of work very high, constantly
                                improving it where possible. Our custom web solutions are pixel
                                perfect on every device and screen size. Most websites we build
                                now are built with a &quot;mobile-first&quot; design process since
                                more than half of users are accessing websites from mobile devices.
                                We track every click on our websites and find that there&apos;s
                                almost always something to improve based on user data. Since the
                                online world is rapidly evolving, we&apos;re also here to keep an
                                eye out for emerging new opportunities, strategies, and trends.
                            </p>
                        </div>

                    </div>

                </div>
            </section>

            {/* Testimonials Slider Section */}
            <TestimonialsSlider />

            {/* CTA Section */}
            <section
                className="w-full py-8 sm:py-12 lg:py-[40px] px-4 flex flex-col items-center gap-4 sm:gap-6"
                style={{ backgroundColor: '#F4F5FA', marginTop: '-70px' }}
            >
                <h2
                    className="text-[32px] sm:text-[50px] lg:text-[70px] font-semibold leading-[82px] tracking-[0em] text-center"
                    style={{ color: '#363636' }}
                >
                    Ready to accelerate your growth?
                </h2>
                <div className="pb-[48px]">
                    <button
                        className="w-[336px] h-[60px] rounded-[10px] text-white text-[18px] font-semibold leading-[100%] tracking-[0em] transition hover:opacity-90"
                        style={{ backgroundColor: '#4343F0' }}
                    >
                        Start a new project with us!
                    </button>
                </div>
            </section>

        </div>
    );
}
