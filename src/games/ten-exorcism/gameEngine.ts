import type { Board, CellState, Selection, ValidationResult } from './types'
import { BOARD_COLS, BOARD_ROWS } from './types'
import { createSeededRandom, generateSeed } from './seededRandom'

/**
 * Create a board from a specific seed for deterministic generation
 */
export function createBoardFromSeed(seed: number): Board {
  const random = createSeededRandom(seed)
  const board: Board = []

  for (let row = 0; row < BOARD_ROWS; row++) {
    const rowData: CellState[] = []
    for (let col = 0; col < BOARD_COLS; col++) {
      rowData.push({
        power: Math.floor(random() * 9) + 1, // 1-9
      })
    }
    board.push(rowData)
  }

  return board
}

/**
 * Create initial board with a new random seed
 * Returns both the board and the seed for session tracking
 */
export function createInitialBoard(): { board: Board; seed: number } {
  const seed = generateSeed()
  const board = createBoardFromSeed(seed)
  return { board, seed }
}

/**
 * Normalize selection bounds to ensure minRow <= maxRow and minCol <= maxCol
 */
export function calculateSelectionBounds(
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number
): Selection {
  return {
    startRow: Math.min(startRow, endRow),
    startCol: Math.min(startCol, endCol),
    endRow: Math.max(startRow, endRow),
    endCol: Math.max(startCol, endCol),
  }
}

/**
 * Calculate the sum of power values in a selection
 */
export function calculatePowerSum(board: Board, selection: Selection): number {
  let sum = 0
  for (let row = selection.startRow; row <= selection.endRow; row++) {
    for (let col = selection.startCol; col <= selection.endCol; col++) {
      const power = board[row]?.[col]?.power
      if (power !== null && power !== undefined) {
        sum += power
      }
    }
  }
  return sum
}


/**
 * Count non-null cells in a selection
 */
export function countNonNullCells(board: Board, selection: Selection): number {
  let count = 0
  for (let row = selection.startRow; row <= selection.endRow; row++) {
    for (let col = selection.startCol; col <= selection.endCol; col++) {
      if (board[row]?.[col]?.power !== null) {
        count++
      }
    }
  }
  return count
}

/**
 * Validate a selection - check if sum equals 10
 */
export function validateSelection(board: Board, selection: Selection): ValidationResult {
  const sum = calculatePowerSum(board, selection)
  const tileCount = countNonNullCells(board, selection)

  return {
    isValid: sum === 10,
    sum,
    tileCount,
  }
}

/**
 * Execute exorcism - clear cells if valid, return new board
 */
export function executeExorcism(board: Board, selection: Selection): Board {
  const validation = validateSelection(board, selection)

  if (!validation.isValid) {
    return board // Return unchanged board for invalid selection
  }

  // Create a deep copy of the board
  const newBoard: Board = board.map((row) => row.map((cell) => ({ ...cell })))

  // Clear cells in the selection
  for (let row = selection.startRow; row <= selection.endRow; row++) {
    for (let col = selection.startCol; col <= selection.endCol; col++) {
      newBoard[row][col] = { power: null }
    }
  }

  return newBoard
}

/**
 * Calculate score increment for a valid exorcism
 */
export function calculateScoreIncrement(board: Board, selection: Selection): number {
  const validation = validateSelection(board, selection)
  return validation.isValid ? validation.tileCount : 0
}

/**
 * Check if there are any valid moves remaining on the board
 */
export function hasValidMoves(board: Board): boolean {
  // Check all possible rectangles
  for (let startRow = 0; startRow < BOARD_ROWS; startRow++) {
    for (let startCol = 0; startCol < BOARD_COLS; startCol++) {
      for (let endRow = startRow; endRow < BOARD_ROWS; endRow++) {
        for (let endCol = startCol; endCol < BOARD_COLS; endCol++) {
          const selection = { startRow, startCol, endRow, endCol }
          const sum = calculatePowerSum(board, selection)
          if (sum === 10) {
            return true // Early exit when valid move found
          }
          // Optimization: if sum > 10, no need to expand further in this direction
          if (sum > 10) {
            break
          }
        }
      }
    }
  }
  return false
}
