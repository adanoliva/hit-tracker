// src/services/bluetooth.ts
// (Mismo que antes, sin cambios)

import type { SensorReading, Device } from '../types';

export class BluetoothService {
  private listeners: ((reading: SensorReading) => void)[] = [];
  private connectionListeners: ((connected: boolean) => void)[] = [];
  private currentDevice: Device | null = null;

  async connectToDevice(mac: string): Promise<boolean> {
    try {
      console.log(`[BLE] Conectando a ${mac}...`);
      
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

  private notifySensorData(reading: SensorReading): void {
    this.listeners.forEach(listener => listener(reading));
  }

  private notifyConnectionChange(connected: boolean): void {
    this.connectionListeners.forEach(listener => listener(connected));
  }
}

export const bluetoothService = new BluetoothService();

// ============================================

// src/services/calibration.ts
// (Mismo que antes, sin cambios)

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
      threshold: 15.0,
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
    if (id !== 'default-v1') {
      this.profiles.delete(id);
    }
  }

  analyzeCalibrationSamples(
    light: number[],
    normal: number[],
    heavy: number[]
  ): { suggestedThreshold: number; suggestedSensitivity: number } {
    
    const avgLight = this.average(light);
    const avgNormal = this.average(normal);
    const avgHeavy = this.average(heavy);

    const suggestedThreshold = avgLight + (avgNormal - avgLight) / 2;
    const suggestedSensitivity = (avgHeavy - suggestedThreshold) / 100;

    return {
      suggestedThreshold,
      suggestedSensitivity
    };
  }

  calculateIntensity(magnitude: number, profile: CalibrationProfile): number {
    const { threshold, sensitivity } = profile;
    
    if (magnitude < threshold) {
      return 0;
    }

    const intensity = ((magnitude - threshold) / sensitivity) * 100;
    return Math.min(100, Math.max(0, intensity));
  }

  isValidHit(intensity: number, powerMax: number): boolean {
    const powerThreshold = powerMax * 0.8;
    return intensity > powerThreshold;
  }

  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }
}

export const calibrationService = new CalibrationService();

// ============================================

// src/services/training.ts
// REFACTORIZADO: Maneja Training + Rounds

import type { 
  Training, 
  Round, 
  RoundStats, 
  TrainingStats, 
  Impact 
} from '../types';
import type { CalibrationProfile, Device } from '../types';

export class TrainingService {
  private currentTraining: Partial<Training> | null = null;
  private currentRound: Partial<Round> | null = null;
  private roundStartTime: number = 0;

  /**
   * Inicializa un nuevo entrenamiento con su configuración de rondas
   */
  startTraining(
    device: Device,
    profile: CalibrationProfile,
    roundDuration: number,    // segundos
    numRounds: number,
    restDuration: number      // segundos
  ): void {
    this.currentTraining = {
      id: this.generateSessionId(),
      createdAt: Date.now(),
      device: {
        mac: device.mac,
        name: device.name
      },
      profile,
      rounds: [],
      roundDuration,
      restDuration,
      totalDuration: 0,
      totalImpacts: 0,
      validHits: 0,
      powerMax: 0,
      avgRpmAcrossRounds: 0,
      bestRound: 0
    };

    console.log(`[Training] Iniciado: ${this.currentTraining.id}`);
    console.log(`[Training] ${numRounds}x${roundDuration}s + ${restDuration}s descanso`);
  }

  /**
   * Inicia una ronda específica dentro del entrenamiento
   */
  startRound(roundNumber: number): void {
    if (!this.currentTraining) {
      throw new Error('No training in progress');
    }

    this.roundStartTime = Date.now();

    this.currentRound = {
      id: `round_${roundNumber}`,
      number: roundNumber,
      startTime: this.roundStartTime,
      duration: 0,
      endTime: 0,
      impacts: [],
      stats: {
        totalImpacts: 0,
        validHits: 0,
        validHitRate: 0,
        powerMax: 0,
        rpmAverage: 0,
        rpmMax: 0,
        powerTrend: 'stable'
      }
    };

    console.log(`[Training] Iniciada ronda ${roundNumber}`);
  }

  /**
   * Finaliza la ronda actual y guarda sus stats
   */
  finishRound(): Round {
    if (!this.currentRound) {
      throw new Error('No round in progress');
    }

    const round = this.currentRound as Round;
    round.endTime = Date.now();
    round.duration = round.endTime - round.startTime;

    // Calcular stats de la ronda
    this.calculateRoundStats(round);

    // Guardar en training
    if (this.currentTraining?.rounds) {
      this.currentTraining.rounds.push(round);
    }

    console.log(`[Training] Ronda ${round.number} finalizada (${round.impacts.length} impactos)`);

    return round;
  }

