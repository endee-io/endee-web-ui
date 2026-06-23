import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained build for a small Docker runtime image.
  output: "standalone",

  // React Compiler (was babel-plugin-react-compiler under Vite).
  reactCompiler: true,

  // The `endee` SDK runs in the browser but relies on Node built-ins
  // (Buffer, zlib, crypto, stream, util). Under Vite this was handled by
  // vite-plugin-node-polyfills. For webpack we provide browser polyfills and
  // inject the Buffer/process globals. The build/dev scripts pass --webpack
  // so this config is used instead of Turbopack (Next 16's default).
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        buffer: require.resolve("buffer/"),
        crypto: require.resolve("crypto-browserify"),
        stream: require.resolve("stream-browserify"),
        zlib: require.resolve("browserify-zlib"),
        util: require.resolve("util/"),
        vm: require.resolve("vm-browserify"),
        process: require.resolve("process/browser"),
      };

      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ["buffer", "Buffer"],
          process: "process/browser",
        }),
      );
    }
    return config;
  },
};

export default nextConfig;
