/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
    unoptimized: process.env.NODE_ENV === 'development',
  },
};

module.exports = nextConfig;
