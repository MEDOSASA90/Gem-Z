/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  reactCompiler: true,
  experimental: {
    turbopack: {
      root: "./"
    }
  }
};

export default nextConfig;
