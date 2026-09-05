import { CalculatorQuestion, CalculatorSelection } from "./priceCalculatorService";

export function getSelectedTier(
  selections: Record<string, CalculatorSelection>,
  tierQuestionKey = "WEB_TIER"
): string {
  const tierSel = selections[tierQuestionKey];
  if (!tierSel?.answerKeys?.[0]) return "starter";
  const key = tierSel.answerKeys[0];
  if (key.includes("PREMIUM")) return "premium";
  if (key.includes("STANDARD")) return "standard";
  return "starter";
}

export function getTierQuestionKey(categoryKey: string): string {
  if (categoryKey === "graphics") return "GFX_TIER";
  if (categoryKey === "seo") return "SEO_TIER";
  return "WEB_TIER";
}

export function getGraphicsCategoryKeys(
  selections: Record<string, CalculatorSelection>
): string[] {
  return selections.GFX_CATEGORIES?.answerKeys || [];
}

export function isGraphicsItemVisible(
  answer: { metadata?: { filterGroup?: string } },
  categoryKeys: string[]
): boolean {
  const group = answer.metadata?.filterGroup;
  if (!group) return true;
  const selected = new Set(categoryKeys);
  if (group === "GFX_CAT_LOGO") {
    return selected.has("GFX_CAT_LOGO") || selected.has("GFX_CAT_BRAND_ID");
  }
  return selected.has(group);
}

export function filterGraphicsAnswers(answers: any[], categoryKeys: string[]) {
  if (!categoryKeys.length) return answers;
  return answers.filter((a) => isGraphicsItemVisible(a, categoryKeys));
}

export function isAnswerVisible(
  answer: { visibleIf?: { tier?: string } },
  tier: string
): boolean {
  if (!answer.visibleIf?.tier) return true;
  return answer.visibleIf.tier === tier;
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
  return {
    ...question,
    answers: question.answers.filter((a) =>
      isAnswerVisible(a as { visibleIf?: { tier?: string } }, tier)
    ),
  };
}

export type ConditionalOn = {
  questionKey: string;
  answerKey?: string;
  answerKeys?: string[];
};

const SEO_ALWAYS_VISIBLE_KEYS = new Set([
  "SEO_WORDS",
  "SEO_BACKLINKS",
  "SEO_MONTHS",
  "SEO_TIMELINE",
]);

const MARKETING_ALWAYS_VISIBLE_KEYS = new Set([
  "MKT_PAID_PLATFORMS",
  "MKT_AD_SPEND",
]);

export function isQuestionVisible(
  question: { key?: string; conditionalOn?: ConditionalOn },
  selections: Record<string, CalculatorSelection>
): boolean {
  if (question.key && SEO_ALWAYS_VISIBLE_KEYS.has(question.key)) return true;
  if (question.key && MARKETING_ALWAYS_VISIBLE_KEYS.has(question.key)) return true;
  const cond = question.conditionalOn;
  if (!cond) return true;
  const dep = selections[cond.questionKey];
  const keys = dep?.answerKeys || [];
  if (cond.answerKey) return keys.includes(cond.answerKey);
  if (cond.answerKeys?.length) return cond.answerKeys.some((k) => keys.includes(k));
  return true;
}

export function getSeoServiceMode(
  selections: Record<string, CalculatorSelection>
): "onetime" | "monthly" | "combination" {
  const key = selections.SEO_SERVICE_TYPE?.answerKeys?.[0];
  if (key === "SEO_TYPE_MONTHLY") return "monthly";
  if (key === "SEO_TYPE_COMBO") return "combination";
  return "onetime";
}

export function filterSeoAnswers(answers: any[], mode: string) {
  return answers.filter((a) => {
    const types = a.metadata?.serviceTypes as string[] | undefined;
    if (!types?.length) return true;
    return types.includes(mode);
  });
}

export function isMonthlyBillingCategory(categoryKey: string | null): boolean {
  return categoryKey === "marketing";
}

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

export function getCategoryProposalName(categoryKey: string, categoryName?: string): string {
  if (categoryName?.trim()) return categoryName.trim();
  return categoryKey
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const DEFAULT_CATEGORY_TIMELINES: Record<string, string> = {
  website: "2 weeks",
  graphics: "2 weeks",
  seo: "2 weeks",
  marketing: "Monthly Service",
};

export function getDefaultCategoryTimeline(categoryKey: string, categoryTimeline?: string): string {
  if (categoryTimeline?.trim()) return categoryTimeline.trim();
  return DEFAULT_CATEGORY_TIMELINES[categoryKey] || "2 weeks";
}

/** Strip rush-fee suffix from timeline labels except graphics (live shows fees there). */
export function formatCalculatorAnswerLabel(text: string, questionKey?: string): string {
  if (questionKey === "GFX_TIMELINE" || questionKey === "SEO_TIMELINE") return text;
  return text.replace(/:\s*\+\d+% rush fee/i, "").trim();
}

/** Optional marker only on text questions; multi/single/number stay plain (live UI). */
export function formatCalculatorQuestionText(
  text: string,
  isRequired?: boolean,
  questionType?: string
): string {
  const trimmed = text.replace(/\s*\(Optional\)/gi, "").trim();
  if (questionType !== "text") {
    return trimmed;
  }
  if (isRequired === false && !/\(Optional\)/i.test(text)) {
    return `${trimmed} (Optional)`;
  }
  return trimmed;
}

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

/** Exact payable amount in display currency (2dp) for payment form — live parity. */
export function getCalculatorPayableAmount(
  amountUsd: number,
  currency: string,
  conversionRate = 1
): number {
  const inCurrency = currency === "eur" ? amountUsd / conversionRate : amountUsd;
  return Math.round(inCurrency * 100) / 100;
}

/** 50% deposit uses floor to cents (live: $787.95 → $393.97). */
export function getCalculatorHalfPayableAmount(payableTotal: number): number {
  return Math.floor((payableTotal / 2) * 100) / 100;
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
  categoryKey?: string
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(roundCalculatorPrice(amountInCurrency, categoryKey));
}

export function pruneHiddenSelections(
  selections: Record<string, CalculatorSelection>,
  questions: { key: string; conditionalOn?: ConditionalOn }[]
): Record<string, CalculatorSelection> {
  const next = { ...selections };
  for (const q of questions) {
    if (!isQuestionVisible(q, next)) delete next[q.key];
  }
  return next;
}
