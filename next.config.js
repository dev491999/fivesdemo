
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost']
  },
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs']
  }
}

module.exports = nextConfig
