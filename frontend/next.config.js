/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ["lucide-react"],
  experimental: {
    webpackBuildWorker: false,
    cpus: 1,
  },
};
