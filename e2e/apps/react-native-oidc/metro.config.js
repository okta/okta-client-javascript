/**
 * https://docs.expo.dev/guides/monorepos/#modify-the-metro-config
 * 
 * Since this is simply an e2e test app, I tried to avoid installing expo/react-native dependencies
 * within the monorepo and instead install them all within this project directory (utilized yarn workspace nohoist)
 * This caused some problems with expo, which expects to use the repo root (root yarn workspace) for dependencies
 * This configuration essentially tells Metro (the RN bundler) which `node_modules` directory to look in
 */

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
// This can be replaced with `find-yarn-workspace-root`
const monorepoRoot = path.resolve(projectRoot, '../../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [...config.watchFolders, monorepoRoot];
// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  ...config.resolver.nodeModulesPaths,
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
