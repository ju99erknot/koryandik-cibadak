import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com;
  style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com;
  font-src 'self' https://cdnjs.cloudflare.com;
  img-src 'self' data: blob: https:;
  connect-src 'self' https://*.supabase.co;
`;

const nextConfig: NextConfig = {
  async headers() {
    if (!isProd) {
      return [];
    }
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\s{2,}/g, ' ').trim(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
