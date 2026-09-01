export class HttpError extends Error {
  status: number;
  data: any;

  constructor(data: any, status: number) {
    super(data.message || "HTTP Error");
    this.status = status;
    this.data = data;
    this.data.isSuccessful = false;
  }
}

export default class HttpClient {
  baseUrl: string;
  session: any;

  constructor(session?: any) {
    this.baseUrl = "/api-gateway";
    this.session = session;
  }

  private serializeQueryParam(value: any): string {
    if (value !== null && typeof value === "object") {
      return JSON.stringify(value);
    }
    return value === undefined ? "" : value.toString();
  }

  private buildFullPath(path: string, params?: Record<string, any>): string {
    let fullPath = path;
    const queryParams: Record<string, any> = {};

    if (params) {
      Object.keys(params).forEach((key) => {
        const placeholder = `{${key}}`;
        if (fullPath.includes(placeholder)) {
          fullPath = fullPath.replace(placeholder, String(params[key]));
        } else {
          queryParams[key] = params[key];
        }
      });
    }

    let url = this.baseUrl + fullPath;
    const searchParams = new URLSearchParams();

    Object.entries(queryParams).forEach(([key, value]) => {
      if (value != null) {
        searchParams.append(key, this.serializeQueryParam(value));
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  private getConfig(token?: string) {
    const config: { headers: Record<string, string> } = { headers: {} };
    let authToken = token || this.session?.oAuthToken;

    if (!authToken && typeof document !== "undefined") {
      const match = /(^| )access_token=([^;]+)/.exec(document.cookie);
      if (match) {
        authToken = match[2];
      }
    }

    if (authToken) {
      config.headers.Authorization = "Bearer " + authToken;
    }
    return config;
  }

  private handleFetchError(error: any) {
    if (error instanceof HttpError) {
      return {
        ...error.data,
        message: error.data.message || "Unknown error",
        isSuccessful: false,
      };
    }
    return {
      message: "There is some error. Please try after sometime.",
      isSuccessful: false,
    };
  }

  private isAuthError(error: any, path: string): boolean {
    return (
      error instanceof HttpError &&
      error.status === 401 &&
      !path.includes("/auth/refresh") &&
      !path.includes("/auth/login")
    );
  }

  private static cache = new Map<string, { data: any; timestamp: number }>();
  private static inflight = new Map<string, Promise<any>>();

  private async fetchJsonWithCache(url: string, config: any, cacheTTL?: number) {
    if (cacheTTL && typeof globalThis.window !== "undefined") {
      const cached = HttpClient.cache.get(url);
      if (cached && Date.now() - cached.timestamp < cacheTTL) {
        return cached.data;
      }
    }

    const inflight = HttpClient.inflight.get(url);
    if (inflight) return inflight;

    const fetchPromise = (async () => {
      try {
        console.log(`[HttpClient] Fetching: ${url}`);
        const response = await fetch(url, {
          headers: config.headers,
          credentials: "include",
        });

        if (!response.ok) {
          let errorData = { message: "Unknown error" };
          try {
            errorData = await response.json();
          } catch {
            errorData = { message: `HTTP ${response.status}` };
          }
          throw new HttpError(errorData, response.status);
        }

        const data = await response.json();
        data.isSuccessful = true;

        if (cacheTTL && typeof globalThis.window !== "undefined") {
          HttpClient.cache.set(url, { data, timestamp: Date.now() });
        }

        return data;
      } finally {
        HttpClient.inflight.delete(url);
      }
    })();

    HttpClient.inflight.set(url, fetchPromise);
    return fetchPromise;
  }

  async get(path: string, params?: Record<string, any>, cacheTTL?: number): Promise<any> {
    let authToken: string | undefined;
    const execute = async () => {
      const url = this.buildFullPath(path, params);
      const config = this.getConfig(authToken);
      return await this.fetchJsonWithCache(url, config, cacheTTL);
    };

    try {
      return await execute();
    } catch (error) {
      if (this.isAuthError(error, path)) {
        const newToken = await this.attemptTokenRefresh();
        if (newToken) {
          authToken = newToken;
          return await execute();
        }
      }
      throw error;
    }
  }

  async post(path: string, data: any): Promise<any> {
    return this.sendRequest("POST", path, data);
  }

  private static refreshPromise: Promise<string | null> | null = null;

  async attemptTokenRefresh(): Promise<string | null> {
    if (typeof document === "undefined") return null;
    if (HttpClient.refreshPromise) return HttpClient.refreshPromise;

    const match = /(^| )refresh_token=([^;]+)/.exec(document.cookie);
    if (!match) {
      console.warn("ServiceClient: No refresh_token cookie found.");
      return null;
    }

    const refreshToken = decodeURIComponent(match[2]);

    HttpClient.refreshPromise = (async () => {
      try {
        const response = await fetch(this.baseUrl + "/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ refreshToken }),
        });

        if (response.ok) {
          const result = await response.json();
          const data = result.data || result;
          if (data?.access_token) {
            document.cookie = `access_token=${data.access_token}; path=/; max-age=900; SameSite=Strict`;
            if (data.refresh_token) {
              document.cookie = `refresh_token=${data.refresh_token}; path=/; max-age=604800; SameSite=Strict`;
            }
            if (this.session) {
              this.session.oAuthToken = data.access_token;
            }
            return data.access_token;
          }
        } else if (response.status >= 400 && response.status < 500) {
          document.cookie = "access_token=; path=/; max-age=0;";
          document.cookie = "refresh_token=; path=/; max-age=0;";
          document.cookie = "user_data=; path=/; max-age=0;";
          if (typeof globalThis !== "undefined") {
            globalThis.dispatchEvent(new Event("auth:logout"));
          }
        }
        return null;
      } catch (error) {
        console.error("Token refresh failed (Network/Unknown):", error);
        return null;
      } finally {
        HttpClient.refreshPromise = null;
      }
    })();

    return HttpClient.refreshPromise;
  }

  async patch(path: string, data: any): Promise<any> {
    return this.sendRequest("PATCH", path, data);
  }

  async put(path: string, data: any): Promise<any> {
    return this.sendRequest("PUT", path, data);
  }

  async delete(path: string, data?: any): Promise<any> {
    return this.sendRequest("DELETE", path, data ?? null);
  }

  private async sendRequest(method: string, path: string, data: any): Promise<any> {
    let authToken: string | undefined;
    const execute = async () => {
      const url = this.baseUrl + path;
      const config = this.getConfig(authToken);
      const isFormData = data instanceof FormData;
      
      const headers = { ...config.headers };
      if (!isFormData) {
        headers["Content-Type"] = "application/json";
      }

      const response = await fetch(url, {
        method,
        headers,
        credentials: "include",
        body: isFormData ? data : JSON.stringify(data),
      });

      if (!response.ok) {
        throw new HttpError(await response.json(), response.status);
      }

      const result = await response.json();
      result.isSuccessful = true;
      return result;
    };

    try {
      return await execute();
    } catch (error) {
      if (this.isAuthError(error, path)) {
        const newToken = await this.attemptTokenRefresh();
        if (newToken) {
          authToken = newToken;
          try {
            return await execute();
          } catch (retryError) {
            return this.handleFetchError(retryError);
          }
        }
      }
      return this.handleFetchError(error);
    }
  }
}
