import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // We removed 'output: export' because we are now using Next.js API routes 
  // for secure hashed authentication. Vercel will automatically handle this.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
