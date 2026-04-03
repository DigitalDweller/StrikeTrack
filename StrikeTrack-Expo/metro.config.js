const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure @ alias resolves correctly (aligns with babel-plugin-module-resolver + tsconfig paths)
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@/')) {
    const relativePath = './' + moduleName.slice(2);
    return context.resolveRequest(context, relativePath, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
