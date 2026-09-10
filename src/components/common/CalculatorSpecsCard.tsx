"use client";

import React from "react";
import { getMainCalculatorCategory } from "@/lib/calculatorUtils";

interface CalculatorSelection {
  questionKey: string;
  questionText?: string;
  answerKeys?: string[];
  answerTexts?: string[];
  numericValue?: number;
  textValue?: string;
}

interface BreakdownItem {
  item: string;
  amount: number;
}

interface CalculatorSpecs {
  categoryKey?: string;
  categoryName?: string;
  selections?: CalculatorSelection[];
  breakdown?: BreakdownItem[];
  estimatedTimeline?: string;
  businessInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
    description?: string;
  };
}

interface Props {
  specs: CalculatorSpecs;
}

function formatTimelineAnswer(timeline?: string, estimatedTimeline?: string): string {
  // Use estimatedTimeline if provided so the duration strictly matches the project Duration
  const primary = (estimatedTimeline && estimatedTimeline.trim()) || (timeline && timeline.trim()) || "2 weeks";
  const source = (timeline && timeline.trim()) || primary;
  const lowerSource = source.toLowerCase();
  const lowerPrimary = primary.toLowerCase();

  // If source already has a full formatted string with colon
  if (
    source.includes(":") &&
    !source.toLowerCase().startsWith("web_") &&
    !source.toLowerCase().startsWith("seo_") &&
    !source.toLowerCase().startsWith("gfx_")
  ) {
    // If estimatedTimeline is known and differs from the duration prefix in source,
    // sync the duration while preserving rush status
    if (estimatedTimeline && !source.toLowerCase().includes(estimatedTimeline.toLowerCase())) {
      if (lowerSource.includes("super") || lowerSource.includes("50%")) {
        return `${estimatedTimeline} (Super Rushed): +50% rush fee`;
      }
      if (lowerSource.includes("rush") || lowerSource.includes("25%")) {
        return `${estimatedTimeline} (Rushed): +25% rush fee`;
      }
      return `${estimatedTimeline} (Normal): No extra fee`;
    }
    return source;
  }

  const isMonthly = lowerPrimary.includes("month") || lowerSource.includes("month");
  if (isMonthly) return "Monthly Service";

  const isSuper = lowerSource.includes("super") || lowerSource.includes("50%") || lowerPrimary.includes("super");
  const isRush = !isSuper && (lowerSource.includes("rush") || lowerSource.includes("25%") || lowerPrimary.includes("rush"));

  // Determine base duration string (e.g. "3 weeks", "2 weeks", "1 week", "3 days")
  let duration = estimatedTimeline?.trim();
  if (!duration) {
    if (lowerSource.includes("3 week")) duration = "3 weeks";
    else if (lowerSource.includes("2 week")) duration = "2 weeks";
    else if (lowerSource.includes("1 week")) duration = "1 week";
    else if (lowerSource.includes("3 day")) duration = "3 days";
    else duration = "2 weeks";
  }

  // Clean duration of any existing suffixes/parentheses
  duration = duration.replace(/\s*\(.*?\)/g, "").replace(/:\s*.*$/, "").trim();

  if (isSuper) {
    return `${duration} (Super Rushed): +50% rush fee`;
  }
  if (isRush) {
    return `${duration} (Rushed): +25% rush fee`;
  }
  return `${duration} (Normal): No extra fee`;
}

function renderAnswerValue(sel: CalculatorSelection): React.ReactNode {
  if (sel.numericValue !== undefined && sel.numericValue !== null) {
    return <span>{sel.numericValue}</span>;
  }
  if (sel.textValue !== undefined && sel.textValue !== "") {
    return <span>{sel.textValue}</span>;
  }

  // Prefer answerTexts (stored by the frontend during submission),
  // fall back to answerKeys as a last resort.
  const texts = (sel.answerTexts || []).filter(Boolean);
  const displayTexts = texts.length > 0 ? texts : (sel.answerKeys || []).filter(Boolean);

  if (displayTexts.length === 0) {
    return <span style={{ color: "#94a3b8", fontStyle: "italic" }}>—</span>;
  }

  if (displayTexts.length === 1) {
    return <span>{displayTexts[0]}</span>;
  }

  return (
    <ul style={{ margin: "6px 0 0 0", paddingLeft: "28px", listStyleType: "disc", color: "#334155", fontSize: "13px", fontWeight: 500, lineHeight: 1.6 }}>
      {displayTexts.map((t, i) => (
        <li key={i} style={{ marginBottom: "4px" }}>{t}</li>
      ))}
    </ul>
  );
}

function cleanQuestionTitle(text?: string): string {
  if (!text) return "";
  let cleaned = text.trim();
  // Strip trailing colon after ? or . or standalone : to keep only the original question
  cleaned = cleaned.replace(/\?:\s*$/, "?").replace(/\.:\s*$/, ".").replace(/:\s*$/, "").trim();
  return cleaned;
}

