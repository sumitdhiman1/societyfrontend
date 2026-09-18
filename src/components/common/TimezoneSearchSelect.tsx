"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

export interface TimezoneOption {
  value: string;
  label: string;
}

export const DEFAULT_TIMEZONES: TimezoneOption[] = [
  { value: "Dateline Standard Time", label: "(UTC-12:00) International Date Line West" },
  { value: "UTC-11", label: "(UTC-11:00) Coordinated Universal Time-11" },
  { value: "Aleutian Standard Time", label: "(UTC-10:00) Aleutian Islands" },
  { value: "Hawaiian Standard Time", label: "(UTC-10:00) Hawaii" },
  { value: "Marquesas Standard Time", label: "(UTC-09:30) Marquesas Islands" },
  { value: "Alaskan Standard Time", label: "(UTC-09:00) Alaska" },
  { value: "UTC-09", label: "(UTC-09:00) Coordinated Universal Time-09" },
  { value: "Pacific Standard Time (Mexico)", label: "(UTC-08:00) Baja California" },
  { value: "UTC-08", label: "(UTC-08:00) Coordinated Universal Time-08" },
  { value: "Pacific Standard Time", label: "(UTC-08:00) Pacific Time (US & Canada)" },
  { value: "US Mountain Standard Time", label: "(UTC-07:00) Arizona" },
  { value: "Mountain Standard Time (Mexico)", label: "(UTC-07:00) Chihuahua, La Paz, Mazatlan" },
  { value: "Mountain Standard Time", label: "(UTC-07:00) Mountain Time (US & Canada)" },
  { value: "Central America Standard Time", label: "(UTC-06:00) Central America" },
  { value: "Central Standard Time", label: "(UTC-06:00) Central Time (US & Canada)" },
  { value: "Central Standard Time (Mexico)", label: "(UTC-06:00) Guadalajara, Mexico City, Monterrey" },
  { value: "Canada Central Standard Time", label: "(UTC-06:00) Saskatchewan" },
  { value: "SA Pacific Standard Time", label: "(UTC-05:00) Bogota, Lima, Quito, Rio Branco" },
  { value: "Eastern Standard Time (Mexico)", label: "(UTC-05:00) Chetumal" },
  { value: "Eastern Standard Time", label: "(UTC-05:00) Eastern Time (US & Canada)" },
  { value: "US Eastern Standard Time", label: "(UTC-05:00) Indiana (East)" },
  { value: "Venezuela Standard Time", label: "(UTC-04:30) Caracas" },
  { value: "Paraguay Standard Time", label: "(UTC-04:00) Asuncion" },
  { value: "Atlantic Standard Time", label: "(UTC-04:00) Atlantic Time (Canada)" },
  { value: "Central Brazilian Standard Time", label: "(UTC-04:00) Cuiaba" },
  { value: "SA Western Standard Time", label: "(UTC-04:00) Georgetown, La Paz, Manaus, San Juan" },
  { value: "Newfoundland Standard Time", label: "(UTC-03:30) Newfoundland" },
  { value: "Tocantins Standard Time", label: "(UTC-03:00) Araguaina" },
  { value: "E. South America Standard Time", label: "(UTC-03:00) Brasilia" },
  { value: "SA Eastern Standard Time", label: "(UTC-03:00) Cayenne, Fortaleza" },
  { value: "Argentina Standard Time", label: "(UTC-03:00) City of Buenos Aires" },
  { value: "Greenland Standard Time", label: "(UTC-03:00) Greenland" },
  { value: "Montevideo Standard Time", label: "(UTC-03:00) Montevideo" },
  { value: "Magallanes Standard Time", label: "(UTC-03:00) Punta Arenas" },
  { value: "Saint Pierre Standard Time", label: "(UTC-03:00) Saint Pierre and Miquelon" },
  { value: "Bahia Standard Time", label: "(UTC-03:00) Salvador" },
  { value: "UTC-02", label: "(UTC-02:00) Coordinated Universal Time-02" },
  { value: "Mid-Atlantic Standard Time", label: "(UTC-02:00) Mid-Atlantic - Old" },
  { value: "Azores Standard Time", label: "(UTC-01:00) Azores" },
  { value: "Cape Verde Standard Time", label: "(UTC-01:00) Cabo Verde Is." },
  { value: "UTC", label: "(UTC) Coordinated Universal Time" },
  { value: "GMT Standard Time", label: "(UTC+00:00) Dublin, Edinburgh, Lisbon, London" },
  { value: "Greenwich Standard Time", label: "(UTC+00:00) Monrovia, Reykjavik" },
  { value: "Sao Tome Standard Time", label: "(UTC+00:00) Sao Tome" },
  { value: "Morocco Standard Time", label: "(UTC+01:00) Casablanca" },
  { value: "W. Europe Standard Time", label: "(UTC+01:00) Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna" },
  { value: "Central Europe Standard Time", label: "(UTC+01:00) Belgrade, Bratislava, Budapest, Ljubljana, Prague" },
  { value: "Romance Standard Time", label: "(UTC+01:00) Brussels, Copenhagen, Madrid, Paris" },
  { value: "Central European Standard Time", label: "(UTC+01:00) Sarajevo, Skopje, Warsaw, Zagreb" },
  { value: "W. Central Africa Standard Time", label: "(UTC+01:00) West Central Africa" },
  { value: "Jordan Standard Time", label: "(UTC+02:00) Amman" },
  { value: "GTB Standard Time", label: "(UTC+02:00) Athens, Bucharest" },
  { value: "Middle East Standard Time", label: "(UTC+02:00) Beirut" },
  { value: "Egypt Standard Time", label: "(UTC+02:00) Cairo" },
  { value: "E. Europe Standard Time", label: "(UTC+02:00) Chisinau" },
  { value: "Syria Standard Time", label: "(UTC+02:00) Damascus" },
  { value: "West Bank Standard Time", label: "(UTC+02:00) Gaza, Hebron" },
  { value: "South Africa Standard Time", label: "(UTC+02:00) Harare, Pretoria" },
  { value: "FLE Standard Time", label: "(UTC+02:00) Helsinki, Kyiv, Riga, Sofia, Tallinn, Vilnius" },
  { value: "Israel Standard Time", label: "(UTC+02:00) Jerusalem" },
  { value: "Kaliningrad Standard Time", label: "(UTC+02:00) Kaliningrad" },
  { value: "Sudan Standard Time", label: "(UTC+02:00) Khartoum" },
  { value: "Libya Standard Time", label: "(UTC+02:00) Tripoli" },
  { value: "Namibia Standard Time", label: "(UTC+02:00) Windhoek" },
  { value: "Arabic Standard Time", label: "(UTC+03:00) Baghdad" },
  { value: "Turkey Standard Time", label: "(UTC+03:00) Istanbul" },
  { value: "Arab Standard Time", label: "(UTC+03:00) Kuwait, Riyadh" },
  { value: "Belarus Standard Time", label: "(UTC+03:00) Minsk" },
  { value: "Russian Standard Time", label: "(UTC+03:00) Moscow, St. Petersburg" },
  { value: "E. Africa Standard Time", label: "(UTC+03:00) Nairobi" },
  { value: "Iran Standard Time", label: "(UTC+03:30) Tehran" },
  { value: "Arabian Standard Time", label: "(UTC+04:00) Abu Dhabi, Muscat" },
  { value: "Astrakhan Standard Time", label: "(UTC+04:00) Astrakhan, Ulyanovsk" },
  { value: "Azerbaijan Standard Time", label: "(UTC+04:00) Baku" },
  { value: "Russia Time Zone 3", label: "(UTC+04:00) Izhevsk, Samara" },
  { value: "Mauritius Standard Time", label: "(UTC+04:00) Port Louis" },
  { value: "Saratov Standard Time", label: "(UTC+04:00) Saratov" },
  { value: "Georgian Standard Time", label: "(UTC+04:00) Tbilisi" },
  { value: "Volgograd Standard Time", label: "(UTC+04:00) Volgograd" },
  { value: "Caucasus Standard Time", label: "(UTC+04:00) Yerevan" },
  { value: "Afghanistan Standard Time", label: "(UTC+04:30) Kabul" },
  { value: "West Asia Standard Time", label: "(UTC+05:00) Ashgabat, Tashkent" },
  { value: "Ekaterinburg Standard Time", label: "(UTC+05:00) Ekaterinburg" },
  { value: "Pakistan Standard Time", label: "(UTC+05:00) Islamabad, Karachi" },
  { value: "Qyzylorda Standard Time", label: "(UTC+05:00) Qyzylorda" },
  { value: "India Standard Time", label: "(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi" },
  { value: "Sri Lanka Standard Time", label: "(UTC+05:30) Sri Jayawardenepura" },
  { value: "Nepal Standard Time", label: "(UTC+05:45) Kathmandu" },
  { value: "Central Asia Standard Time", label: "(UTC+06:00) Astana" },
  { value: "Bangladesh Standard Time", label: "(UTC+06:00) Dhaka" },
  { value: "Omsk Standard Time", label: "(UTC+06:00) Omsk" },
  { value: "Myanmar Standard Time", label: "(UTC+06:30) Yangon (Rangoon)" },
  { value: "SE Asia Standard Time", label: "(UTC+07:00) Bangkok, Hanoi, Jakarta" },
  { value: "Altai Standard Time", label: "(UTC+07:00) Barnaul, Gorno-Altaysk" },
  { value: "W. Mongolia Standard Time", label: "(UTC+07:00) Hovd" },
  { value: "Krasnoyarsk Standard Time", label: "(UTC+07:00) Krasnoyarsk" },
  { value: "Novosibirsk Standard Time", label: "(UTC+07:00) Novosibirsk" },
  { value: "Tomsk Standard Time", label: "(UTC+07:00) Tomsk" },
  { value: "China Standard Time", label: "(UTC+08:00) Beijing, Chongqing, Hong Kong, Urumqi" },
  { value: "North Asia East Standard Time", label: "(UTC+08:00) Irkutsk" },
  { value: "Singapore Standard Time", label: "(UTC+08:00) Kuala Lumpur, Singapore" },
  { value: "W. Australia Standard Time", label: "(UTC+08:00) Perth" },
  { value: "Taipei Standard Time", label: "(UTC+08:00) Taipei" },
  { value: "Ulaanbaatar Standard Time", label: "(UTC+08:00) Ulaanbaatar" },
  { value: "Aus Central W. Standard Time", label: "(UTC+08:45) Eucla" },
  { value: "Transbaikal Standard Time", label: "(UTC+09:00) Chita" },
  { value: "Tokyo Standard Time", label: "(UTC+09:00) Osaka, Sapporo, Tokyo" },
  { value: "North Korea Standard Time", label: "(UTC+09:00) Pyongyang" },
  { value: "Korea Standard Time", label: "(UTC+09:00) Seoul" },
  { value: "Yakutsk Standard Time", label: "(UTC+09:00) Yakutsk" },
  { value: "Cen. Australia Standard Time", label: "(UTC+09:30) Adelaide" },
  { value: "AUS Central Standard Time", label: "(UTC+09:30) Darwin" },
  { value: "E. Australia Standard Time", label: "(UTC+10:00) Brisbane" },
  { value: "AUS Eastern Standard Time", label: "(UTC+10:00) Canberra, Melbourne, Sydney" },
  { value: "West Pacific Standard Time", label: "(UTC+10:00) Guam, Port Moresby" },
  { value: "Tasmania Standard Time", label: "(UTC+10:00) Hobart" },
  { value: "Vladivostok Standard Time", label: "(UTC+10:00) Vladivostok" },
  { value: "Lord Howe Standard Time", label: "(UTC+10:30) Lord Howe Island" },
  { value: "Bougainville Standard Time", label: "(UTC+11:00) Bougainville Island" },
  { value: "Russia Time Zone 10", label: "(UTC+11:00) Chokurdakh" },
  { value: "Magadan Standard Time", label: "(UTC+11:00) Magadan" },
  { value: "Norfolk Standard Time", label: "(UTC+11:00) Norfolk Island" },
  { value: "Sakhalin Standard Time", label: "(UTC+11:00) Sakhalin" },
  { value: "Central Pacific Standard Time", label: "(UTC+11:00) Solomon Is., New Caledonia" },
  { value: "Russia Time Zone 11", label: "(UTC+12:00) Anadyr, Petropavlovsk-Kamchatsky" },
  { value: "New Zealand Standard Time", label: "(UTC+12:00) Auckland, Wellington" },
  { value: "UTC+12", label: "(UTC+12:00) Coordinated Universal Time+12" },
  { value: "Fiji Standard Time", label: "(UTC+12:00) Fiji" },
  { value: "Kamchatka Standard Time", label: "(UTC+12:00) Petropavlovsk-Kamchatsky - Old" },
  { value: "Chatham Islands Standard Time", label: "(UTC+12:45) Chatham Islands" },
  { value: "UTC+13", label: "(UTC+13:00) Coordinated Universal Time+13" },
  { value: "Tonga Standard Time", label: "(UTC+13:00) Nuku'alofa" },
  { value: "Samoa Standard Time", label: "(UTC+13:00) Samoa" },
  { value: "Line Islands Standard Time", label: "(UTC+14:00) Kiritimati Island" }
];

