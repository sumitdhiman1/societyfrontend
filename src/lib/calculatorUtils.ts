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
  selections: Record<string, CalculatorSelection>
): boolean {
  const timelineKey = findTimelineQuestionKey(questions);
  if (!timelineKey) return true;
  const timelineQ = questions.find((q) => q.key === timelineKey || isTimelineQuestion(q));
  if (!timelineQ || !isQuestionVisible(timelineQ, selections, questions)) return true;

  const sel = selections[timelineKey] || selections[timelineQ.key];
  if (!sel) return false;
  if (sel.answerKeys && sel.answerKeys.length > 0) return true;
  if (sel.numericValue !== undefined && sel.numericValue > 0) return true;
  if (sel.textValue && sel.textValue.trim() !== "") return true;
  return false;
}

export function getMissingRequiredQuestions(
  questions: any[],
  selections: Record<string, CalculatorSelection>
): any[] {
  return questions.filter((q) => {
    if (!isQuestionVisible(q, selections, questions)) return false;
    const isRequired = q.isRequired || isTimelineQuestion(q) || q.roleId === 1 || q.roleId === 2;
    if (!isRequired) return false;

    if (q.type === "number") {
      const minVal = q.config?.minValue ?? 0;
      const sel = selections[q.key];
      const val = sel?.numericValue ?? 0;
      return val < minVal;
    }

    const sel = selections[q.key];
    if (!sel) return true;
    if (q.type === "text") return !sel.textValue || sel.textValue.trim() === "";
    return !sel.answerKeys || sel.answerKeys.length === 0;
  });
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

export function isGraphicsItemsQuestion(question: any): boolean {
  if (!question) return false;
  return (
    question.key === "GFX_ITEMS" ||
    question.key === "GD_ITEMS" ||
    question.roleId === 7 ||
    /specific items/i.test(question.text || "") ||
    /include in this project/i.test(question.text || "")
  );
}

export function getGraphicsCategoryKeys(
  selections: Record<string, CalculatorSelection>,
  questions?: any[]
): string[] {
  const result: string[] = [];

  const addKeys = (keys?: string[], q?: any) => {
    if (!keys || !keys.length) return;
    keys.forEach((k) => {
      result.push(k);
      if (q?.answers) {
        const ans = q.answers.find((a: any) => a.key === k);
        if (ans) {
          if (ans.text) result.push(ans.text);
          if (ans.metadata?.filterGroup) result.push(ans.metadata.filterGroup);
          if (ans.metadata?.category) result.push(ans.metadata.category);
        }
      }
    });
  };

  if (selections.GFX_CATEGORIES?.answerKeys?.length) {
    const q = questions?.find((x) => x.key === "GFX_CATEGORIES");
    addKeys(selections.GFX_CATEGORIES.answerKeys, q);
  }
  if (selections.GD_CATEGORIES?.answerKeys?.length) {
    const q = questions?.find((x) => x.key === "GD_CATEGORIES");
    addKeys(selections.GD_CATEGORIES.answerKeys, q);
  }
  if (questions?.length) {
    const q1 = questions.find(
      (q) =>
        q.order === 1 ||
        q.key === "GFX_CATEGORIES" ||
        q.key === "GD_CATEGORIES" ||
        /graphic design or branding work/i.test(q.text || "")
    );
    if (q1?.key && selections[q1.key]?.answerKeys?.length) {
      addKeys(selections[q1.key].answerKeys, q1);
    }
  }
  for (const [qKey, sel] of Object.entries(selections)) {
    if (sel.answerKeys?.some((k) => k.startsWith("GFX_CAT_") || k.startsWith("GD_CAT_"))) {
      const q = questions?.find((x) => x.key === qKey);
      addKeys(sel.answerKeys, q);
    }
  }

  return [...new Set(result)];
}

export type GraphicsCategoryType =
  | "logo"
  | "brand_id"
  | "collateral"
  | "social"
  | "newsletter"
  | "infographic"
  | "illustration"
  | "presentation"
  | "unknown";

export function getGraphicsItemCategory(answer: {
  key?: string;
  text?: string;
  metadata?: { filterGroup?: string; category?: string; heading?: string };
}): GraphicsCategoryType {
  const fg = (answer.metadata?.filterGroup || answer.metadata?.category || "").toLowerCase();
  const heading = (answer.metadata?.heading || "").toLowerCase();
  const key = (answer.key || "").toLowerCase();

  // 1. Collateral & Print Materials (check before brand_id so "Brand Collateral" is not matched as brand_id)
  if (
    fg === "gfx_cat_collateral" ||
    fg === "gd_cat_collateral" ||
    fg.includes("collat") ||
    heading.includes("collateral") ||
    heading.includes("print material") ||
    key.startsWith("gfx_col") ||
    key.startsWith("gd_col")
  ) {
    return "collateral";
  }

  // 2. Full Brand Identity Package
  if (
    fg === "gfx_cat_brand_id" ||
    fg === "gd_cat_brand_id" ||
    fg.includes("brand_id") ||
    heading.includes("brand identity") ||
    heading.includes("identity package") ||
    heading === "full brand identity package" ||
    key.startsWith("gfx_brand") ||
    key.startsWith("gd_brand")
  ) {
    return "brand_id";
  }

  // 3. Logo Design
  if (
    fg === "gfx_cat_logo" ||
    fg === "gd_cat_logo" ||
    heading.includes("logo") ||
    key.startsWith("gfx_logo") ||
    key.startsWith("gd_logo")
  ) {
    return "logo";
  }

  // 4. Social Media
  if (
    fg === "gfx_cat_social" ||
    fg === "gd_cat_social" ||
    heading.includes("social") ||
    key.startsWith("gfx_soc") ||
    key.startsWith("gd_soc")
  ) {
    return "social";
  }

  // 5. Newsletter
  if (
    fg === "gfx_cat_newsletter" ||
    fg === "gd_cat_newsletter" ||
    heading.includes("newsletter") ||
    heading.includes("email") ||
    key.startsWith("gfx_news") ||
    key.startsWith("gd_news")
  ) {
    return "newsletter";
  }

  // 6. Infographics
  if (
    fg === "gfx_cat_infographic" ||
    fg === "gd_cat_infographic" ||
    heading.includes("infographic") ||
    heading.includes("data viz") ||
    key.startsWith("gfx_info") ||
    key.startsWith("gd_info")
  ) {
    return "infographic";
  }

  // 7. Custom Illustrations & Icons
  if (
    fg === "gfx_cat_illustration" ||
    fg === "gd_cat_illustration" ||
    heading.includes("illustration") ||
    heading.includes("icon") ||
    key.startsWith("gfx_illu") ||
    key === "gfx_illustration" ||
    key.startsWith("gd_illu")
  ) {
    return "illustration";
  }

  // 8. Presentation
  if (
    fg === "gfx_cat_presentation" ||
    fg === "gd_cat_presentation" ||
    heading.includes("presentation") ||
    heading.includes("pitch") ||
    heading.includes("deck") ||
    key.startsWith("gfx_pres") ||
    key.startsWith("gd_pres")
  ) {
    return "presentation";
  }

  return "unknown";
}

export function isGraphicsCategorySelected(
  cat: GraphicsCategoryType,
  categoryKeys: string[]
): boolean {
  if (!categoryKeys || categoryKeys.length === 0) return false;
  const selLower = categoryKeys.map((k) => k.toLowerCase());
  const selSet = new Set(selLower);

  switch (cat) {
    case "logo":
      return (
        selSet.has("gfx_cat_logo") ||
        selSet.has("gd_cat_logo") ||
        selLower.some((k) => k.includes("logo"))
      );
    case "brand_id":
      return (
        selSet.has("gfx_cat_brand_id") ||
        selSet.has("gd_cat_brand_id") ||
        selLower.some(
          (k) =>
            k.includes("brand_id") ||
            k.includes("brand id") ||
            k.includes("identity") ||
            (k.includes("brand") && !k.includes("collat") && !k.includes("print"))
        )
      );
    case "collateral":
      return (
        selSet.has("gfx_cat_collateral") ||
        selSet.has("gd_cat_collateral") ||
        selLower.some((k) => k.includes("collat") || k.includes("print"))
      );
    case "social":
      return (
        selSet.has("gfx_cat_social") ||
        selSet.has("gd_cat_social") ||
        selLower.some((k) => k.includes("social"))
      );
    case "newsletter":
      return (
        selSet.has("gfx_cat_newsletter") ||
        selSet.has("gd_cat_newsletter") ||
        selLower.some((k) => k.includes("news") || k.includes("email"))
      );
    case "infographic":
      return (
        selSet.has("gfx_cat_infographic") ||
        selSet.has("gd_cat_infographic") ||
        selLower.some((k) => k.includes("info") || k.includes("data"))
      );
    case "illustration":
      return (
        selSet.has("gfx_cat_illustration") ||
        selSet.has("gd_cat_illustration") ||
        selLower.some((k) => k.includes("illustr") || k.includes("icon"))
      );
    case "presentation":
      return (
        selSet.has("gfx_cat_presentation") ||
        selSet.has("gd_cat_presentation") ||
        selLower.some((k) => k.includes("pres") || k.includes("pitch") || k.includes("deck"))
      );
    default:
      return false;
  }
}

export function isGraphicsItemVisible(
  answer: { key?: string; text?: string; metadata?: { filterGroup?: string; category?: string; heading?: string } },
  categoryKeys: string[]
): boolean {
  if (!categoryKeys || categoryKeys.length === 0) return false;

  const fg = (answer.metadata?.filterGroup || answer.metadata?.category || "").toLowerCase();
  const selLower = categoryKeys.map((k) => k.toLowerCase());
  const selSet = new Set(selLower);

  // Direct exact match with filterGroup if present in categoryKeys
  if (fg && (selSet.has(fg) || selLower.includes(fg))) {
    return true;
  }

  const itemCat = getGraphicsItemCategory(answer);
  if (itemCat === "unknown") {
    return fg ? selSet.has(fg) || selLower.includes(fg) : false;
  }

  // Special requirement: If "Full Brand Identity Package" is selected, also show "Logo Design" items
  if (itemCat === "logo") {
    return isGraphicsCategorySelected("logo", categoryKeys) || isGraphicsCategorySelected("brand_id", categoryKeys);
  }

  return isGraphicsCategorySelected(itemCat, categoryKeys);
}

export function filterGraphicsAnswers(answers: any[], categoryKeys: string[]) {
  if (!categoryKeys || !categoryKeys.length) return [];
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

/** Snap raw per-heading sum to spec sensible values (matches backend). */
export function snapGraphicsBaselineDays(days: number): number {
  if (days <= 3) return 3;
  if (days <= 7) return 7;
  if (days <= 10) return 10;
  if (days <= 14) return 14;
  if (days <= 21) return 21;
  if (days <= 28) return 28;
  return Math.ceil(days / 7) * 7;
}

export type GraphicsRushType = "normal" | "rushed" | "super";

/** Apply rush on raw heading-sum, then snap (live parity). */
export function applyGraphicsRushDays(rawDays: number, rushType: GraphicsRushType): number {
  if (rushType === "normal") return snapGraphicsBaselineDays(rawDays);
  const reduction = rushType === "super" ? 0.75 : 0.5;
  const rushed = Math.max(1, Math.ceil(rawDays * (1 - reduction)));
  return snapGraphicsBaselineDays(rushed);
}

/** Discrete graphics timeline labels per product spec. */
export function formatGraphicsTimelineLabel(days: number): string {
  if (days <= 4) return "3 days";
  if (days <= 7) return "1 week";
  if (days <= 10) return "10 days";
  if (days <= 14) return "2 weeks";
  if (days <= 21) return "3 weeks";
  if (days <= 28) return "4 weeks";
  return `${Math.ceil(days / 7)} weeks`;
}

export function getGraphicsRushTypeFromMetadata(
  metadata?: { fee?: number; reduction?: number },
  text?: string
): GraphicsRushType {
  const isSuper =
    metadata?.fee === 0.5 ||
    metadata?.reduction === 0.75 ||
    /super\s*rushed/i.test(text || "") ||
    /50%/i.test(text || "");
  if (isSuper) return "super";
  const isRush =
    metadata?.fee === 0.25 ||
    metadata?.reduction === 0.5 ||
    /\(rushed\)/i.test(text || "") ||
    /25%/i.test(text || "");
  if (isRush) return "rushed";
  return "normal";
}

export function formatGraphicsTimelineOptionLabel(
  rawDays: number,
  rushType: GraphicsRushType
): string {
  const days = applyGraphicsRushDays(rawDays, rushType);
  const durationStr = formatGraphicsTimelineLabel(days);
  if (rushType === "super") return `${durationStr} (Super Rushed): +50% rush fee`;
  if (rushType === "rushed") return `${durationStr} (Rushed): +25% rush fee`;
  return `${durationStr} (Normal): No extra fee`;
}

/** Resolve graphics timeline label from answer key/text for PDF and proposals. */
export function resolveGraphicsTimelineAnswer(
  raw: string,
  options?: {
    directTimeline?: string;
    baselineDays?: number;
    metadata?: { fee?: number; reduction?: number };
  }
): string {
  if (!raw) return options?.directTimeline || "";
  const lower = raw.toLowerCase().trim();

  const isGfxTimelineKey =
    lower.startsWith("gfx_time") ||
    lower.startsWith("gd_time") ||
    lower.startsWith("gfx_timeline");

  if (!isGfxTimelineKey && !/super\s*rushed|rushed|normal/i.test(raw)) {
    return raw;
  }

  if (options?.directTimeline && !isGfxTimelineKey) {
    return options.directTimeline;
  }

  const baseline = options?.baselineDays && options.baselineDays > 0 ? options.baselineDays : 14;
  const rushType = getGraphicsRushTypeFromMetadata(options?.metadata, raw);
  if (isGfxTimelineKey || options?.metadata?.fee != null || options?.metadata?.reduction != null) {
    return formatGraphicsTimelineOptionLabel(baseline, rushType);
  }

  return options?.directTimeline || raw;
}

function collectGraphicsItemKeys(
  itemsQuestion: any,
  selections: Record<string, CalculatorSelection>
): string[] {
  const itemsKey = itemsQuestion?.key;
  if (itemsKey && selections[itemsKey]?.answerKeys?.length) {
    return selections[itemsKey].answerKeys;
  }
  if (selections.GFX_ITEMS?.answerKeys?.length) {
    return selections.GFX_ITEMS.answerKeys;
  }
  if (selections.GD_ITEMS?.answerKeys?.length) {
    return selections.GD_ITEMS.answerKeys;
  }
  for (const [k, sel] of Object.entries(selections)) {
    if (
      (k === "GFX_ITEMS" || k === "GD_ITEMS" || isGraphicsItemsQuestion({ key: k })) &&
      sel.answerKeys?.length
    ) {
      return sel.answerKeys;
    }
  }
  return [];
}

function sumGraphicsHeadingTimelineDays(
  itemKeys: string[],
  itemsQuestion: any,
  tier: string
): number {
  if (!itemKeys.length) return 0;

  const normTier = (tier || "starter").toLowerCase();
  const answersMap = new Map<string, any>();
  (itemsQuestion?.answers || []).forEach((a: any) => answersMap.set(a.key, a));

  const headingsTimeline: Record<string, number> = {};
  itemKeys.forEach((key) => {
    const ans = answersMap.get(key);
    if (!ans) return;
    const heading = ans.metadata?.heading || ans.metadata?.filterGroup || "General";
    const tierMeta =
      ans.metadata?.[normTier] ||
      ans.metadata?.starter ||
      ans.metadata?.standard ||
      ans.metadata?.premium;

    let days = 0;
    if (tierMeta && typeof tierMeta === "object" && typeof tierMeta.t === "number") {
      days = tierMeta.t;
    } else if (typeof ans.metadata?.days === "number") {
      days = ans.metadata.days;
    } else if (typeof ans.metadata?.t === "number") {
      days = ans.metadata.t;
    }

    if (!headingsTimeline[heading] || days > headingsTimeline[heading]) {
      headingsTimeline[heading] = days;
    }
  });

  return Object.values(headingsTimeline).reduce((sum, d) => sum + d, 0);
}

/** Raw per-heading sum before sensible snap (for rush Q4 labels). */
export function calculateGraphicsRawTimelineDays(
  itemsQuestion: any,
  selections: Record<string, CalculatorSelection>,
  tier = "starter"
): number {
  const itemKeys = collectGraphicsItemKeys(itemsQuestion, selections);
  const total = sumGraphicsHeadingTimelineDays(itemKeys, itemsQuestion, tier);
  return total > 0 ? total : 14;
}

/** Snapped normal baseline from raw heading-sum. */
export function calculateGraphicsBaselineTimelineDays(
  itemsQuestion: any,
  selections: Record<string, CalculatorSelection>,
  tier = "starter"
): number {
  return snapGraphicsBaselineDays(calculateGraphicsRawTimelineDays(itemsQuestion, selections, tier));
}

export function formatDaysToTimelineLabel(days: number): string {
  if (days <= 2) return "24 - 48 hours";
  if (days <= 3.5) return "3 - 4 days";
  if (days <= 5) return "3 - 5 business days";
  if (days <= 7) return "1 week";
  if (days <= 10) return "7 - 10 business days";
  if (days <= 14) return "2 weeks";
  if (days <= 21) return "3 weeks";
  if (days <= 28) return "4 weeks";
  if (days <= 35) return "5 weeks";
  if (days <= 42) return "6 weeks";
  if (days <= 60) return "8 weeks";
  return `${Math.ceil(days / 7)} weeks`;
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
  question: { key?: string; roleId?: number; text?: string; order?: number; conditionalOn?: ConditionalOn },
  selections: Record<string, CalculatorSelection>,
  questions?: any[]
): boolean {
  if (isGraphicsItemsQuestion(question)) {
    const catKeys = getGraphicsCategoryKeys(selections, questions);
    return catKeys.length > 0;
  }
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
  return categoryKey === "marketing" || categoryKey === "seo";
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
  options?: {
    categoryKey?: string;
    roleId?: number;
    metadata?: { fee?: number; reduction?: number; days?: number };
    baselineDays?: number;
  }
): string {
  if (!text) return "";
  const { categoryKey, roleId, metadata, baselineDays } = options ?? {};

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

  if (isTimelineWithRushFees(categoryKey, questionKey, roleId)) {
    let label = appendRushFeeLabel(text, metadata?.fee);
    if (!/\+\d+% rush fee/i.test(label) && !/no extra fee/i.test(label)) {
      if (/super rushed/i.test(label)) label = appendRushFeeLabel(label, 0.5);
      else if (/\(rushed\)/i.test(label)) label = appendRushFeeLabel(label, 0.25);
    }
    return label;
  }

  return (text || "").replace(/:\s*\+\d+% rush fee/i, "").trim();
}

/** Append (Optional) for optional text/number on marketing, SEO, and graphics. */
export function formatCalculatorQuestionText(
  text?: string,
  isRequired?: boolean,
  questionType?: string,
  categoryKey?: string
): string {
  if (!text) return "";
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
  categoryKey?: string,
  fractionDigits = 2
): string {
  const normalizedCurrency = currency.toUpperCase();
  // Always round to nearest 5 for display (both USD and EUR)
  const rounded = roundCalculatorPrice(amountInCurrency, categoryKey);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: normalizedCurrency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(rounded);
}

export function pruneHiddenSelections(
  selections: Record<string, CalculatorSelection>,
  questions: { key: string; roleId?: number; text?: string; order?: number; conditionalOn?: ConditionalOn; answers?: any[] }[]
): Record<string, CalculatorSelection> {
  const next = { ...selections };
  for (const q of questions) {
    if (!isQuestionVisible(q, next, questions)) delete next[q.key];
  }

  // Prune any graphics items that are no longer visible under selected graphics categories
  const catKeys = getGraphicsCategoryKeys(next, questions);
  const gfxQ = questions.find((q) => isGraphicsItemsQuestion(q));
  if (gfxQ?.key && next[gfxQ.key]?.answerKeys) {
    if (!catKeys.length) {
      delete next[gfxQ.key];
    } else if (gfxQ.answers) {
      const allowedKeys = new Set(
        filterGraphicsAnswers(gfxQ.answers, catKeys).map((a: any) => a.key)
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

  return next;
}

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

  // 1. If project has an explicit deadline set, prioritize it
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

  // 3. If durationDays is 0, check if items have duration sum
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

  // 4. If no explicit duration found, check if it's a monthly subscription project (default 30 days)
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
