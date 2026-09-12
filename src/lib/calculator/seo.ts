/**
 * calculator/seo.ts
 *
 * All logic specific to the "Search Engine Optimization" calculator category.
 * Edit THIS FILE when you need to change SEO calculator behaviour.
 * No other category logic lives here.
 */

import { CalculatorSelection } from "../priceCalculatorService";
import { isWebsiteCategoryOrQuestion } from "./website";

// ─── Constants ────────────────────────────────────────────────────────────────

export const SEO_MONTHS_MAX = 20000;

// ─── Question Helpers ─────────────────────────────────────────────────────────

export function isSeoMonthsQuestion(question: { key?: string; roleId?: number }): boolean {
  return question.key === "SEO_MONTHS" || question.roleId === 15;
}

export function getNumberQuestionMax(question: {
  key?: string;
  roleId?: number;
  config?: { maxValue?: number };
}): number | undefined {
  if (question.config?.maxValue != null) return question.config.maxValue;
  if (isSeoMonthsQuestion(question)) return SEO_MONTHS_MAX;
  return undefined;
}

export function getNumberQuestionMin(question: {
  config?: { minValue?: number };
}): number {
  return question.config?.minValue ?? 0;
}

// ─── Service Type Resolution ──────────────────────────────────────────────────

function findSeoServiceTypeQuestion(questions?: any[]) {
  return questions?.find(
    (q) =>
      !isWebsiteCategoryOrQuestion(q, undefined, questions) &&
      (["SEO_TYPE", "SEO_SERVICE_TYPE", "0"].includes(q.key || "") ||
        /what type of seo/i.test(q.text || "") ||
        (q.answers || []).some((a: any) => a?.metadata?.serviceMode))
  );
}

function findSeoServiceTypeSelection(
  selections: Record<string, CalculatorSelection>,
  questions?: any[]
): CalculatorSelection | undefined {
  const typeQ = findSeoServiceTypeQuestion(questions);
  if (typeQ?.key && selections[typeQ.key]) {
    return selections[typeQ.key];
  }
  if (questions?.length) {
    for (const [selKey, sel] of Object.entries(selections)) {
      if (!sel?.answerKeys?.length) continue;
      const q = questions.find((qq) => qq.key === selKey);
      if (!q) continue;
      for (const ak of sel.answerKeys) {
        const ans = q.answers?.find((a: any) => a.key === ak);
        if (ans?.metadata?.serviceMode) return sel;
      }
    }
  }
  return selections.SEO_SERVICE_TYPE || selections.SEO_TYPE || selections["0"];
}

function hasSeoTypeSelected(
  selections: Record<string, CalculatorSelection>,
  questions?: any[]
): boolean {
  return !!findSeoServiceTypeSelection(selections, questions)?.answerKeys?.length;
}

export function getSeoServiceMode(
  selections: Record<string, CalculatorSelection>,
  questions?: any[]
): "onetime" | "monthly" | "combination" {
  const sel = findSeoServiceTypeSelection(selections, questions);
  const key = sel?.answerKeys?.[0];

  if (!key) return "onetime";

  if (questions?.length) {
    const typeQ = findSeoServiceTypeQuestion(questions);
    const ans = typeQ?.answers?.find((a: any) => a.key === key);
    const serviceMode = ans?.metadata?.serviceMode;
    if (
      serviceMode === "monthly" ||
      serviceMode === "onetime" ||
      serviceMode === "combination"
    ) {
      return serviceMode;
    }
  }

  const answerText = (sel as any)?.answerTexts?.[0] || "";
  if (
    key === "SEO_TYPE_MONTHLY" ||
    key.toLowerCase().includes("monthly") ||
    /monthly/i.test(answerText)
  ) {
    return "monthly";
  }
  if (
    key === "SEO_TYPE_COMBO" ||
    key.toLowerCase().includes("combo") ||
    /combo/i.test(answerText)
  ) {
    return "combination";
  }
  if (key === "SEO_TYPE_ONETIME" || /one-?time/i.test(answerText)) {
    return "onetime";
  }
  return "onetime";
}

// ─── SEO Mode Helpers ─────────────────────────────────────────────────────────

export function seoModeNeedsTimeline(mode: string): boolean {
  return mode === "onetime" || mode === "combination";
}

export function seoModeNeedsMonths(mode: string): boolean {
  return mode === "monthly" || mode === "combination";
}

// ─── Answer Filtering ─────────────────────────────────────────────────────────

export function filterSeoAnswers(answers: any[], mode: string) {
  if (!answers || !answers.length) return [];
  return answers.filter((a) => {
    const meta = a.metadata;
    if (meta?.type) {
      return meta.type === mode || meta.type === "both" || meta.type === "combination";
    }
    const types = meta?.serviceTypes as string[] | undefined;
    if (types?.length) {
      return types.includes(mode);
    }
    const key = a.key || "";
    const isMonthlyKey =
      key.includes("LOCAL") ||
      key.includes("CONTENT_MONTHLY") ||
      key.includes("NATIONAL") ||
      key.includes("LINK_MONTHLY") ||
      key.includes("INTL") ||
      key.includes("REPORT");
    if (mode === "monthly") return isMonthlyKey;
    return !isMonthlyKey;
  });
}

