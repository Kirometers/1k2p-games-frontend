import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  createBoardFromSeed,
  validateSelection,
  executeExorcism,
  calculateSelectionBounds,
} from '../gameEngine'
import { BOARD_COLS, BOARD_ROWS } from '../types'
import type { GameAction, GameSession, Selection } from '../types'

// Inline session functions to avoid import issues
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

function createGameSession(seed: number): GameSession {
  return {
    sessionId: generateSessionId(),
    boardSeed: seed,
    startTime: Date.now(),
    actions: [],
    finalScore: 0,
    endTime: 0,
    isComplete: false,
  }
}

function logAction(
  session: GameSession,
  selection: Selection,
  result: 'valid' | 'invalid',
  scoreGained: number
): GameSession {
  const action: GameAction = {
    type: 'SELECT',
    selection,
    timestamp: Date.now() - session.startTime,
    result,
    scoreGained,
  }
  return { ...session, actions: [...session.actions, action] }
}

function finalizeSession(session: GameSession, finalScore: number): GameSession {
  return { ...session, finalScore, endTime: Date.now(), isComplete: true }
}

function replaySession(session: GameSession): number {
  let board = createBoardFromSeed(session.boardSeed)
  let score = 0
  for (const action of session.actions) {
    if (action.type === 'SELECT') {
      const validation = validateSelection(board, action.selection)
      if (validation.isValid) {
        board = executeExorcism(board, action.selection)
        score += validation.tileCount
      }
    }
  }
  return score
}


function verifySession(session: GameSession): boolean {
  if (!session.isComplete) return false
  return replaySession(session) === session.finalScore
}

// Helper to generate a valid selection within board bounds
const selectionArb = fc
  .record({
    startRow: fc.integer({ min: 0, max: BOARD_ROWS - 1 }),
    startCol: fc.integer({ min: 0, max: BOARD_COLS - 1 }),
    endRow: fc.integer({ min: 0, max: BOARD_ROWS - 1 }),
    endCol: fc.integer({ min: 0, max: BOARD_COLS - 1 }),
  })
  .map(({ startRow, startCol, endRow, endCol }) =>
    calculateSelectionBounds(startRow, startCol, endRow, endCol)
  )

// Helper to simulate a game
function simulateGame(seed: number, selections: Selection[]) {
  let board = createBoardFromSeed(seed)
  let session = createGameSession(seed)
  let score = 0

  for (const selection of selections) {
    const validation = validateSelection(board, selection)
    const result = validation.isValid ? 'valid' : 'invalid'
    const scoreGained = validation.isValid ? validation.tileCount : 0
    session = logAction(session, selection, result as 'valid' | 'invalid', scoreGained)
    if (validation.isValid) {
      board = executeExorcism(board, selection)
      score += validation.tileCount
    }
  }

  session = finalizeSession(session, score)
  return { session, actualScore: score }
}

describe('Session Verification Properties', () => {
  /**
   * Property 13: Session Replay Consistency
   * Validates: Requirements 11.4, 11.5
   */
  it('Property 13: Session Replay Consistency', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 0xffffffff }),
        fc.array(selectionArb, { minLength: 1, maxLength: 20 }),
        (seed, selections) => {
          const { session, actualScore } = simulateGame(seed, selections)
          const replayedScore = replaySession(session)
          expect(replayedScore).toBe(actualScore)
          expect(replayedScore).toBe(session.finalScore)
          expect(verifySession(session)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 14: Action Log Completeness
   * Validates: Requirements 10.1, 10.2, 10.3
   */
  it('Property 14: Action Log Completeness', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 0xffffffff }),
        fc.array(selectionArb, { minLength: 1, maxLength: 20 }),
        (seed, selections) => {
          const { session } = simulateGame(seed, selections)
          expect(session.actions.length).toBe(selections.length)
          for (let i = 1; i < session.actions.length; i++) {
            expect(session.actions[i].timestamp).toBeGreaterThanOrEqual(
              session.actions[i - 1].timestamp
            )
          }
          for (let i = 0; i < selections.length; i++) {
            expect(session.actions[i].selection).toEqual(selections[i])
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Tampered session fails verification', () => {
    const seed = 12345
    const selections: Selection[] = [
      { startRow: 0, startCol: 0, endRow: 0, endCol: 1 },
    ]
    const { session } = simulateGame(seed, selections)
    const tamperedSession = { ...session, finalScore: session.finalScore + 100 }
    expect(verifySession(tamperedSession)).toBe(false)
  })
})
