import { authService } from "./authService";

export const WINDOWS_TO_IANA_MAP: Record<string, string> = {
  "Dateline Standard Time": "Etc/GMT+12",
  "UTC-11": "Etc/GMT+11",
  "Aleutian Standard Time": "America/Adak",
  "Hawaiian Standard Time": "Pacific/Honolulu",
  "Marquesas Standard Time": "Pacific/Marquesas",
  "Alaskan Standard Time": "America/Anchorage",
  "UTC-09": "Etc/GMT+9",
  "Pacific Standard Time (Mexico)": "America/Tijuana",
  "UTC-08": "Etc/GMT+8",
  "Pacific Standard Time": "America/Los_Angeles",
  "US Mountain Standard Time": "America/Phoenix",
  "Mountain Standard Time (Mexico)": "America/Mazatlan",
  "Mountain Standard Time": "America/Denver",
  "Central America Standard Time": "America/Guatemala",
  "Central Standard Time": "America/Chicago",
  "Central Standard Time (Mexico)": "America/Mexico_City",
  "Canada Central Standard Time": "America/Regina",
  "SA Pacific Standard Time": "America/Bogota",
  "Eastern Standard Time (Mexico)": "America/Cancun",
  "Eastern Standard Time": "America/New_York",
  "US Eastern Standard Time": "America/Indiana/Indianapolis",
  "Venezuela Standard Time": "America/Caracas",
  "Paraguay Standard Time": "America/Asuncion",
  "Atlantic Standard Time": "America/Halifax",
  "Central Brazilian Standard Time": "America/Cuiaba",
  "SA Western Standard Time": "America/La_Paz",
  "Newfoundland Standard Time": "America/St_Johns",
  "Tocantins Standard Time": "America/Araguaina",
  "E. South America Standard Time": "America/Sao_Paulo",
  "SA Eastern Standard Time": "America/Cayenne",
  "Argentina Standard Time": "America/Argentina/Buenos_Aires",
  "Greenland Standard Time": "America/Godthab",
  "Montevideo Standard Time": "America/Montevideo",
  "Magallanes Standard Time": "America/Punta_Arenas",
  "Saint Pierre Standard Time": "America/Miquelon",
  "Bahia Standard Time": "America/Bahia",
  "UTC-02": "Etc/GMT+2",
  "Mid-Atlantic Standard Time": "Atlantic/South_Georgia",
  "Azores Standard Time": "Atlantic/Azores",
  "Cape Verde Standard Time": "Atlantic/Cape_Verde",
  "UTC": "UTC",
  "GMT Standard Time": "Europe/London",
  "Greenwich Standard Time": "Atlantic/Reykjavik",
  "Sao Tome Standard Time": "Africa/Sao_Tome",
  "Morocco Standard Time": "Africa/Casablanca",
  "W. Europe Standard Time": "Europe/Berlin",
  "Central Europe Standard Time": "Europe/Budapest",
  "Romance Standard Time": "Europe/Paris",
  "Central European Standard Time": "Europe/Warsaw",
  "W. Central Africa Standard Time": "Africa/Lagos",
  "Jordan Standard Time": "Asia/Amman",
  "GTB Standard Time": "Europe/Athens",
  "Middle East Standard Time": "Asia/Beirut",
  "Egypt Standard Time": "Africa/Cairo",
  "E. Europe Standard Time": "Europe/Chisinau",
  "Syria Standard Time": "Asia/Damascus",
  "West Bank Standard Time": "Asia/Hebron",
  "South Africa Standard Time": "Africa/Johannesburg",
  "FLE Standard Time": "Europe/Helsinki",
  "Israel Standard Time": "Asia/Jerusalem",
  "Kaliningrad Standard Time": "Europe/Kaliningrad",
  "Sudan Standard Time": "Africa/Khartoum",
  "Libya Standard Time": "Africa/Tripoli",
  "Namibia Standard Time": "Africa/Windhoek",
  "Arabic Standard Time": "Asia/Baghdad",
  "Turkey Standard Time": "Europe/Istanbul",
  "Arab Standard Time": "Asia/Riyadh",
  "Belarus Standard Time": "Europe/Minsk",
  "Russian Standard Time": "Europe/Moscow",
  "E. Africa Standard Time": "Africa/Nairobi",
  "Iran Standard Time": "Asia/Tehran",
  "Arabian Standard Time": "Asia/Dubai",
  "Astrakhan Standard Time": "Europe/Astrakhan",
  "Azerbaijan Standard Time": "Asia/Baku",
  "Russia Time Zone 3": "Europe/Samara",
  "Mauritius Standard Time": "Indian/Mauritius",
  "Saratov Standard Time": "Europe/Saratov",
  "Georgian Standard Time": "Asia/Tbilisi",
  "Volgograd Standard Time": "Europe/Volgograd",
  "Caucasus Standard Time": "Asia/Yerevan",
  "Afghanistan Standard Time": "Asia/Kabul",
  "West Asia Standard Time": "Asia/Tashkent",
  "Ekaterinburg Standard Time": "Asia/Yekaterinburg",
  "Pakistan Standard Time": "Asia/Karachi",
  "Qyzylorda Standard Time": "Asia/Qyzylorda",
  "India Standard Time": "Asia/Kolkata",
  "Sri Lanka Standard Time": "Asia/Colombo",
  "Nepal Standard Time": "Asia/Kathmandu",
  "Central Asia Standard Time": "Asia/Almaty",
  "Bangladesh Standard Time": "Asia/Dhaka",
  "Omsk Standard Time": "Asia/Omsk",
  "Myanmar Standard Time": "Asia/Yangon",
  "SE Asia Standard Time": "Asia/Bangkok",
  "Altai Standard Time": "Asia/Barnaul",
  "W. Mongolia Standard Time": "Asia/Hovd",
  "Krasnoyarsk Standard Time": "Asia/Krasnoyarsk",
  "Novosibirsk Standard Time": "Asia/Novosibirsk",
  "Tomsk Standard Time": "Asia/Tomsk",
  "China Standard Time": "Asia/Shanghai",
  "North Asia East Standard Time": "Asia/Irkutsk",
  "Singapore Standard Time": "Asia/Singapore",
  "W. Australia Standard Time": "Australia/Perth",
  "Taipei Standard Time": "Asia/Taipei",
  "Ulaanbaatar Standard Time": "Asia/Ulaanbaatar",
  "Aus Central W. Standard Time": "Australia/Eucla",
  "Transbaikal Standard Time": "Asia/Chita",
  "Tokyo Standard Time": "Asia/Tokyo",
  "North Korea Standard Time": "Asia/Pyongyang",
  "Korea Standard Time": "Asia/Seoul",
  "Yakutsk Standard Time": "Asia/Yakutsk",
  "Cen. Australia Standard Time": "Australia/Adelaide",
  "AUS Central Standard Time": "Australia/Darwin",
  "E. Australia Standard Time": "Australia/Brisbane",
  "AUS Eastern Standard Time": "Australia/Sydney",
  "West Pacific Standard Time": "Pacific/Guam",
  "Tasmania Standard Time": "Australia/Hobart",
  "Vladivostok Standard Time": "Asia/Vladivostok",
  "Lord Howe Standard Time": "Australia/Lord_Howe",
  "Bougainville Standard Time": "Pacific/Bougainville",
  "Russia Time Zone 10": "Asia/Srednekolymsk",
  "Magadan Standard Time": "Asia/Magadan",
  "Norfolk Standard Time": "Pacific/Norfolk",
  "Sakhalin Standard Time": "Asia/Sakhalin",
  "Central Pacific Standard Time": "Pacific/Guadalcanal",
  "Russia Time Zone 11": "Asia/Kamchatka",
  "New Zealand Standard Time": "Pacific/Auckland",
  "UTC+12": "Etc/GMT-12",
  "Fiji Standard Time": "Pacific/Fiji",
  "Kamchatka Standard Time": "Asia/Kamchatka",
  "Chatham Islands Standard Time": "Pacific/Chatham",
  "UTC+13": "Etc/GMT-13",
  "Tonga Standard Time": "Pacific/Tongatapu",
  "Samoa Standard Time": "Pacific/Apia",
  "Line Islands Standard Time": "Pacific/Kiritimati",
};

