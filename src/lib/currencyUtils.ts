/**
 * Currency utility helpers for Society Web Solutions
 * Ensures currency conversion to EURO is consistently rounded to the nearest 5.
 */

export function roundToNearest5(val: number): number {
  if (!Number.isFinite(val) || val === 0) return 0;
  return 5 * Math.round(val / 5);
}

export function convertCurrencyAmount(
  amount: number,
  targetCurrency: string,
  sourceCurrency: string = "usd",
  conversionRate: number = 1.08
): number {
  if (!amount || !Number.isFinite(amount) || amount === 0) return 0;
  const isTargetEur = targetCurrency?.toLowerCase() === "eur";
  const isSourceEur = sourceCurrency?.toLowerCase() === "eur";
  const rate = conversionRate || 1.08;

  if (isTargetEur && !isSourceEur) {
    // USD -> EUR: convert and round amounts >= 5 to nearest 5
    const converted = amount / rate;
    if (converted >= 5) {
      return roundToNearest5(converted);
    }
    return Number(converted.toFixed(2));
  }

  if (isTargetEur && isSourceEur) {
    if (amount >= 5) {
      return roundToNearest5(amount);
    }
    return Number(amount.toFixed(2));
  }

  if (!isTargetEur && isSourceEur) {
    // EUR -> USD
    return Number((amount * rate).toFixed(2));
  }

  return amount;
}

export function formatPriceWithCurrency(
  amount: number,
  targetCurrency: string,
  sourceCurrency: string = "usd",
  conversionRate: number = 1.08
): string {
  const converted = convertCurrencyAmount(amount, targetCurrency, sourceCurrency, conversionRate);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (targetCurrency || "usd").toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(converted);
}

export function formatActiveCurrency(
  amount: number,
  targetCurrency: string = "usd"
): string {
  const val = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (targetCurrency || "usd").toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

export function capitalizeCurrencyInText(text?: string): string {
  if (!text) return "";
  return text.replace(/\b(eur|usd|gbp|cad|aud)\b/gi, (match) => match.toUpperCase());
}


