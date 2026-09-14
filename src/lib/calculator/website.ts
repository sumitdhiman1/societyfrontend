/**
 * calculator/website.ts
 *
 * All logic specific to the "A New Website" calculator category.
 * Edit THIS FILE when you need to change website calculator behaviour.
 * No other category logic lives here.
 */

import { CalculatorSelection } from "../priceCalculatorService";

// ─── Category Detection ───────────────────────────────────────────────────────

/**
 * Returns true when the current context is the "website" category
 * OR the question itself belongs to a website configuration.
 * This guard prevents website questions from matching SEO/marketing rules.
 */
export function isWebsiteCategoryOrQuestion(
  question: any,
  categoryKey?: string | null,
  questions?: any[]
): boolean {
  if (categoryKey === "website") return true;
  if (categoryKey && categoryKey !== "website") return false;

  const key = String(question?.key || "").toUpperCase();
  if (key.startsWith("WEB_")) return true;

  if (
    key.startsWith("SEO_") ||
    key.startsWith("GFX_") ||
    key.startsWith("GD_") ||
    key.startsWith("MKT_") ||
    key.startsWith("MC_")
  ) {
    return false;
  }

  if (
    question?.config?.tierSource === "WEB_TIER" ||
    question?.config?.limitSource === "WEB_TIER" ||
    /type of website/i.test(question?.text || "")
  ) {
    return true;
  }

  if (
    questions?.some(
      (q) =>
        q.config?.tierSource === "WEB_TIER" ||
        q.config?.limitSource === "WEB_TIER" ||
        /type of website/i.test(q.text || "")
    )
  ) {
    return true;
  }

  return false;
}

// ─── Visibility ───────────────────────────────────────────────────────────────

/**
 * Handles question visibility for the "A New Website" category.
 *
 * Returns:
 *   - true/false  → definitive answer for this question
 *   - null        → not a website question; caller should continue checking
 *
 * All website questions are visible by default, unless an explicit
 * conditionalOn dependency has not been satisfied.
 */
export function getWebsiteQuestionVisibility(
  question: any,
  selections: Record<string, CalculatorSelection>,
  categoryKey?: string | null,
  questions?: any[]
): boolean | null {
  if (!isWebsiteCategoryOrQuestion(question, categoryKey, questions)) {
    return null;
  }

  const cond = question.conditionalOn;
  if (cond && typeof cond.questionKey === "string" && cond.questionKey.trim() !== "") {
    const parentSel = selections[cond.questionKey];
    const keys = parentSel?.answerKeys || [];
    if (cond.answerKey) return keys.includes(cond.answerKey);
    if (cond.answerKeys?.length) return cond.answerKeys.some((k: string) => keys.includes(k));
    return (
      keys.length > 0 ||
      (parentSel?.numericValue !== undefined && parentSel.numericValue > 0) ||
      (parentSel?.textValue !== undefined && parentSel.textValue.trim() !== "")
    );
  }

  return true;
}

// ─── Pages Calculation & Configuration ────────────────────────────────────────

export interface WebsitePageTierConfig {
  tierKey: "starter" | "standard" | "premium";
  tierName: string;
  limit: number;
  extraPageCost: number;
}

export function isWebsitePagesQuestion(question: any): boolean {
  if (!question) return false;
  if (question.key === "WEB_PAGES") return true;
  if (question.roleId === 3 || question.role === "DEPENDENT_NUMERIC") return true;
  if (
    question.config?.limitSource === "WEB_TIER" ||
    question.config?.rateSource === "WEB_TIER" ||
    question.config?.limitKey === "limit" ||
    question.config?.rateKey === "extraPageCost"
  ) {
    return true;
  }
  return /how many pages/i.test(question.text || "");
}

/**
 * Returns tier page limits and extra page rates:
 * - Starter Tier includes up to 10 custom pages, extra page cost = $150
 * - Standard Tier includes up to 15 custom pages, extra page cost = $200
 * - Premium Tier includes up to 20 custom pages, extra page cost = $250
 */
export function getWebsitePageTierConfig(
  tier: string,
  tierQuestion?: any
): WebsitePageTierConfig {
  const norm = (tier || "starter").toLowerCase();

  let tierKey: "starter" | "standard" | "premium" = "starter";
  let tierName = "Starter Tier";
  let limit = 10;
  let extraPageCost = 150;

  if (norm.includes("premium")) {
    tierKey = "premium";
    tierName = "Premium Tier";
    limit = 20;
    extraPageCost = 250;
  } else if (norm.includes("standard")) {
    tierKey = "standard";
    tierName = "Standard Tier";
    limit = 15;
    extraPageCost = 200;
  } else {
    tierKey = "starter";
    tierName = "Starter Tier";
    limit = 10;
    extraPageCost = 150;
  }

  // If tier question answers have metadata overrides (e.g. from CMS), use them
  if (tierQuestion?.answers && Array.isArray(tierQuestion.answers)) {
    const matched = tierQuestion.answers.find((a: any) => {
      const aTier = (a.metadata?.tierKey || a.visibleIf?.tier || "").toLowerCase();
      if (aTier === tierKey) return true;
      const text = (a.text || "").toLowerCase();
      const key = (a.key || "").toLowerCase();
      return text.includes(tierKey) || key.includes(tierKey);
    });

    if (matched?.metadata) {
      if (typeof matched.metadata.limit === "number" && matched.metadata.limit > 0) {
        limit = matched.metadata.limit;
      }
      if (typeof matched.metadata.extraPageCost === "number" && matched.metadata.extraPageCost > 0) {
        extraPageCost = matched.metadata.extraPageCost;
      }
    }
  }

  return { tierKey, tierName, limit, extraPageCost };
}

/**
 * Extra pages formula:
 * Extra pages = User input – Tier maximum (applied only if user enters more pages than tier limit)
 * Cost per extra page = $150 (Starter) | $200 (Standard) | $250 (Premium)
 * Extra cost = Extra pages × Cost per extra page
 */
export function calculateWebsiteExtraPages(
  userPages: number,
  tier: string,
  tierQuestion?: any
) {
  const config = getWebsitePageTierConfig(tier, tierQuestion);
  const pages = Math.max(0, Number(userPages) || 0);
  const extraPages = Math.max(0, pages - config.limit);
  const extraCost = extraPages * config.extraPageCost;
  const isOverLimit = pages > config.limit;

  return {
    ...config,
    pages,
    extraPages,
    extraCost,
    isOverLimit,
  };
}
