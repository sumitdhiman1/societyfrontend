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

  async getProducts(activeOnly = true) {
    const client = new HttpClient();
    return await client.get("/request-analysis/products", { activeOnly });
  }

  async getProduct(id: string) {
    const client = new HttpClient();
    return await client.get(`/request-analysis/products/${id}`);
  }

  async getProjects() {
    const client = new HttpClient();
    return await client.get("/request-analysis/projects");
  }

  async getProject(id: string) {
    const client = new HttpClient();
    return await client.get(`/request-analysis/projects/${id}`);
  }

  async createProject(data: any) {
    const client = new HttpClient();
    return await client.post("/request-analysis/projects", data);
  }

  async renameProject(id: string, title: string) {
    const client = new HttpClient();
    return await client.patch(`/request-analysis/projects/${id}/rename`, { title });
  }
}

export const requestAnalysisService = new RequestAnalysisService();
