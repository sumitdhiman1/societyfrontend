import HttpClient from "./HttpClient";

/**
 * Dedicated payment service for calculator projects.
 * All calls go to /payments/calculator/* endpoints which are handled
 * exclusively by CalculatorPaymentService on the backend — completely
 * independent of the generic PaymentsService.
 */
export class CalculatorPaymentService {
  private client: HttpClient;

  constructor(session?: any) {
    this.client = new HttpClient(session);
  }

  async createPaymentIntent(data: any) {
    console.log("[CalculatorPaymentService.createPaymentIntent] Sending to API:", data);
    return this.client.post("/payments/calculator/create-intent", data);
  }

  async confirmPayment(data: { transactionId: string }) {
    return this.client.post("/payments/calculator/confirm", data);
  }

  async createOrder(data: any) {
    return this.client.post("/payments/calculator/create-order", data);
  }
}

export const calculatorPaymentService = new CalculatorPaymentService();
