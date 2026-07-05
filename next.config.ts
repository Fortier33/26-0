import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.158"],
  productionBrowserSourceMaps: false,
  devIndicators: false,
};

export default nextConfig;
