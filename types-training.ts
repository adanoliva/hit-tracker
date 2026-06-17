// src/types/sensor.ts

export interface SensorReading {
  timestamp: number;      // ms desde inicio
  ax: number;            // aceleración X (m/s²)
  ay: number;            // aceleración Y (m/s²)
  az: number;            // aceleración Z (m/s²)
  gx: number;            // rotación X (°/s)
  gy: number;            // rotación Y (°/s)
  gz: number;            // rotación Z (°/s)
  magnitude: number;     // sqrt(ax² + ay² + az²)
}

export interface Impact {
  time: number;          // timestamp del impacto
  intensity: number;     // 0-100 escalado
  magnitude: number;     // raw magnitude
  duration: number;      // ms que duró el pico
  isValid: boolean;      // > 80% del power máximo
}

// src/types/device.ts

export interface Device {
  mac: string;           // Dirección MAC (único)
  name: string;          // Nombre custom
  createdAt: number;     // timestamp creación
  lastSeen: number;      // última conexión
  isConnected?: boolean;
}

// src/types/profile.ts

export interface CalibrationData {
  calibratedAt: number;
  samples: {
    light: number[];     // magnitudes golpes ligeros
    normal: number[];    // magnitudes golpes normales
    heavy: number[];     // magnitudes golpes fuertes
  };
}

export interface CalibrationProfile {
  id: string;            // UUID único
  name: string;          // Nombre del perfil
  threshold: number;     // Umbral de detección
  sensitivity: number;   // Sensibilidad de intensidad
  calibrationData?: CalibrationData;
  createdAt: number;
}

// src/types/training.ts (REFACTORIZADO)

/**
 * Estadísticas de una ronda individual
 */
export interface RoundStats {
  totalImpacts: number;
  validHits: number;
  validHitRate: number;     // porcentaje
  powerMax: number;
  rpmAverage: number;
  rpmMax: number;
  powerTrend: 'up' | 'down' | 'stable';  // comparado con ronda anterior
}

/**
 * Una ronda de entrenamiento
 * Ejemplo: 3 minutos de golpes, 1 minuto de descanso
 */
export interface Round {
  id: string;            // round_1, round_2, etc
  number: number;        // 1, 2, 3... (para orden)
  
  startTime: number;     // timestamp inicio
  endTime: number;       // timestamp fin
  duration: number;      // ms de la ronda
  
  impacts: Impact[];
  stats: RoundStats;
}

/**
 * Entrenamiento completo
 * Contiene múltiples rondas + descansos
 * 
 * Ejemplo:
 * - 3 rondas de 3 minutos
 * - Descansos de 1 minuto entre rondas
 * - Total: ~11 minutos
 */
export interface Training {
  id: string;            // training_2025-01-16_14h32m47s
  createdAt: number;
  
  device: {
    mac: string;
    name: string;        // snapshot del nombre
  };
  
  profile: CalibrationProfile;  // snapshot completo
  
  // Configuración de rondas
  rounds: Round[];
  roundDuration: number;   // segundos, duración por ronda
  restDuration: number;    // segundos, descanso entre rondas
  
  // Stats globales
  totalDuration: number;      // ms incluye rondas + descansos
  totalImpacts: number;
  validHits: number;
  powerMax: number;
  avgRpmAcrossRounds: number;
  bestRound: number;          // índice de la mejor ronda (0-based)
  
  notes?: string;
}

/**
 * Estadísticas completas de un entrenamiento
 * Se calcula al finalizar
 */
export interface TrainingStats {
  totalDuration: number;
  totalRounds: number;
  totalImpacts: number;
  validHits: number;
  validHitRate: number;
  powerMax: number;
  avgRpmAcrossRounds: number;
  bestRound: number;
  
  // Tendencias
  powerProgression: 'up' | 'down' | 'stable';
  rpmProgression: 'up' | 'down' | 'stable';
  consistencyScore: number;  // varianza entre rondas
}

// src/types/index.ts

export type {
  SensorReading,
  Impact
} from './sensor';

export type {
  Device
} from './device';

export type {
  CalibrationProfile,
  CalibrationData
} from './profile';

export type {
  Training,
  Round,
  RoundStats,
  TrainingStats
} from './training';
