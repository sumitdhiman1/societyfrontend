import { CalculatorQuestion, CalculatorSelection } from "./priceCalculatorService";

type TierScopedAnswer = {
  key?: string;
  visibleIf?: { tier?: string };
  metadata?: { tierKey?: string; tier?: string };
};

export function getAnswerTierScope(answer: TierScopedAnswer): string | undefined {
  return answer.visibleIf?.tier ?? answer.metadata?.tierKey ?? answer.metadata?.tier;
}

export function findQuestionByRoleId(
  questions: CalculatorQuestion[],
  roleId: number
): CalculatorQuestion | undefined {
  return questions.find((q) => q.roleId === roleId);
}

export function findTimelineQuestionKey(questions: CalculatorQuestion[]): string | undefined {
  const known = questions.find((q) =>
    ["WEB_TIMELINE", "GFX_TIMELINE", "SEO_TIMELINE"].includes(q.key || "")
  );
  if (known?.key) return known.key;
  return questions.find((q) => q.roleId === 13 || q.roleId === 14)?.key;
}

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

export const MAIN_CALCULATOR_CATEGORIES: Record<string, string> = {
  website: "A New Website",
  graphics: "Graphic Designs",
  seo: "Search Engine Optimization",
  marketing: "A Marketing Campaign",
};

export function getMainCalculatorCategory(categoryKey?: string, categoryName?: string): string {
  const normKey = (categoryKey || "").toLowerCase().trim();

  if (categoryName?.trim()) {
    const normName = categoryName.trim().toLowerCase();
    if (normName === "a new website" || normName === "website") return "A New Website";
    if (normName === "graphic designs" || normName === "graphics") return "Graphic Designs";
    if (normName === "search engine optimization" || normName === "seo") return "Search Engine Optimization";
    if (normName === "a marketing campaign" || normName === "marketing") return "A Marketing Campaign";

    if (!normName.includes("custom website development") && !normName.includes("project")) {
      return categoryName.trim();
    }
  }

  if (normKey.includes("web")) return "A New Website";
  if (normKey.includes("graph")) return "Graphic Designs";
  if (normKey.includes("seo")) return "Search Engine Optimization";
  if (normKey.includes("market")) return "A Marketing Campaign";

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
  seo: "2 weeks",
  marketing: "Monthly Service",
};

export function getDefaultCategoryTimeline(categoryKey: string, categoryTimeline?: string): string {
  if (categoryTimeline?.trim()) return categoryTimeline.trim();
  return DEFAULT_CATEGORY_TIMELINES[categoryKey] || "2 weeks";
}

function isTimelineWithRushFees(
  categoryKey?: string,
  questionKey?: string,
  roleId?: number
): boolean {
  if (
    questionKey === "GFX_TIMELINE" ||
    questionKey === "SEO_TIMELINE" ||
    questionKey === "GD_TIMELINE"
  ) {
    return true;
  }
  if (categoryKey === "graphics" && (roleId === 13 || roleId === 14)) return true;
  if (categoryKey === "seo" && roleId === 13) return true;
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

/** Strip rush-fee suffix from timeline labels except graphics/SEO (live may use numeric keys). */
export function formatCalculatorAnswerLabel(
  text: string,
  questionKey?: string,
  options?: { categoryKey?: string; roleId?: number; metadata?: { fee?: number } }
): string {
  const { categoryKey, roleId, metadata } = options ?? {};

  if (isTimelineWithRushFees(categoryKey, questionKey, roleId)) {
    let label = appendRushFeeLabel(text, metadata?.fee);
    if (!/\+\d+% rush fee/i.test(label) && !/no extra fee/i.test(label)) {
      if (/super rushed/i.test(label)) label = appendRushFeeLabel(label, 0.5);
      else if (/\(rushed\)/i.test(label)) label = appendRushFeeLabel(label, 0.25);
    }
    return label;
  }

  return text.replace(/:\s*\+\d+% rush fee/i, "").trim();
}

/** Append (Optional) for optional text/number on marketing, SEO, and graphics. */
export function formatCalculatorQuestionText(
  text: string,
  isRequired?: boolean,
  questionType?: string,
  categoryKey?: string
): string {
  const trimmed = text.replace(/\s*\(Optional\)/gi, "").trim();
  const supportsOptionalLabel = questionType === "text" || questionType === "number";
  const showOptional =
    categoryKey === "marketing" || categoryKey === "seo" || categoryKey === "graphics";
  if (showOptional && supportsOptionalLabel && isRequired !== true) {
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
  // Convert to target currency first, then round to nearest 5 for display
  const inCurrency = currency === "eur" ? amountUsd / conversionRate : amountUsd;
  return roundCalculatorPrice(inCurrency, categoryKey);
}

/** Exact payable amount in display currency (2dp) for payment form — live parity. */
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
  categoryKey?: string
): string {
  const normalizedCurrency = currency.toUpperCase();
  // Always round to nearest 5 for display (both USD and EUR)
  const rounded = roundCalculatorPrice(amountInCurrency, categoryKey);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: normalizedCurrency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rounded);
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
