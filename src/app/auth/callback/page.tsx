"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authService } from "@/lib/authService";
import { profileService } from "@/lib/profileService";

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [statusMessage, setStatusMessage] = useState("Authenticating your account...");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get("token") || searchParams.get("access_token");
      const refreshToken = searchParams.get("refreshToken") || searchParams.get("refresh_token") || "";
      const userParam = searchParams.get("user");
      const error = searchParams.get("error");

      if (error) {
        setIsError(true);
        setStatusMessage(decodeURIComponent(error));
        setTimeout(() => {
          router.push(`/login?error=${encodeURIComponent(error)}`);
        }, 2000);
        return;
      }

      if (!token) {
        setIsError(true);
        setStatusMessage("Authentication failed: No token received.");
        setTimeout(() => {
          router.push("/login?error=Authentication+failed");
        }, 2000);
        return;
      }

      try {
        let user: any = null;
        if (userParam) {
          try {
            user = JSON.parse(decodeURIComponent(userParam));
          } catch (e) {
            console.error("Failed to parse user JSON:", e);
          }
        }

        // Save session
        authService.handleSocialCallback(token, refreshToken, user);

        // Fetch fresh profile if needed
        if (!user) {
          try {
            const profileRes = await profileService.getMyProfile();
            if (profileRes?.data) {
              authService.updateInternalUser(profileRes.data);
            }
          } catch (e) {
            console.warn("Could not fetch profile right away:", e);
          }
        }

        setStatusMessage("Login successful! Redirecting to your dashboard...");
        setTimeout(() => {
          router.push("/dashboard");
        }, 800);
      } catch (err: any) {
        console.error("Error finalizing social login:", err);
        setIsError(true);
        setStatusMessage("Failed to process login. Redirecting...");
        setTimeout(() => {
          router.push("/login?error=Failed+to+complete+login");
        }, 2000);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-md w-full text-center space-y-4">
        {!isError ? (
          <div className="flex justify-center">
            <div className="w-12 h-12 border-4 border-[#4343F0]/20 border-t-[#4343F0] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
        )}
        <h2 className="text-xl font-bold text-gray-800">
          {isError ? "Authentication Error" : "Logging In"}
        </h2>
        <p className="text-sm text-gray-500">{statusMessage}</p>
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="w-10 h-10 border-4 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
