"use client";

import React, { useState } from "react";

export type TooltipPosition =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "top-center"
  | "bottom-left"
  | "bottom-right"
  | "bottom-center";

interface DeadlineTooltipProps {
  className?: string;
  text?: string;
  position?: TooltipPosition;
}

const positionClasses: Record<TooltipPosition, string> = {
  center: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  "top-center": "bottom-full left-1/2 -translate-x-1/2 mb-2",
  "top-left": "bottom-full right-0 mb-2",
  "top-right": "bottom-full left-0 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  "bottom-center": "top-full left-1/2 -translate-x-1/2 mt-2",
  "bottom-left": "top-full right-0 mt-2",
  "bottom-right": "top-full left-0 mt-2",
  left: "right-6 bottom-0",
  right: "left-6 bottom-0",
};

export default function DeadlineTooltip({
  className = "",
  text = "Time spent waiting for client replies does not count towards project deadlines.",
  position = "right",
}: DeadlineTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative inline-block ml-1 ${className}`}>
      <button
        type="button"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        className="w-4 h-4 rounded-full bg-gray-400 text-white text-[9px] font-bold flex items-center justify-center cursor-help leading-none transition-colors hover:bg-gray-500"
        aria-label="About estimated deadline"
      >
        ?
      </button>
      {isOpen && (
        <div
          role="tooltip"
          className={`absolute ${positionClasses[position] || positionClasses.center} w-64 bg-[#1A202C] text-white text-[11px] rounded-lg p-2.5 shadow-xl z-[9999] leading-relaxed font-normal normal-case break-words whitespace-normal pointer-events-none animate-in fade-in zoom-in-95 duration-150`}
        >
          {text}
        </div>
      )}
    </div>
  );
}