// ─── Timeline Calculation ─────────────────────────────────────────────────────

function isSeoOnetimeTimedItem(ans: any): boolean {
  const meta = ans?.metadata;
  if (meta?.type === "monthly") return false;
  if (meta?.type === "onetime") return true;
  const key = ans?.key || "";
  const isMonthlyKey =
    key.includes("LOCAL") ||
    key.includes("CONTENT_MONTHLY") ||
    key.includes("NATIONAL") ||
    key.includes("LINK_MONTHLY") ||
    key.includes("INTL") ||
    key.includes("REPORT");
  return !isMonthlyKey;
}

function collectSeoItemKeys(
  itemsQuestion: any,
  selections: Record<string, CalculatorSelection>
): string[] {
  const itemsKey = itemsQuestion?.key;
  if (itemsKey && selections[itemsKey]?.answerKeys?.length) {
    return selections[itemsKey].answerKeys;
  }
  if (selections.SEO_ITEMS?.answerKeys?.length) {
    return selections.SEO_ITEMS.answerKeys;
  }
  if (selections["2"]?.answerKeys?.length) {
    return selections["2"].answerKeys;
  }
  for (const [k, sel] of Object.entries(selections)) {
    if ((k === "SEO_ITEMS" || k === "2") && sel.answerKeys?.length) {
      return sel.answerKeys;
    }
  }
  return [];
}

/** Raw per-heading sum for one-time SEO items only (no snap). */
export function calculateSeoRawTimelineDays(
  itemsQuestion: any,
  selections: Record<string, CalculatorSelection>,
  tier = "starter"
): number {
  const itemKeys = collectSeoItemKeys(itemsQuestion, selections);
  if (!itemKeys.length || !itemsQuestion) return 0;

  const normTier = (tier || "starter").toLowerCase();
  const answersMap = new Map<string, any>();
  (itemsQuestion?.answers || []).forEach((a: any) => answersMap.set(a.key, a));

  const headingsTimeline: Record<string, number> = {};
  itemKeys.forEach((key) => {
    const ans = answersMap.get(key);
    if (!ans || !isSeoOnetimeTimedItem(ans)) return;

    const heading = ans.metadata?.heading || "General";
    const tierMeta =
      ans.metadata?.[normTier] ||
      ans.metadata?.starter ||
      ans.metadata?.standard ||
      ans.metadata?.premium;

    let days = 0;
    if (tierMeta && typeof tierMeta === "object" && typeof tierMeta.t === "number") {
      days = tierMeta.t;
    }
    if (days <= 0) return;

    if (!headingsTimeline[heading] || days > headingsTimeline[heading]) {
      headingsTimeline[heading] = days;
    }
  });

  return Object.values(headingsTimeline).reduce((sum, d) => sum + d, 0);
}

// ─── Visibility ───────────────────────────────────────────────────────────────

/**
 * Handles question visibility for the "SEO" category.
 *
 * Returns:
 *   - true/false  → definitive answer for this question
 *   - null        → not an SEO-specific visibility rule; caller should continue
 */
export function getSeoQuestionVisibility(
  question: any,
  selections: Record<string, CalculatorSelection>,
  questions?: any[],
  categoryKey?: string | null
): boolean | null {
  const isSeoContext =
    categoryKey === "seo" ||
    String(question.key || "").startsWith("SEO_") ||
    question.roleId === 15;

  if (!isSeoContext) return null;

  if (question.key === "SEO_ITEMS") {
    return hasSeoTypeSelected(selections, questions);
  }
  if (question.key === "SEO_WORDS") {
    const items = selections.SEO_ITEMS?.answerKeys || selections["2"]?.answerKeys || [];
    return items.includes("SEO_ITEM_CONTENT_TEXT") || items.includes("SEO_ITEM_CONTENT") || items.includes("5");
  }
  if (question.key === "SEO_BACKLINKS") {
    const items = selections.SEO_ITEMS?.answerKeys || selections["2"]?.answerKeys || [];
    return items.includes("SEO_ITEM_LINK_BACK") || items.includes("SEO_ITEM_BACKLINKS") || items.includes("8");
  }
  if (question.key === "SEO_MONTHS" || question.roleId === 15) {
    if (!findSeoServiceTypeQuestion(questions)) return true;
    return (
      hasSeoTypeSelected(selections, questions) &&
      seoModeNeedsMonths(getSeoServiceMode(selections, questions))
    );
  }
  // SEO_TIMELINE visibility is handled in shared.ts alongside isTimelineQuestion check
  if (question.key === "SEO_TIMELINE") {
    return (
      hasSeoTypeSelected(selections, questions) &&
      seoModeNeedsTimeline(getSeoServiceMode(selections, questions))
    );
  }

  return null; // no specific rule matched — fall through to generic handling
}
