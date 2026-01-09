// Board dimensions (10 rows × 17 columns)
export const BOARD_ROWS = 10
export const BOARD_COLS = 17

// Cell state representing either a ghost or empty cell
export type CellState = {
  power: number | null // 1-9 for ghost, null for empty
}

// Board represented as 2D array [row][col]
export type Board = CellState[][]

// Rectangle selection coordinates
export type Selection = {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
}

// Game state
export type GameState = {
  board: Board
  score: number
  selection: Selection | null
  isGameOver: boolean
  isDragging: boolean
  seed: number
}

// Selection validation result
export type ValidationResult = {
  isValid: boolean
  sum: number
  tileCount: number
}

// Individual game action for logging
export type GameAction = {
  type: 'SELECT'
  selection: Selection
  timestamp: number // ms since game start
  result: 'valid' | 'invalid'
  scoreGained: number
}

// Complete game session for verification
export type GameSession = {
  sessionId: string
  boardSeed: number
  startTime: number
  actions: GameAction[]
  finalScore: number
  endTime: number
  isComplete: boolean
}
