// Wrapper seguro para react-native-ble-plx
// Si el módulo nativo no está disponible (build incompleto, emulador sin BLE)
// devuelve un stub que no crashea

let BleManagerClass: any = null

try {
  BleManagerClass = require('react-native-ble-plx').BleManager
} catch {
  // nativo no disponible
}

export const isBleAvailable = BleManagerClass !== null

let _instance: any = null

export function getBleManager() {
  if (!isBleAvailable) return null
  if (!_instance) {
    try {
      _instance = new BleManagerClass()
    } catch {
      return null
    }
  }
  return _instance
}
