import HttpClient from "./HttpClient";

class SupportService {
  private client: HttpClient;

  constructor() {
    this.client = new HttpClient();
  }

  async getFaqPage() {
    return this.client.get("/pages/faq");
  }

  async createTicket(data: any) {
    return this.client.post("/support/addticket", data);
  }

  async getAllTickets() {
    return this.client.get("/support/getalltickets");
  }

  async getTicketById(id: string) {
    return this.client.get(`/support/getticketbyid/${id}`);
  }

  async replyToTicket(id: string, data: any) {
    return this.client.post(`/support/addticketreply/${id}`, data);
  }

  async rateTicket(id: string, data: any) {
    return this.client.post(`/support/rateticket/${id}`, data);
  }

  async reopenTicket(id: string) {
    return this.client.post(`/support/reopenticket/${id}`, {});
  }

  async closeTicket(id: string) {
    return this.client.post(`/support/closeticket/${id}`, {});
  }
}

export const supportService = new SupportService();
