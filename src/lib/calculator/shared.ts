/**
 * calculator/shared.ts
 *
 * Shared helpers used across ALL calculator categories:
 *  - Types
 *  - Question/answer helpers
 *  - The isQuestionVisible() orchestrator (delegates to category files)
 *  - Pricing & formatting utilities
 *  - Project deadline estimation
 *
 * Do NOT add category-specific logic here.
 */

import { CalculatorQuestion, CalculatorSelection } from "../priceCalculatorService";
import { getWebsiteQuestionVisibility } from "./website";
import { getGraphicsQuestionVisibility, getGraphicsCategoryKeys, isGraphicsItemsQuestion, filterGraphicsAnswers } from "./graphics";
import { getSeoQuestionVisibility, getSeoServiceMode, filterSeoAnswers } from "./seo";
import { getMarketingQuestionVisibility } from "./marketing";

// ─── Shared Types ─────────────────────────────────────────────────────────────

type TierScopedAnswer = {
  key?: string;
  visibleIf?: { tier?: string };
  metadata?: { tierKey?: string; tier?: string };
};

export type ConditionalOn = {
  questionKey: string;
  answerKey?: string;
  answerKeys?: string[];
};

type QuestionVisibilityInput = Partial<CalculatorQuestion> & {
  key?: string;
  text?: string;
  config?: CalculatorQuestion["config"];
};

// ─── Numeric Role Detection ───────────────────────────────────────────────────

const NUMERIC_CALCULATOR_ROLE_IDS = new Set([3, 4, 10, 11, 12, 15]);
const NUMERIC_CALCULATOR_ROLE_NAMES = new Set([
  "DEPENDENT_NUMERIC",
  "NUMERIC_ADDON",
  "NUMERIC_STEP_MULTIPLIER",
  "NUMERIC_INCREMENTAL",
  "PERCENTAGE_ADDON",
  "DURATION_MULTIPLIER",
]);

// ─── Question Type Helpers ────────────────────────────────────────────────────

export function getAnswerTierScope(answer: TierScopedAnswer): string | undefined {
  return answer.visibleIf?.tier ?? answer.metadata?.tierKey ?? answer.metadata?.tier;
}

export function findQuestionByRoleId(
  questions: CalculatorQuestion[],
  roleId: number
): CalculatorQuestion | undefined {
  return questions.find((q) => q.roleId === roleId);
}

/** Prod DB/CMS may store numeric pricing questions as type single. */
export function resolveCalculatorQuestionType(question: {
  type?: string;
  roleId?: number;
  role?: string;
}): string {
  const explicit = String(question?.type || "").toLowerCase();
  if (explicit === "number" || explicit === "text" || explicit === "multi") {
    return explicit;
  }
  const roleId = Number(question?.roleId ?? 0);
  const role = String(question?.role || "").toUpperCase();
  if (NUMERIC_CALCULATOR_ROLE_IDS.has(roleId) || NUMERIC_CALCULATOR_ROLE_NAMES.has(role)) {
    return "number";
  }
  return explicit || "single";
}

export function normalizeCalculatorQuestionsForUi<T extends { type?: string; roleId?: number; role?: string }>(
  questions: T[]
): T[] {
  return questions.map((q) => ({
    ...q,
    type: resolveCalculatorQuestionType(q),
  }));
}

// ─── Timeline Question Helpers ────────────────────────────────────────────────

export function findTimelineQuestionKey(questions: CalculatorQuestion[]): string | undefined {
  const known = questions.find((q) =>
    ["WEB_TIMELINE", "GFX_TIMELINE", "SEO_TIMELINE"].includes(q.key || "")
  );
  if (known?.key) return known.key;
  const byRole = questions.find((q) => q.roleId === 13 || q.roleId === 14)?.key;
  if (byRole) return byRole;
  return questions.find((q) => /timeline/i.test(q.key || "") || /timeline/i.test(q.text || ""))?.key;
}

export function isTimelineQuestion(question: any): boolean {
  if (!question) return false;
  return (
    question.roleId === 13 ||
    question.roleId === 14 ||
    ["WEB_TIMELINE", "GFX_TIMELINE", "SEO_TIMELINE"].includes(question.key || "") ||
    /timeline/i.test(question.key || "") ||
    /timeline/i.test(question.text || "")
  );
}

