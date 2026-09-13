/**
 * calculator/marketing.ts
 *
 * All logic specific to the "Social Media Marketing" calculator category.
 * Edit THIS FILE when you need to change marketing calculator behaviour.
 * No other category logic lives here.
 */

import { CalculatorSelection } from "../priceCalculatorService";
import { isWebsiteCategoryOrQuestion } from "./website";

// ─── Constants ────────────────────────────────────────────────────────────────

const MARKETING_ORGANIC_FOCUS_KEYS = new Set([
  "MKT_ORGANIC_CONTENT",
  "MKT_COMMUNITY",
  "MKT_SHORT_VIDEO",
  "MKT_INFLUENCER",
  "MKT_CRISIS",
  "MC_AREA_ORG_CONT",
  "MC_AREA_COMM_MGMT",
  "MC_AREA_SHORT_VID",
  "MC_AREA_INF_MGMT",
  "MC_AREA_CRISIS",
  "0",
  "1",
  "2",
  "3",
  "4",
]);

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function findMarketingFocusQuestion(questions?: any[]) {
  return questions?.find(
    (q) =>
      q.key === "MKT_FOCUS" ||
      q.key === "MC_AREAS" ||
      q.key === "1" ||
      q.roleId === 8 ||
      /which areas do you want to focus/i.test(q.text || "")
  );
}

function getMarketingTargetCategory(
  question: any,
  categoryKey?: string | null,
  questions?: any[]
): "organic" | "paid" | null {
  if (isWebsiteCategoryOrQuestion(question, categoryKey, questions)) return null;

  const targetCategory = question?.config?.targetCategory;
  if (targetCategory === "organic" || targetCategory === "paid") return targetCategory;

  const key = String(question?.key || "");
  if (
    key === "MKT_ORGANIC_PLATFORMS" ||
    key === "MKT_POSTS_WEEK" ||
    key === "MC_PLAT_ORG" ||
    key === "MC_POSTS" ||
    key === "2" ||
    key === "3" ||
    question?.roleId === 9 ||
    question?.roleId === 10
  ) {
    return "organic";
  }
  if (
    key === "MKT_PAID_PLATFORMS" ||
    key === "MKT_AD_SPEND" ||
    key === "MC_PLAT_PAID" ||
    key === "MC_ADSPEND" ||
    key === "4" ||
    key === "5" ||
    question?.roleId === 11 ||
    question?.roleId === 12
  ) {
    return "paid";
  }
  return null;
}

function hasMarketingFocusSelection(
  selections: Record<string, CalculatorSelection>,
  questions?: any[]
): boolean {
  const focusQ = findMarketingFocusQuestion(questions);
  if (!focusQ?.key) return false;
  return (selections[focusQ.key]?.answerKeys?.length ?? 0) > 0;
}

function hasMarketingOrganicSelected(
  selections: Record<string, CalculatorSelection>,
  questions?: any[]
): boolean {
  const focusQ = findMarketingFocusQuestion(questions);
  if (!focusQ) return false;
  const selectedKeys = selections[focusQ.key]?.answerKeys || [];
  return selectedKeys.some((answerKey) => {
    if (MARKETING_ORGANIC_FOCUS_KEYS.has(answerKey)) return true;
    const answer = focusQ.answers?.find((a: any) => a.key === answerKey);
    const category = answer?.metadata?.category || answer?.metadata?.segment;
    return category === "organic";
  });
}

function hasMarketingPaidSelected(
  selections: Record<string, CalculatorSelection>,
  questions?: any[]
): boolean {
  const focusQ = findMarketingFocusQuestion(questions);
  if (!focusQ) return false;
  const selectedKeys = selections[focusQ.key]?.answerKeys || [];
  return selectedKeys.some((answerKey) => {
    if (answerKey === "MKT_PAID" || answerKey === "MC_AREA_PAID_ADS" || answerKey === "5") {
      return true;
    }
    const answer = focusQ.answers?.find((a: any) => a.key === answerKey);
    const category = answer?.metadata?.category || answer?.metadata?.segment;
    return category === "paid";
  });
}

// ─── Visibility ───────────────────────────────────────────────────────────────

/**
 * Handles question visibility for the "Social Media Marketing" category.
 *
 * Returns:
 *   - true/false  → definitive answer for this question
 *   - null        → not a marketing-specific question; caller should continue
 */
export function getMarketingQuestionVisibility(
  question: any,
  selections: Record<string, CalculatorSelection>,
  questions?: any[],
  categoryKey?: string | null
): boolean | null {
  if (isWebsiteCategoryOrQuestion(question, categoryKey, questions)) return null;

  const segment = getMarketingTargetCategory(question, categoryKey, questions);
  if (!segment) return null;

  if (segment === "organic") {
    return hasMarketingOrganicSelected(selections, questions);
  }

  // Paid platforms: default visible when focus not picked yet (local parity).
  if (!hasMarketingFocusSelection(selections, questions)) return true;
  return hasMarketingPaidSelected(selections, questions);
}