  /**
   * Registra un impacto en la ronda actual
   */
  onImpactDetected(impact: Impact): void {
    if (!this.currentRound) return;

    this.currentRound.impacts = this.currentRound.impacts || [];
    this.currentRound.impacts.push(impact);

    // Actualizar power máximo de la ronda
    if (!this.currentRound.stats) {
      this.currentRound.stats = {
        totalImpacts: 0,
        validHits: 0,
        validHitRate: 0,
        powerMax: 0,
        rpmAverage: 0,
        rpmMax: 0,
        powerTrend: 'stable'
      };
    }

    if (impact.magnitude > this.currentRound.stats.powerMax) {
      this.currentRound.stats.powerMax = impact.magnitude;
    }
  }

  /**
   * Finaliza el entrenamiento completo y calcula stats globales
   */
  finishTraining(): Training {
    if (!this.currentTraining) {
      throw new Error('No training in progress');
    }

    const training = this.currentTraining as Training;

    // Calcular stats globales
    this.calculateTrainingStats(training);

    this.currentTraining = null;

    console.log(`[Training] Finalizado: ${training.id}`);
    console.log(`[Training] ${training.totalImpacts} impactos, ${training.validHits} válidos`);

    return training;
  }

  /**
   * Obtiene la ronda actual (útil para UI)
   */
  getCurrentRound(): Partial<Round> | null {
    return this.currentRound;
  }

  /**
   * Obtiene stats de la ronda anterior (para comparación durante descanso)
   */
  getPreviousRoundStats(): RoundStats | null {
    if (!this.currentTraining?.rounds || this.currentTraining.rounds.length === 0) {
      return null;
    }

    const lastRound = this.currentTraining.rounds[
      this.currentTraining.rounds.length - 1
    ];
    return lastRound.stats;
  }

  /**
   * Obtiene estado actual del entrenamiento
   */
  getCurrentTraining(): Partial<Training> | null {
    return this.currentTraining;
  }

  /**
   * Calcula stats de una ronda individual
   */
  private calculateRoundStats(round: Round): void {
    const impacts = round.impacts || [];
    const validHits = impacts.filter(i => i.isValid).length;
    const durationMinutes = (round.duration || 0) / 1000 / 60;

    round.stats = {
      totalImpacts: impacts.length,
      validHits,
      validHitRate: impacts.length > 0 ? (validHits / impacts.length) * 100 : 0,
      powerMax: Math.max(...impacts.map(i => i.magnitude), 0),
      rpmAverage: durationMinutes > 0 ? impacts.length / durationMinutes : 0,
      rpmMax: 0, // TODO: calcular máximo RPM local
      powerTrend: this.calculatePowerTrend(round)
    };
  }

  /**
   * Calcula stats globales del entrenamiento completo
   */
  private calculateTrainingStats(training: Training): void {
    const rounds = training.rounds || [];

    // Acumular impactos
    training.totalImpacts = rounds.reduce((sum, r) => sum + r.stats.totalImpacts, 0);
    training.validHits = rounds.reduce((sum, r) => sum + r.stats.validHits, 0);
    training.powerMax = Math.max(...rounds.map(r => r.stats.powerMax), 0);

    // Promediar RPM
    const avgRpms = rounds.map(r => r.stats.rpmAverage);
    training.avgRpmAcrossRounds = avgRpms.length > 0
      ? avgRpms.reduce((a, b) => a + b) / avgRpms.length
      : 0;

    // Encontrar mejor ronda (por validHitRate)
    training.bestRound = rounds.length > 0
      ? rounds.reduce((best, r, i) =>
          r.stats.validHitRate > rounds[best].stats.validHitRate ? i : best
        , 0)
      : 0;

    // Duración total (incluye descansos)
    const roundsDuration = rounds.reduce((sum, r) => sum + r.duration, 0);
    const restsDuration = (rounds.length - 1) * training.restDuration * 1000;
    training.totalDuration = roundsDuration + restsDuration;
  }

  /**
   * Determina si el power subió, bajó o se mantuvo igual entre rondas
   */
  private calculatePowerTrend(round: Round): 'up' | 'down' | 'stable' {
    const prev = this.getPreviousRoundStats();
    if (!prev) return 'stable';

    const diff = round.stats.powerMax - prev.powerMax;
    
    // Umbral de 5 m/s² para considerar cambio
    if (Math.abs(diff) < 5) return 'stable';
    
    return diff > 0 ? 'up' : 'down';
  }

  /**
   * Genera ID único para el entrenamiento
   */
  private generateSessionId(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `training_${year}-${month}-${day}_${hours}h${minutes}m${seconds}s`;
  }
}

export const trainingService = new TrainingService();
