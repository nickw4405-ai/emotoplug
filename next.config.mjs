/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from external domains used in the app
  images: { unoptimized: true },
  // Increase serverless function timeout (Vercel Pro: 300s, Hobby: 10s)
  // Edge functions used for AI calls have no timeout limit
  experimental: {},
};

export default nextConfig;
