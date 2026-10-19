import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    // All illustrations are local SVGs stored in /public/images (served as-is by next/image).
    dangerouslyAllowSVG: false,
  },
};

export default nextConfig;
