export const ESTONIA_VAT_RATE = 24;

/**
 * Checks whether a given country identifier corresponds to Estonia.
 * Accepts ISO2 ('EE'), ISO3 ('EST'), or country name ('ESTONIA' case-insensitive).
 */
export function isEstoniaCountry(country?: string): boolean {
  if (!country) return false;
  const c = country.trim().toUpperCase();
  return c === 'EE' || c === 'EST' || c === 'ESTONIA';
}

/**
 * Common VAT Rate resolver for the frontend.
 * Only Estonia has a VAT rate of 24%. All other countries have 0%.
 */
export function getVatRateForCountry(country?: string): number {
  return isEstoniaCountry(country) ? ESTONIA_VAT_RATE : 0;
}
