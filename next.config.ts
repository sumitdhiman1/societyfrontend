import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const apiUrl = process.env.API_URL || "https://societywebapi.azurewebsites.net";
    return [
      {
        source: "/api-gateway/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "http",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "societywebsolutions.s3.ap-south-1.amazonaws.com",
      },
      {
        protocol: "http",
        hostname: "societywebsolutions.s3.ap-south-1.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
