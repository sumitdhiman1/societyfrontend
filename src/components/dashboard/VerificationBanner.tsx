'use client';

import React, { useState, useEffect } from "react";
import { authService } from "@/lib/authService";
import { useChatWidget } from "@/context/ChatWidgetContext";
import { toast } from "sonner";

export default function VerificationBanner() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { openChat } = useChatWidget();

  useEffect(() => {
    setMounted(true);
    setUser(authService.getUser());

    const handleUpdate = () => setUser(authService.getUser());
    
    window.addEventListener("auth:login", handleUpdate);
    window.addEventListener("auth:logout", () => setUser(null));
    window.addEventListener("auth:user_update", handleUpdate);

    return () => {
      window.removeEventListener("auth:login", handleUpdate);
      window.removeEventListener("auth:logout", () => setUser(null));
      window.removeEventListener("auth:user_update", handleUpdate);
    };
  }, []);

  if (!mounted || !user || user.isEmailVerified || !show) return null;

  const handleResend = async () => {
    if (!user.email || loading) return;
    
    setLoading(true);
    const toastId = toast.loading("Sending verification email...");
    
    try {
      const res = await authService.resendVerificationEmail(user.email);
      if (res.isSuccessful) {
        toast.success("Verification link sent! Please check your inbox.", { id: toastId });
      } else {
        toast.error(res.message || "Failed to send verification email.", { id: toastId });
      }
    } catch (error) {
      toast.error("An error occurred. Please try again later.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sticky top-0 z-[60] w-full bg-[#4343F0]/95 backdrop-blur-md border-b border-white/10 px-4 py-2.5 animate-in slide-in-from-top duration-500 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm shadow-inner">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white animate-pulse">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="text-center sm:text-left">
            <p className="text-sm font-bold text-white tracking-tight">Verify your email to unlock full access</p>
            <p className="text-[11px] text-white/80 font-medium">
              Sent to <span className="text-white underline decoration-white/30">{user.email}</span> • Unlock payments, projects, and messaging.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5">
          <button 
            onClick={openChat}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/10 border border-white/20 text-white rounded-lg text-xs font-bold hover:bg-white/20 transition-all active:scale-95 backdrop-blur-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Support
          </button>
          <button
            onClick={handleResend}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-[#4343F0] rounded-lg text-xs font-extrabold hover:bg-blue-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Resending...
              </span>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polyline points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                Resend Link
              </>
            )}
          </button>
          <button 
            onClick={() => setShow(false)}
            className="ml-1 p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
            title="Dismiss for now"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

