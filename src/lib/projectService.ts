import HttpClient from "./HttpClient";
import CacheManager from "./CacheManager";

export class ProjectService {
  private client: HttpClient;

  constructor(session?: any) {
    this.client = new HttpClient(session);
  }

  async getAllProjects(limit: number = 10, page: number = 1, status?: string) {
    let url = `/projects/getallprojects?limit=${limit}&page=${page}`;
    if (status && status !== "all") {
      url += `&status=${encodeURIComponent(status)}`;
    }
    return this.client.get(url);
  }

  async getRenewals() {
    return this.client.get("/projects/get-renewals");
  }

  async getProjectById(id: string) {
    return this.client.get(`/projects/getprojectbyid/${id}`);
  }

  async addMessage(
    projectId: string,
    message: string,
    isInternal: boolean = false,
    attachments: any[] = [],
    recommendedSolutions?: any[]
  ) {
    return this.client.post(`/projects/addmessage/${projectId}`, {
      message,
      isInternal,
      attachments,
      recommendedSolutions,
    });
  }

  async acceptProposal(projectId: string, proposalMessageId: string, username: string, userAvatar: string, comments: string = "") {
    return this.client.post(`/projects/action/${projectId}`, {
      action: "accept_addon",
      proposalMessageId,
      username,
      userAvatar,
      comments
    });
  }

  async declineProposal(projectId: string, proposalMessageId: string, comments: string, username: string, userAvatar: string) {
    return this.client.post(`/projects/action/${projectId}`, {
      action: "decline_addon",
      proposalMessageId,
      comments,
      username,
      userAvatar
    });
  }

  async requestProposalModification(projectId: string, proposalMessageId: string, comments: string, username: string, userAvatar: string) {
    return this.client.post(`/projects/action/${projectId}`, {
      action: "request_addon_modification",
      proposalMessageId,
      comments,
      username,
      userAvatar
    });
  }

  async getDashboardStats(status?: string) {
    const cacheKey = status ? `dashboard_stats_${status}` : "dashboard_stats_all";
    const url = status ? `/projects/dashboard-stats?status=${encodeURIComponent(status)}` : "/projects/dashboard-stats";
    
    return CacheManager.getInstance().getOrFetch(
      cacheKey,
      () => this.client.get(url),
      900000 // 15 mins
    );
  }

  async markMessagesAsRead(projectId: string) {
    console.warn("markMessagesAsRead endpoint not implemented yet");
    return Promise.resolve();
  }

  async getProjectFiles(projectId: string) {
    return this.client.get(`/projects/files/${projectId}`);
  }

  async addProjectFile(projectId: string, data: any) {
    return this.client.post(`/projects/files/${projectId}`, data);
  }

  async deleteProjectFile(projectId: string, fileId: string) {
    return this.client.delete(`/projects/files/${projectId}/${fileId}`);
  }

  async pauseProject(projectId: string, pauseReason: string, note: string) {
    return this.client.patch(`/projects/pause/${projectId}`, { pauseReason, note });
  }

  async resumeProject(projectId: string, note: string) {
    return this.client.patch(`/projects/resume/${projectId}`, { note });
  }

  async restartMonthlyProject(projectId: string) {
    return this.client.patch(`/projects/restart/${projectId}`, {});
  }

  async renameProject(projectId: string, title: string) {
    return this.client.patch(`/projects/rename/${projectId}`, { title });
  }
}

export const projectService = new ProjectService();
