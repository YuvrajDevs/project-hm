import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Icons are small local PNGs, so the image optimizer is not needed
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
