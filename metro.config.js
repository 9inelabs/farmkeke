const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The Next.js website (web/) and the backend tests (convex-tests/) have their
// own node_modules; keep Metro out of both.
const dirPattern = (name) =>
  path.resolve(__dirname, name).replace(/[/\\]/g, '[/\\\\]').replace(/\./g, '\\.');

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
    new RegExp(`^${dirPattern('web')}[/\\\\].*`),
    new RegExp(`^${dirPattern('convex-tests')}[/\\\\].*`),
  ],
};

module.exports = config;
