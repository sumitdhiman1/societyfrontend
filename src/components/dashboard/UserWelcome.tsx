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
    <div className="bg-white rounded-[8px]  md:px-8 p-6   
    shadow-[0px_5px_25px_#0000000D] flex flex-col justify-center items-start md:h-[209px]
     w-full font-sans">
      {loading ? (
        <>
          <div className="h-8 bg-gray-200 rounded w-32 mb-2 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-48 mb-6 animate-pulse" />
          <div className="h-10 bg-gray-200 rounded w-40 animate-pulse" />
        </>
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
            onClick={() => router.push("/dashboard/new-project")}

            className="md:w-[247px] w-[200px] bg-[#4343F0] hover:bg-[#5c5cf2] text-white font-bold py-3 rounded-[6px] transition-colors shadow-sm text-[14px] mt-6"
          >
            Start A New Project
          </button>
        </>
      )}
    </div>
  );
}
