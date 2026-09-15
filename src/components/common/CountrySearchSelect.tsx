"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Country } from "@/lib/countryService";

interface CountrySearchSelectProps {
  value: string;
  onChange: (countryName: string) => void;
  countries: Country[];
  placeholder?: string;
  id?: string;
  className?: string;
}

export default function CountrySearchSelect({
  value,
  onChange,
  countries,
  placeholder = "Search country...",
  id,
  className = "",
}: CountrySearchSelectProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Derive display label from current value - show ONLY country name
  const selectedCountry = countries.find(
    (c) => c.name === value || c.iso2 === value || c.iso3 === value
  );

  const displayLabel = selectedCountry
    ? selectedCountry.name
    : value
    ? (countries.find((c) => c.iso2 === value || c.iso3 === value)?.name || value)
    : "";

  const filtered = search
    ? countries.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
      )
    : countries;

  const handleOpen = () => {
    setSearch("");
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSelect = (c: Country) => {
    onChange(c.name);
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
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleOpen}
        className="w-full bg-white border border-gray-300 rounded-[4px] px-4 py-3 text-sm text-left focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300 transition-all pr-10 cursor-pointer flex items-center justify-between"
      >
        <span className={displayLabel ? "text-gray-900" : "text-gray-400"}>
          {displayLabel || placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`}
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
                placeholder="Search country..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-300"
              />
            </div>
          </div>

          {/* Options list */}
          <ul className="max-h-56 overflow-y-auto">
            {value && (
              <li
                className="px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-50 cursor-pointer"
                onMouseDown={() => { onChange(""); setOpen(false); setSearch(""); }}
              >
                — Clear selection —
              </li>
            )}
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-400 text-center">No countries found</li>
            ) : (
              filtered.map((c) => (
                <li
                  key={c.iso2 || c._id}
                  onMouseDown={() => handleSelect(c)}
                  className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                    c.name === value ? "bg-blue-50 font-medium text-blue-700" : "text-gray-800"
                  }`}
                >
                  {c.name}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
