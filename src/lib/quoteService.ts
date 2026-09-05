import HttpClient from "./HttpClient";

export class QuoteService {
  private client: HttpClient;

  constructor(session?: any) {
    this.client = new HttpClient(session);
  }

  async getAllQuotes(status?: string, page?: number, limit?: number) {
    const params = new URLSearchParams();
    
    if (status) params.set("status", status);
    if (page) params.set("page", String(page));
    if (limit) params.set("limit", String(limit));
    
    const queryString = params.toString();
    return await this.client.get(`/quotes/getallquotes${queryString ? `?${queryString}` : ""}`);
  }

  async getQuoteById(id: string) {
    return await this.client.get(`/quotes/getquotebyid/${id}`);
  }

  async requestQuote(data: any) {
    return await this.client.post("/quotes/requestquote", data);
  }

  async updateQuote(id: string, data: any) {
    return await this.client.put(`/quotes/user/updatequote/${id}`, data);
  }

  async renameQuote(id: string, title: string) {
    return await this.client.patch(`/quotes/rename/${id}`, { projectTitle: title });
  }

  async downloadQuotePDF(quote: { _id?: string; quoteNumber?: string; [key: string]: any }) {
    const { generateQuotePDF } = await import("./generateQuotePDF");
    await generateQuotePDF(quote);
  }

  async getQuoteFiles(id: string) {
    return await this.client.get(`/quotes/${id}/files`);
  }

  async addQuoteFile(id: string, data: any) {
    return await this.client.post(`/quotes/${id}/files`, data);
  }

  async deleteQuoteFile(id: string, fileId: string) {
    return await this.client.delete(`/quotes/${id}/files/${fileId}`);
  }
}

export const quoteService = new QuoteService();
