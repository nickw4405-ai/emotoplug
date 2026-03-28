/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  experimental: {},
  async headers() {
    return [
      {
        // Never cache the main HTML page — fixes Safari serving stale versions
        source: '/',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
      {
        // Never cache static JS/CSS so version bumps always take effect
        source: '/:file(app\\.js|style\\.css)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
