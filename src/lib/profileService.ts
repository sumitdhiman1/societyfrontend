import HttpClient from "./HttpClient";

class CacheManager {
  private static instance: CacheManager;
  private cache = new Map<string, { data: any; expiry: number }>();
  private inflight = new Map<string, Promise<any>>();

  private constructor() {}

  static getInstance() {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  get(key: string) {
    const item = this.cache.get(key);
    if (item && item.expiry > Date.now()) {
      return item.data;
    }
    this.cache.delete(key);
    return null;
  }

  async getOrFetch(key: string, fetchFn: () => Promise<any>, ttl: number = 1800000) {
    const cached = this.get(key);
    if (cached) return cached;

    if (this.inflight.has(key)) return this.inflight.get(key);

    const promise = fetchFn().then((res) => {
      if (res && (res.isSuccessful === true || res.isSuccessful === undefined)) {
        this.set(key, res, ttl);
      }
      return res;
    }).finally(() => {
      this.inflight.delete(key);
    });

    this.inflight.set(key, promise);
    return promise;
  }

  set(key: string, data: any, ttl: number) {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { data, expiry });
  }

  clear() {
    this.cache.clear();
    this.inflight.clear();
  }
}

export class ProfileService extends HttpClient {
  constructor(session?: any) {
    super(session);
  }

  async getMyProfile() {
    return CacheManager.getInstance().getOrFetch(
      "my_profile",
      () => this.get("/profile/getmyprofile"),
      1800000 // 30 minutes
    );
  }

  async updateProfile(data: any) {
    // Production uses POST /profile/updatemyprofile for all updates
    const res = await this.post("/profile/updatemyprofile", data);
    if (res.isSuccessful) {
      // Clear cache on update
      CacheManager.getInstance().clear();
    }
    return res;
  }

  async getEmailPreferences() {
    return this.get("/users/email-preferences");
  }

  async updateEmailPreferences(preferences: any) {
    return this.patch("/users/email-preferences", preferences);
  }

  async getReferralStats() {
    return this.get("/users/referrals");
  }
}

export const profileService = new ProfileService();

