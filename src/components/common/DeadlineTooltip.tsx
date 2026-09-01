"use client";

import React, { useState } from "react";

interface DeadlineTooltipProps {
  className?: string;
  text?: string;
}

export default function DeadlineTooltip({
  className = "",
  text = "Time spent waiting for client replies does not count towards project deadlines.",
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
          className="absolute left-6 bottom-0 w-64 bg-[#1A202C] text-white text-[11px] rounded-lg p-2.5 shadow-xl z-[9999] leading-relaxed font-normal normal-case break-words whitespace-normal"
        >
          {text}
        </div>
      )}
    </div>
  );
}
