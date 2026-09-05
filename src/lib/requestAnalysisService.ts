import HttpClient from "./HttpClient";

export function savePendingAnalysisId(analysisId: string) {
  if (typeof document === "undefined" || !analysisId) return;
  // Save in cookie (valid for 30 days)
  document.cookie = `pending_analysis_id=${encodeURIComponent(
    analysisId,
  )}; path=/; max-age=2592000; SameSite=Lax;`;
  try {
    localStorage.setItem("pending_analysis_id", analysisId);
    const existingStr = localStorage.getItem("pending_analysis_ids") || "[]";
    const existing = JSON.parse(existingStr);
    if (Array.isArray(existing) && !existing.includes(analysisId)) {
      existing.push(analysisId);
      localStorage.setItem("pending_analysis_ids", JSON.stringify(existing));
    }
  } catch (e) {}
}

export function savePendingAnalysisInfo(analysis: any) {
  if (typeof document === "undefined" || !analysis) return;
  const analysisId = analysis._id || analysis.id;
  if (analysisId) {
    savePendingAnalysisId(analysisId);
  }

  const client = typeof analysis.client === "object" ? analysis.client : {};
  
  // Clean email
  let email = analysis.clientEmail || client?.email || "";
  if (typeof email !== "string" || !email.includes("@")) {
    email = "";
  }

  // Filter dummy/placeholder names
  const dummyNames = ["unknown", "prospect", "client", "n/a", "null", "undefined", "user", "admin"];
  const isValidName = (name: any) => {
    if (!name || typeof name !== "string") return false;
    const clean = name.trim().toLowerCase();
    if (dummyNames.includes(clean)) return false;
    if (clean.includes("@")) return false; // Contains email address
    return true;
  };

  let fullName = "";
  if (isValidName(analysis.clientName)) {
    fullName = analysis.clientName.trim();
  } else if (isValidName(client?.fullName)) {
    fullName = client.fullName.trim();
  }

  let firstName = "";
  let lastName = "";

  if (isValidName(client?.firstName)) {
    firstName = client.firstName.trim();
  }
  if (isValidName(client?.lastName)) {
    lastName = client.lastName.trim();
  }

  if (!firstName && fullName) {
    const parts = fullName.split(/\s+/);
    firstName = parts[0] || "";
    lastName = parts.slice(1).join(" ") || "";
  }

  // Clean phone number
  let phoneNumber = analysis.phoneNumber || analysis.clientPhone || client?.phoneNumber || client?.phone || "";
  if (typeof phoneNumber !== "string" || !isValidName(phoneNumber)) {
    phoneNumber = "";
  }

  // Clean company name
  let companyName = analysis.clientCompany || analysis.companyName || client?.companyName || client?.company || "";
  if (typeof companyName !== "string" || !isValidName(companyName)) {
    companyName = "";
  }

  const targetWebsiteUrl = analysis.targetWebsiteUrl || analysis.websiteUrl || analysis.domain || "";

  const userInfo = {
    email: email.trim(),
    fullName: fullName.trim(),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    phoneNumber: phoneNumber.trim(),
    companyName: companyName.trim(),
    websiteUrl: typeof targetWebsiteUrl === "string" ? targetWebsiteUrl.trim() : "",
    analysisId: analysisId || "",
  };

  if (email || firstName || lastName || phoneNumber || companyName) {
    try {
      const encoded = btoa(encodeURIComponent(JSON.stringify(userInfo)));
      document.cookie = `pending_user_info=${encoded}; path=/; max-age=2592000; SameSite=Lax;`;
      localStorage.setItem("pending_user_info", JSON.stringify(userInfo));
    } catch (e) {}
  }
}

export function getPendingUserInfo(): {
  email?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  companyName?: string;
  websiteUrl?: string;
  analysisId?: string;
} | null {
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(^| )pending_user_info=([^;]+)/);
    if (match && match[2]) {
      try {
        const decoded = decodeURIComponent(atob(match[2]));
        return JSON.parse(decoded);
      } catch (e) {}
    }
  }
  if (typeof localStorage !== "undefined") {
    try {
      const stored = localStorage.getItem("pending_user_info");
      if (stored) return JSON.parse(stored);
    } catch (e) {}
  }
  return null;
}

export function clearPendingUserInfo() {
  if (typeof document !== "undefined") {
    document.cookie = "pending_user_info=; path=/; max-age=0; SameSite=Lax;";
    document.cookie = "pending_user_info=; path=/; max-age=0;";
  }
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem("pending_user_info");
    } catch (e) {}
  }
}

export function getPendingAnalysisIds(): string[] {
  const ids = new Set<string>();
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(^| )pending_analysis_id=([^;]+)/);
    if (match && match[2]) ids.add(decodeURIComponent(match[2]));
  }
  if (typeof localStorage !== "undefined") {
    try {
      const single = localStorage.getItem("pending_analysis_id");
      if (single) ids.add(single);
      const list = JSON.parse(localStorage.getItem("pending_analysis_ids") || "[]");
      if (Array.isArray(list)) list.forEach((id) => id && ids.add(id));
    } catch (e) {}
  }
  return Array.from(ids);
}

export function clearPendingAnalysisId() {
  if (typeof document !== "undefined") {
    document.cookie = "pending_analysis_id=; path=/; max-age=0; SameSite=Lax;";
    document.cookie = "pending_analysis_id=; path=/; max-age=0;";
  }
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem("pending_analysis_id");
      localStorage.removeItem("pending_analysis_ids");
    } catch (e) {}
  }
  clearPendingUserInfo();
}

export class RequestAnalysisService {
  async submitRequest(data: { email: string; websiteUrl: string }) {
    const client = new HttpClient();
    return await client.post("/request-analysis", data);
  }

  async getSettings(ttl: number = 900000) {
    const client = new HttpClient();
    return await client.get("/request-analysis/settings", {}, ttl);
  }

  async updateSettings(data: any) {
    const client = new HttpClient();
    return await client.patch("/request-analysis/settings", data);
  }

  async getProducts(activeOnly = true) {
    const client = new HttpClient();
    return await client.get("/request-analysis/products", { activeOnly });
  }

  async getProduct(id: string) {
    const client = new HttpClient();
    return await client.get(`/request-analysis/products/${id}`);
  }

  async getProjects() {
    const client = new HttpClient();
    return await client.get("/request-analysis/projects");
  }

  async getProject(id: string) {
    const client = new HttpClient();
    return await client.get(`/request-analysis/projects/${id}`);
  }

  async createProject(data: any) {
    const client = new HttpClient();
    return await client.post("/request-analysis/projects", data);
  }

  async renameProject(id: string, title: string) {
    const client = new HttpClient();
    return await client.patch(`/request-analysis/projects/${id}/rename`, { title });
  }

  async claimProject(data: { analysisId?: string; analysisIds?: string[] }) {
    const client = new HttpClient();
    return await client.post("/request-analysis/projects/claim", data);
  }
}

export const requestAnalysisService = new RequestAnalysisService();

export async function claimPendingAnalyses() {
  const pendingIds = getPendingAnalysisIds();
  if (!pendingIds || pendingIds.length === 0) return;
  try {
    const res = await requestAnalysisService.claimProject({ analysisIds: pendingIds });
    if (res && (res.isSuccessful || res.statusCode === 200 || res.data)) {
      clearPendingAnalysisId();
    }
  } catch (e) {
    console.error("Failed to claim pending analyses:", e);
  }
}
