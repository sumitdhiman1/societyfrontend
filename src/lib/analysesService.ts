import HttpClient from "./HttpClient";

export class AnalysesService {
  private client: HttpClient;

  constructor(session?: any) {
    this.client = new HttpClient(session);
  }

  async getAllAnalyses(limit: number = 10, page: number = 1, status?: string) {
    let url = `/analyses/getallanalyses?limit=${limit}&page=${page}`;
    if (status && status !== "all") {
      url += `&status=${encodeURIComponent(status)}`;
    }
    return this.client.get(url);
  }

  async getAnalysisById(id: string) {
    return this.client.get(`/analyses/getanalysisbyid/${id}`);
  }

  async addMessage(
    analysisId: string,
    message: string,
    isInternal: boolean = false,
    attachments: any[] = [],
    recommendedSolutions?: any[]
  ) {
    return this.client.post(`/analyses/addmessage/${analysisId}`, {
      message,
      isInternal,
      attachments,
      recommendedSolutions,
    });
  }

  async acceptProposal(analysisId: string, proposalMessageId: string, username: string, userAvatar: string, comments: string = "") {
    return this.client.post(`/analyses/action/${analysisId}`, {
      action: "accept_addon",
      proposalMessageId,
      username,
      userAvatar,
      comments
    });
  }

  async declineProposal(analysisId: string, proposalMessageId: string, comments: string, username: string, userAvatar: string) {
    return this.client.post(`/analyses/action/${analysisId}`, {
      action: "decline_addon",
      proposalMessageId,
      comments,
      username,
      userAvatar
    });
  }

  async requestProposalModification(analysisId: string, proposalMessageId: string, comments: string, username: string, userAvatar: string) {
    return this.client.post(`/analyses/action/${analysisId}`, {
      action: "modify_addon",
      proposalMessageId,
      comments,
      username,
      userAvatar
    });
  }

  async getAnalysisFiles(analysisId: string) {
    return this.client.get(`/analyses/files/${analysisId}`);
  }

  async addAnalysisFile(analysisId: string, fileData: { name: string; url: string; size?: number; type?: string; source?: string; mimeType?: string; category?: string; [key: string]: any }) {
    return this.client.post(`/analyses/files/${analysisId}`, fileData);
  }

  async deleteAnalysisFile(analysisId: string, fileId: string) {
    return this.client.delete(`/analyses/files/${analysisId}/${fileId}`);
  }
}

export const analysesService = new AnalysesService();
export default AnalysesService;
