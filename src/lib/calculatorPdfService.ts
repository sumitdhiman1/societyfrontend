/**
 * Utility to generate a PDF proposal from calculator data.
 */

import { getCalculatorDisplayAmount } from "./calculatorUtils";
import {
  downloadCalculatorProjectPDF,
  getCalculatorProjectHTML,
  extractCalculatorPDFData,
} from "./generateCalculatorProjectPDF";

export interface PdfProposalData {
  categoryName: string;
  subtitle?: string;
  breakdownItems: Array<{ question: string; answers: string[] }>;
  totalPrice: number;
  timeline?: string;
  currency?: string;
  conversionRate?: number;
  categoryKey?: string;
  [key: string]: any;
}

export async function downloadCalculatorPdf(data: PdfProposalData): Promise<void> {
  return downloadCalculatorProjectPDF(data);
}

export async function getCalculatorPdfBase64(data: PdfProposalData): Promise<string> {
  try {
    const html = getCalculatorProjectHTML(extractCalculatorPDFData(data));
    return btoa(unescape(encodeURIComponent(html)));
  } catch {
    const html = generateCalculatorHtml(data);
    return btoa(unescape(encodeURIComponent(html)));
  }
}

function generateCalculatorHtml(data: PdfProposalData): string {
  const d = extractCalculatorPDFData(data);
  return getCalculatorProjectHTML(d);
}

