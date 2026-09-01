import React from "react";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";

export const metadata = {
  title: "Careers | Society",
  description: "Join our dynamic team and help shape the future of digital solutions.",
};

export default function CareersPage() {
  return (
    <div className="bg-white min-h-screen flex flex-col font-sans text-gray-600">
      {/* Hero Section */}
      <div className="bg-primary-100 border-[3px] border-gray-600">
        <div className="container mx-auto px-4 md:px-8 lg:px-[54px] py-16 max-w-[1536px]">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white uppercase tracking-tight">
            Careers
          </h1>
        </div>
      </div>

      <main className="flex-grow mx-auto px-4 md:px-8 lg:px-[54px] py-16 max-w-[1600px] w-full">
        <div className="mb-16">
          <h2 className="text-xl font-bold text-gray-600 mb-4">Why work with us?</h2>
          <p className="text-gray-500 text-sm leading-relaxed max-w-[1600px]">
            Join our dynamic team and help shape the future of digital solutions. We value
            innovation, collaboration, and personal growth. At Society, we believe in
            empowering our employees to do their best work in a supportive and flexible
            environment. We offer competitive salaries, remote work opportunities, and a
            culture that celebrates diversity and creativity.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-600 mb-8">Openings</h2>
          <div className="bg-gray-50 rounded-xl p-8 border border-gray-200 text-center">
            <p className="text-gray-500 text-sm font-medium">No current openings.</p>
            <p className="text-gray-400 text-xs mt-2">
              Check back later or follow us on our social media for updates.
            </p>
          </div>
        </div>

        <div className="mt-20">
          <SupportNewsletter />
        </div>
      </main>
    </div>
  );
}
