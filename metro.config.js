const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const sharedRoot = path.resolve(projectRoot, './shared')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [sharedRoot]

config.resolver.extraNodeModules = {
  '@shared': sharedRoot
}

// Fallback: alias directo para builds de release
config.resolver.alias = {
  '@shared': sharedRoot
}

module.exports = config
