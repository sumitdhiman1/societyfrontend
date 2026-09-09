import React, { Suspense } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/dashboard/Footer";
import VerificationBanner from "@/components/dashboard/VerificationBanner";
import AppHeader from "@/components/AppHeader";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#F3F4F6] min-h-screen flex flex-col font-sans">
      <AppHeader>
        <Suspense fallback={null}>
          <VerificationBanner />
        </Suspense>
        <Navbar />
      </AppHeader>
      <main className="flex-grow flex flex-col">
        {children}
      </main>
      <Footer />
    </div>
  );
}
