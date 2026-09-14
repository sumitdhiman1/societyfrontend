import HttpClient from "./HttpClient";
import { claimPendingAnalyses } from "./requestAnalysisService";

export class AuthService {
  private session: any;
  private inMemoryUser: any = null;

  constructor(session?: any) {
    this.session = session;
  }

  async register(data: any) {
    const client = new HttpClient(this.session);
    const response = await client.post("/auth/register", data);
    if (response.isSuccessful && response.data?.access_token) {
      this.setSession(response.data);
      window.dispatchEvent(new Event("auth:login"));
      claimPendingAnalyses();
    }
    return response;
  }

  async login(data: any) {
    const client = new HttpClient(this.session);
    const response = await client.post("/auth/client/login", data);
    
    if (response.isSuccessful && response.data) {
      this.setSession(response.data);
      window.dispatchEvent(new Event("auth:login"));
      claimPendingAnalyses();
    }
    return response;
  }

  async forgotPassword(email: string) {
    const client = new HttpClient(this.session);
    return await client.post("/auth/forgot-password", { email });
  }

  async resetPassword(token: string, password: string) {
    const client = new HttpClient(this.session);
    return await client.post("/auth/reset-password", { token, password });
  }

  async verifyEmail(token: string) {
    const client = new HttpClient(this.session);
    return await client.post("/auth/verify-email", { token });
  }

  async resendVerificationEmail(email: string) {
    const client = new HttpClient(this.session);
    return await client.post("/auth/resend-verification-email", { email });
  }

  async changePassword(token: string, oldPassword: string, newPassword: string) {
    const client = new HttpClient(this.session);
    return await client.post("/auth/change-password", { token, oldPassword, newPassword });
  }

  async refreshToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return null;
    
