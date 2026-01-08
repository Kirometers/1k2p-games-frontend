import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  createBoardFromSeed,
  createInitialBoard,
  calculateSelectionBounds,
  calculatePowerSum,
  validateSelection,
  executeExorcism,
  calculateScoreIncrement,
  countNonNullCells,
  hasValidMoves,
} from '../gameEngine'
import type { Board } from '../types'
import { BOARD_COLS, BOARD_ROWS } from '../types'

/**
 * Feature: ten-exorcism-game
 * Property-based tests for board initialization
 */

describe('Board Initialization Properties', () => {
  /**
   * Property 1: Board Dimensions Invariant
   * For any generated board, the board SHALL have exactly 17 rows and 10 columns.
   * Validates: Requirements 1.1
   */
  it('Property 1: Board Dimensions Invariant', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 0xffffffff }), (seed) => {
        const board = createBoardFromSeed(seed)

        // Board should have exactly BOARD_ROWS rows
        expect(board.length).toBe(BOARD_ROWS)

        // Each row should have exactly BOARD_COLS columns
        for (const row of board) {
          expect(row.length).toBe(BOARD_COLS)
        }
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2: Initial Power Values Range
   * For any cell in a newly generated board, the power value SHALL be an integer between 1 and 9 inclusive.
   * Validates: Requirements 1.2
   */
  it('Property 2: Initial Power Values Range', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 0xffffffff }), (seed) => {
        const board = createBoardFromSeed(seed)

        for (let row = 0; row < BOARD_ROWS; row++) {
          for (let col = 0; col < BOARD_COLS; col++) {
            const power = board[row][col].power
            expect(power).not.toBeNull()
            expect(power).toBeGreaterThanOrEqual(1)
            expect(power).toBeLessThanOrEqual(9)
            expect(Number.isInteger(power)).toBe(true)
          }
        }
      }),
      { numRuns: 100 }
    )
  })


  /**
   * Property 12: Deterministic Board Generation
   * For any seed value, calling createBoardFromSeed with the same seed SHALL produce identical boards.
   * Validates: Requirements 9.1, 9.2
   */
  it('Property 12: Deterministic Board Generation', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 0xffffffff }), (seed) => {
        const board1 = createBoardFromSeed(seed)
        const board2 = createBoardFromSeed(seed)

        // Boards should be identical
        for (let row = 0; row < BOARD_ROWS; row++) {
          for (let col = 0; col < BOARD_COLS; col++) {
            expect(board1[row][col].power).toBe(board2[row][col].power)
          }
        }
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Additional test: createInitialBoard returns valid board and seed
   */
  it('createInitialBoard returns board with valid seed', () => {
    const { board, seed } = createInitialBoard()

    // Board should have correct dimensions
    expect(board.length).toBe(BOARD_ROWS)
    expect(board[0].length).toBe(BOARD_COLS)

    // Seed should be a number
    expect(typeof seed).toBe('number')

    // Board should be reproducible from seed
    const reproducedBoard = createBoardFromSeed(seed)
    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        expect(board[row][col].power).toBe(reproducedBoard[row][col].power)
      }
    }
  })
})


describe('Selection Bounds Properties', () => {
  /**
   * Property 3: Rectangle Selection Bounds
   * For any two points (startRow, startCol) and (endRow, endCol) on the board,
   * the calculated selection SHALL form a valid rectangle with normalized bounds
   * (minRow ≤ maxRow, minCol ≤ maxCol).
   * Validates: Requirements 2.1, 2.2
   */
  it('Property 3: Rectangle Selection Bounds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: BOARD_ROWS - 1 }),
        fc.integer({ min: 0, max: BOARD_COLS - 1 }),
        fc.integer({ min: 0, max: BOARD_ROWS - 1 }),
        fc.integer({ min: 0, max: BOARD_COLS - 1 }),
        (startRow, startCol, endRow, endCol) => {
          const selection = calculateSelectionBounds(startRow, startCol, endRow, endCol)

          // Bounds should be normalized
          expect(selection.startRow).toBeLessThanOrEqual(selection.endRow)
          expect(selection.startCol).toBeLessThanOrEqual(selection.endCol)

          // All original points should be within the selection
          expect(selection.startRow).toBeLessThanOrEqual(Math.min(startRow, endRow))
          expect(selection.endRow).toBeGreaterThanOrEqual(Math.max(startRow, endRow))
          expect(selection.startCol).toBeLessThanOrEqual(Math.min(startCol, endCol))
          expect(selection.endCol).toBeGreaterThanOrEqual(Math.max(startCol, endCol))

          // Selection should be exactly the bounding rectangle
          expect(selection.startRow).toBe(Math.min(startRow, endRow))
          expect(selection.endRow).toBe(Math.max(startRow, endRow))
          expect(selection.startCol).toBe(Math.min(startCol, endCol))
          expect(selection.endCol).toBe(Math.max(startCol, endCol))
        }
      ),
      { numRuns: 100 }
    )
  })
})


