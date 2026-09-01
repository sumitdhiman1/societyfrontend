import HttpClient from "./HttpClient";

class InvoiceService {
  private client: HttpClient;

  constructor() {
    this.client = new HttpClient();
  }

  async getInvoiceByTransaction(transactionId: string) {
    return this.client.get(`/invoices/transaction/${transactionId}`);
  }

  async getInvoices(params?: { page?: number; limit?: number; startDate?: string; endDate?: string }) {
    return this.client.get("/invoices", params);
  }

  async getInvoicesByQuote(quoteId: string) {
    return this.client.get("/invoices/quote/{quoteId}", { quoteId });
  }

  async getInvoicesByProject(projectId: string) {
    return this.client.get(`/invoices/project/${projectId}`);
  }

  async downloadInvoicePDF(invoiceId: string) {
    try {
      let token: string | undefined;
      const url = `/api-gateway/invoices/${invoiceId}/download`;

      if (typeof document !== "undefined") {
        const match = /(^| )access_token=([^;]+)/.exec(document.cookie);
        if (match) token = match[2];
      }

      const res = await fetch(url, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });

      if (!res.ok) throw new Error(`Failed to download invoice: ${res.statusText}`);

      const blob = await res.blob();
      const objectUrl = globalThis.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      globalThis.URL.revokeObjectURL(objectUrl);
    } catch (e) {
      console.error("Download error:", e);
      throw e;
    }
  }
}

export const invoiceService = new InvoiceService();
