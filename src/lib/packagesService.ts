import HttpClient from "./HttpClient";

export class PackagesService {
  private session: any;

  constructor(session?: any) {
    this.session = session;
  }

  async getAllPackages(options?: any, ttl: number = 60000) {
    const client = new HttpClient(this.session);
    const url = this.buildPackagesUrl(options);
    return await client.get(url, {}, ttl);
  }

  private buildPackagesUrl(options?: any) {
    const baseUrl = options?.categorycode?.toUpperCase() === "BUNDLES" 
      ? "/bundles/getallbundles" 
      : "/packages/getallpackages";
      
    if (!options) return baseUrl;
    
    const params = new URLSearchParams();
    if (options.page) params.append("page", options.page.toString());
    if (options.limit) params.append("limit", options.limit.toString());
    if (options.categorycode) params.append("categorycode", options.categorycode);
    if (options.sortBy) params.append("sortBy", options.sortBy);
    if (options.minPrice != null) params.append("minPrice", options.minPrice.toString());
    if (options.maxPrice != null) params.append("maxPrice", options.maxPrice.toString());
    if (options.query) params.append("query", options.query);
    if (options.search) params.append("search", options.search);
    
    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  async getPackageById(id: string) {
    const client = new HttpClient(this.session);
    return await client.get(`/packages/getpackagebyid/${id}`, {}, 60000);
  }

  async getBundleById(id: string) {
    const client = new HttpClient(this.session);
    return await client.get(`/bundles/getbundlebyid/${id}`, {}, 60000);
  }

  async listCategories(options: { page: number; limit: number }) {
    const client = new HttpClient(this.session);
    return await client.get(`/categories/getallcategories?page=${options.page}&limit=${options.limit}`, {}, 300000);
  }

  async listPackages(options: { page: number; limit: number; categorycode?: string; categoryId?: string }) {
    return await this.getAllPackages(options);
  }

  async listBundles(options: { page: number; limit: number }) {
    return await this.getAllPackages({ ...options, categorycode: "BUNDLES" });
  }
}

export const packagesService = new PackagesService();
