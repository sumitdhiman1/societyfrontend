/**
 * calculator/graphics.ts
 *
 * All logic specific to the "Graphic Designs" calculator category.
 * Edit THIS FILE when you need to change graphics calculator behaviour.
 * No other category logic lives here.
 */

import { CalculatorSelection } from "../priceCalculatorService";

// ─── Category Types ───────────────────────────────────────────────────────────

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

export type GraphicsRushType = "normal" | "rushed" | "super";

// ─── Question Detection ───────────────────────────────────────────────────────

export function isGraphicsItemsQuestion(question: any): boolean {
  if (!question) return false;
  const key = String(question.key || "").toUpperCase();
  if (
    key.startsWith("SEO_") ||
    key.startsWith("WEB_") ||
    key.startsWith("MKT_")
  ) {
    return false;
  }
  if (key === "GFX_ITEMS" || key === "GD_ITEMS") {
    return true;
  }
  if (key.startsWith("GFX_") || key.startsWith("GD_")) {
    return (
      question.roleId === 7 ||
      /specific items/i.test(question.text || "") ||
      /include in this project/i.test(question.text || "")
    );
  }
  return false;
}

// ─── Category Selection Helpers ───────────────────────────────────────────────

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

export function getGraphicsItemCategory(answer: {
  key?: string;
  text?: string;
  metadata?: { filterGroup?: string; category?: string; heading?: string };
}): GraphicsCategoryType {
  const fg = (answer.metadata?.filterGroup || answer.metadata?.category || "").toLowerCase();
  const heading = (answer.metadata?.heading || "").toLowerCase();
  const key = (answer.key || "").toLowerCase();

  // 1. Collateral & Print Materials
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
      return selSet.has("gfx_cat_logo") || selSet.has("gd_cat_logo") || selLower.some((k) => k.includes("logo"));
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
        selSet.has("gfx_cat_social") || selSet.has("gd_cat_social") || selLower.some((k) => k.includes("social"))
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

  if (fg && (selSet.has(fg) || selLower.includes(fg))) {
    return true;
  }

  const itemCat = getGraphicsItemCategory(answer);
  if (itemCat === "unknown") {
    return fg ? selSet.has(fg) || selLower.includes(fg) : false;
  }

  return isGraphicsCategorySelected(itemCat, categoryKeys);
}

export function filterGraphicsAnswers(answers: any[], categoryKeys: string[]) {
  if (!categoryKeys || !categoryKeys.length) return [];
  return answers.filter((a) => isGraphicsItemVisible(a, categoryKeys));
}

// ─── Timeline Helpers ─────────────────────────────────────────────────────────

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

  const isRushTimelineKey =
    lower.startsWith("gfx_time") ||
    lower.startsWith("gd_time") ||
    lower.startsWith("gfx_timeline") ||
    lower.startsWith("seo_time");

  if (!isRushTimelineKey && !/super\s*rushed|rushed|normal/i.test(raw)) {
    return raw;
  }

  if (options?.directTimeline && !isRushTimelineKey) {
    return options.directTimeline;
  }

  const baseline = options?.baselineDays && options.baselineDays > 0 ? options.baselineDays : 14;
  const rushType = getGraphicsRushTypeFromMetadata(options?.metadata, raw);
  if (isRushTimelineKey || options?.metadata?.fee != null || options?.metadata?.reduction != null) {
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

// ─── Visibility ───────────────────────────────────────────────────────────────

/**
 * Handles question visibility for the "Graphic Designs" category.
 *
 * Returns:
 *   - true/false  → definitive answer for this question
 *   - null        → not a graphics question; caller should continue checking
 */
export function getGraphicsQuestionVisibility(
  question: any,
  selections: Record<string, CalculatorSelection>,
  questions?: any[]
): boolean | null {
  if (!isGraphicsItemsQuestion(question)) return null;
  const catKeys = getGraphicsCategoryKeys(selections, questions);
  return catKeys.length > 0;
}
