import HttpClient from "./HttpClient";
import { claimPendingAnalyses } from "./requestAnalysisService";

export class AuthService {
  private session: any;

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
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/(^| )user_data=([^;]+)/);
      if (match) {
        try {
          const raw = decodeURIComponent(match[2]);
          const parsed = this.decodeUserData(raw);
          if (parsed && (parsed.id || parsed._id || parsed.email)) {
            return parsed;
          }
        } catch {
          try {
            const parsed = this.decodeUserData(match[2]);
            if (parsed && (parsed.id || parsed._id || parsed.email)) {
              return parsed;
            }
          } catch {}
        }
      }
    }

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
      const res = await client.get("/auth/me");
      const user = res?.data?.user || res?.user || res?.data;
      if (user) {
        this.updateInternalUser(user);
        return user;
      }
    } catch {
      // ignore
    }
    return this.getUser();
  }

  updateInternalUser(data: any) {
    const user = this.getUser();
    const updated = { ...(user || {}), ...data };
    const updatedUser = btoa(JSON.stringify(updated));
    document.cookie = `user_data=${updatedUser}; path=/; max-age=604800;`;
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
      const userData = btoa(JSON.stringify(user));
      document.cookie = `user_data=${userData}; path=/; max-age=604800;`;
    }
    window.dispatchEvent(new Event("auth:login"));
    claimPendingAnalyses();
  }
}

export const authService = new AuthService();
