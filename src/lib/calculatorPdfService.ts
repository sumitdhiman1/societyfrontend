/**
 * Utility to generate a PDF proposal from calculator data.
 */

export interface PdfProposalData {
  categoryName: string;
  subtitle?: string;
  breakdownItems: Array<{ question: string; answers: string[] }>;
  totalPrice: number;
  timeline?: string;
  currency?: string;
}

export async function downloadCalculatorPdf(data: PdfProposalData): Promise<void> {
  const html = generateCalculatorHtml(data);
  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `proposal-${data.categoryName.toLowerCase().replace(/\s+/g, "-")}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function getCalculatorPdfBase64(data: PdfProposalData): Promise<string> {
  const html = generateCalculatorHtml(data);
  return btoa(unescape(encodeURIComponent(html)));
}

function generateCalculatorHtml(data: PdfProposalData): string {
  const currencySymbol = data.currency?.toLowerCase() === "eur" ? "€" : "$";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Project Proposal - ${data.categoryName}</title>
  <style>
    body { font-family: 'Inter', sans-serif; margin: 40px; color: #5356ff; }
    h1 { font-size: 32px; font-weight: 800; margin-bottom: 4px; text-transform: uppercase; }
    .subtitle { font-size: 18px; font-weight: 300; margin-bottom: 40px; text-transform: uppercase; opacity: 0.8; }
    .section { margin-bottom: 30px; }
    .question { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
    .answer { font-size: 16px; font-weight: 400; margin-bottom: 4px; line-height: 1.5; }
    .total-box { margin-top: 50px; border-top: 2px solid #5356ff; pt-20; }
    .total-price { font-size: 28px; font-weight: 900; margin-bottom: 4px; }
    .timeline { font-size: 16px; font-weight: 700; margin-top: 20px; }
    .footer { margin-top: 60px; font-size: 12px; opacity: 0.6; }
  </style>
</head>
<body>
  <h1>${data.categoryName}</h1>
  ${data.subtitle ? `<p class="subtitle">${data.subtitle}</p>` : ""}
  
  ${data.breakdownItems.map(item => `
    <div class="section">
      <div class="question">${item.question}</div>
      ${item.answers.map(ans => `<div class="answer">${ans}</div>`).join("")}
    </div>
  `).join("")}
  
  <div class="total-box">
    <div class="total-price">PROJECT TOTAL COST: ${currencySymbol}${data.totalPrice.toLocaleString()}</div>
    <div class="timeline">Estimated Deadline: ${data.timeline || "TBA"}</div>
  </div>
  
  <div class="footer">Generated via Society Web Solutions Calculator — societywebsolutions.com</div>
</body>
</html>
  `;
}
