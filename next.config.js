/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Updated configuration for Next.js 14
  output: 'standalone', // For better Docker support
};

module.exports = nextConfig; 