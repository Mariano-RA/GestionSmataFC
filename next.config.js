const path = require('path');

module.exports = {
  reactStrictMode: true,
  // swcMinify option is no longer recognized in latest Next.js versions.
  // Minification is handled automatically in production builds.
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
  // ensure Turbopack knows the correct project root when multiple lockfiles
  turbopack: {
    root: __dirname,
  },
  webpack(config) {
    // Alias `@` to the `src` directory for imports like '@/components/...'
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    return config;
  },
};