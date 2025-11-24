/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Directory is now stable in Next.js 14
  eslint: {
    // Disable ESLint during build to avoid the deprecated options warning
    ignoreDuringBuilds: true,
  },
  // Habilita output standalone para Docker
  output: 'standalone',
};

module.exports = nextConfig;