// Helper to generate a valid selection within board bounds
const selectionArb = fc.record({
  startRow: fc.integer({ min: 0, max: BOARD_ROWS - 1 }),
  startCol: fc.integer({ min: 0, max: BOARD_COLS - 1 }),
  endRow: fc.integer({ min: 0, max: BOARD_ROWS - 1 }),
  endCol: fc.integer({ min: 0, max: BOARD_COLS - 1 }),
}).map(({ startRow, startCol, endRow, endCol }) => 
  calculateSelectionBounds(startRow, startCol, endRow, endCol)
)

// Helper to generate a board with some cells potentially empty
const boardWithEmptyCellsArb = fc.integer({ min: 0, max: 0xffffffff }).chain((seed) => {
  const board = createBoardFromSeed(seed)
  return fc.array(
    fc.record({
      row: fc.integer({ min: 0, max: BOARD_ROWS - 1 }),
      col: fc.integer({ min: 0, max: BOARD_COLS - 1 }),
    }),
    { minLength: 0, maxLength: 20 }
  ).map((emptyCells) => {
    const newBoard: Board = board.map((row) => row.map((cell) => ({ ...cell })))
    for (const { row, col } of emptyCells) {
      newBoard[row][col] = { power: null }
    }
    return newBoard
  })
})

