import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
  serverExternalPackages: ['@prisma/client'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-2971f994a6ac2fdadd4842209a20496e.r2.dev',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
