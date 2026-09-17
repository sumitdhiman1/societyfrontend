"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { profileService } from "@/lib/profileService";
import { authService } from "@/lib/authService";
import {
  getIanaTimeZone,
  formatClockTime,
  formatClockDate,
  formatSubmittedDate,
  formatMessageTimestamp,
  formatDateTimeWithUserTz,
} from "@/lib/dateUtils";

interface TimezoneContextType {
  timeZone: string;
  ianaTimeZone: string | undefined;
  setTimeZone: (tz: string) => void;
  formatClockTime: (date?: Date | string | number) => string;
  formatClockDate: (date?: Date | string | number) => string;
  formatSubmittedDate: (date: string | Date | number) => string;
  formatMessageTimestamp: (date: string | Date | number) => string;
  formatDateTime: (date: string | Date | number, options?: Intl.DateTimeFormatOptions) => string;
}

const TimezoneContext = createContext<TimezoneContextType>({
  timeZone: "",
  ianaTimeZone: undefined,
  setTimeZone: () => {},
  formatClockTime: (date?: Date | string | number) => formatClockTime(date ? new Date(date) : new Date()),
  formatClockDate: (date?: Date | string | number) => formatClockDate(date ? new Date(date) : new Date()),
  formatSubmittedDate: (date: string | Date | number) => formatSubmittedDate(date),
  formatMessageTimestamp: (date: string | Date | number) => formatMessageTimestamp(date),
  formatDateTime: (date: string | Date | number, options?: Intl.DateTimeFormatOptions) =>
    formatDateTimeWithUserTz(date, options),
});

export function TimezoneProvider({ children }: { children: React.ReactNode }) {
  const [timeZone, setTimeZoneState] = useState<string>("");

  const syncTimeZone = useCallback(() => {
    const user = authService.getUser();
    const storedTz = user?.timeZone || user?.timezone || localStorage.getItem("app-timezone") || "";
    if (storedTz) {
      setTimeZoneState(storedTz);
    }
  }, []);

  useEffect(() => {
    syncTimeZone();

    if (authService.isAuthenticated()) {
      profileService
        .getMyProfile()
        .then((res) => {
          const tz = res?.data?.timeZone || res?.data?.timezone;
          if (tz) {
            setTimeZoneState(tz);
            localStorage.setItem("app-timezone", tz);
            authService.updateInternalUser({ timeZone: tz });
          }
        })
        .catch((err) => console.error("Failed to sync timezone from profile", err));
    }

    const handleUserUpdate = () => {
      syncTimeZone();
    };

    window.addEventListener("auth:user_update", handleUserUpdate);
    return () => {
      window.removeEventListener("auth:user_update", handleUserUpdate);
    };
  }, [syncTimeZone]);

  const setTimeZone = (newTz: string) => {
    setTimeZoneState(newTz);
    localStorage.setItem("app-timezone", newTz);
    authService.updateInternalUser({ timeZone: newTz });
  };

  const ianaTimeZone = getIanaTimeZone(timeZone);

  const formatClockTimeFn = useCallback(
    (date?: Date | string | number) => {
      const d = date ? new Date(date) : new Date();
      return formatClockTime(d, timeZone);
    },
    [timeZone]
  );

  const formatClockDateFn = useCallback(
    (date?: Date | string | number) => {
      const d = date ? new Date(date) : new Date();
      return formatClockDate(d, timeZone);
    },
    [timeZone]
  );

  const formatSubmittedDateFn = useCallback(
    (date: string | Date | number) => formatSubmittedDate(date, timeZone),
    [timeZone]
  );

  const formatMessageTimestampFn = useCallback(
    (date: string | Date | number) => formatMessageTimestamp(date, timeZone),
    [timeZone]
  );

  const formatDateTimeFn = useCallback(
    (date: string | Date | number, options?: Intl.DateTimeFormatOptions) =>
      formatDateTimeWithUserTz(date, options, timeZone),
    [timeZone]
  );

  return (
    <TimezoneContext.Provider
      value={{
        timeZone,
        ianaTimeZone,
        setTimeZone,
        formatClockTime: formatClockTimeFn,
        formatClockDate: formatClockDateFn,
        formatSubmittedDate: formatSubmittedDateFn,
        formatMessageTimestamp: formatMessageTimestampFn,
        formatDateTime: formatDateTimeFn,
      }}
    >
      {children}
    </TimezoneContext.Provider>
  );
}

export const useTimezone = () => useContext(TimezoneContext);