/**
 * Resolves a timezone string (Windows or IANA) to a valid IANA timezone identifier
 */
export function getIanaTimeZone(tz?: string): string | undefined {
  if (!tz || typeof tz !== "string") return undefined;
  const trimmed = tz.trim();
  if (!trimmed) return undefined;

  if (WINDOWS_TO_IANA_MAP[trimmed]) {
    return WINDOWS_TO_IANA_MAP[trimmed];
  }

  // Check if it's already a valid IANA timezone identifier
  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return trimmed;
  } catch {
    // If not valid, return undefined so browser default is safely used
    return undefined;
  }
}

/**
 * Gets the current active user timezone from user session or localStorage
 */
export function getActiveUserTimeZone(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const user = authService.getUser();
  const rawTz = user?.timeZone || user?.timezone || localStorage.getItem("app-timezone") || undefined;
  return getIanaTimeZone(rawTz);
}

/**
 * Formats clock time string (e.g. "7:35 PM") using user's active timezone
 */
export function formatClockTime(date: Date = new Date(), customTz?: string): string {
  const timeZone = customTz ? getIanaTimeZone(customTz) : getActiveUserTimeZone();
  try {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone,
    });
  } catch {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
}

/**
 * Formats clock date string (e.g. "Thursday 17, Sep, 2026") using user's active timezone
 */
