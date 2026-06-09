/** @type {import('next').NextConfig} */
const extraOrigins = process.env.NEXT_PUBLIC_APP_URL
  ? [new URL(process.env.NEXT_PUBLIC_APP_URL).host]
  : []

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', ...extraOrigins],
    },
  },
}

export default nextConfig
