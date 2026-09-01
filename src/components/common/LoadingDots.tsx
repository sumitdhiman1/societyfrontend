"use client";

import React from "react";

export default function LoadingDots({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      {text}
      <span className="inline-flex items-center ml-0.5" style={{ transform: "translateY(-1px)" }}>
        <span className="inline-block animate-blink">.</span>
        <span className="inline-block animate-blink" style={{ animationDelay: "0.2s" }}>.</span>
        <span className="inline-block animate-blink" style={{ animationDelay: "0.4s" }}>.</span>
      </span>
      <style jsx>{`
        @keyframes blink {
          0% { opacity: 0.2; }
          20% { opacity: 1; }
          100% { opacity: 0.2; }
        }
        .animate-blink {
          animation: blink 1.4s infinite both;
        }
      `}</style>
    </span>
  );
}
