import HttpClient from "./HttpClient";

export class MediaService {
  private client: HttpClient;

  constructor(session?: any) {
    this.client = new HttpClient(session);
  }

  async uploadImage(data: { file: File; folder?: string }) {
    const formData = new FormData();
    formData.append("file", data.file);
    if (data.folder) {
      formData.append("folder", data.folder);
    }
    // Note: HttpClient should handle multipart/form-data correctly when passing FormData
    return await this.client.post("/cloudinary/upload", formData);
  }
}

export const mediaService = new MediaService();
