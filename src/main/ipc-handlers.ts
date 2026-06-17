import { ipcMain, app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import type { Training } from '../renderer/src/types'
import type { Device, CalibrationProfile } from '../renderer/src/types'

const DATA_DIR = join(app.getPath('userData'), 'HitTracker')
const TRAININGS_DIR = join(DATA_DIR, 'trainings')
const DEVICES_FILE = join(DATA_DIR, 'devices.json')
const PROFILES_FILE = join(DATA_DIR, 'profiles.json')
const CONFIG_FILE = join(DATA_DIR, 'app-config.json')

async function ensureDirs(): Promise<void> {
  await fs.mkdir(TRAININGS_DIR, { recursive: true })
}

export function registerIpcHandlers(): void {
  // Trainings
  ipcMain.handle('save-training', async (_, training: Training) => {
    await ensureDirs()
    const path = join(TRAININGS_DIR, `${training.id}.json`)
    await fs.writeFile(path, JSON.stringify(training, null, 2), 'utf8')
    return true
  })

  ipcMain.handle('load-trainings', async () => {
    await ensureDirs()
    const files = await fs.readdir(TRAININGS_DIR)
    const jsonFiles = files.filter((f) => f.endsWith('.json'))
    const trainings = await Promise.all(
      jsonFiles.map(async (f) => {
        const content = await fs.readFile(join(TRAININGS_DIR, f), 'utf8')
        return JSON.parse(content) as Training
      })
    )
    return trainings.sort((a, b) => b.createdAt - a.createdAt)
  })

  ipcMain.handle('delete-training', async (_, id: string) => {
    const path = join(TRAININGS_DIR, `${id}.json`)
    await fs.unlink(path)
    return true
  })

  // Devices
  ipcMain.handle('load-devices', async () => {
    await ensureDirs()
    try {
      const content = await fs.readFile(DEVICES_FILE, 'utf8')
      return JSON.parse(content) as Device[]
    } catch {
      return []
    }
  })

  ipcMain.handle('save-devices', async (_, devices: Device[]) => {
    await ensureDirs()
    await fs.writeFile(DEVICES_FILE, JSON.stringify(devices, null, 2), 'utf8')
    return true
  })

  // Profiles
  ipcMain.handle('load-profiles', async () => {
    await ensureDirs()
    try {
      const content = await fs.readFile(PROFILES_FILE, 'utf8')
      return JSON.parse(content) as CalibrationProfile[]
    } catch {
      return []
    }
  })

  ipcMain.handle('save-profiles', async (_, profiles: CalibrationProfile[]) => {
    await ensureDirs()
    await fs.writeFile(PROFILES_FILE, JSON.stringify(profiles, null, 2), 'utf8')
    return true
  })

  // Config
  ipcMain.handle('load-config', async () => {
    await ensureDirs()
    try {
      const content = await fs.readFile(CONFIG_FILE, 'utf8')
      return JSON.parse(content)
    } catch {
      return { theme: 'dark' }
    }
  })

  ipcMain.handle('save-config', async (_, config: Record<string, unknown>) => {
    await ensureDirs()
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8')
    return true
  })
}
