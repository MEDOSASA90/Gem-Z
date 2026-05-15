/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  trailingSlash: true,
  reactCompiler: true,
  experimental: {
    turbopack: {
      root: "./"
    }
  },
  // Runtime environment variables forwarded to the client
  env: {
    NEXT_PUBLIC_API_URL: process.env.API_URL || "http://localhost:5000",
  },
  // Image optimization (required for standalone)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
