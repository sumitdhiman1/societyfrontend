"use client";

import React, { useState, useEffect } from "react";
import CloseIcon from "@/components/icons/close";

interface StatusPopupProps {
  isOpen: boolean;
  onClose: () => void;
  type: "success" | "error";
  title: string;
  message: string;
}

export default function StatusPopup({
  isOpen,
  onClose,
  type,
  title,
  message,
}: StatusPopupProps) {
  const [shouldRender, setRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) setRender(true);
    else {
      const timer = setTimeout(() => setRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender && !isOpen) return null;

  const isSuccess = type === "success";
  const iconColor = isSuccess ? "text-[#5356ff]" : "text-red-500";
  const bgColor = isSuccess ? "bg-[#5356ff]/10" : "bg-red-50";

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-300 px-4 ${isOpen ? "opacity-100" : "opacity-0"
        }`}
    >
      <button
        type="button"
        className="absolute inset-0 w-full h-full bg-[#00102E]/60 backdrop-blur-sm cursor-default border-none outline-none appearance-none p-0 m-0"
        onClick={onClose}
        aria-label="Close popup"
      />
      <div
        className={`relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 transform transition-all duration-300 ${isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
          }`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
          aria-label="Close"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center text-center">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${bgColor}`}
          >
            {isSuccess ? (
              <svg
                className={`w-10 h-10 ${iconColor}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className={`w-10 h-10 ${iconColor}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
          </div>
          <h3 className="text-2xl font-bold mb-3 text-[#363636]">{title}</h3>
          <p className="text-gray-500 mb-8 leading-relaxed px-4">{message}</p>
          <button
            onClick={onClose}
            className={`w-full py-3.5 rounded-xl font-bold text-white transition-all shadow-lg hover:shadow-xl active:scale-[0.98] ${isSuccess ? "bg-[#5356ff] hover:bg-[#3232b7]" : "bg-red-500 hover:bg-red-600"
              }`}
          >
            {isSuccess ? "Continue" : "Try Again"}
          </button>
        </div>
      </div>
    </div>
  );
}
