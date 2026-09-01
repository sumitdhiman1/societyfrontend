import HttpClient from "./HttpClient";

export class PaymentService {
  private client: HttpClient;

  constructor(session?: any) {
    this.client = new HttpClient(session);
  }

  async getPaymentHistory(options?: { page?: number; limit?: number; from?: string; to?: string }) {
    let url = "/payments/history";
    const params = new URLSearchParams();
    
    if (options?.page) params.append("page", options.page.toString());
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.from) params.append("from", options.from);
    if (options?.to) params.append("to", options.to);
    
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    
    return this.client.get(url);
  }

  // Production alias – used by payment-history page
  async getHistory(params?: { startDate?: string; endDate?: string }) {
    return this.client.get("/payments/history", params);
  }

  async createPaymentIntent(data: any) {
    return this.client.post("/payments/create-intent", data);
  }

  async createOrder(data: any) {
    return this.client.post("/payments/create-order", data);
  }

  async confirmPayment(data: any) {
    return this.client.post("/payments/confirm", data);
  }

  async getTransactionsByProject(projectId: string) {
    return this.client.get(`/payments/history/${projectId}`);
  }

  async getSavedPaymentMethods() {
    return this.client.get("/payments/methods");
  }

  async createSetupIntent() {
    return this.client.post("/payments/create-setup-intent", {});
  }

  async setDefaultMethod(paymentMethodId: string) {
    return this.client.post("/payments/set-default-method", { paymentMethodId });
  }

  async exportHistory(options?: { from?: string; to?: string }) {
    let url = "/payments/export";
    const params = new URLSearchParams();
    if (options?.from) params.append("from", options.from);
    if (options?.to) params.append("to", options.to);
    
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    
    return this.client.get(url);
  }
}

export const paymentService = new PaymentService();
