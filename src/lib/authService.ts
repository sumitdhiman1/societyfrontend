import HttpClient from "./HttpClient";

export class AuthService {
  private session: any;

  constructor(session?: any) {
    this.session = session;
  }

  async register(data: any) {
    const client = new HttpClient(this.session);
    return await client.post("/auth/register", data);
  }

  async login(data: any) {
    const client = new HttpClient(this.session);
    const response = await client.post("/auth/client/login", data);
    
    if (response.isSuccessful && response.data) {
      this.setSession(response.data);
      window.dispatchEvent(new Event("auth:login"));
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
            "Content-Type": "application/json"
          }
        }).catch(e => console.error("Logout API call failed:", e));
      } catch (error) {
        console.error("Logout API call failed:", error);
      }
    }
  }

  public setSession(data: any) {
    console.log("[AuthService] Setting session:", data);
    if (data.access_token) {
      this.setTokens(data.access_token, data.refresh_token);
    }
    if (data.user) {
      const userData = btoa(JSON.stringify(data.user));
      document.cookie = `user_data=${userData}; path=/; max-age=604800;`;
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
          return JSON.parse(atob(match[2]));
        } catch (error) {
          return null;
        }
      }
    }
    return null;
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken() || !!this.getRefreshToken();
  }

  updateInternalUser(data: any) {
    const user = this.getUser();
    if (user) {
      const updatedUser = btoa(JSON.stringify({ ...user, ...data }));
      document.cookie = `user_data=${updatedUser}; path=/; max-age=604800;`;
    }
  }

  loginWithGoogle() {
    const client = new HttpClient(this.session);
    window.location.href = `${client.baseUrl}/auth/google`;
  }
}

export const authService = new AuthService();
