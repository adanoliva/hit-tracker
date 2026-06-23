# Feature: Logros & Hitos (Achievements)

## Overview

Implementar un sistema simple de logros/hitos en Hit Tracker que reconozca y celebre milestones significativos en el entrenamiento del usuario. Los logros sirven como motivación visual y registro de progreso sin necesidad de gamificación compleja.

## Context

Hit Tracker es un sistema de monitoreo de impactos en boxeo/fitness. Ya tiene:
- Captura de datos de golpes por usuario
- Histórico de sesiones
- Estadísticas por sesión (total golpes, duración, etc.)

Los logros aprovechan estos datos para marcar hitos importantes del usuario.

## Problem Statement

Users need simple motivation and progress recognition without:
- Leaderboards complejos
- Sistemas de puntuación
- Comparativas con otros (pueden venir después)

Un sistema de logros ligero proporciona satisfacción visual y registro tangible de progreso.

## User Story

**As a** usuario de Hit Tracker,
**I want to** desbloquear logros cuando alcanzo milestones,
**So that** tenga reconocimiento visual de mi progreso y motivación para seguir entrenando.

## Feature Scope

### What's Included

**Sistema de Logros Inicial** (12 logros base):

#### Categoría: Volumen
1. **"Primer Golpe"** - Registrar el primer golpe en Hit Tracker
2. **"Centena"** - 100 golpes totales en una sesión
3. **"Mil Golpes"** - 1,000 golpes históricos acumulados
4. **"Maratón"** - Una sesión de 15+ minutos

#### Categoría: Potencia
5. **"Fuerte"** - Un golpe con >1000 Newtons de fuerza
6. **"Muy Fuerte"** - Un golpe con >1500 Newtons
7. **"Potencia Consistente"** - 50+ golpes consecutivos sin caída de >20% de fuerza

#### Categoría: Consistencia
8. **"Ritmo Perfecto"** - 30+ golpes en < varianza de 10% de tiempo entre golpes
9. **"Sin Fatiga"** - Sesión de 10+ min sin degradación de potencia

#### Categoría: Dedicación
10. **"Primera Semana"** - Entrenar 3+ días en una semana
11. **"Racha de Fuego"** - 7 días consecutivos entrenando
12. **"Veterano"** - 30+ sesiones registradas

### What's Out of Scope

- Logros progresivos/graduados (nivel 1, 2, 3 del mismo logro)
- Puntos, XP, o sistemas de rewards
- Leaderboards
- Logros dinámicos basados en ML/form analysis
- Desbloqueo de contenido
- Social sharing de logros (puede venir después)

## Technical Requirements

### Architecture

**Storage**:
```
Core/types/achievements.ts
├── Achievement (type)
│   ├── id: string ("first-punch", "hundred-hits", etc.)
│   ├── name: string
│   ├── description: string
│   ├── icon: string (emoji o path a asset)
│   ├── category: "volume" | "power" | "consistency" | "dedication"
│   └── condition: (sessionData, historicalData) => boolean
│
├── UserAchievement (type)
│   ├── achievementId: string
│   ├── unlockedAt: ISO timestamp
│   └── sessionId?: string (sesión en que se desbloqueó)

Services/AchievementService.ts
├── checkAchievements(user, newSession, allSessions)
├── getUnlockedAchievements(userId)
├── getAchievementProgress(userId)
└── resetAchievements(userId) [debug/testing]

Hooks/useAchievements.ts
├── useAchievementCheck() - hook para trigger tras sesión
└── useAchievementsList() - hook para mostrar logros
```

**UI Components**:
```
components/AchievementBadge.tsx
├── Muestra un logro individual con icono + nombre
└── Estado: locked/unlocked

components/AchievementNotification.tsx
├── Toast/modal que aparece cuando se desbloquea un logro
└── Celebración visual (animación simple)

components/AchievementsGallery.tsx
├── Galería de todos los logros
├── Filtro por categoría
└── Muestra: bloqueados, desbloqueados + fecha
```

### Data Schema

**Achievement Conditions** (ejemplos):

