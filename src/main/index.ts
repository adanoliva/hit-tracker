import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc-handlers'

let mainWindow: BrowserWindow | null = null
let bluetoothSelectCallback: ((deviceId: string) => void) | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    icon: join(__dirname, '../../resources/icon.ico'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Intercepta el picker nativo de BLE y lo redirige al renderer
  mainWindow.webContents.on('select-bluetooth-device', (event, deviceList, callback) => {
    event.preventDefault()
    bluetoothSelectCallback = callback
    mainWindow?.webContents.send('ble-devices-updated', deviceList)
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// El renderer envía el deviceId elegido por el usuario
ipcMain.on('ble-select-device', (_, deviceId: string) => {
  if (bluetoothSelectCallback) {
    bluetoothSelectCallback(deviceId)
    bluetoothSelectCallback = null
  }
})

// El renderer cancela el escaneo
ipcMain.on('ble-cancel-scan', () => {
  if (bluetoothSelectCallback) {
    bluetoothSelectCallback('')
    bluetoothSelectCallback = null
  }
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.hittracker.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
