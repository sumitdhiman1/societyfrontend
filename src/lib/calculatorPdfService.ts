import {
  downloadCalculatorProjectPDF,
  generateCalculatorProjectPDFBase64,
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
  return generateCalculatorProjectPDFBase64(data);
}

