# Implementation Plan: Ten Exorcism Game

## Overview

This implementation plan breaks down the Ten Exorcism game into discrete coding tasks. The game will be implemented as a self-contained React component within the `src/games/ten-exorcism/` directory, following the project's contribution guidelines. The implementation includes a score verification system using deterministic board generation and action logging.

## Tasks

- [x] 1. Set up project structure and type definitions
  - [x] 1.1 Create game.ts metadata file for hub registration
    - Export GameMeta with id: 'ten-exorcism', title, mode, status, description
    - Use localized strings for Korean and English
    - _Requirements: 8.1_

  - [x] 1.2 Create types.ts with core type definitions
    - Define CellState, Board, Selection, GameState, ValidationResult types
    - Define GameAction, GameSession types for verification system
    - Define BOARD_COLS (10) and BOARD_ROWS (17) constants
    - _Requirements: 1.1, 10.1, 11.1_

  - [x] 1.3 Create seededRandom.ts with deterministic PRNG
    - Implement Mulberry32 seeded random number generator
    - Export createSeededRandom(seed) function
    - _Requirements: 9.1_

- [x] 2. Implement core game engine logic
  - [x] 2.1 Create gameEngine.ts with deterministic board initialization
    - Implement createBoardFromSeed(seed) function using seeded PRNG
    - Implement createInitialBoard() that generates seed and calls createBoardFromSeed
    - Generate random power values 1-9 for each cell
    - _Requirements: 1.2, 9.1, 9.2, 9.3_

  - [x] 2.2 Write property tests for board initialization
    - **Property 1: Board Dimensions Invariant**
    - **Property 2: Initial Power Values Range**
    - **Property 12: Deterministic Board Generation**
    - **Validates: Requirements 1.1, 1.2, 9.1, 9.2**

  - [x] 2.3 Implement selection calculation function
    - Implement calculateSelectionBounds() to normalize start/end coordinates
    - Handle all drag directions (any corner to any corner)
    - _Requirements: 2.1, 2.2_

  - [x] 2.4 Write property test for selection bounds
    - **Property 3: Rectangle Selection Bounds**
    - **Validates: Requirements 2.1, 2.2**

  - [x] 2.5 Implement power sum calculation and validation
    - Implement calculatePowerSum() for a selection
    - Implement validateSelection() returning ValidationResult
    - _Requirements: 3.1, 3.2_

  - [x] 2.6 Write property tests for validation
    - **Property 4: Power Sum Calculation Correctness**
    - **Property 5: Validation Correctness**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

  - [x] 2.7 Implement exorcism execution
    - Implement executeExorcism() to clear cells and return new board
    - Only execute if validation passes (sum = 10)
    - _Requirements: 4.1, 4.2, 4.4_

  - [x] 2.8 Write property tests for exorcism
    - **Property 6: Exorcism Clears Selected Cells**
    - **Property 8: Invalid Selection Preserves Board**
    - **Property 9: Non-Selected Cells Preservation**
    - **Property 10: No New Ghosts Property**
    - **Validates: Requirements 4.1, 4.2, 4.4, 5.1, 5.2, 5.3, 5.4**

  - [x] 2.9 Implement score calculation
    - Implement calculateScoreIncrement() for valid exorcism
    - Count non-null cells in selection
    - _Requirements: 4.3, 6.2_

  - [x] 2.10 Write property test for score calculation
    - **Property 7: Score Increment Correctness**
    - **Validates: Requirements 4.3, 6.2**

  - [x] 2.11 Implement game over detection
    - Implement hasValidMoves() to check all possible rectangles
    - Optimize by early exit when valid move found
    - _Requirements: 7.1, 7.2_

  - [x] 2.12 Write property test for valid moves detection
    - **Property 11: Valid Moves Detection**
    - **Validates: Requirements 7.1, 7.2**

- [x] 3. Implement session management and verification
  - [x] 3.1 Create sessionManager.ts with session lifecycle
    - Implement createGameSession(seed) to initialize new session
    - Implement logAction(session, action) to record player actions
    - Implement finalizeSession(session, score) to complete session
    - _Requirements: 10.1, 10.2, 10.4, 11.1, 11.2_

  - [x] 3.2 Implement session replay and verification
    - Implement replaySession(session) to recalculate score from actions
    - Implement verifySession(session) to compare calculated vs reported score
    - _Requirements: 11.4, 11.5_

  - [x] 3.3 Implement session export functionality
    - Implement exportSession(session) to serialize as JSON
    - Use compact format for efficient transmission
    - _Requirements: 11.3_

  - [x] 3.4 Write property tests for session verification
    - **Property 13: Session Replay Consistency**
    - **Property 14: Action Log Completeness**
    - **Validates: Requirements 10.2, 10.3, 11.4, 11.5**

- [x] 4. Checkpoint - Ensure all game engine tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement React component and state management
  - [x] 5.1 Create useGameState custom hook
    - Manage board, score, selection, isGameOver, isDragging state
    - Integrate session management for action logging
    - Expose handlers for mouse events and game reset
    - _Requirements: 6.1, 6.4, 6.5, 10.1_

  - [x] 5.2 Create main TenExorcism component structure
    - Set up component with game state hook
    - Create board grid container with CSS Grid
    - _Requirements: 1.1, 8.1_

  - [x] 5.3 Implement cell rendering with ghost images
    - Render ghost image with power number overlay
    - Handle empty cells with different styling
    - Use single_ghost_crop.png asset
    - _Requirements: 1.3, 1.4, 8.2_

  - [x] 5.4 Implement mouse event handlers for selection
    - Handle mousedown to start selection
    - Handle mousemove to update selection bounds
    - Handle mouseup to finalize, validate, and log action
    - _Requirements: 2.1, 2.7, 10.1_

  - [x] 5.5 Implement selection visual feedback
    - Highlight selected cells during drag
    - Show valid (green) or invalid (red) state on mouseup
    - _Requirements: 3.5, 8.4_

- [x] 6. Implement game UI elements
  - [x] 6.1 Create score display component
    - Show current score prominently
    - Update immediately on successful exorcism
    - _Requirements: 6.3_

  - [x] 6.2 Implement game over screen
    - Display final score
    - Show "New Game" button
    - Finalize and optionally export session
    - Prevent further interactions
    - _Requirements: 7.3, 7.4, 7.5, 11.2_

  - [x] 6.3 Create styles.css with scoped game styles
    - Style board grid layout
    - Style ghost tiles and empty cells
    - Add selection highlight styles
    - Add animations for exorcism effect
    - _Requirements: 1.5, 8.3, 8.5_

- [x] 7. Final checkpoint - Ensure complete integration
  - Ensure all tests pass, ask the user if questions arise.
  - Verify game loads correctly in hub
  - Test full gameplay flow
  - Verify session export and replay functionality

## Notes

- All tasks including tests are required for complete implementation
- Each task references specific requirements for traceability
- Property tests use fast-check library for TypeScript
- All code stays within `src/games/ten-exorcism/` directory per contribution guidelines
- Session verification system enables future backend score validation
