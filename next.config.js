/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    webpack: (config, { isServer }) => {
        // Externalize ssh2 and its native dependencies for server-side
        if (isServer) {
            config.externals = config.externals || [];
            config.externals.push('ssh2');
        }

        // Ignore .node files
        config.module = config.module || {};
        config.module.rules = config.module.rules || [];
        config.module.rules.push({
            test: /\.node$/,
            use: 'node-loader',
        });

        return config;
    },
}

module.exports = nextConfig
