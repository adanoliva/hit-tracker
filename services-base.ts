// src/services/bluetooth.ts

import type { SensorReading, Device } from '../types';

export class BluetoothService {
  private listeners: ((reading: SensorReading) => void)[] = [];
  private connectionListeners: ((connected: boolean) => void)[] = [];
  private currentDevice: Device | null = null;

  async connectToDevice(mac: string): Promise<boolean> {
    try {
      // TODO: Implementar conexión BLE real
      // Usar noble-mac o @abandonware/noble
      
      console.log(`[BLE] Conectando a ${mac}...`);
      
      // Simular conexión exitosa
      this.currentDevice = {
        mac,
        name: `Saco ${mac.slice(-5)}`,
        createdAt: Date.now(),
        lastSeen: Date.now(),
        isConnected: true
      };
      
      this.notifyConnectionChange(true);
      return true;
    } catch (error) {
      console.error('[BLE] Error conectando:', error);
      return false;
    }
  }

  async disconnectDevice(): Promise<void> {
    if (!this.currentDevice) return;
    
    console.log(`[BLE] Desconectando de ${this.currentDevice.mac}...`);
    
    this.currentDevice.isConnected = false;
    this.currentDevice = null;
    this.notifyConnectionChange(false);
  }

  async getAvailableDevices(): Promise<Device[]> {
    // TODO: Implementar escaneo BLE real
    console.log('[BLE] Escaneando dispositivos...');
    return [];
  }

  onSensorData(callback: (reading: SensorReading) => void): void {
    this.listeners.push(callback);
  }

  onConnectionChange(callback: (connected: boolean) => void): void {
    this.connectionListeners.push(callback);
  }

  isConnected(): boolean {
    return this.currentDevice?.isConnected ?? false;
  }

  getCurrentDevice(): Device | null {
    return this.currentDevice;
  }

  // Método interno para notificar lecturas (usado por receiver BLE)
  private notifySensorData(reading: SensorReading): void {
    this.listeners.forEach(listener => listener(reading));
  }

  // Método interno para notificar cambios de conexión
  private notifyConnectionChange(connected: boolean): void {
    this.connectionListeners.forEach(listener => listener(connected));
  }
}

export const bluetoothService = new BluetoothService();

// ============================================

// src/services/calibration.ts

import type { CalibrationProfile } from '../types';

export class CalibrationService {
  private profiles: Map<string, CalibrationProfile> = new Map();

  constructor() {
    this.initializeDefaultProfile();
  }

  private initializeDefaultProfile(): void {
    const defaultProfile: CalibrationProfile = {
      id: 'default-v1',
      name: 'Default',
      threshold: 15.0,
      sensitivity: 25.0,
      createdAt: Date.now()
    };
    
    this.profiles.set(defaultProfile.id, defaultProfile);
  }

  createProfile(name: string): CalibrationProfile {
    const id = `profile-${Date.now()}`;
    const profile: CalibrationProfile = {
      id,
      name,
      threshold: 15.0,        // valores default
      sensitivity: 25.0,
      createdAt: Date.now()
    };
    
    this.profiles.set(id, profile);
    return profile;
  }

  getProfile(id: string): CalibrationProfile | null {
    return this.profiles.get(id) || null;
  }

  getAllProfiles(): CalibrationProfile[] {
    return Array.from(this.profiles.values());
  }

  updateProfile(id: string, updates: Partial<CalibrationProfile>): void {
    const profile = this.profiles.get(id);
    if (profile) {
      this.profiles.set(id, { ...profile, ...updates });
    }
  }

  deleteProfile(id: string): void {
    if (id !== 'default-v1') {  // Proteger perfil default
      this.profiles.delete(id);
    }
  }

  // Analizar muestras de calibración y sugerir valores
  analyzeCalibrationSamples(
    light: number[],
    normal: number[],
    heavy: number[]
  ): { suggestedThreshold: number; suggestedSensitivity: number } {
    
    const avgLight = this.average(light);
    const avgNormal = this.average(normal);
    const avgHeavy = this.average(heavy);

    // Threshold entre ligero y normal
    const suggestedThreshold = avgLight + (avgNormal - avgLight) / 2;

    // Sensitivity: rango dinámico normalizado
    const suggestedSensitivity = (avgHeavy - suggestedThreshold) / 100;

    return {
      suggestedThreshold,
      suggestedSensitivity
    };
  }