export function hasTimelineSelected(
  questions: any[],
  selections: Record<string, CalculatorSelection>,
  categoryKey?: string | null
): boolean {
  const timelineKey = findTimelineQuestionKey(questions);
  if (!timelineKey) return true;
  const timelineQ = questions.find((q) => q.key === timelineKey || isTimelineQuestion(q));
  if (!timelineQ || !isQuestionVisible(timelineQ, selections, questions, categoryKey)) return true;

  const sel = selections[timelineKey] || selections[timelineQ.key];
  if (!sel) return false;
  if (sel.answerKeys && sel.answerKeys.length > 0) return true;
  if (sel.numericValue !== undefined && sel.numericValue > 0) return true;
  if (sel.textValue && sel.textValue.trim() !== "") return true;
  return false;
}

// ─── Tier Helpers ─────────────────────────────────────────────────────────────

export function isTierSourceQuestion(
  question: Pick<CalculatorQuestion, "key" | "roleId">,
  categoryKey?: string | null
): boolean {
  if (question.roleId === 2) return true;
  return question.key === getTierQuestionKey(categoryKey || "");
}

export function getSelectedTier(
  selections: Record<string, CalculatorSelection>,
  tierQuestionKey = "WEB_TIER",
  questions?: CalculatorQuestion[]
): string {
  const tierQuestion =
    questions?.find((q) => q.key === tierQuestionKey) ??
    (questions ? findQuestionByRoleId(questions, 2) : undefined);

  const selectionKey = tierQuestion?.key ?? tierQuestionKey;
  const tierSel = selections[selectionKey];
  if (!tierSel?.answerKeys?.[0]) return "starter";

  const answerKey = tierSel.answerKeys[0];
  const answer = tierQuestion?.answers?.find((a) => a.key === answerKey);
  const tierFromMeta = answer ? getAnswerTierScope(answer as TierScopedAnswer) : undefined;
  if (tierFromMeta) return tierFromMeta;

  if (answerKey.includes("PREMIUM")) return "premium";
  if (answerKey.includes("STANDARD")) return "standard";
  return "starter";
}

export function getTierQuestionKey(categoryKey: string): string {
  if (categoryKey === "graphics") return "GFX_TIER";
  if (categoryKey === "seo") return "SEO_TIER";
  return "WEB_TIER";
}

// ─── Answer Visibility ────────────────────────────────────────────────────────

export function isAnswerVisible(answer: TierScopedAnswer, tier: string): boolean {
  const answerTier = getAnswerTierScope(answer);
  if (!answerTier) return true;
  return answerTier === tier;
}

