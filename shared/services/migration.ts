import type { Training } from '../types'
import { APP_VERSION, RAW16_FACTOR } from '../constants'

type MigrationFn = (training: Training) => Training

const MIGRATIONS: Array<{ from: string; to: string; fn: MigrationFn }> = [
  {
    from: '1.0.0',
    to:   '1.1.0',
    fn:   migrate_1_0_0_to_1_1_0
  }
]

function migrate_1_0_0_to_1_1_0(training: Training): Training {
  return {
    ...training,
    appVersion: '1.1.0',
    rounds: training.rounds.map((round) => ({
      ...round,
      impacts: round.impacts.map((impact) => ({
        ...impact,
        magnitude: Math.round(impact.magnitude * RAW16_FACTOR)
      }))
    }))
  }
}

export const migrationService = {
  migrate(trainings: Training[]): Training[] {
    return trainings.map((t) => migrationService.migrateOne(t))
  },

  migrateOne(training: Training): Training {
    let current = training
    let version = current.appVersion ?? '1.0.0'

    for (const migration of MIGRATIONS) {
      if (version === migration.from) {
        current = migration.fn(current)
        version = migration.to
      }
    }

    return current
  },

  needsMigration(training: Training): boolean {
    return (training.appVersion ?? '1.0.0') !== APP_VERSION
  }
}
