import HttpClient from "./HttpClient";

class BlogService {
  private client: HttpClient;

  constructor() {
    this.client = new HttpClient();
  }

  async getBlogs(page: number = 1, limit: number = 5) {
    return this.client.get("/blogs", { page, limit });
  }

  async getBlogBySlug(slug: string) {
    return this.client.get(`/blogs/${slug}`);
  }

  async listTitles(page: number = 1, limit: number = 10) {
    return this.client.get("/blogs/list-titles", { page, limit });
  }
}

export const blogService = new BlogService();
