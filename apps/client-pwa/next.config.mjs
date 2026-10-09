import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? 'http://api:4000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  turbopack: {
    root: workspaceRoot,
  },
  async rewrites() {
    return [
      {
        source: '/proxy/api/:path*',
        destination: `${API_INTERNAL_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
