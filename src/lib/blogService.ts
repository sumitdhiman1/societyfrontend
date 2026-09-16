import HttpClient from "./HttpClient";

class BlogService {
  private client: HttpClient;

  constructor() {
    this.client = new HttpClient();
  }

  async getBlogs(page: number = 1, limit: number = 10, category?: string) {
    const params: any = { page, limit };
    if (category) params.category = category;
    return this.client.get("/blogs", params);
  }

  async getBlogBySlug(slug: string) {
    return this.client.get(`/blogs/${slug}`);
  }

  async listTitles(page: number = 1, limit: number = 10) {
    return this.client.get("/blogs/list-titles", { page, limit });
  }
}

export const blogService = new BlogService();
