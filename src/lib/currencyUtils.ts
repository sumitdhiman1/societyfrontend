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

  if (isTargetEur === isSourceEur || targetCurrency?.toLowerCase() === sourceCurrency?.toLowerCase()) {
    return Number(amount.toFixed(2));
  }

  if (isTargetEur && !isSourceEur) {
    // USD -> EUR
    const converted = amount / rate;
    return Number(converted.toFixed(2));
  }

  if (!isTargetEur && isSourceEur) {
    // EUR -> USD
    return Number((amount * rate).toFixed(2));
  }

  return Number(amount.toFixed(2));
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
  let cleaned = text
    .replace(/(Great!\s+We've received your payment of\s+[\d.,]+(?:\s+[A-Z]{3})?)(?:\s+for\s+"[^"]*")?(?:\.?\s+Your (?:project|analysis) financials have been updated\.?)/gi, "$1.")
    .replace(/(Great!\s+We've received your payment of\s+[\d.,]+(?:\s+[A-Z]{3})?)\s+for\s+"[^"]*"\.?/gi, "$1.")
    .replace(/\.?\s+Your (?:project|analysis) financials have been updated\.?/gi, "")
    .replace(/\s*for\s+["']Payment for accepted(?: add-on)? project deliverables["']/gi, "")
    .replace(/(\d+\.\d{3,})/g, (match) => {
      const num = parseFloat(match);
      return Number.isFinite(num) ? num.toFixed(2) : match;
    });
  return cleaned.replace(/\b(eur|usd|gbp|cad|aud)\b/gi, (match) => match.toUpperCase());
}

export function formatPriceStringWithCurrency(
  text: string,
  targetCurrency: string = "usd",
  sourceCurrency: string = "usd",
  conversionRate: number = 1.08,
  roundBy5: boolean = false
): string {
  if (!text || typeof text !== "string") return "";
  const trimmed = text.trim();
  if (trimmed.toUpperCase() === "FREE" || trimmed.toLowerCase() === "get a quote" || !/\d/.test(trimmed)) {
    return text;
  }

  const targetCurr = (targetCurrency || "usd").toLowerCase();
  const sourceCurr = (sourceCurrency || "usd").toLowerCase();
  const symbol = targetCurr === "eur" ? "€" : "$";
  const isRange = text.includes("-");

  // Replace monetary figures (e.g. $2200, 2200, $2200.00, €2000)
  return text.replace(/(?:[\$€£])?\s*(\d+(?:,\d{3})*(?:\.\d+)?)/g, (match, numStr) => {
    const cleanNum = parseFloat(numStr.replace(/,/g, ""));
    if (isNaN(cleanNum)) return match;
    const converted = convertCurrencyAmount(cleanNum, targetCurr, sourceCurr, conversionRate);
    const finalVal = (roundBy5 || isRange || targetCurr === "eur") ? roundToNearest5(converted) : converted;
    const hasCents = finalVal % 1 !== 0;
    const formattedNum = hasCents
      ? finalVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : finalVal.toLocaleString("en-US", { maximumFractionDigits: 0 });
    return `${symbol}${formattedNum}`;
  });
}



