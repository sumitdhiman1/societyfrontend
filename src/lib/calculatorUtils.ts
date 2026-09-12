/**
 * calculatorUtils.ts
 *
 * Re-export barrel — all calculator logic now lives in dedicated category files:
 *
 *   calculator/shared.ts    — shared types, visibility orchestrator, pricing
 *   calculator/website.ts   — "A New Website" logic
 *   calculator/graphics.ts  — "Graphic Designs" logic
 *   calculator/seo.ts       — "Search Engine Optimization" logic
 *   calculator/marketing.ts — "Social Media Marketing" logic
 *
 * This file exists purely for backwards compatibility: all existing imports
 * throughout the codebase (page.tsx, PDF services, dashboard components, etc.)
 * continue to work without any changes.
 *
 * To change category-specific behaviour, edit the relevant file above.
 * Do NOT add new logic directly to this file.
 */

export * from "./calculator/shared";
export * from "./calculator/website";
export * from "./calculator/graphics";
export * from "./calculator/seo";
export * from "./calculator/marketing";
