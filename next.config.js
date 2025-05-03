/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable ESLint during builds (we'll run it separately)
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Disable TypeScript type checking during builds (we'll run it separately)
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    // If client-side, don't polyfill Node.js modules
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        os: false,
        child_process: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        util: false,
        assert: false,
        url: false,
        punycode: false,
        querystring: false,
        buffer: false,
        constants: false,
        vm: false,
        tty: false,
        events: false,
        string_decoder: false,
        dns: false,
        timers: false,
        dgram: false,
      };
    }

    return config;
  },
  // Disable image optimization for development
  images: {
    unoptimized: process.env.NODE_ENV === "development",
  },
};

module.exports = nextConfig;