describe('Validation Properties', () => {
  /**
   * Property 4: Power Sum Calculation Correctness
   * For any board and valid selection, the calculated sum SHALL equal the sum of all
   * non-null power values within the selected rectangle.
   * Validates: Requirements 3.1
   */
  it('Property 4: Power Sum Calculation Correctness', () => {
    fc.assert(
      fc.property(boardWithEmptyCellsArb, selectionArb, (board, selection) => {
        const calculatedSum = calculatePowerSum(board, selection)

        // Manually calculate expected sum
        let expectedSum = 0
        for (let row = selection.startRow; row <= selection.endRow; row++) {
          for (let col = selection.startCol; col <= selection.endCol; col++) {
            const power = board[row][col].power
            if (power !== null) {
              expectedSum += power
            }
          }
        }

        expect(calculatedSum).toBe(expectedSum)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 5: Validation Correctness
   * For any selection, the validation result isValid SHALL be true if and only if
   * the power sum equals exactly 10.
   * Validates: Requirements 3.2, 3.3, 3.4
   */
  it('Property 5: Validation Correctness', () => {
    fc.assert(
      fc.property(boardWithEmptyCellsArb, selectionArb, (board, selection) => {
        const result = validateSelection(board, selection)
        const sum = calculatePowerSum(board, selection)

        // isValid should be true iff sum === 10
        expect(result.isValid).toBe(sum === 10)
        expect(result.sum).toBe(sum)
      }),
      { numRuns: 100 }
    )
  })
})


describe('Exorcism Properties', () => {
  /**
   * Property 6: Exorcism Clears Selected Cells
   * For any valid exorcism (sum = 10), all cells within the selected rectangle
   * SHALL have their power set to null after execution.
   * Validates: Requirements 4.1, 4.2
   */
  it('Property 6: Exorcism Clears Selected Cells', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 0xffffffff }),
        selectionArb,
        (seed, selection) => {
          const board = createBoardFromSeed(seed)
          const validation = validateSelection(board, selection)

          if (validation.isValid) {
            const newBoard = executeExorcism(board, selection)

            // All cells in selection should be null
            for (let row = selection.startRow; row <= selection.endRow; row++) {
              for (let col = selection.startCol; col <= selection.endCol; col++) {
                expect(newBoard[row][col].power).toBeNull()
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 8: Invalid Selection Preserves Board
   * For any invalid selection (sum ≠ 10), the board SHALL remain unchanged after the operation.
   * Validates: Requirements 4.4
   */
  it('Property 8: Invalid Selection Preserves Board', () => {
    fc.assert(
      fc.property(boardWithEmptyCellsArb, selectionArb, (board, selection) => {
        const validation = validateSelection(board, selection)

        if (!validation.isValid) {
          const newBoard = executeExorcism(board, selection)

          // Board should be unchanged
          for (let row = 0; row < BOARD_ROWS; row++) {
            for (let col = 0; col < BOARD_COLS; col++) {
              expect(newBoard[row][col].power).toBe(board[row][col].power)
            }
          }
        }
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 9: Non-Selected Cells Preservation
   * For any exorcism operation, all cells outside the selected rectangle
   * SHALL retain their original power values.
   * Validates: Requirements 5.1, 5.4
   */
  it('Property 9: Non-Selected Cells Preservation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 0xffffffff }),
        selectionArb,
        (seed, selection) => {
          const board = createBoardFromSeed(seed)
          const newBoard = executeExorcism(board, selection)

          // Cells outside selection should be unchanged
          for (let row = 0; row < BOARD_ROWS; row++) {
            for (let col = 0; col < BOARD_COLS; col++) {
              const isInSelection =
                row >= selection.startRow &&
                row <= selection.endRow &&
                col >= selection.startCol &&
                col <= selection.endCol

              if (!isInSelection) {
                expect(newBoard[row][col].power).toBe(board[row][col].power)
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 10: No New Ghosts Property
   * For any exorcism operation, no cell that was empty (power = null) before
   * the operation SHALL become non-empty after.
   * Validates: Requirements 5.2, 5.3
   */
  it('Property 10: No New Ghosts Property', () => {
    fc.assert(
      fc.property(boardWithEmptyCellsArb, selectionArb, (board, selection) => {
        const newBoard = executeExorcism(board, selection)

        // No empty cell should become non-empty
        for (let row = 0; row < BOARD_ROWS; row++) {
          for (let col = 0; col < BOARD_COLS; col++) {
            if (board[row][col].power === null) {
              expect(newBoard[row][col].power).toBeNull()
            }
          }
        }
      }),
      { numRuns: 100 }
    )
  })
})


describe('Score Calculation Properties', () => {
  /**
   * Property 7: Score Increment Correctness
   * For any valid exorcism, the score SHALL increase by exactly the count of
   * non-null cells in the selection before exorcism.
   * Validates: Requirements 4.3, 6.2
   */
  it('Property 7: Score Increment Correctness', () => {
    fc.assert(
      fc.property(boardWithEmptyCellsArb, selectionArb, (board, selection) => {
        const validation = validateSelection(board, selection)
        const scoreIncrement = calculateScoreIncrement(board, selection)
        const nonNullCount = countNonNullCells(board, selection)

        if (validation.isValid) {
          // Score increment should equal non-null cell count
          expect(scoreIncrement).toBe(nonNullCount)
          expect(scoreIncrement).toBeGreaterThan(0)
        } else {
          // Invalid selection should give 0 score
          expect(scoreIncrement).toBe(0)
        }
      }),
      { numRuns: 100 }
    )
  })
})


describe('Valid Moves Detection Properties', () => {
  /**
   * Property 11: Valid Moves Detection
   * For any board, hasValidMoves SHALL return true if and only if there exists
   * at least one rectangle where the sum of power values equals 10.
   * Validates: Requirements 7.1, 7.2
   */
  it('Property 11: Valid Moves Detection', () => {
    fc.assert(
      fc.property(boardWithEmptyCellsArb, (board) => {
        const hasValid = hasValidMoves(board)

        // Manually check if any valid rectangle exists
        let foundValid = false
        outer: for (let startRow = 0; startRow < BOARD_ROWS; startRow++) {
          for (let startCol = 0; startCol < BOARD_COLS; startCol++) {
            for (let endRow = startRow; endRow < BOARD_ROWS; endRow++) {
              for (let endCol = startCol; endCol < BOARD_COLS; endCol++) {
                const selection = { startRow, startCol, endRow, endCol }
                const sum = calculatePowerSum(board, selection)
                if (sum === 10) {
                  foundValid = true
                  break outer
                }
              }
            }
          }
        }

        expect(hasValid).toBe(foundValid)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Additional test: Empty board has no valid moves
   */
  it('Empty board has no valid moves', () => {
    const emptyBoard: Board = Array(BOARD_ROWS)
      .fill(null)
      .map(() =>
        Array(BOARD_COLS)
          .fill(null)
          .map(() => ({ power: null }))
      )

    expect(hasValidMoves(emptyBoard)).toBe(false)
  })

  /**
   * Additional test: Board with single cell of power 10 has no valid moves (max power is 9)
   */
  it('Fresh board always has valid moves', () => {
    // A fresh board with all cells having power 1-9 should have valid moves
    // since we can always find combinations that sum to 10
    const { board } = createInitialBoard()
    expect(hasValidMoves(board)).toBe(true)
  })
})
