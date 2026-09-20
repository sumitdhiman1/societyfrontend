import React, { Suspense } from "react";
import type { Metadata } from "next";
import ForgotPasswordClient from "./ForgotPasswordClient";

export const metadata: Metadata = {
  title: "Forgot Your Password - Society Web Solutions",
  description: "Request a password reset link for your Society account.",
};

function ForgotPasswordFallback() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f3f4f6]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4343F0]"></div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordFallback />}>
      <ForgotPasswordClient />
    </Suspense>
  );
}
