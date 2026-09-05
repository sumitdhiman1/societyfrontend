function formatMoney(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

function formatDate(date?: string) {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

function getLineItems(quote: any) {
  const fromProposal = quote.messages
    ?.filter((m: any) => m.type === "quote_proposal")
    ?.at(-1)?.content?.lineItems;

  if (fromProposal?.length) {
    return fromProposal.map((item: any) => ({
      description: item.description || item.item || "Item",
      duration: item.duration || "-",
      amount: item.amount ?? item.cost ?? 0,
    }));
  }

  const items = quote.lineItems || quote.deliverableItems;
  if (items?.length) {
    return items.map((item: any) => ({
      description: item.description || item.item || "Item",
      duration: item.duration || "-",
      amount: item.amount ?? item.cost ?? 0,
    }));
  }

  const breakdown = quote.requirements?.breakdown;
  if (breakdown?.length) {
    return breakdown
      .filter((item: any) => item.amount > 0 || item.item)
      .map((item: any) => ({
        description: item.item,
        duration: "-",
        amount: item.amount || 0,
      }));
  }

  const total =
    quote.totalCost ||
    quote.estimatedPrice ||
    quote.requirements?.calculatedPrice ||
    0;

  return [
    {
      description: quote.projectTitle || "Project",
      duration: quote.totalDuration || quote.requirements?.estimatedTimeline || "-",
      amount: total,
    },
  ];
}

function getTotalCost(quote: any, lineItems: Array<{ amount: number }>) {
  const explicit =
    quote.totalCost ||
    quote.estimatedPrice ||
    quote.requirements?.calculatedPrice;
  if (explicit) return explicit;
  return lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
}

export async function generateQuotePDF(quote: any): Promise<void> {
  const currency = (quote.currency || "USD").toUpperCase();
  const lineItems = getLineItems(quote);
  const totalCost = getTotalCost(quote, lineItems);
  const totalDuration =
    quote.totalDuration || quote.requirements?.estimatedTimeline || "-";
  const quoteNumber = quote.quoteNumber || quote._id || "quote";
  const description = (quote.projectDescription || "")
    .replace(/\n/g, "<br />")
    .replace(/- /g, "• ");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Proposal ${quoteNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { font-size: 24px; color: #163659; margin-bottom: 4px; }
    .badge { display: inline-block; padding: 4px 8px; background: #dbeafe; color: #1d4ed8; font-size: 10px; font-weight: bold; border-radius: 4px; text-transform: uppercase; margin-bottom: 16px; }
    .meta { font-size: 12px; color: #666; margin-bottom: 20px; }
    .description { font-size: 13px; color: #555; line-height: 1.6; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #f8fafc; text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; color: #64748b; border: 1px solid #e2e8f0; }
    td { padding: 12px; border: 1px solid #e2e8f0; font-size: 13px; vertical-align: top; }
    .amount { text-align: right; font-weight: bold; white-space: nowrap; }
    .duration { text-align: center; }
    .totals { margin-top: 24px; display: flex; justify-content: flex-end; gap: 48px; font-size: 13px; }
    .totals .label { color: #64748b; font-weight: bold; margin-bottom: 4px; }
    .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <h1>Project Details</h1>
  <div class="badge">${quote.serviceType || "Custom Project"}</div>
  <p class="meta">
    Project #${quoteNumber}<br />
    Status: ${quote.status || "Pending"}<br />
    Submitted: ${formatDate(quote.dateSubmitted || quote.createdAt)}<br />
    Expires: ${formatDate(quote.expirationDate)}
  </p>
  <h2 style="font-size:18px;margin:0 0 8px;">${quote.projectTitle || "Project Proposal"}</h2>
  ${description ? `<div class="description">${description}</div>` : ""}
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th style="text-align:center;">Duration</th>
        <th style="text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${lineItems
        .map(
          (item: { description: string; duration: string; amount: number }) => `
      <tr>
        <td>${item.description}</td>
        <td class="duration">${item.duration}</td>
        <td class="amount">${formatMoney(item.amount, currency)}</td>
      </tr>`,
        )
        .join("")}
    </tbody>
  </table>
  <div class="totals">
    <div>
      <div class="label">Total Duration</div>
      <div>${totalDuration}</div>
    </div>
    <div>
      <div class="label">Total Cost</div>
      <div>${formatMoney(totalCost, currency)}</div>
    </div>
  </div>
  <div class="footer">Society Web Solutions — societywebsolutions.com</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Proposal-${quoteNumber}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
