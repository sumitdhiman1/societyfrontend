"use client";

import React, { useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authService } from "@/lib/authService";

import "./login.css";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(searchParams.get("error") || "");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await authService.login(formData);
      if (res.isSuccessful) {
        router.push(redirect || "/dashboard");
      } else {
        setError(res.message || "Login failed. Please check your credentials.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white">
      {/* Left Panel - Image */}
      <div className="hidden lg:block w-[40%] h-screen top-0 self-start overflow-hidden shrink-0 bg-[#060a12] relative">
        <Image
          src="/images/worldpic.png"
          alt="Left Panel Image"
          fill
          className="object-cover object-center transition-opacity duration-300"
          priority
        />
      </div>

      {/* Right Panel - Form */}
      <div className="login-right-panel">
        <div className="login-form-wrapper">
          <div className="mt-4 mb-6">
            <Link
              href="/"
              className="w-10 h-10 border border-gray-400 rounded-full flex items-center justify-center text-[#1a1a40] hover:bg-gray-50 hover:border-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
          </div>
          <div className="header-link-container">
            <div className="flex flex-col">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1a1a40] tracking-tight">Log in</h1>
              <p className="text-gray-400 font-bold text-sm sm:text-[15px] uppercase tracking-wider mt-1">Welcome back</p>
            </div>
            <div className="register-link-desktop">
              <div className="text-sm">
                <span className="opacity-60 text-gray-400 font-bold uppercase tracking-wider text-[11px]">Not a member?</span>
                <Link href="/register" className="font-extrabold text-[#1a1a40] ml-3 hover:underline transition-all tracking-tight">
                  Register now
                </Link>
              </div>
            </div>
          </div>

          <div className="register-link-mobile">
            <span className="link-label">Not a member?</span>
            <Link href="/register" className="link-action">
              Register now
            </Link>
          </div>

          <div className="hidden sm:block mb-10 mt-2 h-5"></div>
          <div className="horizontal-rule"></div>
          <div className="mb-4"></div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-error rounded-lg text-sm font-medium border border-red-100">
              {error}
            </div>
          )}

          {/* Social Login Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10 w-full">
            <button
              type="button"
              onClick={() => authService.loginWithGoogle()}
              className="social-button cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="social-icon-wrapper">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.6 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h6.5c-.3 1.4-1 2.6-2.2 3.4v2.8h3.6c2.1-1.9 3.3-4.7 3.3-8.2z"
                  ></path>
                  <path
                    fill="#34A853"
                    d="M12 24c3 0 5.5-1 7.3-2.8l-3.6-2.8c-1 1-2.3 1.6-3.7 1.6-2.9 0-5.4-1.9-6.3-4.6H1v2.9C2.8 21 6.1 24 12 24z"
                  ></path>
                  <path
                    fill="#FBBC05"
                    d="M5.7 14.4C5.5 13.8 5.5 13.1 5.5 12.4s.1-1.4.3-2l-3-2.3C1.9 9.3 1 10.8 1 12.4s.9 3 2 4.3l2.7-2.3z"
                  ></path>
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3.1.6 4.3 1.7l3.2-3.2C17.5 1.2 14.9 0 12 0 6.1 0 2.8 3 1 7.6l2.7 2.3C6.6 6.9 9.1 5 12 5z"
                  ></path>
                </svg>
              </div>
              <div className="social-divider"></div>
              <span className="social-text">Sign in with Google</span>
            </button>
            <button
              type="button"
              onClick={() => authService.loginWithFacebook()}
              className="social-button cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="social-icon-wrapper">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 33.891 33.891"
                  className="w-5 h-5 text-primary-300"
                  fill="currentColor"
                >
                  <path
                    d="M30.26,2.25H3.631A3.631,3.631,0,0,0,0,5.881V32.51a3.631,3.631,0,0,0,3.631,3.631H14.014V24.619H9.248V19.2h4.766V15.062c0-4.7,2.8-7.3,7.086-7.3a28.873,28.873,0,0,1,4.2.366v4.615H22.935a2.712,2.712,0,0,0-3.058,2.93V19.2h5.2l-.832,5.423H19.877V36.141H30.26a3.631,3.631,0,0,0,3.631-3.631V5.881A3.631,3.631,0,0,0,30.26,2.25Z"
                    transform="translate(0 -2.25)"
                  ></path>
                </svg>
              </div>
              <div className="social-divider"></div>
              <span className="social-text">Sign in with Facebook</span>
            </button>
          </div>

          {/* Divider */}
          <div className="divider-container">
            <div className="divider-line"></div>
            <span className="divider-text">or</span>
            <div className="divider-line"></div>
          </div>

          <p className="section-title">Continue with your email</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div className="flex flex-col gap-1">
                <label className="login-input-label">
                  Email address<span className="text-error ml-1">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="login-input-field"
                />
              </div>
              <div className="relative w-full">
                <div className="flex flex-col gap-1">
                  <label className="login-input-label">
                    Password<span className="text-error ml-1">*</span>
                  </label>
                  <div className="relative w-full">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      className="login-input-field pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <Link
                  href="/forgot-password"
                  className="absolute right-0 top-0 text-sm text-gray-600 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="login-submit-button"
              >
                {loading ? "Logging in..." : "Log in"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
