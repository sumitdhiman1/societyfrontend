import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.API_URL ||
      "http://localhost:5001",
    NEXT_PUBLIC_DISABLE_SIGNUP:
      process.env.NEXT_PUBLIC_DISABLE_SIGNUP ||
      (process.env.NODE_ENV === "production" ? "true" : "false"),
  },
  async rewrites() {

    const apiUrl =
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:5001";
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