    try {
      const client = new HttpClient(this.session);
      const response = await client.post("/auth/refresh", { refreshToken });
      
      if (response.isSuccessful && response.data) {
        this.setTokens(response.data.access_token, response.data.refresh_token);
        return response.data.access_token;
      }
      
      this.logout();
      return null;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      this.logout();
      return null;
    }
  }

  async logout() {
    const token = this.getAccessToken();
    const refreshToken = this.getRefreshToken();

    // Clear cookies immediately so subsequent navigations don't see stale cookies
    document.cookie = "access_token=; path=/; max-age=0; SameSite=Strict";
    document.cookie = "access_token=; path=/; max-age=0;";
    document.cookie = "refresh_token=; path=/; max-age=0; SameSite=Strict";
    document.cookie = "refresh_token=; path=/; max-age=0;";
    document.cookie = "user_data=; path=/; max-age=0;";
    window.dispatchEvent(new Event("auth:logout"));

    if (token) {
      try {
        // Send logout request without relying on cookies
        fetch("/api-gateway/auth/logout", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        }).catch((e) => console.error("Logout API call failed:", e));
      } catch (error) {
        console.error("Logout API call failed:", error);
      }
    }
  }

  private encodeUserData(obj: any): string {
    try {
      const jsonStr = JSON.stringify(obj);
      return btoa(
        encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) =>
          String.fromCharCode(parseInt(p1, 16))
        )
      );
    } catch {
      return btoa(JSON.stringify(obj));
    }
  }

  private decodeUserData(base64Str: string): any {
    try {
      const decoded = decodeURIComponent(
        atob(base64Str)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(decoded);
    } catch {
      return JSON.parse(atob(base64Str));
    }
  }

  decodeToken(token?: string | null): any {
    const t = token || this.getAccessToken();
    if (!t || typeof t !== "string") return null;
    try {
      const parts = t.split(".");
      if (parts.length !== 3) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch {
      try {
        return JSON.parse(atob(t.split(".")[1]));
      } catch {
        return null;
      }
    }
  }

  getUserId(): string | null {
    const user = this.getUser();
    const uId = user?.id || user?._id;
    if (uId && String(uId) !== "undefined" && String(uId) !== "null") {
      return String(uId);
    }

    const token = this.getAccessToken();
    if (token) {
      const decoded = this.decodeToken(token);
      const sub = decoded?.sub || decoded?.id || decoded?._id;
      if (sub && String(sub) !== "undefined" && String(sub) !== "null") {
        return String(sub);
      }
    }
    return null;
  }

  public setSession(data: any) {
    console.log("[AuthService] Setting session:", data);
    if (data.access_token) {
      this.setTokens(data.access_token, data.refresh_token);
    }
    if (data.user) {
      try {
        const userData = this.encodeUserData(data.user);
        document.cookie = `user_data=${userData}; path=/; max-age=604800; SameSite=Lax;`;
      } catch (e) {
        console.error("Failed to save user_data cookie:", e);
      }
    }
  }

  private setTokens(accessToken: string, refreshToken: string) {
    document.cookie = `access_token=${accessToken}; path=/; max-age=900;`;
    document.cookie = `refresh_token=${refreshToken}; path=/; max-age=604800;`;
  }

  getAccessToken(): string | null {
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/(^| )access_token=([^;]+)/);
      if (match) return match[2];
    }
    return null;
  }

  getRefreshToken(): string | null {
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/(^| )refresh_token=([^;]+)/);
      if (match) return match[2];
    }
    return null;
  }

  getUser(): any | null {
    let cookieUser: any = null;
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/(^| )user_data=([^;]+)/);
      if (match) {
        try {
          const raw = decodeURIComponent(match[2]);
          const parsed = this.decodeUserData(raw);
          if (parsed && (parsed.id || parsed._id || parsed.email)) {
            cookieUser = parsed;
          }
        } catch {
          try {
            const parsed = this.decodeUserData(match[2]);
            if (parsed && (parsed.id || parsed._id || parsed.email)) {
              cookieUser = parsed;
            }
          } catch {}
        }
      }
    }

    if (this.inMemoryUser) {
      return cookieUser ? { ...cookieUser, ...this.inMemoryUser } : this.inMemoryUser;
    }
    if (cookieUser) return cookieUser;

    // Fallback: decode user basics from JWT token if cookie is missing or corrupt
    const decoded = this.decodeToken();
    if (decoded && (decoded.sub || decoded.email)) {
      return {
        id: decoded.sub,
        _id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
      };
    }

    return null;
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken() || !!this.getRefreshToken();
  }

  async getProfile() {
    if (!this.isAuthenticated()) return null;
    try {
      const client = new HttpClient(this.session);
      let res = await client.get("/auth/me");
      let user = res?.data?.user || res?.user || res?.data;
      if (!user || (!user.id && !user._id && !user.email)) {
        res = await client.get("/profile/getmyprofile");
        user = res?.data?.user || res?.user || res?.data;
      }
      if (user && (user.id || user._id || user.email)) {
        this.updateInternalUser(user);
        const merged = { ...(this.getUser() || {}), ...user };
        this.inMemoryUser = merged;
        return merged;
      }
    } catch (e) {
      console.warn("[AuthService] getProfile error:", e);
    }
    return this.getUser();
  }

  updateInternalUser(data: any) {
    const user = this.getUser();
    const updated = { ...(user || {}), ...data };
    this.inMemoryUser = updated;
    try {
      const updatedUser = this.encodeUserData(updated);
      document.cookie = `user_data=${updatedUser}; path=/; max-age=604800; SameSite=Lax;`;
    } catch (e) {
      console.error("Failed to update user_data cookie:", e);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("auth:user_update"));
    }
  }

  loginWithGoogle() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    if (typeof window !== "undefined") {
      const redirectUri = encodeURIComponent(window.location.origin);
      window.location.href = `${apiUrl}/auth/google?redirect_uri=${redirectUri}`;
    }
  }

  loginWithFacebook() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    if (typeof window !== "undefined") {
      const redirectUri = encodeURIComponent(window.location.origin);
      window.location.href = `${apiUrl}/auth/facebook?redirect_uri=${redirectUri}`;
    }
  }

  handleSocialCallback(accessToken: string, refreshToken: string, user?: any) {
    if (accessToken) {
      this.setTokens(accessToken, refreshToken || "");
    }
    if (user) {
      try {
        const userData = this.encodeUserData(user);
        document.cookie = `user_data=${userData}; path=/; max-age=604800; SameSite=Lax;`;
      } catch (e) {
        console.error("Failed to encode user data in social callback:", e);
      }
    }
    window.dispatchEvent(new Event("auth:login"));
    claimPendingAnalyses();
  }

  /**
   * Send unauthenticated users to login, preserving the current (or given) path.
   */
  redirectToLogin(redirectPath?: string): void {
    if (typeof window === "undefined") return;
    const path = redirectPath ?? `${window.location.pathname}${window.location.search}`;
    window.location.assign(`/login?redirect=${encodeURIComponent(path)}`);
  }

  /**
   * True when an API/UI error is an auth failure (guest or expired session).
   */
  isUnauthorizedError(error: unknown): boolean {
    if (error == null) return false;
    if (typeof error === "string") {
      return error.trim().toLowerCase() === "unauthorized";
    }
    if (typeof error === "object") {
      const record = error as { status?: number; message?: unknown };
      if (record.status === 401) return true;
      if (typeof record.message === "string") {
        return record.message.trim().toLowerCase() === "unauthorized";
      }
    }
    return false;
  }
}

export const authService = new AuthService();
