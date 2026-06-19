const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const sharedRoot = path.resolve(projectRoot, '../shared')

const config = getDefaultConfig(projectRoot)

// Permite a Metro resolver archivos fuera del directorio del proyecto
config.watchFolders = [sharedRoot]

// Mapea el alias @shared al directorio compartido
config.resolver.extraNodeModules = {
  '@shared': sharedRoot
}

module.exports = config
