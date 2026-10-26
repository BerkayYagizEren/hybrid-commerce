import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hibrit e-ticaret platformu yapılandırması
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
