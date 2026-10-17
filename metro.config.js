const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const sharedRoot = path.resolve(projectRoot, './shared')
const sharedKernelRoot = path.resolve(projectRoot, './shared-kernel')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [sharedRoot, sharedKernelRoot]

config.resolver.extraNodeModules = {
  '@shared': sharedRoot,
  '@shared-kernel': sharedKernelRoot
}

// Fallback: alias directo para builds de release
config.resolver.alias = {
  '@shared': sharedRoot,
  '@shared-kernel': sharedKernelRoot
}

module.exports = config
