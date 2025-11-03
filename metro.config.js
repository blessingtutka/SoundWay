// const path = require('path');
// const { pathToFileURL } = require('url');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withNativeWind } = require('nativewind/metro');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */

const config = mergeConfig(getDefaultConfig(__dirname), {
  // transformer: {
  //   babelTransformerPath: require.resolve('nativewind/babel-transformer'),
  // },
  resolver: {
    unstable_enablePackageExports: false,
    sourceExts: [...getDefaultConfig(__dirname).resolver.sourceExts, 'css'],
  },
});

// const cssPath = pathToFileURL(
//   path.resolve(__dirname, 'src/assets/styles/global.css'),
// ).href;

module.exports = withNativeWind(config, {
  input: './src/assets/styles/global.css',
});

// module.exports = config;
