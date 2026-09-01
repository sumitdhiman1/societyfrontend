"use client";

import React, { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  isOpen: boolean;
  onClose: () => void;
  type?: "success" | "error" | "info";
  duration?: number;
  title?: string;
}

export default function Toast({
  message,
  isOpen,
  onClose,
  type = "error",
  duration = 5000,
  title,
}: ToastProps) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Small delay for transition
      const timer = setTimeout(() => setIsVisible(true), 10);

      if (duration > 0) {
        const closeTimer = setTimeout(() => {
          handleClose();
        }, duration);
        return () => {
          clearTimeout(timer);
          clearTimeout(closeTimer);
        };
      }
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setRenderFalseAfterTransition(), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration]);

  const setRenderFalseAfterTransition = () => {
    setShouldRender(false);
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!shouldRender && !isOpen) return null;

  const accentColor = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-[#5356ff]",
  };

  const iconBg = {
    success: "bg-green-100",
    error: "bg-red-100",
    info: "bg-[#5356ff]/10",
  };

  const iconColor = {
    success: "text-green-600",
    error: "text-red-600",
    info: "text-[#5356ff]",
  };

  const defaultTitle = {
    success: "Success",
    error: "Error",
    info: "Notice",
  };

  const icons = {
    success: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  };

  const currentTitle = title || defaultTitle[type];

  return (
    <div
      className={`fixed top-6 right-6 z-[9999] transition-all duration-300 transform ${isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
        }`}
    >
      <div
        className="bg-white rounded-xl shadow-[0px_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 w-[380px] overflow-hidden flex items-stretch"
      >
        {/* Left Accent Bar */}
        <div className={`w-1.5 ${accentColor[type]}`} />

        <div className="flex-1 p-5 flex items-start gap-4">
          <div className={`flex-shrink-0 w-10 h-10 rounded-full ${iconBg[type]} flex items-center justify-center ${iconColor[type]}`}>
            {icons[type]}
          </div>

          <div className="flex-1 pt-0.5">
            <h4 className="text-sm font-bold text-gray-900 mb-1 leading-tight">
              {currentTitle}
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed font-medium">
              {message}
            </p>
          </div>

          <button
            onClick={handleClose}
            className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors p-1 hover:bg-gray-50 rounded-full"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
