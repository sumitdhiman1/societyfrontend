import { downloadProjectDetailsPDF } from "./generateProjectDetailsPDF";

export async function generateQuotePDF(quote: any): Promise<void> {
  await downloadProjectDetailsPDF({ ...quote, isQuote: true });
}
