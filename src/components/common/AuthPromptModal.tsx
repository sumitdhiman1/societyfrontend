"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CloseIcon from "@/components/icons/close";

interface AuthPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  redirectUrl?: string;
}

export default function AuthPromptModal({
  isOpen,
  onClose,
  title = "Join the Conversation",
  description = "Please log in or register to message our team and upload files for this analysis.",
  redirectUrl,
}: AuthPromptModalProps) {
  const router = useRouter();
  const [shouldRender, setRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setRender(true);
    } else {
      const timer = setTimeout(() => setRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender && !isOpen) return null;

  const currentRedirect = redirectUrl || (typeof window !== "undefined" ? window.location.pathname + window.location.search : "");
  const loginUrl = `/login${currentRedirect ? `?redirect=${encodeURIComponent(currentRedirect)}` : ""}`;
  const registerUrl = `/register${currentRedirect ? `?redirect=${encodeURIComponent(currentRedirect)}` : ""}`;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-300 px-4 ${
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 w-full h-full bg-[#00102E]/60 backdrop-blur-sm cursor-default border-none outline-none appearance-none p-0 m-0"
        onClick={onClose}
        aria-label="Close modal"
      />

      {/* Modal Dialog */}
      <div
        className={`relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 sm:p-10 transform transition-all duration-300 text-center border border-gray-100 ${
          isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors p-1.5 hover:bg-gray-100 rounded-full cursor-pointer"
          aria-label="Close"
        >
          <CloseIcon className="w-5 h-5" />
        </button>

        {/* Lock Icon */}
        <div className="w-16 h-16 rounded-full bg-[#EEF2FF] flex items-center justify-center mx-auto mb-6 text-[#4343F0] shadow-sm">
          <svg className="w-7 h-7 text-[#4343F0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>

        {/* Heading */}
        <h3 className="text-2xl font-bold text-[#0D1939] mb-2.5 tracking-tight">
          {title}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto leading-relaxed">
          {description}
        </p>

        {/* Action Buttons */}
        <div className="space-y-3 w-full">
          <button
            onClick={() => {
              onClose();
              router.push(loginUrl);
            }}
            className="w-full py-3.5 px-6 bg-[#4343F0] hover:bg-[#3434d8] text-white font-bold rounded-xl shadow-md shadow-[#4343F0]/20 transition-all text-sm cursor-pointer active:scale-[0.99]"
          >
            Log In
          </button>

          <button
            onClick={() => {
              onClose();
              router.push(registerUrl);
            }}
            className="w-full py-3.5 px-6 bg-[#4343F0] hover:bg-[#3434d8] text-white font-bold rounded-xl shadow-md shadow-[#4343F0]/20 transition-all text-sm cursor-pointer active:scale-[0.99]"
          >
            Register / Create Account
          </button>
        </div>
      </div>
    </div>
  );
}
