/** @type {import('next').NextConfig} */
const nextConfig = {
  headers: async () => [
    {
      source: '/admin/video-creator',
      headers: [
        { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        { key: 'Cross-Origin-Opener-Policy',   value: 'same-origin'  },
      ],
    },
  ],
};

export default nextConfig;
