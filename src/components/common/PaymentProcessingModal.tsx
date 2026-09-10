"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type PaymentProcessStep =
  | "idle"
  | "preparing"
  | "gateway"
  | "bank_auth"
  | "confirming"
  | "activating"
  | "success"
  | "error";

interface PaymentProcessingModalProps {
  isOpen: boolean;
  step: PaymentProcessStep;
  customMessage?: string;
  customTitle?: string;
  amountText?: string;
}

const STEP_INFO: Record<
  Exclude<PaymentProcessStep, "idle" | "error">,
  {
    title: string;
    description: string;
    stageIndex: number;
  }
> = {
  preparing: {
    title: "Preparing Project Order",
    description: "Validating specifications, tax calculations, and currency conversion...",
    stageIndex: 0,
  },
  gateway: {
    title: "Connecting to Secure Gateway",
    description: "Establishing end-to-end 256-bit encrypted session with Stripe...",
    stageIndex: 1,
  },
  bank_auth: {
    title: "Authorizing with Your Bank",
    description: "Contacting card issuer for 3D Secure verification & funds authorization...",
    stageIndex: 1,
  },
  confirming: {
    title: "Confirming Transaction & Receipt",
    description: "Recording verified payment and generating official invoice receipt...",
    stageIndex: 2,
  },
  activating: {
    title: "Activating Project Workspace",
    description: "Initializing milestones, client workspace, and PM assignments...",
    stageIndex: 2,
  },
  success: {
    title: "Payment Successful!",
    description: "Your project has been started! Redirecting to your workspace...",
    stageIndex: 3,
  },
};

const STAGES = [
  { label: "Order Setup", icon: "📋" },
  { label: "Bank Authorization", icon: "💳" },
  { label: "Project Activation", icon: "🚀" },
];

export default function PaymentProcessingModal({
  isOpen,
  step,
  customMessage,
  customTitle,
  amountText,
}: PaymentProcessingModalProps) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setElapsedSeconds(0);
      const interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender || step === "idle") return null;
  if (!mounted || typeof document === "undefined") return null;

  const currentInfo =
    step === "error"
      ? {
          title: "Payment Unsuccessful",
          description: customMessage || "An error occurred during payment processing.",
          stageIndex: -1,
        }
      : STEP_INFO[step] || STEP_INFO.preparing;

  const displayTitle = customTitle || currentInfo.title;
  const displayDesc = customMessage || currentInfo.description;
  const isSuccess = step === "success";

  const content = (
    <div
      className={`fixed inset-0 z-[99999] flex items-center justify-center transition-opacity duration-300 px-4 select-none ${
        isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Dimmed backdrop */}
      <div className="absolute inset-0 bg-[#070D1E]/80 backdrop-blur-md transition-all" />

      {/* Main card */}
      <div
        className={`relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 transform transition-all duration-300 text-center ${
          isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
      >
        {/* Top security pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100/80 text-[11px] font-bold text-indigo-700 uppercase tracking-wider mb-6">
          <svg className="w-3.5 h-3.5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z"
              clipRule="evenodd"
            />
          </svg>
          256-Bit Encrypted Secure Checkout
        </div>

        {/* Animated Central Icon */}
        <div className="relative flex items-center justify-center w-24 h-24 mx-auto mb-6">
          {isSuccess ? (
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center animate-in zoom-in-50 duration-300 shadow-lg shadow-emerald-500/20">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <>
              {/* Outer pulsing ring */}
              <div className="absolute inset-0 rounded-full bg-indigo-500/15 animate-ping duration-1000" />
              {/* Inner rotating gradient border */}
              <div className="w-20 h-20 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin flex items-center justify-center shadow-inner" />
              {/* Central badge */}
              <div className="absolute w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
            </>
          )}
        </div>

        {/* Dynamic Title */}
        <h3 className="text-[20px] font-bold text-gray-900 mb-2 tracking-tight">
          {displayTitle}
        </h3>

        {/* Amount badge if provided */}
        {amountText && (
          <div className="text-[14px] font-semibold text-indigo-600 mb-3 bg-indigo-50/70 inline-block px-3 py-1 rounded-md">
            Charge Amount: {amountText}
          </div>
        )}

        {/* Dynamic Description */}
        <p className="text-[14px] text-gray-500 mb-6 leading-relaxed px-2 transition-all duration-300">
          {displayDesc}
        </p>

        {/* Multi-stage Progress Stepper */}
        <div className="bg-gray-50 rounded-xl p-3.5 mb-6 border border-gray-100">
          <div className="grid grid-cols-3 gap-2">
            {STAGES.map((stg, idx) => {
              const isCompleted = isSuccess || currentInfo.stageIndex > idx;
              const isCurrent = !isSuccess && currentInfo.stageIndex === idx;

              return (
                <div
                  key={stg.label}
                  className={`flex flex-col items-center p-2 rounded-lg transition-all duration-300 ${
                    isCurrent
                      ? "bg-white shadow-sm border border-indigo-200 text-indigo-700 font-bold scale-105"
                      : isCompleted
                      ? "text-emerald-700 font-semibold opacity-95"
                      : "text-gray-400 font-normal opacity-60"
                  }`}
                >
                  <div className="text-base mb-1">
                    {isCompleted ? "✅" : isCurrent ? "⏳" : stg.icon}
                  </div>
                  <span className="text-[10.5px] text-center leading-tight">
                    {stg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Safety Reminder */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Do not refresh or close window</span>
          </div>
          {elapsedSeconds > 0 && <span>{elapsedSeconds}s</span>}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
