import HttpClient from "./HttpClient";
import CacheManager from "./CacheManager";

export class SearchService {
  private session: any;

  constructor(session?: any) {
    this.session = session;
  }

  async search(query: string) {
    const client = new HttpClient(this.session);
    return await client.get(`/search?q=${encodeURIComponent(query)}`);
  }

  async getSuggestions(query: string) {
    const client = new HttpClient(this.session);
    return await client.get(`/search/suggestions?q=${encodeURIComponent(query)}`);
  }
}

export class NotificationService {
  private session: any;

  constructor(session?: any) {
    this.session = session;
  }

  async getUnreadCount() {
    return CacheManager.getInstance().getOrFetch(
      "unread_count",
      () => new HttpClient(this.session).get("/notifications/getunreadcount"),
      300000
    );
  }

  async getAllNotifications(options?: { page?: number; limit?: number }) {
    const client = new HttpClient(this.session);
    const params = new URLSearchParams();
    if (options?.page) params.append("page", options.page.toString());
    if (options?.limit) params.append("limit", options.limit.toString());
    
    const query = params.toString() ? `?${params.toString()}` : "";
    const cacheKey = `all_notifications_${options?.page || 1}_${options?.limit || 10}`;
    
    return CacheManager.getInstance().getOrFetch(
      cacheKey,
      () => client.get(`/notifications/getallnotifications${query}`),
      60000
    );
  }

  async markAllRead() {
    const client = new HttpClient(this.session);
    const result = await client.post("/notifications/markallread", {});
    // Invalidate all notification caches so the next open fetches fresh data
    CacheManager.getInstance().deleteByPrefix("all_notifications_");
    CacheManager.getInstance().delete("unread_count");
    return result;
  }

  async markRead(id: string) {
    const client = new HttpClient(this.session);
    const result = await client.post(`/notifications/markread/${id}`, {});
    // Invalidate caches so the updated read state is reflected on next fetch
    CacheManager.getInstance().deleteByPrefix("all_notifications_");
    CacheManager.getInstance().delete("unread_count");
    return result;
  }
}

export const notificationService = new NotificationService();
export const searchService = new SearchService();