export function groupAnswersByHeading(answers: any[]) {
  const groups: { heading: string | null; answers: any[] }[] = [];
  const seen = new Map<string, number>();

  answers.forEach((ans) => {
    const heading = ans.metadata?.heading || null;
    const key = heading || "__flat__";
    if (!seen.has(key)) {
      seen.set(key, groups.length);
      groups.push({ heading, answers: [] });
    }
    groups[seen.get(key)!].answers.push(ans);
  });

  return groups;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function getMissingRequiredQuestions(
  questions: any[],
  selections: Record<string, CalculatorSelection>,
  categoryKey?: string | null
): any[] {
  return questions.filter((q) => {
    if (!isQuestionVisible(q, selections, questions, categoryKey)) return false;
    const isRequired = q.isRequired || isTimelineQuestion(q) || q.roleId === 1 || q.roleId === 2;
    if (!isRequired) return false;

    if (q.type === "number") {
      const minVal = q.config?.minValue ?? 0;
      const maxVal = (q as any).config?.maxValue;
      const sel = selections[q.key];
      const val = sel?.numericValue ?? 0;
      if (val < minVal) return true;
      if (maxVal != null && val > maxVal) return true;
      return false;
    }

    const sel = selections[q.key];
    if (!sel) return true;
    if (q.type === "text") return !sel.textValue || sel.textValue.trim() === "";
    return !sel.answerKeys || sel.answerKeys.length === 0;
  });
}

// ─── Core Visibility Orchestrator ─────────────────────────────────────────────

/**
 * Determines whether a calculator question should be shown to the user.
 *
 * Delegates to each category file in order:
 *   1. Website  → getWebsiteQuestionVisibility()
 *   2. Graphics → getGraphicsQuestionVisibility()
 *   3. SEO      → getSeoQuestionVisibility()
 *   4. Marketing→ getMarketingQuestionVisibility()
 *   5. Generic conditionalOn fallback
 *
 * Each handler returns null if the question does not belong to that category,
 * allowing the chain to continue.
 */
export function isQuestionVisible(
  question: QuestionVisibilityInput,
  selections: Record<string, CalculatorSelection>,
  questions?: QuestionVisibilityInput[],
  categoryKey?: string | null
): boolean {
  if (!question) return false;

  // 1. Website category
  const websiteResult = getWebsiteQuestionVisibility(question, selections, categoryKey, questions);
  if (websiteResult !== null) return websiteResult;

  // 2. Graphics items question
  const graphicsResult = getGraphicsQuestionVisibility(question, selections, questions);
  if (graphicsResult !== null) return graphicsResult;

  // 3. SEO category
  const seoResult = getSeoQuestionVisibility(question, selections, questions, categoryKey);
  if (seoResult !== null) return seoResult;

  // 4. Marketing category
  const marketingResult = getMarketingQuestionVisibility(question, selections, questions, categoryKey);
  if (marketingResult !== null) return marketingResult;

  // 5. Generic conditionalOn fallback
  const cond = question.conditionalOn;
  if (cond && typeof cond.questionKey === "string" && cond.questionKey.trim() !== "") {
    const keys = selections[cond.questionKey]?.answerKeys || [];
    if (cond.answerKey) return keys.includes(cond.answerKey);
    if (cond.answerKeys?.length) return cond.answerKeys.some((k) => keys.includes(k));
    return keys.length > 0;
  }

  return true;
}

// ─── Selection Pruning ────────────────────────────────────────────────────────

export function pruneHiddenSelections(
  selections: Record<string, CalculatorSelection>,
  questions: QuestionVisibilityInput[],
  categoryKey?: string | null
): Record<string, CalculatorSelection> {
  const next = { ...selections };
  for (const q of questions) {
    if (!q.key) continue;
    if (!isQuestionVisible(q, next, questions, categoryKey)) delete next[q.key];
  }

  // Prune graphics items no longer visible under selected categories
  const catKeys = getGraphicsCategoryKeys(next, questions);
  const gfxQ = questions.find((q) => isGraphicsItemsQuestion(q));
  if (gfxQ?.key && next[gfxQ.key]?.answerKeys) {
    if (!catKeys.length) {
      delete next[gfxQ.key];
    } else if ((gfxQ as any).answers) {
      const allowedKeys = new Set(
        filterGraphicsAnswers((gfxQ as any).answers, catKeys).map((a: any) => a.key)
      );
      const filteredItemKeys = next[gfxQ.key].answerKeys.filter((k) => allowedKeys.has(k));
      if (filteredItemKeys.length !== next[gfxQ.key].answerKeys.length) {
        if (filteredItemKeys.length > 0) {
          next[gfxQ.key] = { ...next[gfxQ.key], answerKeys: filteredItemKeys };
        } else {
          delete next[gfxQ.key];
        }
      }
    }
  }

  // Prune SEO items no longer visible under selected service mode
  const seoMode = getSeoServiceMode(next, questions);
  const seoItemsQ = questions.find((q) => q.key === "SEO_ITEMS");
  if (seoItemsQ?.key && next[seoItemsQ.key]?.answerKeys) {
    if ((seoItemsQ as any).answers) {
      const allowedKeys = new Set(
        filterSeoAnswers((seoItemsQ as any).answers, seoMode).map((a: any) => a.key)
      );
      const filteredItemKeys = next[seoItemsQ.key].answerKeys.filter((k) => allowedKeys.has(k));
      if (filteredItemKeys.length !== next[seoItemsQ.key].answerKeys.length) {
        if (filteredItemKeys.length > 0) {
          next[seoItemsQ.key] = { ...next[seoItemsQ.key], answerKeys: filteredItemKeys };
        } else {
          delete next[seoItemsQ.key];
        }
      }
    }
  }

  return next;
}

// ─── Selection Utilities ──────────────────────────────────────────────────────

export function shouldShowPriceBar(
  category: any,
  selections: Record<string, CalculatorSelection>
): boolean {
  const trigger = category?.uiRules?.priceBarTrigger;
  if (!trigger?.questionKey) {
    return Object.keys(selections).length > 0;
  }
  const sel = selections[trigger.questionKey];
  const min = trigger.minSelections ?? 1;
  if (sel?.answerKeys?.length >= min) return true;
  if (sel?.numericValue !== undefined && sel.numericValue >= min) return true;
  return false;
}

export function selectionsToArray(
  selections: Record<string, CalculatorSelection>
): CalculatorSelection[] {
  return Object.values(selections)
    .filter(
      (s) =>
        (s.answerKeys && s.answerKeys.length > 0) ||
        s.numericValue !== undefined ||
        (s.textValue !== undefined && s.textValue !== "")
    )
    .map((s) =>
      s.answerKeys?.length
        ? { ...s, answerKeys: [...new Set(s.answerKeys)] }
        : s
    );
}

export function filterQuestionAnswers(
  question: CalculatorQuestion,
  tier: string
): CalculatorQuestion {
  if (!question.answers?.length) return question;
  if (question.roleId === 2) return question;
  return {
    ...question,
    answers: question.answers.filter((a) => isAnswerVisible(a as TierScopedAnswer, tier)),
  };
}

// ─── Category Display Helpers ─────────────────────────────────────────────────

const DEFAULT_CATEGORY_ILLUSTRATIONS: Record<string, string> = {
  website: "/images/calculator/website_illustration_v1_1769769521492.png",
  graphics: "/images/calculator/graphics_design_illustration_v1_1769769544150.png",
  seo: "/images/calculator/seo_illustration_v1_1769769565449.png",
  marketing: "/images/calculator/marketing_illustration_v1_1769769585205.png",
};

export function getCategoryIllustration(categoryKey: string, imageUrl?: string): string {
  if (imageUrl?.trim()) return imageUrl.trim();
  return (
    DEFAULT_CATEGORY_ILLUSTRATIONS[categoryKey] ||
    `/images/calculator/${categoryKey}_illustration.svg`
  );
}

export function getCategoryDisplayName(categoryKey: string, categoryName?: string): string {
  if (categoryName?.trim()) return categoryName.trim().toUpperCase();
  return categoryKey.toUpperCase();
}

export const MAIN_CALCULATOR_CATEGORIES: Record<string, string> = {
  website: "A New Website",
  graphics: "Graphic Designs",
  seo: "Search Engine <br> Optimization",
  marketing: "A Marketing <br> Campaign",
};

export function getMainCalculatorCategory(categoryKey?: string, categoryName?: string): string {
  const normKey = (categoryKey || "").toLowerCase().trim();

  if (categoryName?.trim()) {
    const normName = categoryName.trim().toLowerCase();
    if (normName === "a new website" || normName === "website") return "A New Website";
    if (normName === "graphic designs" || normName === "graphics") return "Graphic Designs";
    if (normName === "search engine optimization" || normName === "seo") return "Search Engine <br> Optimization";
    if (normName === "a marketing campaign" || normName === "marketing") return "A Marketing <br> Campaign";

    if (!normName.includes("custom website development") && !normName.includes("project")) {
      return categoryName.trim();
    }
  }

  if (normKey.includes("web")) return "A New Website";
  if (normKey.includes("graph")) return "Graphic Designs";
  if (normKey.includes("seo")) return "Search Engine <br> Optimization";
  if (normKey.includes("market")) return "A Marketing <br> Campaign";

  return MAIN_CALCULATOR_CATEGORIES[normKey] || "A New Website";
}

export function getCategoryProposalName(categoryKey: string, categoryName?: string): string {
  if (categoryName?.trim()) return categoryName.trim();
  return categoryKey
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const DEFAULT_CATEGORY_TIMELINES: Record<string, string> = {
  website: "2 weeks",
  graphics: "2 weeks",
  seo: "Monthly Service",
  marketing: "Monthly Service",
};

export function getDefaultCategoryTimeline(categoryKey: string, categoryTimeline?: string): string {
  if (categoryTimeline?.trim()) return categoryTimeline.trim();
  return DEFAULT_CATEGORY_TIMELINES[categoryKey] || "2 weeks";
}

export function isMonthlyBillingCategory(categoryKey: string | null, seoMode?: string): boolean {
  if (categoryKey === "marketing") return true;
  if (categoryKey === "seo") return seoMode === "monthly";
  return false;
}

// ─── Timeline Label Formatting ────────────────────────────────────────────────

export function formatDaysToTimelineLabel(days: number): string {
  if (days <= 0) return "";
  if (days === 1) return "1 day";
  if (days <= 4) return `${days} days`;
  if (days <= 7) return "1 week";
  if (days <= 10) return "10 days";
  if (days <= 14) return "2 weeks";
  if (days <= 21) return "3 weeks";
  if (days <= 28) return "4 weeks";
  if (days <= 35) return "5 weeks";
  if (days <= 42) return "6 weeks";
  if (days <= 60) return "8 weeks";
  if (days <= 90) return "12 weeks";
  return `${Math.ceil(days / 7)} weeks`;
}

// ─── Answer Label Formatting ──────────────────────────────────────────────────

function isTimelineWithRushFees(
  categoryKey?: string,
  questionKey?: string,
  roleId?: number
): boolean {
  if (
    questionKey === "GFX_TIMELINE" ||
    questionKey === "SEO_TIMELINE" ||
    questionKey === "GD_TIMELINE" ||
    questionKey === "WEB_TIMELINE" ||
    /timeline/i.test(questionKey || "")
  ) {
    return true;
  }
  if (categoryKey === "graphics" && (roleId === 13 || roleId === 14)) return true;
  if (categoryKey === "seo" && (roleId === 13 || roleId === 14)) return true;
  if (categoryKey === "website" && (roleId === 13 || roleId === 14)) return true;
  if (roleId === 13 || roleId === 14) return true;
  return false;
}

function appendRushFeeLabel(text: string, fee?: number): string {
  if (!fee || fee <= 0 || /\+\d+% rush fee/i.test(text) || /no extra fee/i.test(text)) {
    return text;
  }
  const pct = Math.round(fee * 100);
  const base = text.replace(/:\s*$/, "").trim();
  return `${base}: +${pct}% rush fee`;
}

/** Format calculator answer labels (preserves rush-fee text for website, graphics, and SEO). */
export function formatCalculatorAnswerLabel(
  text: string,
  questionKey?: string,
  options?: {
    categoryKey?: string;
    roleId?: number;
    metadata?: { fee?: number; reduction?: number; days?: number };
    baselineDays?: number;
  }
): string {
  if (!text) return "";
  const { categoryKey, roleId, metadata, baselineDays } = options ?? {};

  // Import lazily to avoid circular dependency at module level
  const { getGraphicsRushTypeFromMetadata, formatGraphicsTimelineOptionLabel } = require("./graphics");

  if (
    categoryKey === "graphics" &&
    (questionKey === "GFX_TIMELINE" ||
      questionKey === "GD_TIMELINE" ||
      roleId === 13 ||
      roleId === 14 ||
      /timeline/i.test(questionKey || ""))
  ) {
    if (baselineDays && baselineDays > 0) {
      const rushType = getGraphicsRushTypeFromMetadata(metadata, text);
      return formatGraphicsTimelineOptionLabel(baselineDays, rushType);
    }
  }

  if (
    categoryKey === "seo" &&
    (questionKey === "SEO_TIMELINE" || roleId === 13 || roleId === 14)
  ) {
    if (baselineDays && baselineDays > 0) {
      const rushType = getGraphicsRushTypeFromMetadata(metadata, text);
      return formatGraphicsTimelineOptionLabel(baselineDays, rushType);
    }
  }

  if (isTimelineWithRushFees(categoryKey, questionKey, roleId)) {
    let label = appendRushFeeLabel(text, metadata?.fee);
    if (!/\+\d+% rush fee/i.test(label) && !/no extra fee/i.test(label)) {
      if (/super rushed/i.test(label)) label = appendRushFeeLabel(label, 0.5);
      else if (/\(rushed\)/i.test(label) || /rushed/i.test(label)) label = appendRushFeeLabel(label, 0.25);
    }
    return label;
  }

  return text;
}

export function formatCalculatorQuestionText(
  text?: string,
  isRequired?: boolean,
  questionType?: string,
  _categoryKey?: string
): string {
  if (!text) return "";
  let trimmed = text.replace(/\s*\(Optional\)/gi, "").trim();
  if (/Tell us more about your goals and target audience$/i.test(trimmed)) {
    trimmed = `${trimmed}:`;
  }
  if (questionType === "text" && isRequired !== true) {
    return `${trimmed} (Optional)`;
  }
  return trimmed;
}

// ─── Pricing Helpers ──────────────────────────────────────────────────────────

/** Nearest 5 for most categories; SEO uses nearest $1 (live parity). */
export function roundCalculatorPrice(amount: number, categoryKey?: string): number {
  if (!Number.isFinite(amount)) return 0;
  if (categoryKey === "seo") {
    return Math.round(amount);
  }
  return 5 * Math.round(amount / 5);
}

export function getCalculatorDisplayAmount(
  amountUsd: number,
  currency: string,
  conversionRate = 1,
  categoryKey?: string
): number {
  const inCurrency = currency === "eur" ? amountUsd / conversionRate : amountUsd;
  return roundCalculatorPrice(inCurrency, categoryKey);
}

/** Exact payable amount in chosen currency, rounded to nearest 5 for display/charge consistency. */
export function getCalculatorPayableAmount(
  amountUsd: number,
  currency: string,
  conversionRate = 1,
  categoryKey?: string
): number {
  const inCurrency = currency === "eur" ? amountUsd / conversionRate : amountUsd;
  return roundCalculatorPrice(inCurrency, categoryKey);
}

/** 50% deposit rounded to nearest 5. */
export function getCalculatorHalfPayableAmount(payableTotal: number, categoryKey?: string): number {
  return roundCalculatorPrice(payableTotal / 2, categoryKey);
}

export function formatCalculatorPrice(
  amountUsd: number,
  currency: string,
  conversionRate = 1,
  categoryKey?: string
): string {
  return formatCalculatorDisplayAmount(
    getCalculatorDisplayAmount(amountUsd, currency, conversionRate, categoryKey),
    currency,
    categoryKey
  );
}

export function formatCalculatorDisplayAmount(
  amountInCurrency: number,
  currency: string,
  categoryKey?: string,
  fractionDigits = 2
): string {
  const normalizedCurrency = currency.toUpperCase();
  const rounded = roundCalculatorPrice(amountInCurrency, categoryKey);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: normalizedCurrency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(rounded);
}

// ─── Duration / Deadline Helpers ──────────────────────────────────────────────

export function parseDurationToDays(durationStr: string): number {
  if (!durationStr) return 0;
  if (/monthly\s*service/i.test(durationStr)) return 30;
  const trimmed = durationStr.trim();
  if (/^3\s*days?$/i.test(trimmed)) return 3;
  if (/^10\s*days?$/i.test(trimmed)) return 10;
  const rangeMatch = /(\d+)\s*-\s*(\d+)/.exec(durationStr);
  if (rangeMatch) return parseInt(rangeMatch[2], 10);
  const weeksMatch = /(\d+)\s*week/i.exec(durationStr);
  if (weeksMatch) return parseInt(weeksMatch[1], 10) * 7;
  const monthsMatch = /(\d+)\s*month/i.exec(durationStr);
  if (monthsMatch) return parseInt(monthsMatch[1], 10) * 30;
  if (/month/i.test(durationStr)) return 30;
  const daysMatch = /(\d+)\s*(?:business\s*)?day/i.exec(durationStr);
  if (daysMatch) return parseInt(daysMatch[1], 10);
  const hoursMatch = /(\d+)\s*hour/i.exec(durationStr);
  if (hoursMatch) return Math.max(1, Math.ceil(parseInt(hoursMatch[1], 10) / 24));
  return parseInt(durationStr, 10) || 0;
}

export function getProjectEstimatedDeadline(project: any): Date | null {
  if (!project) return null;

  // 1. Explicit deadline takes priority
  if (project.deadline) {
    const d = new Date(project.deadline);
    if (!isNaN(d.getTime())) return d;
  }

  const startDate = project.startDate || project.createdAt;
  if (!startDate) return null;
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return null;

  // 2. Parse duration from timeline strings
  const timelineStr =
    project.calculatorSpecs?.estimatedTimeline ||
    project.calculatorSpecs?.timeline ||
    project.requirements?.estimatedTimeline ||
    project.requirements?.timeline ||
    project.estimatedTimeline ||
    project.totalDuration ||
    project.timeline ||
    project.duration ||
    "";

  let durationDays = parseDurationToDays(timelineStr);

  // 3. Sum item durations if no top-level timeline
  if (durationDays === 0 && Array.isArray(project.items) && project.items.length > 0) {
    let sumDays = 0;
    for (const item of project.items) {
      if (item.duration) {
        const itemDays =
          typeof item.duration === "number"
            ? item.duration
            : parseDurationToDays(String(item.duration));
        sumDays += itemDays;
      }
    }
    if (sumDays > 0) {
      durationDays = sumDays;
    }
  }

  // 4. Monthly subscription fallback
  if (durationDays === 0) {
    const isMonthly =
      project.billingType === "monthly" ||
      project.calculatorSpecs?.categoryKey === "seo" ||
      project.calculatorSpecs?.categoryKey === "marketing" ||
      project.categoryKey === "seo" ||
      project.categoryKey === "marketing";

    if (isMonthly) {
      durationDays = 30;
    }
  }

  if (durationDays > 0) {
    const d = new Date(start);
    d.setDate(d.getDate() + durationDays);
    return d;
  }

  return null;
}
