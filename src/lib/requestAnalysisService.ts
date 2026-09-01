import HttpClient from "./HttpClient";

export class RequestAnalysisService {
  async submitRequest(data: { email: string; websiteUrl: string }) {
    const client = new HttpClient();
    return await client.post("/request-analysis", data);
  }

  async getSettings(ttl: number = 900000) {
    const client = new HttpClient();
    return await client.get("/request-analysis/settings", {}, ttl);
  }

  async updateSettings(data: any) {
    const client = new HttpClient();
    return await client.patch("/request-analysis/settings", data);
  }
}

export const requestAnalysisService = new RequestAnalysisService();