interface TimezoneSearchSelectProps {
  value: string;
  onChange: (tzValue: string) => void;
  timezones?: TimezoneOption[];
  placeholder?: string;
  id?: string;
  className?: string;
}

export default function TimezoneSearchSelect({
  value,
  onChange,
  timezones = DEFAULT_TIMEZONES,
  placeholder = "Select timezone...",
  id,
  className = "",
}: TimezoneSearchSelectProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Derive display label from current value
  const selectedTimezone = timezones.find(
    (t) => t.value === value || t.label === value
  );

  const displayLabel = selectedTimezone ? selectedTimezone.label : value || "";

  const filtered = search
    ? timezones.filter((t) =>
        t.label.toLowerCase().includes(search.toLowerCase()) ||
        t.value.toLowerCase().includes(search.toLowerCase())
      )
    : timezones;

  const handleOpen = () => {
    setSearch("");
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSelect = (t: TimezoneOption) => {
    onChange(t.value);
    setSearch("");
    setOpen(false);
  };

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false);
      setSearch("");
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  return (
    <div ref={containerRef} className={`relative ${className}`} id={id}>
      {/* Trigger button matching CountrySearchSelect */}
      <button
        type="button"
        onClick={handleOpen}
        className="w-full bg-white border border-gray-300 rounded-[4px] px-4 py-3 text-sm text-left focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300 transition-all pr-10 cursor-pointer flex items-center justify-between"
      >
        <span className={`truncate ${displayLabel ? "text-gray-900" : "text-gray-400"}`}>
          {displayLabel || placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ml-2 ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search timezone..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-300"
              />
            </div>
          </div>

          {/* Options list */}
          <ul className="max-h-56 overflow-y-auto">
            {value && (
              <li
                className="px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-50 cursor-pointer"
                onMouseDown={() => {
                  onChange("");
                  setOpen(false);
                  setSearch("");
                }}
              >
                — Clear selection —
              </li>
            )}
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-400 text-center">No timezones found</li>
            ) : (
              filtered.map((tz) => (
                <li
                  key={tz.value}
                  onMouseDown={() => handleSelect(tz)}
                  className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                    tz.value === value || tz.label === value
                      ? "bg-blue-50 font-medium text-blue-700"
                      : "text-gray-800"
                  }`}
                >
                  {tz.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
