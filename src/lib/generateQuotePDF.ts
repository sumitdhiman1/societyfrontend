import { downloadProjectDetailsPDF } from "./generateProjectDetailsPDF";
import { downloadCalculatorProjectPDF } from "./generateCalculatorProjectPDF";
import { isCalculatorProject } from "./calculator/shared";

export async function generateQuotePDF(quote: any): Promise<void> {
  if (!quote) return;
  const activeTitle = quote?.projectTitle || quote?.title || quote?.requirements?.projectTitle || "Custom Quote";
  const activeDesc = quote?.projectDescription || quote?.description || quote?.requirements?.projectDescription || quote?.requirements?.description || "";
  
  const deliverableItems =
    (Array.isArray(quote?.lineItems) && quote.lineItems.length > 0 && quote.lineItems) ||
    (Array.isArray(quote?.deliverableItems) && quote.deliverableItems.length > 0 && quote.deliverableItems) ||
    (Array.isArray(quote?.deliverables) && quote.deliverables.length > 0 && quote.deliverables) ||
    (Array.isArray(quote?.requirements?.breakdown) && quote.requirements.breakdown.length > 0 && quote.requirements.breakdown.map((item: any) => ({
      name: item.item || item.description || item.title || "Deliverable",
      description: item.item || item.description || item.title || "Deliverable",
      details: item.details || "",
      duration: item.duration || "-",
      amount: Number(item.amount ?? item.cost ?? 0) || 0,
    }))) ||
    [];

  const payload = {
    ...quote,
    isQuote: true,
    isProject: false,
    title: activeTitle,
    projectTitle: activeTitle,
    description: activeDesc,
    projectDescription: activeDesc,
    deliverables: deliverableItems,
    lineItems: deliverableItems,
    deliverableItems: deliverableItems,
  };

  if (isCalculatorProject(payload)) {
    await downloadCalculatorProjectPDF(payload);
  } else {
    await downloadProjectDetailsPDF(payload);
  }
}
