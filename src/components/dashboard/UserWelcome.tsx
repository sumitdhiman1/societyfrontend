"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/authService";

interface UserWelcomeProps {
  title?: string;
}

export default function UserWelcome({ title }: UserWelcomeProps) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (title) {
      setLoading(false);
      return;
    }

    const init = async () => {
      const user = authService.getUser();
      if (user?.fullName) {
        setFirstName(user.fullName.split(" ")[0]);
        setLoading(false);
      } else if (authService.isAuthenticated()) {
        try {
          // This would normally call profileService.getMyProfile()
          // For now we just use the authService state
          setFirstName("User");
        } catch (error) {
          console.error("Failed to fetch profile in UserWelcome:", error);
          setFirstName("Guest");
        } finally {
          setLoading(false);
        }
      } else {
        setFirstName("Guest");
        setLoading(false);
      }
    };

    init();

    const handleAuthChange = () => init();
    window.addEventListener("auth:login", handleAuthChange);
    window.addEventListener("auth:logout", handleAuthChange);
    return () => {
      window.removeEventListener("auth:login", handleAuthChange);
      window.removeEventListener("auth:logout", handleAuthChange);
    };
  }, [title]);

  return (
    <div
      className="bg-white rounded-[8px] px-8 pt-10 pb-6 shadow-[0px_5px_25px_#0000000D] flex flex-col items-start h-[209px] w-full font-sans"
      style={{ fontFamily: "var(--font-inter), sans-serif" }}
    >
      {loading ? (
        <div className="w-full h-full flex flex-col justify-between">
          <div>
            <div className="h-7 bg-gray-200 rounded w-36 mb-2 animate-pulse" />
            <div className="h-4 bg-gray-100 rounded w-52 animate-pulse" />
          </div>
          <div className="h-11 bg-gray-200 rounded-[6px] w-[247px] max-w-full animate-pulse" />
        </div>
      ) : (
        <>
          <div>
            <h1 className="text-[22px] font-bold text-[#1A202C] mb-2 leading-[28px]">
              {title || (firstName === "Guest" ? "Welcome!" : `Hi ${firstName}!`)}
            </h1>
            <p className="text-[#434343] text-[16px] font-normal leading-[24px]">
              Are you looking to get things done?
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/dashboard/new-project")}
            className="w-[247px] bg-[#4343F0] hover:bg-[#2828c0] text-white font-bold py-3 rounded-[6px] transition-colors shadow-sm text-[14px] mt-6 cursor-pointer"
          >
            Start A New Project
          </button>
        </>
      )}
    </div>
  );
}
