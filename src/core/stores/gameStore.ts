import { create } from 'zustand'
import { storage } from '../../services/storage'
import type { GameTopThree, GameScore } from '../types'

type GamePhase = 'idle' | 'waiting' | 'new-record' | 'loser'

function entersTopThree(score: number, top: GameTopThree): boolean {
  const scores = top.filter(Boolean).map(e => e!.score)
  if (scores.length < 3) return true
  return score > Math.min(...scores)
}

function insertScore(entry: GameScore, top: GameTopThree): GameTopThree {
  const current = top.filter(Boolean) as GameScore[]
  const updated = [...current, entry].sort((a, b) => b.score - a.score).slice(0, 3)
  return [updated[0] ?? null, updated[1] ?? null, updated[2] ?? null]
}

export function minScoreForTop3(top: GameTopThree): number {
  const filled = top.filter(Boolean) as GameScore[]
  if (filled.length < 3) return 0
  return Math.min(...filled.map(e => e.score)) + 1
}

interface GameState {
  topThree: GameTopThree
  phase: GamePhase
  lastScore: number | null
  pendingScore: number | null
  startGame(): void
  cancelGame(): void
  registerHit(magnitude: number): void
  submitInitials(initials: string): Promise<void>
  resetToIdle(): void
  loadScores(): Promise<void>
}

export const useGameStore = create<GameState>((set, get) => ({
  topThree: [null, null, null],
  phase: 'idle',
  lastScore: null,
  pendingScore: null,

  startGame() { set({ phase: 'waiting' }) },
  cancelGame() { set({ phase: 'idle', lastScore: null, pendingScore: null }) },
  resetToIdle() { set({ phase: 'idle', lastScore: null, pendingScore: null }) },

  registerHit(magnitude) {
    const score = Math.round(magnitude)
    set({ lastScore: score, pendingScore: score })
    if (entersTopThree(score, get().topThree)) {
      set({ phase: 'new-record' })
    } else {
      set({ phase: 'loser' })
    }
  },

  async submitInitials(initials) {
    const { topThree, pendingScore } = get()
    if (pendingScore === null) return
    const entry: GameScore = { initials: initials.toUpperCase(), score: pendingScore, date: Date.now() }
    const newTop = insertScore(entry, topThree)
    await storage.saveGameScores(newTop)
    set({ topThree: newTop, phase: 'idle', pendingScore: null })
  },

  async loadScores() {
    try {
      const scores = await storage.loadGameScores()
      set({ topThree: scores ?? [null, null, null] })
    } catch {
      set({ topThree: [null, null, null] })
    }
  }
}))
