"use client";

import React, { useState, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import StatusPopup from "@/components/common/StatusPopup";
import HttpClient from "@/lib/HttpClient";
import Turnstile, { TurnstileRef } from "@/components/common/Turnstile";

const httpClient = new HttpClient();

interface SupportNewsletterProps {
  noPadding?: boolean;
  className?: string;
  gridClassName?: string;
}

export default function SupportNewsletter({
  noPadding = false,
  className = "",
  gridClassName = "",
}: SupportNewsletterProps) {
  const [email, setEmail] = useState("");
  const [hp, setHp] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileRef>(null);

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken(null);
  }, []);

  const handleTurnstileError = useCallback(() => {
    setTurnstileToken(null);
  }, []);

  const [popup, setPopup] = useState({
    isOpen: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || loading) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setPopup({
        isOpen: true,
        type: "error",
        title: "Invalid Email",
        message: "Please enter a valid email address.",
      });
      return;
    }

    try {
      setLoading(true);

      let activeToken = turnstileToken || turnstileRef.current?.getResponse();
      if (!activeToken) {
        turnstileRef.current?.execute();
        for (let i = 0; i < 20; i++) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          activeToken = turnstileRef.current?.getResponse();
          if (activeToken) {
            setTurnstileToken(activeToken);
            break;
          }
        }
      }

      if (!activeToken) {
        throw new Error("Security verification is processing. Please try clicking Subscribe again.");
      }

      const res: any = await httpClient.post("/newsletter/subscribe", {
        email,
        turnstileToken: activeToken,
        hp,
      });

      if (res.success) {
        setPopup({
          isOpen: true,
          type: "success",
          title: "Subscribed!",
          message:
            res.message || "You have successfully joined our mailing list.",
        });
        setEmail("");
        setHp("");
        setTurnstileToken(null);
        turnstileRef.current?.reset();
      } else {
        throw new Error(res.message || "Subscription failed");
      }
    } catch (error: any) {
      console.error("Newsletter Subscription Error:", error);
      const status = error?.response?.status;
      let title = "Subscription Failed";
      let message = "An error occurred while subscribing. Please try again.";

      if (status === 409) {
        title = "Already Subscribed";
        message = "This email is already active in our mailing list.";
      } else if (status === 400) {
        title = "Verification Failed";
        message = error?.response?.data?.message || "Security verification failed. Please try again.";
      }

      setPopup({
        isOpen: true,
        type: "error",
        title,
        message: error?.response?.data?.message || message,
      });
      setTurnstileToken(null);
      turnstileRef.current?.reset();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`${noPadding
        ? "w-full"
        : "max-w-[1536px] w-full mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px]"
        } ${className}`}
    >
      <StatusPopup
        isOpen={popup.isOpen}
        onClose={() => setPopup({ ...popup, isOpen: false })}
        type={popup.type}
        title={popup.title}
        message={popup.message}
      />

      <Turnstile
        ref={turnstileRef}
        size="invisible"
        onVerify={handleTurnstileVerify}
        onExpire={handleTurnstileExpire}
        onError={handleTurnstileError}
      />

      <div
        className={`support-section w-full grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 font-sans ${
          gridClassName || "mt-8 md:mt-12"
        }`}
        style={{ fontFamily: "var(--font-inter), sans-serif" }}
      >
        {/* Support Card */}
        <div className="bg-white rounded-[12px] shadow-[0px_10px_35px_rgba(0,0,0,0.06)] md:shadow-[0px_5px_25px_#0000000D] flex flex-col md:flex-row items-center justify-between relative overflow-hidden h-auto min-h-[251px] flex-1 px-6 md:px-8 py-8 xl:py-0">
          <Image
            src="/images/Group 2878.svg"
            alt="Decoration"
            width={278}
            height={150}
            className="absolute bottom-0 left-0 z-0 opacity-40 md:opacity-100 pointer-events-none select-none"
          />
          <div className="w-full md:w-[220px] shrink-0 relative z-10 flex items-center justify-center mb-6 md:mb-0">
            <Image
              src="/images/Active Support-rafiki.svg"
              alt="Support"
              width={260}
              height={230}
              className="object-contain max-w-full h-auto max-h-[170px] md:max-h-[200px]"
            />
          </div>
          <div className="w-full md:flex-1 flex flex-col items-center md:items-start z-10 text-center md:text-left px-0 md:pl-6 md:pr-4 py-0">
            <h3 className="text-[28px] md:text-[30px] leading-[34px] md:leading-[36px] font-bold text-[#434343] capitalize font-sans mb-[36px]">
              Visit Help &amp; Support
            </h3>
            <Link href="/help-support" className="w-full max-w-[400px] md:max-w-none">
              <button
                type="button"
                className="bg-[#4343F0] hover:bg-[#3232b7] text-white font-bold h-[54px] md:h-[50px] w-full flex items-center justify-center rounded-lg shadow-md text-sm transition-all px-4 font-sans cursor-pointer"
              >
                Contact Our Support Team
              </button>
            </Link>
          </div>
        </div>

        {/* Newsletter Card */}
        <div className="bg-white rounded-[12px] shadow-[0px_10px_35px_rgba(0,0,0,0.06)] md:shadow-[0px_5px_25px_#0000000D] flex flex-col md:flex-row items-center justify-between relative overflow-hidden h-auto min-h-[251px] flex-1 px-6 md:px-8 py-8 xl:py-0">
          <Image
            src="/images/Group 2878.svg"
            alt="Decoration"
            width={278}
            height={150}
            className="absolute bottom-0 left-0 z-0 opacity-[0.25] md:opacity-50 pointer-events-none select-none"
          />
          <div className="w-full md:w-[220px] shrink-0 relative z-10 flex items-center justify-center mb-6 md:mb-0">
            <Image
              src="/images/Group 2882.svg"
              alt="Newsletter"
              width={260}
              height={230}
              className="object-contain max-w-full h-auto max-h-[170px] md:max-h-[200px]"
            />
          </div>
          <div className="w-full md:flex-1 flex flex-col items-center md:items-start z-10 text-center md:text-left px-0 md:pl-6 md:pr-4 py-0">
            <h3 className="text-[28px] md:text-[30px] leading-[34px] md:leading-[36px] font-bold text-[#434343] capitalize font-sans mb-[36px]">
              Sign Up For Updates!
            </h3>
            <form
              onSubmit={handleSubscribe}
              className="flex items-center w-full max-w-[400px] md:max-w-none h-[54px] md:h-[50px] relative rounded-[8px] overflow-hidden"
              style={{ borderRadius: "8px", overflow: "hidden" }}
            >
              {/* Hidden honeypot field for bot trapping */}
              <input
                type="text"
                name="company_website_url_hp"
                value={hp}
                onChange={(e) => setHp(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }}
                aria-hidden="true"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                disabled={loading}
                style={{
                  borderTopLeftRadius: "8px",
                  borderBottomLeftRadius: "8px",
                  borderTopRightRadius: "0px",
                  borderBottomRightRadius: "0px",
                  borderRight: "none",
                }}
                className="flex-1 min-w-0 h-full px-4 md:px-5 bg-[#F0F0FF] border border-r-0 border-[#36363622] text-gray-700 text-sm placeholder-gray-500 outline-none focus:border-[#4343F0] disabled:opacity-50 font-sans"
                required
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  borderTopLeftRadius: "0px",
                  borderBottomLeftRadius: "0px",
                  borderTopRightRadius: "8px",
                  borderBottomRightRadius: "8px",
                  border: "none",
                  margin: 0,
                }}
                className="bg-[#4343F0] hover:bg-[#3232b7] text-white font-bold h-full px-6 md:px-8 text-sm whitespace-nowrap shrink-0 disabled:opacity-75 flex items-center justify-center min-w-[110px] md:min-w-[100px] transition-all font-sans cursor-pointer"
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "Subscribe"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