export default function CalculatorSpecsCard({ specs }: Props) {
  if (!specs) return null;

  const {
    categoryKey = "website",
    categoryName,
    selections = [],
    breakdown = [],
    estimatedTimeline,
    businessInfo,
  } = specs;

  // A selection is visible if it has any kind of value
  const validSelections = selections.filter((s) => {
    if (s.numericValue !== undefined && s.numericValue !== null) return true;
    if (s.textValue !== undefined && s.textValue !== "") return true;
    if (s.answerTexts && s.answerTexts.some((t) => t?.trim())) return true;
    if (s.answerKeys && s.answerKeys.some((k) => k?.trim())) return true;
    return false;
  });

  const timelineSelection = selections.find((s) => {
    const k = (s.questionKey || "").toLowerCase();
    const q = (s.questionText || "").toLowerCase();
    return k.includes("timeline") || q.includes("timeline");
  });

  const questionSelections = validSelections.filter((s) => {
    const k = (s.questionKey || "").toLowerCase();
    const q = (s.questionText || "").toLowerCase();
    return !k.includes("timeline") && !q.includes("timeline");
  });

  const rawTimelineVal =
    timelineSelection?.answerTexts?.[0] ||
    timelineSelection?.answerKeys?.[0] ||
    estimatedTimeline ||
    "2 weeks";

  const timelineAnswerText = formatTimelineAnswer(rawTimelineVal, estimatedTimeline);

  const hasContent =
    validSelections.length > 0 ||
    breakdown.length > 0 ||
    (businessInfo && Object.values(businessInfo).some(Boolean)) ||
    !!estimatedTimeline;

  if (!hasContent) return null;

  const displayName = getMainCalculatorCategory(categoryKey, categoryName);

  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "20px 24px",
        marginTop: "12px",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          paddingBottom: "12px",
          borderBottom: "1px solid #cbd5e1",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontWeight: 800,
            color: "#3730a3",
            background: "#e0e7ff",
            padding: "4px 12px",
            borderRadius: "20px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Category: {displayName}
        </div>
        <div
          style={{
            fontSize: "10px",
            fontWeight: 800,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          CALCULATOR SPECIFICATIONS
        </div>
      </div>

      {/* Q&A Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {questionSelections.length > 0 ? (
          questionSelections.map((sel, idx) => {
            // Use stored questionText if available, otherwise fall back to questionKey
            const qTitle = cleanQuestionTitle(sel.questionText || sel.questionKey);
            return (
              <div
                key={idx}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "14px 16px",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    color: "#1e293b",
                    fontSize: "13.5px",
                    marginBottom: "6px",
                  }}
                >
                  {qTitle}
                </div>
                <div
                  style={{
                    color: "#2563eb",
                    fontSize: "13.5px",
                    fontWeight: 600,
                    paddingLeft: "16px",
                    marginTop: "4px",
                  }}
                >
                  {renderAnswerValue(sel)}
                </div>
              </div>
            );
          })
        ) : breakdown.length > 0 ? (
          breakdown.map((item, idx) => (
            <div
              key={idx}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "14px 16px",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: "#1e293b",
                  fontSize: "13.5px",
                  marginBottom: "4px",
                }}
              >
                {cleanQuestionTitle(item.item)}
              </div>
              <div
                style={{
                  color: "#2563eb",
                  fontSize: "13px",
                  fontWeight: 600,
                  paddingLeft: "16px",
                }}
              >
                {item.amount > 0 ? `$${item.amount.toLocaleString()}` : "Included"}
              </div>
            </div>
          ))
        ) : null}

        {/* What is your desired project timeline? Card */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "14px 16px",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              color: "#1e293b",
              fontSize: "13.5px",
              marginBottom: "6px",
            }}
          >
            What is your desired project timeline?
          </div>
          <div
            style={{
              color: "#2563eb",
              fontSize: "13.5px",
              fontWeight: 600,
              paddingLeft: "16px",
              marginTop: "4px",
            }}
          >
            {timelineAnswerText}
          </div>
        </div>

        {/* Business Info */}
        {businessInfo && Object.values(businessInfo).some(Boolean) && (
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                color: "#1e293b",
                fontSize: "13.5px",
                marginBottom: "10px",
              }}
            >
              Business Information:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingLeft: "16px" }}>
              {businessInfo.name && (
                <div style={{ fontSize: "13px", color: "#334155" }}>
                  <span style={{ fontWeight: 600, color: "#64748b" }}>Business: </span>
                  {businessInfo.name}
                </div>
              )}
              {businessInfo.website && (
                <div style={{ fontSize: "13px", color: "#334155" }}>
                  <span style={{ fontWeight: 600, color: "#64748b" }}>Website: </span>
                  <a
                    href={businessInfo.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#2563eb", textDecoration: "underline" }}
                  >
                    {businessInfo.website}
                  </a>
                </div>
              )}
              {businessInfo.address && (
                <div style={{ fontSize: "13px", color: "#334155" }}>
                  <span style={{ fontWeight: 600, color: "#64748b" }}>Address: </span>
                  {businessInfo.address}
                </div>
              )}
              {businessInfo.description && (
                <div style={{ fontSize: "13px", color: "#334155", marginTop: "4px" }}>
                  <span style={{ fontWeight: 600, color: "#64748b", display: "block", marginBottom: "2px" }}>
                    Description:
                  </span>
                  <span style={{ color: "#475569" }}>{businessInfo.description}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
