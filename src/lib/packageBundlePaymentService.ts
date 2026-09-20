import HttpClient from "./HttpClient";

export class PackageBundlePaymentService {
  private client: HttpClient;

  constructor(session?: any) {
    this.client = new HttpClient(session);
  }

  async createOrder(data: any) {
    return this.client.post("/payments/create-order", data);
  }

  async createPaymentIntent(data: any) {
    console.log("[PackageBundlePaymentService.createPaymentIntent] Sending to API:", data);
    return this.client.post("/payments/create-intent", data);
  }

  async confirmPayment(data: any) {
    return this.client.post("/payments/confirm", data);
  }

  async getSavedPaymentMethods() {
    return this.client.get("/payments/methods");
  }

  async createSetupIntent() {
    return this.client.post("/payments/create-setup-intent", {});
  }
}

export const packageBundlePaymentService = new PackageBundlePaymentService();
