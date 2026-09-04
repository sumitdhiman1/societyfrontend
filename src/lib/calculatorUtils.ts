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
  if (!categoryKeys.length) return [];
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
  return Object.values(selections).filter(
    (s) =>
      (s.answerKeys && s.answerKeys.length > 0) ||
      s.numericValue !== undefined ||
      (s.textValue !== undefined && s.textValue !== "")
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

export function isQuestionVisible(
  question: { conditionalOn?: ConditionalOn },
  selections: Record<string, CalculatorSelection>
): boolean {
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
