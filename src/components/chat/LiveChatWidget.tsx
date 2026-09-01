"use client";

import React, { useState, useEffect } from "react";
import { useChatWidget } from "@/context/ChatWidgetContext";

export default function LiveChatWidget() {
  const { isOpen, toggleChat, closeChat, bottomOffset } = useChatWidget();
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    // This is where real chat script would be initialized
    if (isOpen) {
      console.log("Chat widget opened");
    }
  }, [isOpen]);

  return (
    <>
      <div
        className={`fixed right-4 sm:right-6 z-[999] transition-all duration-300 ease-in-out origin-bottom-right transform ${isOpen ? "opacity-100 translate-y-0 scale-100 pointer-events-auto" : "opacity-0 translate-y-4 scale-95 pointer-events-none"
          }`}
        style={{ bottom: "calc(1rem + 80px)" }}
      >
        <div className="w-[calc(100vw-32px)] sm:w-[380px] h-[500px] sm:h-[600px] max-h-[80vh] bg-white shadow-2xl rounded-2xl overflow-hidden border border-gray-200 flex flex-col">
          {/* Header */}
          <div className="bg-[#0D1939] p-4 flex justify-between items-center text-white shrink-0">
            <div className="min-w-0">
              <h2 className="text-xl font-bold truncate">Live Support</h2>
              <div className="flex items-center gap-3 mt-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="text-xs font-medium text-gray-300">Connected</span>
                </div>
                <span className="text-xs font-medium text-gray-400">Helper Active</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-md uppercase tracking-wider transition-colors">
                End Chat
              </button>
              <button onClick={closeChat} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 p-6 bg-[#F8F9FB] overflow-y-auto flex flex-col items-center justify-center">
            <p className="text-center text-gray-500 text-sm max-w-[240px] leading-relaxed">
              Start a conversation with our support team.
            </p>
          </div>

          {/* Footer */}
          <div className="p-4 bg-white border-t border-gray-100">
            <div className="flex items-center gap-3">
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#5356ff] placeholder-gray-400"
              />
              <button className="bg-[#A5A5FF] text-white p-2.5 rounded-full hover:scale-105 transition-transform flex items-center justify-center shrink-0 shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        className="fixed right-4 sm:right-6 z-[999] transition-all duration-500 ease-in-out"
        style={{ bottom: `calc(${bottomOffset}px + 1rem)` }}
      >
        <button
          onClick={() => {
            if (!hasInteracted) setHasInteracted(true);
            toggleChat();
          }}
          className={`p-4 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center relative ${isOpen ? "bg-red-500 hover:bg-red-600 rotate-90" : "bg-[#5356ff] hover:bg-[#3232b7]"
            }`}
        >
          {unreadCount > 0 && !isOpen && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-white animate-bounce shadow-sm">
              {unreadCount > 9 ? "9+" : unreadCount}
            </div>
          )}
          {isOpen ? (
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          )}
        </button>
      </div>
    </>
  );
}
