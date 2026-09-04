"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import StatusPopup from "@/components/common/StatusPopup";
import HttpClient from "@/lib/HttpClient";

const httpClient = new HttpClient();

export default function SupportNewsletter() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
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
      const res: any = await httpClient.post("/newsletter/subscribe", {
        email,
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
        title = "Invalid Email";
        message = "The email address provided is invalid.";
      }

      setPopup({
        isOpen: true,
        type: "error",
        title,
        message: error?.response?.data?.message || message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1536px] mx-auto px-4 md:px-8 lg:px-[54px] w-full">
      <StatusPopup
        isOpen={popup.isOpen}
        onClose={() => setPopup({ ...popup, isOpen: false })}
        type={popup.type}
        title={popup.title}
        message={popup.message}
      />

      <div
        className="w-full grid grid-cols-1 lg:grid-cols-2  md:gap-8 font-sans mt-8 md:mt-12 font-sans gap-8 mb-12"
        style={{ fontFamily: "var(--font-inter), sans-serif" }}
      >
        {/* Support Card */}
        <div className="bg-white rounded-[12px] shadow-[0px_10px_35px_rgba(0,0,0,0.06)] md:shadow-[0px_5px_25px_#0000000D] flex flex-col md:flex-row items-center justify-between relative overflow-hidden h-auto min-h-[251px] flex-1 pr-0 md:pr-8 py-8 px-6 md:px-8 py-8 xl:py-0 md:py-0">
          <Image
            src="/images/Group 2878.svg"
            alt="Decoration"
            width={278}
            height={150}
            className="absolute bottom-0 left-0 z-0 opacity-40 md:opacity-100"
          />
          <div className="w-full md:w-[238px] relative z-10 flex items-center justify-center mb-6 md:mb-0">
            <Image
              src="/images/Active Support-rafiki.svg"
              alt="Support"
              width={260}
              height={230}
              className="object-contain max-w-full h-auto max-h-[170px] md:max-h-[200px]"
            />
          </div>
          <div className="w-full md:w-2/3 flex flex-col items-center md:items-start z-10 text-center md:text-left space-y-4 md:space-y-8 md:space-y-[40px] px-6 p-inline-set">
            <h3 className="text-[26px] mb-5 md:text-[25px] leading-[34px] md:leading-[30px] font-semibold md:font-bold text-[#434343] capitalize font-sans">
              Visit Help & Support
            </h3>
            <Link href="/help-support" className="w-full    ">
              <button
                className="bg-[#4343F0] font-semibold   hover:bg-[#3232b7]
               text-white md:font-bold h-[54px] md:h-[50px] w-full flex items-center 
               justify-center rounded-lg shadow-lg md:shadow-md text-sm transition-all px-4 font-sanstracking-widest"
              >
                Contact Our Support Team
              </button>
            </Link>
          </div>
        </div>

        {/* Newsletter Card */}
        <div className="bg-white rounded-[12px] shadow-[0px_10px_35px_rgba(0,0,0,0.06)] md:shadow-[0px_5px_25px_#0000000D] flex flex-col md:flex-row items-center justify-between relative overflow-hidden h-auto min-h-[251px] flex-1 gap-0  md:px-8 py-8 md:py-0">
          <Image
            src="/images/Group 2878.svg"
            alt="Decoration"
            width={278}
            height={150}
            className="absolute bottom-0 left-0 z-0 opacity-[0.25] md:opacity-50"
          />
          <div className="w-[220px] relative z-10 flex items-center justify-center mb-6 md:mb-0">
            <Image
              src="/images/Group 2882.svg"
              alt="Newsletter"
              width={260}
              height={230}
              className="object-contain max-w-full h-auto max-h-[170px] md:max-h-[200px]"
            />
          </div>
          <div className="flex w-[362px] pr-4 pl-6 flex-col items-center md:items-start z-10 text-center md:text-left space-y-4 md:space-y-8md:space-y-[40px] px-6s">
            <h3 className="text-[26px] mb-5 md:text-[25px] leading-[34px] md:leading-[30px] font-semibold md:font-bold text-[#434343] capitalize font-sans">
              Sign Up For Updates!
            </h3>
            <form
              onSubmit={handleSubscribe}
              className="flex w-full max-w-[400px] md:max-w-none shadow-sm rounded-lg overflow-hidden bg-[#F0F0FF] h-[54px] md:h-[50px] border border-[#36363622]"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                disabled={loading}
                className="w-full px-4 md:px-4 bg-transparent  rounded-[6px] text-gray-700 text-sm placeholder-gray-500 outline-none disabled:opacity-50"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-[#4343F0] hover:bg-[#3232b7] text-white font-semibold md:font-bold px-6   text-sm h-full whitespace-nowrap shrink-0 disabled:opacity-75 flex items-center justify-center min-w-[110px] md:min-w-[100px] transition-colors uppercase tracking-widest"
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
