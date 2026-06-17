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

// src/types/session.ts

export interface TrainingSession {
  id: string;            // session_YYYY-MM-DD_HHhmmsss
  createdAt: number;
  
  device: {
    mac: string;
    name: string;        // snapshot del nombre
  };
  
  profile: CalibrationProfile;  // snapshot completo
  
  impacts: Impact[];
  rawReadings?: SensorReading[];
  
  duration: number;      // ms
  totalImpacts: number;
  validHits: number;     // impactos > 80%
  powerMax: number;      // máximo power detectado
  rpmAverage: number;    // golpes/minuto promedio
  notes?: string;
}

export interface SessionStats {
  duration: number;
  totalImpacts: number;
  validHits: number;
  validHitRate: number;  // porcentaje
  powerMax: number;
  rpmAverage: number;
  rpmMax: number;
  rpmMin: number;
  consistencyScore: number;  // varianza
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
  TrainingSession,
  SessionStats
} from './session';