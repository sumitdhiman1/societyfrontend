"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { profileService } from "@/lib/profileService";
import { authService } from "@/lib/authService";
import Link from "next/link";

function ConfirmEmailChangeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Confirming your new email address...");
  const [newEmail, setNewEmail] = useState<string>("");
  const isVerifyingRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Confirmation token is missing from the link.");
      return;
    }

    // Prevent double execution in React Strict Mode
    if (isVerifyingRef.current) return;
    isVerifyingRef.current = true;

    const confirm = async () => {
      try {
        const res = await profileService.confirmEmailChange(token);
        if (res.isSuccessful || res.success) {
          const verifiedEmail = res.data?.email || "";
          setNewEmail(verifiedEmail);
          setStatus("success");
          setMessage(
            verifiedEmail
              ? `Your account email address has been successfully changed to ${verifiedEmail}.`
              : "Your account email address has been successfully updated!"
          );

          if (verifiedEmail) {
            authService.updateInternalUser({ email: verifiedEmail });
          }

          try {
            await profileService.getMyProfile(true);
          } catch {
            // Profile cache refresh can safely fail if unauthenticated in this tab
          }
        } else {
          const isExpiredOrUsed =
            res.error === "INVALID_OR_EXPIRED_TOKEN" ||
            res.message?.includes("Invalid or expired");

          setStatus("error");
          setMessage(
            isExpiredOrUsed
              ? "This confirmation link has already been used or has expired. If you have already confirmed your new email, your account is already up to date."
              : res.message || "Email change confirmation failed. The link may have expired or is invalid."
          );
        }
      } catch (err: any) {
        const errorMsg =
          err?.response?.data?.message ||
          err?.message ||
          "An unexpected error occurred while confirming your new email address.";
        setStatus("error");
        setMessage(errorMsg);
      }
    };

    confirm();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
        {status === "loading" && (
          <div className="flex flex-col items-center py-6">
            <div className="w-16 h-16 border-4 border-[#4545F0]/20 border-t-[#4545F0] rounded-full animate-spin mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Confirming...</h2>
            <p className="text-gray-600 text-sm">{message}</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center py-4">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Email Updated!</h2>
            <p className="text-gray-600 mb-8 text-sm leading-relaxed">{message}</p>
            <div className="flex flex-col gap-3 w-full">
              <Link
                href="/dashboard/myAccount"
                className="w-full py-3 bg-[#4545F0] hover:bg-[#3737D8] text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg active:scale-[0.98] text-sm"
              >
                Go to Account Settings
              </Link>
              <Link
                href="/dashboard"
                className="text-gray-500 hover:text-gray-700 font-semibold text-xs transition-colors"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center py-4">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Confirmation Failed</h2>
            <p className="text-gray-600 mb-8 text-sm leading-relaxed">{message}</p>
            <div className="flex flex-col gap-3 w-full">
              <Link
                href="/dashboard/myAccount"
                className="w-full py-3 bg-[#4545F0] hover:bg-[#3737D8] text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg active:scale-[0.98] text-sm"
              >
                Go to Account Settings
              </Link>
              <Link
                href="/login"
                className="text-gray-500 hover:text-gray-700 font-semibold text-xs transition-colors"
              >
                Back to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConfirmEmailChangePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
          <div className="w-12 h-12 border-4 border-[#4545F0]/20 border-t-[#4545F0] rounded-full animate-spin"></div>
        </div>
      }
    >
      <ConfirmEmailChangeContent />
    </Suspense>
  );
}
