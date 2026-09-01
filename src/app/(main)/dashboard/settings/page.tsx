"use client";

import React, { useState, useEffect } from "react";
import DashboardSubNav from "@/components/dashboard/DashboardSubNav";
import { profileService } from "@/lib/profileService";

// Toggle component matching production dist (a9b6da1b87bc5f7b.js)
const ToggleRow = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <div className="flex items-center justify-between py-6 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-4 -mx-4 transition-colors rounded-[4px]">
    <span className="text-sm font-bold text-gray-700">{label}</span>
    <div
      className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
        checked ? "bg-primary-300" : "bg-gray-300"
      }`}
      onClick={() => onChange(!checked)}
    >
      <div
        className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </div>
  </div>
);

export default function SettingsPage() {
  const [preferences, setPreferences] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await profileService.getEmailPreferences();
        if (res?.data?.preferences) {
          setPreferences(res.data.preferences);
          setEmail(res.data.email || "");
        } else if (res?.data) {
          // fallback if preferences are top-level
          setPreferences(res.data);
          setEmail(res.data.email || "");
        }
      } catch (e) {
        console.error("Failed to load settings data", e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleToggle = async (key: string) => {
    if (!preferences) return;
    const newVal = !preferences[key];
    // Optimistic update
    setPreferences((prev: any) => (prev ? { ...prev, [key]: newVal } : null));
    try {
      await profileService.updateEmailPreferences({ [key]: newVal });
    } catch (e) {
      console.error("Failed to update preference", e);
      // Revert
      setPreferences((prev: any) => (prev ? { ...prev, [key]: !newVal } : null));
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-300" />
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen flex flex-col font-sans">
      <DashboardSubNav />
      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-8 md:pt-12 pb-12">
        <h1 className="text-[28px] md:text-[32px] font-medium text-primary-100 mb-8 md:mb-12">
          Notification Settings
        </h1>

        <div className="border border-gray-300 rounded-[4px] p-8 md:p-12">
          <div className="flex flex-col lg:flex-row lg:gap-16">
            {/* Left: toggles */}
            <div className="flex-1">
              <div className="mb-10">
                <h3 className="text-sm font-bold text-gray-800 mb-2">Email Notifications</h3>
                <p className="text-xs text-gray-500 mb-6">
                  We&apos;ll use{" "}
                  <span className="font-semibold">{email}</span>{" "}
                  to send you information for notifications.
                </p>

                <div className="flex flex-col">
                  {preferences && (
                    <>
                      <ToggleRow
                        label="All Email Notifications"
                        checked={preferences.emailNotifications ?? true}
                        onChange={() => handleToggle("emailNotifications")}
                      />
                      <ToggleRow
                        label="Project Updates & Assignments"
                        checked={preferences.projects ?? true}
                        onChange={() => handleToggle("projects")}
                      />
                      <ToggleRow
                        label="Quote Updates & Offers"
                        checked={preferences.quotes ?? true}
                        onChange={() => handleToggle("quotes")}
                      />
                      <ToggleRow
                        label="Support & Chat Updates"
                        checked={preferences.support ?? true}
                        onChange={() => handleToggle("support")}
                      />
                      <ToggleRow
                        label="Payment Receipts"
                        checked={preferences.payments ?? true}
                        onChange={() => handleToggle("payments")}
                      />
                      <ToggleRow
                        label="New Features and Company Related News"
                        checked={preferences.marketing ?? false}
                        onChange={() => handleToggle("marketing")}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: info panel */}
            <div className="w-full lg:w-[320px] pl-0 lg:pl-12 border-l-0 lg:border-l border-gray-200">
              <h4 className="font-bold text-sm text-gray-800 mb-4">
                Essential Emails Notifications
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed max-w-[250px]">
                Configure which automated emails you receive from SWSCRM. Essential
                account-related emails cannot be disabled.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