  // Calcular intensidad (0-100) de una magnitud
  calculateIntensity(magnitude: number, profile: CalibrationProfile): number {
    const { threshold, sensitivity } = profile;
    
    if (magnitude < threshold) {
      return 0;
    }

    const intensity = ((magnitude - threshold) / sensitivity) * 100;
    return Math.min(100, Math.max(0, intensity));
  }

  // Verificar si es un golpe válido (> 80% del máximo)
  isValidHit(intensity: number, powerMax: number): boolean {
    const powerThreshold = powerMax * 0.8;
    const minIntensity = this.calculateIntensity(powerThreshold, {
      id: '',
      name: '',
      threshold: 0,
      sensitivity: 1,
      createdAt: 0
    });
    
    return intensity > minIntensity;
  }

  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }
}

export const calibrationService = new CalibrationService();

// ============================================

// src/services/session.ts

import type { TrainingSession, Impact, SessionStats } from '../types';
import { CalibrationProfile } from '../types';
import { Device } from '../types';

export class SessionService {
  private currentSession: Partial<TrainingSession> | null = null;
  private sessionStartTime: number = 0;

  startSession(
    device: Device,
    profile: CalibrationProfile,
    durationSeconds: number
  ): void {
    this.sessionStartTime = Date.now();

    this.currentSession = {
      id: this.generateSessionId(),
      createdAt: Date.now(),
      device: {
        mac: device.mac,
        name: device.name
      },
      profile,
      impacts: [],
      rawReadings: [],
      duration: durationSeconds * 1000,
      totalImpacts: 0,
      validHits: 0,
      powerMax: 0,
      rpmAverage: 0
    };

    console.log(`[Session] Iniciada: ${this.currentSession.id}`);
  }

  stopSession(): TrainingSession | null {
    if (!this.currentSession) return null;

    const session = this.currentSession as TrainingSession;
    const stats = this.calculateStats();

    // Actualizar estadísticas finales
    session.totalImpacts = stats.totalImpacts;
    session.validHits = stats.validHits;
    session.rpmAverage = stats.rpmAverage;

    this.currentSession = null;
    
    console.log(`[Session] Finalizada: ${session.id}`);
    return session;
  }

  onImpactDetected(impact: Impact): void {
    if (!this.currentSession) return;

    this.currentSession.impacts = this.currentSession.impacts || [];
    this.currentSession.impacts.push(impact);

    // Actualizar power máximo
    if (impact.magnitude > (this.currentSession.powerMax || 0)) {
      this.currentSession.powerMax = impact.magnitude;
    }

    // Contar golpes válidos
    if (impact.isValid) {
      this.currentSession.validHits = (this.currentSession.validHits || 0) + 1;
    }
  }

  getCurrentSession(): Partial<TrainingSession> | null {
    return this.currentSession;
  }

  private calculateStats(): SessionStats {
    if (!this.currentSession) {
      return {
        duration: 0,
        totalImpacts: 0,
        validHits: 0,
        validHitRate: 0,
        powerMax: 0,
        rpmAverage: 0,
        rpmMax: 0,
        rpmMin: 0,
        consistencyScore: 0
      };
    }

    const impacts = this.currentSession.impacts || [];
    const duration = Date.now() - this.sessionStartTime;
    const durationMinutes = duration / 60000;

    const validHits = impacts.filter(i => i.isValid).length;
    const validHitRate = impacts.length > 0 ? (validHits / impacts.length) * 100 : 0;
    const rpmAverage = durationMinutes > 0 ? impacts.length / durationMinutes : 0;

    return {
      duration,
      totalImpacts: impacts.length,
      validHits,
      validHitRate,
      powerMax: this.currentSession.powerMax || 0,
      rpmAverage,
      rpmMax: 0,  // TODO: calcular máximo RPM
      rpmMin: 0,  // TODO: calcular mínimo RPM
      consistencyScore: 0  // TODO: calcular varianza
    };
  }

  private generateSessionId(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `session_${year}-${month}-${day}_${hours}h${minutes}m${seconds}s`;
  }
}

export const sessionService = new SessionService();