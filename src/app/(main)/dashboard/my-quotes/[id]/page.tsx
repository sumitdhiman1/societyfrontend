"use client";

import React, { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function QuoteRedirectPage() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    if (params?.id) {
      router.replace(`/dashboard/my-quotes/${params.id}/details`);
    }
  }, [params, router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
    </div>
  );
}
