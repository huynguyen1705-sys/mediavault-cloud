import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
    optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts'],
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
