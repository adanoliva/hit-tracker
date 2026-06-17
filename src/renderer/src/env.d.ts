/// <reference types="vite/client" />

import type { ElectronAPI, BleDevice } from '../../preload/index'

declare global {
  interface Window {
    api: ElectronAPI
  }
}

export type { BleDevice }
