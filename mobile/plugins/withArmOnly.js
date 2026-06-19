const { withSettingsGradle } = require('@expo/config-plugins')

/**
 * Fuerza arm64-v8a en todos los subproyectos de Gradle.
 *
 * react-native-worklets (dep transitiva de @react-navigation/drawer →
 * react-native-reanimated) no tiene prebuilts para x86_64. Expo CLI
 * sobreescribe gradle.properties con -PreactNativeArchitectures=x86_64
 * al detectar emuladores x86_64, lo que rompe la build nativa.
 *
 * gradle.beforeProject en settings.gradle fija arm64-v8a con precedencia
 * sobre el flag de CLI. Los emuladores con Android 12+ ejecutan arm64
 * vía traducción nativa.
 */
module.exports = function withArmOnly(config) {
  return withSettingsGradle(config, (config) => {
    if (!config.modResults.contents.includes('gradle.beforeProject')) {
      config.modResults.contents += `
gradle.beforeProject { proj ->
    proj.ext.reactNativeArchitectures = "arm64-v8a"
}
`
    }
    return config
  })
}
