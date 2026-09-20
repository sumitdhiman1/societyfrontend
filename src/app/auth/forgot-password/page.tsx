"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ForgotPasswordRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const queryString = searchParams?.toString();
    router.replace(queryString ? `/forgot-password?${queryString}` : "/forgot-password");
  }, [router, searchParams]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f3f4f6]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4343F0]"></div>
    </div>
  );
}

export default function AuthForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-[#f3f4f6]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4343F0]"></div>
      </div>
    }>
      <ForgotPasswordRedirect />
    </Suspense>
  );
}
