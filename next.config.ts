import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-2971f994a6ac2fdadd4842209a20496e.r2.dev',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;