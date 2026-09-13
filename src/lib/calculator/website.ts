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
