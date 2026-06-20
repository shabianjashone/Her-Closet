// craco.config.js
const path = require("path");
require("dotenv").config();

// Check if we're in development/preview mode (not production build)
// Craco sets NODE_ENV=development for start, NODE_ENV=production for build
const isDevServer = process.env.NODE_ENV !== "production";

// Environment variable overrides
const config = {
  enableHealthCheck: process.env.ENABLE_HEALTH_CHECK === "true",
};

// Conditionally load health check modules only if enabled
let WebpackHealthPlugin;
let setupHealthEndpoints;
let healthPluginInstance;

if (config.enableHealthCheck) {
  WebpackHealthPlugin = require("./plugins/health-check/webpack-health-plugin");
  setupHealthEndpoints = require("./plugins/health-check/health-endpoints");
  healthPluginInstance = new WebpackHealthPlugin();
}

let webpackConfig = {
  eslint: {
    configure: {
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {

      // Add ignored patterns to reduce watched directories
        webpackConfig.watchOptions = {
          ...webpackConfig.watchOptions,
          ignored: [
            '**/node_modules/**',
            '**/.git/**',
            '**/build/**',
            '**/dist/**',
            '**/coverage/**',
            '**/public/**',
        ],
      };

      // Add health check plugin to webpack if enabled
      if (config.enableHealthCheck && healthPluginInstance) {
        webpackConfig.plugins.push(healthPluginInstance);
      }
      return webpackConfig;
    },
  },
};

webpackConfig.devServer = (devServerConfig) => {
  // Add health check endpoints if enabled
  if (config.enableHealthCheck && setupHealthEndpoints && healthPluginInstance) {
    const originalSetupMiddlewares = devServerConfig.setupMiddlewares;

    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      // Call original setup if exists
      if (originalSetupMiddlewares) {
        middlewares = originalSetupMiddlewares(middlewares, devServer);
      }

      // Setup health endpoints
      setupHealthEndpoints(devServer, healthPluginInstance);

      return middlewares;
    };
  }

  return devServerConfig;
};

// Wrap with visual edits (automatically adds babel plugin, dev server, and overlay in dev mode)
if (isDevServer) {
  try {
    const { withVisualEdits } = require("@emergentbase/visual-edits/craco");
    webpackConfig = withVisualEdits(webpackConfig);
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND' && err.message.includes('@emergentbase/visual-edits/craco')) {
      console.warn(
        "[visual-edits] @emergentbase/visual-edits not installed — visual editing disabled."
      );
    } else {
      throw err;
    }
  }
}

// Strip deprecated webpack-dev-server v4 options that visual-edits may inject
// (onBeforeSetupMiddleware / onAfterSetupMiddleware are not valid in WDS v5)
const originalDevServer = webpackConfig.devServer;
webpackConfig.devServer = (devServerConfig) => {
  let cfg = devServerConfig;
  if (typeof originalDevServer === "function") {
    cfg = originalDevServer(devServerConfig) || devServerConfig;
  }
  if (cfg && typeof cfg === "object") {
    delete cfg.onBeforeSetupMiddleware;
    delete cfg.onAfterSetupMiddleware;
    // WDS v4 → v5 deprecated keys
    delete cfg.https;
    delete cfg.http2;
    delete cfg.public;
    delete cfg.publicPath;
    delete cfg.contentBase;
    delete cfg.contentBasePublicPath;
    delete cfg.watchContentBase;
    delete cfg.disableHostCheck;
    delete cfg.sockHost;
    delete cfg.sockPath;
    delete cfg.sockPort;
    delete cfg.injectClient;
    delete cfg.injectHot;
    delete cfg.lazy;
    delete cfg.filename;
    delete cfg.useLocalIp;
    delete cfg.before;
    delete cfg.after;
    delete cfg.transportMode;
    delete cfg.serveIndex;
    delete cfg.stats;
    delete cfg.log;
    delete cfg.logLevel;
    delete cfg.logTime;
    delete cfg.noInfo;
    delete cfg.quiet;
    delete cfg.reporter;
    delete cfg.warn;
    delete cfg.features;
    delete cfg.fs;
    delete cfg.index;
    delete cfg.mimeTypes;
    delete cfg.publicPath;
    delete cfg.serverSideRender;
    delete cfg.writeToDisk;
    delete cfg.clientLogLevel;
    delete cfg.overlay;
    delete cfg.progress;
    delete cfg.profile;
    delete cfg.inline;
    delete cfg.staticOptions;
  }
  return cfg;
};

module.exports = webpackConfig;
