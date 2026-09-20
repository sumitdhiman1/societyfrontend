"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authService } from "@/lib/authService";
import { toast } from "sonner";

export default function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  // State for request link mode
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  // State for token reset mode (if user clicks link from email)
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Handle requesting the reset link
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res: any = await authService.forgotPassword(email.trim());
      if (res?.isSuccessful || res?.success || res?.status === "success" || res) {
        setIsSubmitted(true);
        toast.success("Reset link sent! Please check your email inbox.");
      } else {
        const errorMsg = res?.message || "Failed to send reset link. Please try again.";
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err: any) {
      const errorMsg =
        err?.data?.message || err?.message || "An unexpected error occurred. Please try again.";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle setting new password with token
  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res: any = await authService.resetPassword(token || "", newPassword);
      if (res?.isSuccessful || res?.success || res?.status === "success" || res) {
        setResetSuccess(true);
        toast.success("Password reset successfully! Redirecting to login...");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        const errorMsg = res?.message || "Failed to reset password. The link may have expired.";
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err: any) {
      const errorMsg =
        err?.data?.message || err?.message || "Failed to reset password. The link may have expired.";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#f3f4f6]">
      {/* Left Panel: Image with 100% Height */}
      <div className="hidden lg:block w-[40%] min-h-screen sticky top-0 overflow-hidden shrink-0 bg-[#060a12] relative">
        <Image
          src="/images/worldpic.png"
          alt="Reset Password"
          fill
          className="object-cover object-center"
          priority
          sizes="(min-width: 1024px) 40vw, 0vw"
        />
      </div>

      {/* Right Panel: Content Group */}
      <div className="flex-1 flex flex-col justify-center min-h-screen px-6 sm:px-10 lg:px-0 py-10 bg-[#f3f4f6]">
        <div
          style={{
            marginTop: "auto",
            marginBottom: "auto",
          }}
          className="w-full max-w-[418px] my-auto mx-auto lg:ml-[210px] lg:mr-auto"
        >
          {/* Heading */}
          <h1
            style={{
              font: "normal normal bold 36px/49px Manrope",
              letterSpacing: "0px",
              color: "#1a202c",
            }}
            className="text-left font-bold text-[28px] sm:text-[36px] leading-[38px] sm:leading-[49px] text-[#1a202c] mb-[32px] sm:mb-[45px] tracking-normal"
          >
            {token ? "Create New Password" : "Reset Your Password"}
          </h1>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Token Mode: Set New Password */}
          {token ? (
            resetSuccess ? (
              <div className="text-left py-4">
                <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Password Reset Successfully</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Your password has been changed. You will be redirected to the login page shortly.
                </p>
                <Link
                  href="/login"
                  className="w-full h-[48px] rounded-[8px] text-white text-[15px] font-bold bg-[#4343F0] hover:bg-[#3232b7] shadow-md flex items-center justify-center transition-all"
                >
                  Go to Login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSetNewPassword} className="w-full">
                <div className="mb-4">
                  <label
                    htmlFor="new-password"
                    style={{
                      fontSize: "var(--text-sm, 14px)",
                      lineHeight: "var(--tw-leading, 20px)",
                      fontWeight: "var(--font-weight-semibold, 600)",
                      color: "var(--color-gray-700, #374151)",
                      marginBottom: "16px",
                    }}
                    className="text-left block text-sm font-semibold text-gray-700 mb-4"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min. 6 chars)"
                      required
                      autoComplete="new-password"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-3 pr-10 text-sm leading-normal text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4343F0] focus:border-transparent transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <label
                    htmlFor="confirm-password"
                    style={{
                      fontSize: "var(--text-sm, 14px)",
                      lineHeight: "var(--tw-leading, 20px)",
                      fontWeight: "var(--font-weight-semibold, 600)",
                      color: "var(--color-gray-700, #374151)",
                      marginBottom: "16px",
                    }}
                    className="text-left block text-sm font-semibold text-gray-700 mb-4"
                  >
                    Confirm New Password
                  </label>
                  <input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    autoComplete="new-password"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-3 text-sm leading-normal text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4343F0] focus:border-transparent transition-all duration-200"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[48px] mt-6 rounded-[8px] text-white text-[15px] font-bold transition-all active:scale-[0.98] bg-[#4343F0] hover:bg-[#3232b7] shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Saving password...</span>
                    </div>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </form>
            )
          ) : isSubmitted ? (
            /* Success State after sending reset link */
            <div className="text-left py-2">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-[#4343F0] flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Check Your Email</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                We’ve sent a password reset link to <strong className="text-gray-900 font-semibold">{email}</strong>. Please check your inbox and click the link to reset your password.
              </p>
              <button
                type="button"
                onClick={() => setIsSubmitted(false)}
                className="w-full h-[48px] rounded-[8px] text-[#4343F0] border-2 border-[#4343F0] hover:bg-blue-50 text-[15px] font-bold transition-all cursor-pointer flex items-center justify-center"
              >
                Send to another email
              </button>
            </div>
          ) : (
            /* Default Mode: Email Form */
            <form onSubmit={handleRequestReset} className="w-full">
              {/* Label */}
              <label
                htmlFor="email"
                style={{
                  fontSize: "var(--text-sm, 14px)",
                  lineHeight: "var(--tw-leading, 20px)",
                  fontWeight: "var(--font-weight-semibold, 600)",
                  color: "var(--color-gray-700, #374151)",
                  marginBottom: "16px",
                }}
                className="text-left block text-sm font-semibold text-gray-700 mb-4"
              >
                Email Address
              </label>

              {/* Input field */}
              <input
                id="email"
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                autoComplete="email"
                style={{
                  borderRadius: "var(--radius-md, 0.375rem)",
                  borderWidth: "1px",
                  borderColor: "var(--color-gray-300, #d1d5db)",
                  backgroundColor: "var(--color-white, #ffffff)",
                  width: "100%",
                  paddingInline: "calc(var(--spacing, 0.25rem) * 3)",
                  paddingBlock: "calc(var(--spacing, 0.25rem) * 3)",
                  fontSize: "var(--text-sm, 14px)",
                  lineHeight: "var(--tw-leading, 20px)",
                  color: "var(--color-gray-900, #111827)",
                  transitionProperty: "all",
                  transitionTimingFunction: "var(--tw-ease, cubic-bezier(0.4, 0, 0.2, 1))",
                  transitionDuration: "var(--tw-duration, 150ms)",
                }}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-3 text-sm leading-normal text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4343F0] focus:border-transparent transition-all duration-200"
              />

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[48px] mt-6 rounded-[8px] text-white text-[15px] font-bold transition-all active:scale-[0.98] bg-[#4343F0] hover:bg-[#3232b7] shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Sending reset link...</span>
                  </div>
                ) : (
                  "Send reset link"
                )}
              </button>
            </form>
          )}

          {/* Back button parent div with display flex, margin-top: 50px */}
          <div
            style={{
              display: "flex",
              marginTop: "50px",
            }}
            className="flex items-center mt-[36px] sm:mt-[50px]"
          >
            <Link
              href="/login"
              className="inline-flex items-center group cursor-pointer"
            >
              {/* Back arrow button on left */}
              <div
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "50%",
                  backgroundColor: "var(--color-primary-300, #4343F0)",
                  marginRight: "20px",
                }}
                className="flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-105 group-hover:shadow-md shadow-sm"
              >
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </div>

              {/* Back arrow text on right */}
              <span
                style={{
                  fontSize: "21px",
                  fontWeight: 600,
                  letterSpacing: "2.63px",
                }}
                className="text-[#1a202c] group-hover:text-[#4343F0] transition-colors uppercase select-none"
              >
                BACK
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


