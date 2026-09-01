/**
 * Generates and downloads an invoice PDF from invoice data.
 * This is a client-side PDF generation utility that creates a simple
 * printable receipt and triggers a browser download.
 */
export async function generateInvoicePDF(invoiceData: any): Promise<void> {
  // Build a simple HTML invoice receipt and print/save it
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${invoiceData._id || ""}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { font-size: 24px; color: #0D1939; }
    .meta { font-size: 12px; color: #666; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #f5f5f5; text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; color: #666; }
    td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
    .total { font-weight: bold; font-size: 14px; }
    .footer { margin-top: 40px; font-size: 11px; color: #999; }
  </style>
</head>
<body>
  <h1>Society Web Solutions</h1>
  <p class="meta">
    Invoice ID: ${invoiceData._id || "N/A"}<br />
    Date: ${invoiceData.createdAt ? new Date(invoiceData.createdAt).toLocaleDateString("en-US", { dateStyle: "long" }) : "N/A"}<br />
    Status: ${invoiceData.status || "Paid"}
  </p>
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${
        Array.isArray(invoiceData.items)
          ? invoiceData.items
              .map(
                (item: any) => `
        <tr>
          <td>${item.description || item.name || "Service"}</td>
          <td>${new Intl.NumberFormat("en-US", { style: "currency", currency: (invoiceData.currency || "USD").toUpperCase() }).format(item.amount || 0)}</td>
        </tr>`
              )
              .join("")
          : `<tr><td>Service Payment</td><td>${new Intl.NumberFormat("en-US", { style: "currency", currency: (invoiceData.currency || "USD").toUpperCase() }).format(invoiceData.totalAmount || invoiceData.amount || 0)}</td></tr>`
      }
    </tbody>
    <tfoot>
      <tr>
        <td class="total">Total</td>
        <td class="total">${new Intl.NumberFormat("en-US", { style: "currency", currency: (invoiceData.currency || "USD").toUpperCase() }).format(invoiceData.totalAmount || invoiceData.amount || 0)}</td>
      </tr>
    </tfoot>
  </table>
  <div class="footer">Thank you for your business — Society Web Solutions</div>
</body>
</html>
`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoice-${invoiceData._id || Date.now()}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
