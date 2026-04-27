import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Increase body size limit for large file uploads (video/audio)
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
  // Separate limit for client-side uploads via middleware (fetch API)
  middlewareClientMaxBodySize: '500mb',
  // Use images domains for R2
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
