import type { Device } from '../types'

describe('HT-001 — Eliminación de modos de prueba', () => {

  describe('shared/types — símbolos eliminados', () => {
    it('PHONE_SENSOR_ID no existe en exports', () => {
      const types = require('../types')
      expect(types.PHONE_SENSOR_ID).toBeUndefined()
    })

    it('SensorPlacement no existe en exports', () => {
      const types = require('../types')
      expect(types.SensorPlacement).toBeUndefined()
    })

    it('PhoneSensorPlacement no existe en exports', () => {
      const types = require('../types')
      expect(types.PhoneSensorPlacement).toBeUndefined()
    })
  })

  describe('Device type — campo placement eliminado', () => {
    it('Device sin placement es un tipo válido', () => {
      const device: Device = {
        mac: 'AA:BB:CC:DD:EE:FF',
        name: 'HIT_TRACKER_PROTOTIPO',
        createdAt: 1000,
        lastSeen: 2000
      }
      expect(device.mac).toBe('AA:BB:CC:DD:EE:FF')
      expect(device.name).toBe('HIT_TRACKER_PROTOTIPO')
    })

    it('Device con placement en JSON legacy se deserializa sin crash', () => {
      const json = '{"mac":"AA:BB:CC","name":"Sensor","createdAt":1000,"lastSeen":2000,"placement":"front-vertical"}'
      const parsed = JSON.parse(json) as Device
      // placement es ignorado por TypeScript en runtime — el objeto existe sin error
      expect(parsed.mac).toBe('AA:BB:CC')
      expect(parsed.name).toBe('Sensor')
    })
  })

  describe('archivos eliminados', () => {
    it('mockSensor.ts no existe', () => {
      expect(() => require('../../src/renderer/src/services/mockSensor')).toThrow()
    })

    it('usePhoneSensor.ts no existe', () => {
      expect(() => require('../../mobile/src/core/hooks/usePhoneSensor')).toThrow()
    })
  })

})