export function formatClockDate(date: Date = new Date(), customTz?: string): string {
  const timeZone = customTz ? getIanaTimeZone(customTz) : getActiveUserTimeZone();
  try {
    const weekday = date.toLocaleDateString("en-US", { weekday: "long", timeZone });
    const day = date.toLocaleDateString("en-US", { day: "numeric", timeZone });
    const month = date.toLocaleDateString("en-US", { month: "short", timeZone });
    const year = date.toLocaleDateString("en-US", { year: "numeric", timeZone });
    return `${weekday} ${day}, ${month}, ${year}`;
  } catch {
    const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
    const day = date.getDate();
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const year = date.getFullYear();
    return `${weekday} ${day}, ${month}, ${year}`;
  }
}

/**
 * Formats submitted date string (e.g. "Submitted on Sep 17, 7:35 PM")
 */
export function formatSubmittedDate(date: string | Date | number, customTz?: string): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const timeZone = customTz ? getIanaTimeZone(customTz) : getActiveUserTimeZone();
  try {
    const month = d.toLocaleString("en-US", { month: "short", timeZone });
    const day = d.toLocaleDateString("en-US", { day: "numeric", timeZone });
    const time = d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone });
    return `Submitted on ${month} ${day}, ${time}`;
  } catch {
    const month = d.toLocaleString("en-US", { month: "short" });
    const day = d.getDate();
    const time = d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `Submitted on ${month} ${day}, ${time}`;
  }
}

/**
 * Formats message timestamp string (e.g. "7:35 PM - Submitted on Sep 17, 2026")
 */
export function formatMessageTimestamp(date: string | Date | number, customTz?: string): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const timeZone = customTz ? getIanaTimeZone(customTz) : getActiveUserTimeZone();
  try {
    const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone });
    const formattedDate = formatSubmittedDate(date, customTz);
    return `${time} - ${formattedDate}`;
  } catch {
    const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    const formattedDate = formatSubmittedDate(date);
    return `${time} - ${formattedDate}`;
  }
}

/**
 * Generic date/time formatter with user timezone
 */
export function formatDateTimeWithUserTz(
  date: string | Date | number,
  options?: Intl.DateTimeFormatOptions,
  customTz?: string
): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const timeZone = customTz ? getIanaTimeZone(customTz) : getActiveUserTimeZone();
  try {
    return d.toLocaleString("en-US", { ...options, timeZone });
  } catch {
    return d.toLocaleString("en-US", options);
  }
}
