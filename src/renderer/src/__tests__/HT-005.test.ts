import { useGameStore, minScoreForTop3 } from '../stores/gameStore'
import type { GameTopThree } from '@shared/types'

jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn().mockResolvedValue(undefined)
}))

// Reset store to initial state before each test
beforeEach(() => {
  useGameStore.setState({
    topThree: [null, null, null],
    phase: 'idle',
    lastScore: null,
    pendingScore: null
  })
})

describe('HT-005 — Modo Game mejorado con TOP 3', () => {
  describe('minScoreForTop3', () => {
    it('should return 0 when TOP 3 has empty slots', () => {
      const top = [{ initials: 'AAA', score: 90, date: 0 }, null, null] as GameTopThree
      expect(minScoreForTop3(top)).toBe(0)
    })

    it('should return min+1 when TOP 3 is full', () => {
      const top = [
        { initials: 'AAA', score: 90, date: 0 },
        { initials: 'BBB', score: 80, date: 0 },
        { initials: 'CCC', score: 70, date: 0 }
      ] as GameTopThree
      expect(minScoreForTop3(top)).toBe(71)
    })

    it('should return 0 when TOP 3 is completely empty', () => {
      expect(minScoreForTop3([null, null, null])).toBe(0)
    })
  })

  describe('registerHit — entersTopThree logic', () => {
    it('should enter new-record phase when there are empty slots', () => {
      useGameStore.setState({
        topThree: [{ initials: 'AAA', score: 90, date: 0 }, null, null],
        phase: 'waiting'
      })
      useGameStore.getState().registerHit(50)
      const { phase, lastScore, pendingScore } = useGameStore.getState()
      expect(phase).toBe('new-record')
      expect(lastScore).toBe(50)
      expect(pendingScore).toBe(50)
    })

    it('should enter loser phase when score does not beat minimum of full TOP 3', () => {
      useGameStore.setState({
        topThree: [
          { initials: 'AAA', score: 90, date: 0 },
          { initials: 'BBB', score: 80, date: 0 },
          { initials: 'CCC', score: 70, date: 0 }
        ],
        phase: 'waiting'
      })
      useGameStore.getState().registerHit(65)
      expect(useGameStore.getState().phase).toBe('loser')
      expect(useGameStore.getState().lastScore).toBe(65)
    })

    it('should enter loser phase when score equals minimum (strictly greater required)', () => {
      useGameStore.setState({
        topThree: [
          { initials: 'AAA', score: 90, date: 0 },
          { initials: 'BBB', score: 80, date: 0 },
          { initials: 'CCC', score: 70, date: 0 }
        ],
        phase: 'waiting'
      })
      useGameStore.getState().registerHit(70)
      expect(useGameStore.getState().phase).toBe('loser')
    })

    it('should enter new-record phase when score strictly beats minimum', () => {
      useGameStore.setState({
        topThree: [
          { initials: 'AAA', score: 90, date: 0 },
          { initials: 'BBB', score: 80, date: 0 },
          { initials: 'CCC', score: 70, date: 0 }
        ],
        phase: 'waiting'
      })
      useGameStore.getState().registerHit(71)
      expect(useGameStore.getState().phase).toBe('new-record')
    })

    it('should round magnitude to integer', () => {
      useGameStore.setState({ topThree: [null, null, null], phase: 'waiting' })
      useGameStore.getState().registerHit(847.6)
      expect(useGameStore.getState().lastScore).toBe(848)
      expect(useGameStore.getState().pendingScore).toBe(848)
    })
  })

  describe('submitInitials — insertScore logic', () => {
    it('should insert score and displace last entry when TOP 3 is full', async () => {
      useGameStore.setState({
        topThree: [
          { initials: 'AAA', score: 90, date: 0 },
          { initials: 'BBB', score: 80, date: 0 },
          { initials: 'CCC', score: 70, date: 0 }
        ],
        phase: 'new-record',
        pendingScore: 85
      })
      await useGameStore.getState().submitInitials('DDD')
      const { topThree, phase } = useGameStore.getState()
      expect(phase).toBe('idle')
      expect(topThree[0]?.initials).toBe('AAA')
      expect(topThree[0]?.score).toBe(90)
      expect(topThree[1]?.initials).toBe('DDD')
      expect(topThree[1]?.score).toBe(85)
      expect(topThree[2]?.initials).toBe('BBB')
      expect(topThree[2]?.score).toBe(80)
    })

    it('should auto-uppercase initials', async () => {
      useGameStore.setState({ topThree: [null, null, null], phase: 'new-record', pendingScore: 100 })
      await useGameStore.getState().submitInitials('abc')
      expect(useGameStore.getState().topThree[0]?.initials).toBe('ABC')
    })

    it('should clear pendingScore after submit', async () => {
      useGameStore.setState({ topThree: [null, null, null], phase: 'new-record', pendingScore: 100 })
      await useGameStore.getState().submitInitials('AAA')
      expect(useGameStore.getState().pendingScore).toBeNull()
    })

    it('should not submit if pendingScore is null', async () => {
      useGameStore.setState({ topThree: [null, null, null], phase: 'new-record', pendingScore: null })
      await useGameStore.getState().submitInitials('AAA')
      expect(useGameStore.getState().topThree[0]).toBeNull()
    })
  })

  describe('cancelGame', () => {
    it('should return to idle and clear scores when cancelled during waiting', () => {
      useGameStore.setState({ phase: 'waiting', lastScore: 100, pendingScore: 100 })
      useGameStore.getState().cancelGame()
      const { phase, lastScore, pendingScore } = useGameStore.getState()
      expect(phase).toBe('idle')
      expect(lastScore).toBeNull()
      expect(pendingScore).toBeNull()
    })
  })

  describe('startGame / resetToIdle', () => {
    it('should transition from idle to waiting on startGame', () => {
      useGameStore.getState().startGame()
      expect(useGameStore.getState().phase).toBe('waiting')
    })

    it('should return to idle on resetToIdle', () => {
      useGameStore.setState({ phase: 'loser', lastScore: 50, pendingScore: 50 })
      useGameStore.getState().resetToIdle()
      const { phase, lastScore, pendingScore } = useGameStore.getState()
      expect(phase).toBe('idle')
      expect(lastScore).toBeNull()
      expect(pendingScore).toBeNull()
    })
  })
})
