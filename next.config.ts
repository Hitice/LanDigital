import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.trycloudflare.com", "*.loca.lt", "192.168.15.4", "192.168.15.0/24"],
  serverExternalPackages: ["@anthropic-ai/sdk"],
};

export default nextConfig;
