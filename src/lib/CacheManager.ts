export default class CacheManager {
  private static instance: CacheManager;
  private cache = new Map<string, { data: any; expiry: number }>();
  private inflight = new Map<string, Promise<any>>();

  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  get(key: string): any {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  async getOrFetch(key: string, fetchFn: () => Promise<any>, ttl: number = 60000): Promise<any> {
    const cached = this.get(key);
    if (cached) return cached;

    const inflight = this.inflight.get(key);
    if (inflight) return inflight;

    const fetchPromise = fetchFn()
      .then((result) => {
        if (result && (result.isSuccessful === true || result.isSuccessful === undefined)) {
          this.set(key, result, ttl);
        }
        return result;
      })
      .finally(() => {
        this.inflight.delete(key);
      });

    this.inflight.set(key, fetchPromise);
    return fetchPromise;
  }

  set(key: string, data: any, ttl: number) {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { data, expiry });
  }
}
