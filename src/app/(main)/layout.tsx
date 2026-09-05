import React, { Suspense } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/dashboard/Footer";
import VerificationBanner from "@/components/dashboard/VerificationBanner";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#F3F4F6] min-h-screen flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full">
        <Suspense fallback={null}>
          <VerificationBanner />
        </Suspense>
        <Navbar />
      </header>
      <main className="flex-grow flex flex-col">
        {children}
      </main>
      <Footer />
    </div>
  );
}
