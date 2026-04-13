/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  // Ensure static files are served correctly
  async headers() {
    return [
      {
        source: '/novnc/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;