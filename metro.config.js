const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The Next.js website lives in web/ with its own node_modules; keep Metro out of it.
const webDir = path.resolve(__dirname, 'web').replace(/[/\\]/g, '[/\\\\]');

const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg'],
  blockList: [
    ...[].concat(resolver.blockList ?? []),
    new RegExp(`^${webDir.replace(/\./g, '\\.')}[/\\\\].*`),
  ],
};

module.exports = config;
