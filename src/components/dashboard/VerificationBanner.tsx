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
    const initialUser = authService.getUser();
    setUser(initialUser);

    // Fetch fresh profile from backend to ensure status is up to date
    authService.getProfile().then((freshUser) => {
      if (freshUser) {
        setUser(freshUser);
      }
    });

    const handleUpdate = () => {
      const u = authService.getUser();
      setUser(u);
    };
    
    window.addEventListener("auth:login", handleUpdate);
    window.addEventListener("auth:logout", () => setUser(null));
    window.addEventListener("auth:user_update", handleUpdate);

    return () => {
      window.removeEventListener("auth:login", handleUpdate);
      window.removeEventListener("auth:logout", () => setUser(null));
      window.removeEventListener("auth:user_update", handleUpdate);
    };
  }, []);

  const isVerified =
    user?.isEmailVerified === true ||
    String(user?.isEmailVerified) === "true" ||
    user?.emailVerified === true;

  // Don't show if mounted is false, no user, already verified, explicitly hidden,
  // or isEmailVerified is undefined (still loading profile)
  if (!mounted || !user || isVerified || !show || user.isEmailVerified === undefined) return null;

  const handleResend = async () => {
    if (!user.email || loading) return;
    
    setLoading(true);
    const toastId = toast.loading("Sending verification email...");
    
    try {
      const res = await authService.resendVerificationEmail(user.email);
      const isAlreadyVerified =
        res?.message?.toLowerCase().includes("already verified") ||
        res?.errorCode === "EMAIL_IS_ALREADY_VERIFIED" ||
        res?.error === "EMAIL_IS_ALREADY_VERIFIED";

      if (res && res.isSuccessful) {
        toast.success("Verification link sent! Please check your inbox.", { id: toastId });
      } else if (isAlreadyVerified) {
        toast.success("Your email is already verified!", { id: toastId });
        authService.updateInternalUser({ isEmailVerified: true });
        setUser((prev: any) => ({ ...prev, isEmailVerified: true }));
      } else {
        toast.error(res?.message || "Failed to send verification email.", { id: toastId });
      }
    } catch (error: any) {
      const msg = error?.message || error?.data?.message || "";
      if (msg.toLowerCase().includes("already verified")) {
        toast.success("Your email is already verified!", { id: toastId });
        authService.updateInternalUser({ isEmailVerified: true });
        setUser((prev: any) => ({ ...prev, isEmailVerified: true }));
      } else {
        toast.error("An error occurred. Please try again later.", { id: toastId });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    setLoading(true);
    const toastId = toast.loading("Checking verification status...");
    try {
      const freshUser = await authService.getProfile();
      const verified =
        freshUser?.isEmailVerified === true ||
        String(freshUser?.isEmailVerified) === "true";
      if (verified) {
        toast.success("Your email is verified!", { id: toastId });
        authService.updateInternalUser({ isEmailVerified: true });
        setUser((prev: any) => ({ ...prev, isEmailVerified: true }));
      } else {
        toast.info("Email is not verified yet. Please check your inbox.", { id: toastId });
      }
    } catch {
      toast.error("Could not check status right now.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-[#4343F0] text-white border-b border-white/20 px-4 py-2.5 shadow-md relative z-[60] overflow-hidden transition-all duration-300">
      <div className="max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 relative z-10">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm shadow-inner shrink-0 hidden xs:flex sm:flex">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white animate-pulse">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="flex flex-col">
            <p className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-2 justify-center sm:justify-start">
              <span>Verify your email address</span>
              <span className="bg-white/20 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Restricted Access
              </span>
            </p>
            <p className="text-[11px] sm:text-xs text-white/90 font-medium">
              Sent to <span className="text-white font-bold underline decoration-white/40">{user?.email}</span> • Unlock payments, project creation, and messaging.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <button 
            type="button"
            onClick={openChat}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/25 text-white rounded-lg text-xs font-bold transition-all active:scale-95 backdrop-blur-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Support
          </button>
          <button 
            type="button"
            onClick={handleResend}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 bg-white text-[#4343F0] rounded-lg text-xs font-extrabold hover:bg-blue-50 transition-all shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
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
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                Resend Link
              </>
            )}
          </button>
          <button 
            type="button"
            onClick={() => setShow(false)}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
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

