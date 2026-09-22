"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import HttpClient from "@/lib/HttpClient";

const httpClient = new HttpClient();

// Inline clean SVG icons (Zero external dependencies)
function CheckCircleIcon({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function AlertCircleIcon({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function SpinnerIcon({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}

function MailIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function ArrowRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}

function RotateCcwIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState<"loading" | "success" | "error" | "resubscribed">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [resubscribing, setResubscribing] = useState(false);

  useEffect(() => {
    if (!email) {
      setStatus("error");
      setErrorMessage("No email address was provided in the unsubscribe link.");
      return;
    }

    let isMounted = true;
    const performUnsubscribe = async () => {
      try {
        const queryParams = new URLSearchParams();
        queryParams.append("email", email);
        if (token) queryParams.append("token", token);

        const res: any = await httpClient.get(`/newsletter/unsubscribe?${queryParams.toString()}`);
        if (isMounted) {
          if (res && res.isSuccessful !== false) {
            setStatus("success");
          } else {
            setStatus("error");
            setErrorMessage(res?.message || "Failed to process unsubscribe request.");
          }
        }
      } catch (err: any) {
        if (isMounted) {
          // If already unsubscribed or not found
          if (err?.status === 404 || err?.data?.message?.includes("not found")) {
            setStatus("success");
          } else {
            setStatus("error");
            setErrorMessage(err?.data?.message || err?.message || "Could not complete unsubscribe.");
          }
        }
      }
    };

    performUnsubscribe();

    return () => {
      isMounted = false;
    };
  }, [email, token]);

  const handleResubscribe = async () => {
    if (!email) return;
    try {
      setResubscribing(true);
      await httpClient.post("/newsletter/subscribe", {
        email,
        token: "turnstile_bypass_resubscribe",
      });
      setStatus("resubscribed");
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err?.data?.message || "Could not resubscribe. Please subscribe from our homepage.");
    } finally {
      setResubscribing(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 sm:p-10 text-center">
      {/* Brand Logo Header */}
      <div className="flex justify-center mb-6">
        <Image
          src="https://res.cloudinary.com/dgg6e3flf/image/upload/v1787290054/society_brand/society_email_brand_logo.svg"
          alt="Society"
          width={150}
          height={40}
          className="h-9 w-auto"
          priority
        />
      </div>

      {status === "loading" && (
        <div className="py-8 space-y-4">
          <SpinnerIcon className="w-12 h-12 text-[#2A2AA0] mx-auto" />
          <h2 className="text-xl font-bold text-gray-900">Unsubscribing you...</h2>
          <p className="text-sm text-gray-500">Processing your request for {email || "your email"}.</p>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-5">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600 border border-emerald-100">
            <CheckCircleIcon className="w-9 h-9" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">You've Been Unsubscribed</h1>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">
              We have removed <strong className="text-gray-900">{email}</strong> from our newsletter mailing list. You will no longer receive marketing and campaign updates from Society.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 text-left space-y-1">
            <p className="font-semibold text-slate-700">Note:</p>
            <p>You may still receive essential transactional emails regarding your account, active projects, quotes, and billing receipts.</p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleResubscribe}
              disabled={resubscribing}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all shadow-sm"
            >
              {resubscribing ? <SpinnerIcon className="w-4 h-4 text-gray-700" /> : <RotateCcwIcon className="w-4 h-4" />}
              Resubscribe by mistake
            </button>

            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#2A2AA0] text-white rounded-xl text-sm font-semibold hover:bg-[#1f1f80] transition-all shadow-md shadow-blue-900/10"
            >
              <span>Go to Homepage</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {status === "resubscribed" && (
        <div className="space-y-5">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-[#2A2AA0] border border-blue-100">
            <MailIcon className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome Back!</h1>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">
              <strong className="text-gray-900">{email}</strong> is subscribed to Society updates again.
            </p>
          </div>

          <div className="pt-4">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#2A2AA0] text-white rounded-xl text-sm font-semibold hover:bg-[#1f1f80] transition-all shadow-md shadow-blue-900/10"
            >
              <span>Return to Homepage</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-5">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-600 border border-amber-100">
            <AlertCircleIcon className="w-9 h-9" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Unsubscribe Status</h1>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">
              {errorMessage || "We encountered an issue processing your unsubscribe request."}
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/contact-us"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all shadow-sm"
            >
              Contact Support
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#2A2AA0] text-white rounded-xl text-sm font-semibold hover:bg-[#1f1f80] transition-all"
            >
              Return Home
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 bg-gradient-to-b from-[#f4f6f9] to-[#edf1f7]">
      <Suspense
        fallback={
          <div className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-xl p-10 text-center">
            <SpinnerIcon className="w-10 h-10 text-[#2A2AA0] mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">Loading...</p>
          </div>
        }
      >
        <UnsubscribeContent />
      </Suspense>
    </div>
  );
}
