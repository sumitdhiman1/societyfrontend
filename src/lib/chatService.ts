import HttpClient from "./HttpClient";

class ChatService {
  private client: HttpClient;

  constructor(session?: any) {
    this.client = new HttpClient(session);
  }

  private extractData(res: any) {
    if (!res) return null;
    // If HttpClient caught an error and returned { isSuccessful: false }
    if (res.isSuccessful === false) {
      console.warn("[ChatService] Request unsuccessful:", res);
      return null;
    }
    // If NestJS ResponseHelper wrapper is returned: { data: ..., isSuccessful: true }
    if (typeof res === "object" && res !== null && "data" in res) {
      return res.data;
    }
    return res;
  }

  async startChat(): Promise<any> {
    try {
      const res = await this.client.post("/chat/start", {});
      const data = this.extractData(res);
      return data && data._id ? data : null;
    } catch (err) {
      console.error("[ChatService] startChat failed:", err);
      return null;
    }
  }

  async getMyConversations(): Promise<any> {
    try {
      const res = await this.client.get("/chat/conversations");
      return this.extractData(res);
    } catch (err) {
      console.error("[ChatService] getMyConversations failed:", err);
      return [];
    }
  }

  async getChatDetails(id: string): Promise<any> {
    if (!id) return null;
    try {
      const res = await this.client.get(`/chat/${id}`);
      const data = this.extractData(res);
      return data && data._id ? data : null;
    } catch (err) {
      console.error("[ChatService] getChatDetails failed:", err);
      return null;
    }
  }

  async closeChat(id: string): Promise<any> {
    if (!id) return null;
    try {
      const res = await this.client.post(`/chat/${id}/close`, {});
      return this.extractData(res);
    } catch (err) {
      console.error("[ChatService] closeChat failed:", err);
      return null;
    }
  }
}

export const chatService = new ChatService();
export default ChatService;
