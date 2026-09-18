import { downloadProjectDetailsPDF } from "./generateProjectDetailsPDF";
import { downloadCalculatorProjectPDF } from "./generateCalculatorProjectPDF";
import { isCalculatorProject } from "./calculator/shared";

export async function generateQuotePDF(quote: any): Promise<void> {
  if (isCalculatorProject(quote)) {
    await downloadCalculatorProjectPDF(quote);
  } else {
    await downloadProjectDetailsPDF({ ...quote, isQuote: true });
  }
}
