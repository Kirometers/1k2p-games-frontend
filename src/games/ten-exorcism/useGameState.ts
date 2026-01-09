import { useState, useCallback, useRef, useEffect } from 'react'
import type { Board, Selection, GameSession, GameAction } from './types'
import {
  createBoardFromSeed,
  calculateSelectionBounds,
  validateSelection,
  executeExorcism,
  calculateScoreIncrement,
} from './gameEngine'
import { generateSeed } from './seededRandom'

// Game duration in seconds
const GAME_DURATION = 120

// Inline session management functions
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
  return {
    ...session,
    actions: [...session.actions, action],
  }
}

function finalizeSession(session: GameSession, finalScore: number): GameSession {
  return {
    ...session,
    finalScore,
    endTime: Date.now(),
    isComplete: true,
  }
}

export type GamePhase = 'title' | 'playing' | 'gameover'

export type GameStateHook = {
  phase: GamePhase
  board: Board
  score: number
  selection: Selection | null
  isGameOver: boolean
  isDragging: boolean
  timeRemaining: number
  session: GameSession
  startGame: () => void
  handleMouseDown: (row: number, col: number) => void
  handleMouseMove: (row: number, col: number) => void
  handleMouseUp: () => void
  resetGame: () => void
}


export function useGameState(): GameStateHook {
  const [phase, setPhase] = useState<GamePhase>('title')
  const [board, setBoard] = useState<Board>([])
  const [score, setScore] = useState(0)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(GAME_DURATION)

  const sessionRef = useRef<GameSession | null>(null)
  const dragStartRef = useRef<{ row: number; col: number } | null>(null)
  const timerRef = useRef<number | null>(null)

  const isGameOver = phase === 'gameover'

  // Timer effect
  useEffect(() => {
    if (phase === 'playing' && timeRemaining > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // Time's up!
            setPhase('gameover')
            if (sessionRef.current) {
              sessionRef.current = finalizeSession(sessionRef.current, score)
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current)
        }
      }
    }
  }, [phase, timeRemaining, score])

  const startGame = useCallback(() => {
    const newSeed = generateSeed()
    const newBoard = createBoardFromSeed(newSeed)
    setBoard(newBoard)
    setScore(0)
    setSelection(null)
    setIsDragging(false)
    setTimeRemaining(GAME_DURATION)
    sessionRef.current = createGameSession(newSeed)
    dragStartRef.current = null
    setPhase('playing')
  }, [])

  const handleMouseDown = useCallback((row: number, col: number) => {
    if (phase !== 'playing') return
    setIsDragging(true)
    dragStartRef.current = { row, col }
    setSelection({ startRow: row, startCol: col, endRow: row, endCol: col })
  }, [phase])

  const handleMouseMove = useCallback((row: number, col: number) => {
    if (!isDragging || !dragStartRef.current) return
    const newSelection = calculateSelectionBounds(
      dragStartRef.current.row,
      dragStartRef.current.col,
      row,
      col
    )
    setSelection(newSelection)
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    if (!isDragging || !selection) {
      setIsDragging(false)
      return
    }

    setIsDragging(false)
    const result = validateSelection(board, selection)

    // Log action to session
    if (sessionRef.current) {
      sessionRef.current = logAction(
        sessionRef.current,
        selection,
        result.isValid ? 'valid' : 'invalid',
        result.isValid ? result.tileCount : 0
      )
    }

    if (result.isValid) {
      const newBoard = executeExorcism(board, selection)
      const scoreIncrement = calculateScoreIncrement(board, selection)
      setBoard(newBoard)
      setScore((prev) => prev + scoreIncrement)

      // Clear selection after successful exorcism
      setTimeout(() => {
        setSelection(null)
      }, 200)
    } else {
      // Clear invalid selection after a short delay
      setTimeout(() => {
        setSelection(null)
      }, 300)
    }

    dragStartRef.current = null
  }, [isDragging, selection, board])

  const resetGame = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    setPhase('title')
    setBoard([])
    setScore(0)
    setSelection(null)
    setIsDragging(false)
    setTimeRemaining(GAME_DURATION)
    sessionRef.current = null
    dragStartRef.current = null
  }, [])

  return {
    phase,
    board,
    score,
    selection,
    isGameOver,
    isDragging,
    timeRemaining,
    session: sessionRef.current!,
    startGame,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetGame,
  }
}