```typescript
const achievements = [
  {
    id: "first-punch",
    name: "Primer Golpe",
    description: "Registra tu primer golpe",
    category: "volume",
    condition: (session, history) => history.totalSessions === 1 && session.impacts.length > 0
  },
  {
    id: "hundred-hits",
    name: "Centena",
    description: "100 golpes en una sesión",
    category: "volume",
    condition: (session) => session.impacts.length >= 100
  },
  {
    id: "thousand-hits",
    name: "Mil Golpes",
    description: "1,000 golpes históricos",
    category: "volume",
    condition: (session, history) => history.totalImpacts >= 1000
  },
  {
    id: "marathon",
    name: "Maratón",
    description: "Sesión de 15+ minutos",
    category: "volume",
    condition: (session) => session.durationMs >= 15 * 60 * 1000
  },
  {
    id: "strong-hit",
    name: "Fuerte",
    description: "Un golpe con >1000 N",
    category: "power",
    condition: (session) => session.impacts.some(i => i.force > 1000)
  },
  {
    id: "very-strong-hit",
    name: "Muy Fuerte",
    description: "Un golpe con >1500 N",
    category: "power",
    condition: (session) => session.impacts.some(i => i.force > 1500)
  },
  {
    id: "consistent-power",
    name: "Potencia Consistente",
    description: "50+ golpes sin caída >20%",
    category: "power",
    condition: (session) => {
      const impacts = session.impacts.slice(0, 50);
      if (impacts.length < 50) return false;
      const baseline = impacts[0].force;
      return impacts.every(i => i.force >= baseline * 0.8);
    }
  },
  {
    id: "perfect-rhythm",
    name: "Ritmo Perfecto",
    description: "30+ golpes, <10% varianza temporal",
    category: "consistency",
    condition: (session) => {
      const impacts = session.impacts.slice(0, 30);
      if (impacts.length < 30) return false;
      const intervals = impacts.slice(1).map((i, idx) => i.timestamp - impacts[idx].timestamp);
      const mean = intervals.reduce((a, b) => a + b) / intervals.length;
      const variance = Math.sqrt(intervals.reduce((sum, t) => sum + Math.pow(t - mean, 2)) / intervals.length);
      return (variance / mean) < 0.1;
    }
  },
  {
    id: "no-fatigue",
    name: "Sin Fatiga",
    description: "10+ min sin caída de potencia",
    category: "consistency",
    condition: (session) => {
      if (session.durationMs < 10 * 60 * 1000) return false;
      const impacts = session.impacts;
      const firstHalf = impacts.slice(0, Math.floor(impacts.length / 2));
      const secondHalf = impacts.slice(Math.floor(impacts.length / 2));
      const avgFirst = firstHalf.reduce((sum, i) => sum + i.force, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((sum, i) => sum + i.force, 0) / secondHalf.length;
      return avgSecond >= avgFirst * 0.9;
    }
  },
  {
    id: "first-week",
    name: "Primera Semana",
    description: "3+ días entrenando en una semana",
    category: "dedication",
    condition: (session, history) => {
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const sessionsThisWeek = history.sessions.filter(s => new Date(s.endTime).getTime() > oneWeekAgo);
      const daysWithSessions = new Set(sessionsThisWeek.map(s => new Date(s.endTime).toDateString()));
      return daysWithSessions.size >= 3;
    }
  },
  {
    id: "fire-streak",
    name: "Racha de Fuego",
    description: "7 días consecutivos entrenando",
    category: "dedication",
    condition: (session, history) => {
      // Check last 7 days for consecutive sessions
      const sortedSessions = history.sessions.sort((a, b) => 
        new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
      );
      // Complex logic to verify 7 consecutive days
      // (implementation detail, but doable)
      return checkConsecutiveDays(sortedSessions, 7);
    }
  },
  {
    id: "veteran",
    name: "Veterano",
    description: "30+ sesiones registradas",
    category: "dedication",
    condition: (session, history) => history.totalSessions >= 30
  }
];
```

**Storage en Zustand/Core Store**:

```typescript
// core/stores/achievementStore.ts
interface AchievementState {
  unlockedAchievements: Map<string, UserAchievement>;
  addUnlockedAchievement: (achievement: UserAchievement) => void;
  isAchievementUnlocked: (id: string) => boolean;
  getUnlockedCount: () => number;
}
```

### Platform Specifics

- **Desktop (Electron)**: Toast notification + animated badge appear
- **Mobile (React Native)**: Local notification + banner + gallery view
- No cloud sync required (local only, per user)

## User Flow

1. **Durante Sesión**: Usuario entrena normalmente
2. **Al Terminar Sesión**: App calcula automáticamente si se desbloquearon logros
3. **Notificación**: Si hay logro nuevo, muestra animación celebratoria + toast
4. **Galería de Logros**: Usuario puede ver todos los logros en settings/profile
   - Desbloqueados: con fecha
   - Bloqueados: con descripción de cómo desbloquear (opcional en v1)
5. **Persistencia**: Se guardan en sesión JSON (metadata.unlockedAchievements)

## Implementation Notes

### Simple & Pragmatic

- Sin animaciones complejas (un bounce simple es suficiente)
- Iconos: emojis simples (`🥊`, `⚡`, `🔥`, `🏆`) o assets SVG
- Sin progreso visual (no "X de Y")
- Check automático post-sesión, sin UI interruptiva si no hay logro

### Testing Strategy

- Unit tests: cada achievement condition
- Mock sessions para validar triggers
- E2E: completar sesión y verificar logro aparece

## Acceptance Criteria

- [ ] 12 logros iniciales definidos y codificados
- [ ] AchievementService comprueba logros post-sesión
- [ ] Nuevos logros guardados en metadata de sesión
- [ ] UI muestra notificación cuando se desbloquea logro
- [ ] Galería muestra todos los logros (desbloqueados + bloqueados)
- [ ] Persistencia: logros se cargan al abrir app
- [ ] Sin bugs en cálculos de logros (especialmente consistency)
- [ ] Código modular y fácil de agregar logros nuevos

## Deliverables

1. **Code**
   - `types/achievements.ts`: tipos y definiciones
   - `services/AchievementService.ts`: lógica de evaluación
   - `stores/achievementStore.ts`: persistencia Zustand
   - `hooks/useAchievements.ts`: hooks para UI
   - `components/AchievementBadge.tsx`, `AchievementNotification.tsx`, `AchievementsGallery.tsx`

2. **Tests**
   - Unit tests para cada achievement condition
   - Integration test: sesión completa → logros desbloqueados

3. **Documentation**
   - Actualizar README con mención a logros
   - Comentarios en código para condiciones complejas

## Estimated Effort

- **Service + store**: 1-2 días
- **UI components + notifications**: 1-2 días
- **Testing**: 1 día
- **Total**: ~3-4 días

---

**Status**: Ready for implementation
**Category**: Motivación & Engagement
**Complexity**: Low-Medium
