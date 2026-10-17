const { withAppBuildGradle } = require('@expo/config-plugins')

/**
 * Firma los builds de release con un keystore de producción si existe.
 *
 * `android/` es generado por `expo prebuild` (no versionado) — cualquier
 * edición manual de build.gradle se pierde en el siguiente prebuild. Este
 * plugin la reinyecta cada vez. El keystore vive fuera de `android/`, en
 * `keystores/` (raíz del repo, gitignorado), para no perderlo nunca en un
 * `expo prebuild --clean`. Sin `keystores/keystore.properties`, cae de
 * vuelta al keystore de debug (build local normal, sin romper nada).
 */
module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents

    const propsLoader = `
def keystorePropertiesFile = rootProject.file('../keystores/keystore.properties')
def keystoreProperties = new Properties()
def hasReleaseKeystore = keystorePropertiesFile.exists()
if (hasReleaseKeystore) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
// Un .aab es siempre para Play: firmarlo con la clave de debug no debe pasar en silencio.
// (APK/run:android release sí cae a debug, para builds locales de prueba.)
if (!hasReleaseKeystore && gradle.startParameter.taskNames.any { it.toLowerCase().contains('bundlerelease') }) {
    throw new GradleException("Falta keystores/keystore.properties: no se puede generar el .aab firmado para Play")
}

android {`

    if (!contents.includes('hasReleaseKeystore')) {
      contents = contents.replace(/\nandroid \{/, propsLoader)

      contents = contents.replace(
        /(keyPassword 'android'\s*\n\s*\})(\s*\n\s*\})/,
        `$1
        release {
            if (hasReleaseKeystore) {
                storeFile rootProject.file('../keystores/' + keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }$2`
      )

      contents = contents.replace(
        /(release \{\s*\n\s*\/\/ Caution![^\n]*\n\s*\/\/ see[^\n]*\n\s*)signingConfig signingConfigs\.debug/,
        `$1signingConfig hasReleaseKeystore ? signingConfigs.release : signingConfigs.debug`
      )
    }

    config.modResults.contents = contents
    return config
  })
}
