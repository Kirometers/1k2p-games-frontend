import { useState, useEffect, useCallback, useReducer, useRef } from 'react'
import './styles.css'

// 이미지 직접 import
import blackFrightened from './re_black_frightened.png'
import blueSad from './re_blue_sad.png'
import greenDisgust from './re_green_disgust.png'
import greyLove from './re_grey_love.png'
import orangeShy from './re_orange_shy.png'
import pinkHappy from './re_pink_happy.png'
import purpleEnvy from './re_purple_envy.png'
import redAngry from './re_red_angry.png'
import whiteSmile from './re_white_smile.png'
import yellowFrightened from './re_yellow_frightened.png'

// 배경 이미지 import
import mainPageNo from './main_page_no.png'
import backgroundMorning from './background_morning.png'
import backgroundEvening from './background_evening.png'
import backgroundNight from './background_night.png'

// Types
type BlockType = string
type Position = { row: number; col: number }
type Block = {
  type: BlockType
  id: string
  isMatched?: boolean
  isHinted?: boolean
  isInvalid?: boolean
  row?: number
  col?: number
}

type GameState = 'menu' | 'how-to-play' | 'difficulty' | 'character-select' | 'playing' | 'paused' | 'game-over'
type Difficulty = 'normal' | 'hard'

interface GameData {
  board: Block[][]
  score: number
  timeLeft: number
  hintsLeft: number
  selectedBlocks: Position[]
  gameState: GameState
  difficulty: Difficulty | null
  selectedCharacters: string[]
  availableCharacters: string[]
  isAnimating: boolean
  isProcessing: boolean
  isHintActive: boolean
  hintBlocks: Position[]
  poppingBlocks: string[] // 터지는 애니메이션 중인 블록들의 ID
  dragState: {
    isDragging: boolean
    startPos: Position | null
    startCoords: { x: number; y: number } | null
    currentCoords: { x: number; y: number } | null
  }
}

// Available emotion characters
const ALL_CHARACTERS = [
  'black_frightened',
  'blue_sad', 
  'green_disgust',
  'grey_love',
  'orange_shy',
  'pink_happy',
  'purple_envy',
  'red_angry',
  'white_smile',
  'yellow_frightened'
]

// 이미지 매핑 객체
const CHARACTER_IMAGES: Record<string, string> = {
  'black_frightened': blackFrightened,
  'blue_sad': blueSad,
  'green_disgust': greenDisgust,
  'grey_love': greyLove,
  'orange_shy': orangeShy,
  'pink_happy': pinkHappy,
  'purple_envy': purpleEnvy,
  'red_angry': redAngry,
  'white_smile': whiteSmile,
  'yellow_frightened': yellowFrightened,
}

// 이미지 경로 함수
const getCharacterImage = (character: string) => {
  return CHARACTER_IMAGES[character] || CHARACTER_IMAGES['pink_happy'] // 폴백 이미지
}

// Game reducer
type GameAction = 
  | { type: 'SET_STATE'; payload: GameState }
  | { type: 'SET_DIFFICULTY'; payload: Difficulty }
  | { type: 'SET_CHARACTERS'; payload: string[] }
  | { type: 'SET_BOARD'; payload: Block[][] }
  | { type: 'UPDATE_SCORE'; payload: number }
  | { type: 'UPDATE_TIME'; payload: number }
  | { type: 'USE_HINT' }
  | { type: 'SET_HINT_BLOCKS'; payload: Position[] }
  | { type: 'CLEAR_HINT_BLOCKS' }
  | { type: 'SET_HINT_ACTIVE'; payload: boolean }
  | { type: 'SELECT_BLOCK'; payload: Position }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_ANIMATING'; payload: boolean }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_POPPING_BLOCKS'; payload: string[] }
  | { type: 'CLEAR_POPPING_BLOCKS' }
  | { type: 'START_DRAG'; payload: { pos: Position; coords: { x: number; y: number } } }
  | { type: 'UPDATE_DRAG'; payload: { x: number; y: number } }
  | { type: 'END_DRAG' }
  | { type: 'FORCE_UNLOCK' }
  | { type: 'RESET_GAME' }

const initialState: GameData = {
  board: [],
  score: 0,
  timeLeft: 60,
  hintsLeft: 2,
  selectedBlocks: [],
  gameState: 'menu',
  difficulty: null,
  selectedCharacters: [],
  availableCharacters: ALL_CHARACTERS,
  isAnimating: false,
  isProcessing: false,
  isHintActive: false,
  hintBlocks: [],
  poppingBlocks: [], // 터지는 애니메이션 중인 블록들의 ID
  dragState: {
    isDragging: false,
    startPos: null,
    startCoords: null,
    currentCoords: null
  }
}

function gameReducer(state: GameData, action: GameAction): GameData {
  switch (action.type) {
    case 'SET_STATE':
      return { ...state, gameState: action.payload }
    case 'SET_DIFFICULTY':
      return { ...state, difficulty: action.payload }
    case 'SET_CHARACTERS':
      return { ...state, selectedCharacters: action.payload }
    case 'SET_BOARD':
      return { ...state, board: action.payload }
    case 'UPDATE_SCORE':
      return { ...state, score: state.score + action.payload }
    case 'UPDATE_TIME':
      return { ...state, timeLeft: Math.min(60, Math.max(0, action.payload)) }
    case 'USE_HINT':
      return { ...state, hintsLeft: Math.max(0, state.hintsLeft - 1) }
    case 'SET_HINT_BLOCKS':
      return { ...state, hintBlocks: action.payload, isHintActive: true }
    case 'CLEAR_HINT_BLOCKS':
      return { ...state, hintBlocks: [], isHintActive: false }
    case 'SET_HINT_ACTIVE':
      return { ...state, isHintActive: action.payload }
    case 'SELECT_BLOCK':
      const newSelection = state.selectedBlocks.length === 2 
        ? [action.payload] 
        : [...state.selectedBlocks, action.payload]
      return { ...state, selectedBlocks: newSelection }
    case 'CLEAR_SELECTION':
      return { ...state, selectedBlocks: [] }
    case 'SET_ANIMATING':
      return { ...state, isAnimating: action.payload }
    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload }
    case 'SET_POPPING_BLOCKS':
      return { ...state, poppingBlocks: action.payload }
    case 'CLEAR_POPPING_BLOCKS':
      return { ...state, poppingBlocks: [] }
    case 'START_DRAG':
      return { 
        ...state, 
        dragState: {
          isDragging: true,
          startPos: action.payload.pos,
          startCoords: action.payload.coords,
          currentCoords: action.payload.coords
        }
      }
    case 'UPDATE_DRAG':
      return { 
        ...state, 
        dragState: {
          ...state.dragState,
          currentCoords: action.payload
        }
      }
    case 'END_DRAG':
      return { 
        ...state, 
        dragState: {
          isDragging: false,
          startPos: null,
          startCoords: null,
          currentCoords: null
        }
      }
    case 'FORCE_UNLOCK':
      return { 
        ...state, 
        isAnimating: false, 
        isProcessing: false, 
        selectedBlocks: [],
        isHintActive: false,
        hintBlocks: [],
        poppingBlocks: [], // 터지는 블록 ID 목록 클리어
        dragState: {
          isDragging: false,
          startPos: null,
          startCoords: null,
          currentCoords: null
        },
        board: state.board.map((row: Block[]) => 
          row.map((block: Block) => ({ 
            ...block, 
            isInvalid: false, 
            isHinted: false 
          }))
        )
      }
    case 'RESET_GAME':
      return { ...initialState }
    default:
      return state
  }
}

export default function EmotionMatch() {
  const [gameData, dispatch] = useReducer(gameReducer, initialState)
  const [gameTimer, setGameTimer] = useState<number | null>(null)
  const hintTimeoutRef = useRef<number | null>(null)

  const gridSize = gameData.difficulty === 'normal' ? 10 : 12
  const requiredCharacters = gameData.difficulty === 'normal' ? 6 : 8

  // Generate random board
  const generateBoard = useCallback((size: number, characters: string[]): Block[][] => {
    const board: Block[][] = []
    for (let row = 0; row < size; row++) {
      board[row] = []
      for (let col = 0; col < size; col++) {
        let blockType: string
        do {
          blockType = characters[Math.floor(Math.random() * characters.length)]
        } while (
          // Avoid creating initial matches
          (col >= 2 && board[row][col-1]?.type === blockType && board[row][col-2]?.type === blockType) ||
          (row >= 2 && board[row-1]?.[col]?.type === blockType && board[row-2]?.[col]?.type === blockType)
        )
        
        board[row][col] = {
          type: blockType,
          id: `${row}-${col}-${Date.now()}-${Math.random()}`,
          row: row,
          col: col
        }
      }
    }
    return board
  }, [])

  // Check for matches
  const findMatches = useCallback((board: Block[][]): Position[] => {
    const matches: Position[] = []
    const size = board.length

    // Check horizontal matches
    for (let row = 0; row < size; row++) {
      let count = 1
      for (let col = 1; col < size; col++) {
        if (board[row][col].type === board[row][col-1].type) {
          count++
        } else {
          if (count >= 3) {
            for (let i = col - count; i < col; i++) {
              matches.push({ row, col: i })
            }
          }
          count = 1
        }
      }
      if (count >= 3) {
        for (let i = size - count; i < size; i++) {
          matches.push({ row, col: i })
        }
      }
    }

    // Check vertical matches
    for (let col = 0; col < size; col++) {
      let count = 1
      for (let row = 1; row < size; row++) {
        if (board[row][col].type === board[row-1][col].type) {
          count++
        } else {
          if (count >= 3) {
            for (let i = row - count; i < row; i++) {
              matches.push({ row: i, col })
            }
          }
          count = 1
        }
      }
      if (count >= 3) {
        for (let i = size - count; i < size; i++) {
          matches.push({ row: i, col })
        }
      }
    }

    return matches
  }, [])

  // Check if move is valid (creates matches)
  const isValidMove = useCallback((board: Block[][], pos1: Position, pos2: Position): boolean => {
    // Create temporary board with swapped blocks
    const tempBoard = board.map(row => [...row])
    const temp = tempBoard[pos1.row][pos1.col]
    tempBoard[pos1.row][pos1.col] = tempBoard[pos2.row][pos2.col]
    tempBoard[pos2.row][pos2.col] = temp

    const matches = findMatches(tempBoard)
    return matches.length > 0
  }, [findMatches])

  // Find available moves
  const findAvailableMoves = useCallback((board: Block[][]): Position[][] => {
    const moves: Position[][] = []
    const size = board.length

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        // Check adjacent positions
        const adjacent = [
          { row: row - 1, col },
          { row: row + 1, col },
          { row, col: col - 1 },
          { row, col: col + 1 }
        ].filter(pos => pos.row >= 0 && pos.row < size && pos.col >= 0 && pos.col < size)

        for (const adjPos of adjacent) {
          if (isValidMove(board, { row, col }, adjPos)) {
            moves.push([{ row, col }, adjPos])
          }
        }
      }
    }

    return moves
  }, [isValidMove])

  // Apply gravity with proper drop-down physics
  const applyGravity = useCallback((board: Block[][], characters: string[]): Block[][] => {
    const newBoard: Block[][] = Array(board.length).fill(null).map(() => Array(board[0].length).fill(null))
    const size = board.length

    // Process each column independently
    for (let col = 0; col < size; col++) {
      // Step 1: Extract valid (non-matched) blocks from this column
      const validBlocks: Block[] = []
      for (let row = 0; row < size; row++) {
        const block = board[row][col]
        if (block && !block.isMatched && block.type) {
          validBlocks.push({ ...block, row, col })
        }
      }

      // Step 2: Place valid blocks at the bottom of the column
      const startRow = size - validBlocks.length
      for (let i = 0; i < validBlocks.length; i++) {
        const targetRow = startRow + i
        newBoard[targetRow][col] = {
          ...validBlocks[i],
          row: targetRow,
          col: col
        }
      }

      // Step 3: Fill empty spaces at the top with new random blocks
      for (let row = 0; row < startRow; row++) {
        const blockType = characters[Math.floor(Math.random() * characters.length)]
        newBoard[row][col] = {
          type: blockType,
          id: `${row}-${col}-${Date.now()}-${Math.random()}`,
          row: row,
          col: col
        }
      }
    }

    return newBoard
  }, [])

  // Process matches and update score - OPTIMIZED VFX WITH NO LAG
  const processMatches = useCallback(async (board: Block[][]): Promise<Block[][]> => {
    let currentBoard = board.map((row: Block[]) => [...row])
    let totalScore = 0
    let hasMatches = true
    let iterations = 0
    const maxIterations = 10 // 무한 루프 방지

    try {
      while (hasMatches && iterations < maxIterations) {
        iterations++
        const matches = findMatches(currentBoard)
        
        if (matches.length === 0) {
          hasMatches = false
          break
        }

        // STEP 1: 즉시 터지는 애니메이션 시작 (블록 ID 기반으로 정확한 블록만)
        const matchedBlockIds = matches.map((pos: Position) => {
          if (currentBoard[pos.row] && currentBoard[pos.row][pos.col]) {
            return currentBoard[pos.row][pos.col].id
          }
          return null
        }).filter(id => id !== null) as string[]
        
        dispatch({ type: 'SET_POPPING_BLOCKS', payload: matchedBlockIds })

        // STEP 2: 점수 계산 (미리 계산)
        const matchGroups = new Map<string, number>()
        matches.forEach((pos: Position) => {
          if (currentBoard[pos.row] && currentBoard[pos.row][pos.col]) {
            const key = `${pos.row}-${currentBoard[pos.row][pos.col].type}`
            matchGroups.set(key, (matchGroups.get(key) || 0) + 1)
          }
        })

        matchGroups.forEach((count: number) => {
          if (count === 3) totalScore += 3
          else if (count === 4) totalScore += 5
          else if (count === 5) totalScore += 7
          else if (count >= 6) totalScore += 10
        })

        // STEP 3: 애니메이션 시간 대기 (0.2초로 단축)
        await new Promise(resolve => setTimeout(resolve, 200))

        // STEP 4: 애니메이션 완료 후 실제 데이터 삭제 (매치된 블록만)
        matches.forEach((pos: Position) => {
          if (currentBoard[pos.row] && currentBoard[pos.row][pos.col]) {
            currentBoard[pos.row][pos.col].isMatched = true
          }
        })

        // STEP 5: 터지는 애니메이션 상태 클리어
        dispatch({ type: 'CLEAR_POPPING_BLOCKS' })

        // STEP 6: 매치된 블록들만 사라진 상태로 보드 업데이트 (사용자가 볼 수 있게)
        dispatch({ type: 'SET_BOARD', payload: currentBoard })
        
        // 사라진 블록들을 확인할 수 있는 짧은 대기
        await new Promise(resolve => setTimeout(resolve, 100))

        // STEP 7: 중력 적용 및 새 블록 생성 (이제 빈 공간을 채움)
        currentBoard = applyGravity(currentBoard, gameData.selectedCharacters)
        
        // STEP 8: 블록들이 떨어진 후 보드 상태 업데이트
        dispatch({ type: 'SET_BOARD', payload: currentBoard })
        
        // 새로운 블록들이 떨어지는 애니메이션을 위한 대기
        await new Promise(resolve => setTimeout(resolve, 400)) // 0.5초 → 0.4초로 단축
      }

      if (totalScore > 0) {
        dispatch({ type: 'UPDATE_SCORE', payload: totalScore })
        // Time bonus removed - hardcore mode
      }

    } catch (error) {
      console.error('Error in processMatches:', error)
    } finally {
      // 항상 애니메이션 상태 해제
      dispatch({ type: 'CLEAR_POPPING_BLOCKS' })
      dispatch({ type: 'SET_ANIMATING', payload: false })
      dispatch({ type: 'SET_PROCESSING', payload: false })
    }

    return currentBoard
  }, [findMatches, applyGravity, gameData.selectedCharacters])

  // Handle drag end with 2-block limitation (only adjacent blocks) - FIXED SWAP THEN MATCH
  const handleDragEnd = useCallback(async (clientX: number, clientY: number) => {
    if (!gameData.dragState.isDragging || !gameData.dragState.startPos || !gameData.dragState.startCoords) {
      dispatch({ type: 'END_DRAG' })
      return
    }

    const deltaX = clientX - gameData.dragState.startCoords.x
    const deltaY = clientY - gameData.dragState.startCoords.y
    const minDistance = 30 // Minimum drag distance to register as swipe

    // Calculate if drag distance is sufficient
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    
    if (distance < minDistance) {
      // Not enough movement - just end drag
      dispatch({ type: 'END_DRAG' })
      return
    }

    // Determine direction (prioritize the larger movement) - LIMITED TO 1 ADJACENT BLOCK ONLY
    let targetPos: Position | null = null
    const startPos = gameData.dragState.startPos

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal movement - limit to 1 block only
      if (deltaX > 0 && startPos.col < gridSize - 1) {
        // Right - only 1 block
        targetPos = { row: startPos.row, col: startPos.col + 1 }
      } else if (deltaX < 0 && startPos.col > 0) {
        // Left - only 1 block
        targetPos = { row: startPos.row, col: startPos.col - 1 }
      }
    } else {
      // Vertical movement - limit to 1 block only
      if (deltaY > 0 && startPos.row < gridSize - 1) {
        // Down - only 1 block
        targetPos = { row: startPos.row + 1, col: startPos.col }
      } else if (deltaY < 0 && startPos.row > 0) {
        // Up - only 1 block
        targetPos = { row: startPos.row - 1, col: startPos.col }
      }
    }

    dispatch({ type: 'END_DRAG' })

    // If we have a valid target (only adjacent block), attempt the swap
    if (targetPos) {
      try {
        dispatch({ type: 'SET_PROCESSING', payload: true })
        
        // Check if move is valid
        const isValid = isValidMove(gameData.board, startPos, targetPos)
        
        if (isValid) {
          // Valid move - perform swap FIRST, then process matches
          dispatch({ type: 'SET_ANIMATING', payload: true })
          
          // Step 1: Swap the blocks
          const newBoard = gameData.board.map((row: Block[]) => [...row])
          const temp = newBoard[startPos.row][startPos.col]
          newBoard[startPos.row][startPos.col] = newBoard[targetPos.row][targetPos.col]
          newBoard[targetPos.row][targetPos.col] = temp
          
          // Update positions in the block objects
          newBoard[startPos.row][startPos.col].row = startPos.row
          newBoard[startPos.row][startPos.col].col = startPos.col
          newBoard[targetPos.row][targetPos.col].row = targetPos.row
          newBoard[targetPos.row][targetPos.col].col = targetPos.col
          
          dispatch({ type: 'SET_BOARD', payload: newBoard })
          
          // Step 2: Wait for swap animation to complete, then process matches
          setTimeout(async () => {
            try {
              const processedBoard = await processMatches(newBoard)
              dispatch({ type: 'SET_BOARD', payload: processedBoard })
            } catch (error) {
              console.error('Error processing matches after swap:', error)
            } finally {
              dispatch({ type: 'SET_ANIMATING', payload: false })
              dispatch({ type: 'SET_PROCESSING', payload: false })
            }
          }, 300) // Wait for swap animation
          
        } else {
          // Invalid move - show error animation
          dispatch({ type: 'SET_ANIMATING', payload: true })
          
          const errorBoard = gameData.board.map((row: Block[]) => [...row])
          errorBoard[startPos.row][startPos.col].isInvalid = true
          errorBoard[targetPos.row][targetPos.col].isInvalid = true
          
          dispatch({ type: 'SET_BOARD', payload: errorBoard })
          
          // Clear error after animation
          setTimeout(() => {
            try {
              const clearedBoard = errorBoard.map((row: Block[]) => 
                row.map((block: Block) => ({ ...block, isInvalid: false }))
              )
              dispatch({ type: 'SET_BOARD', payload: clearedBoard })
              dispatch({ type: 'SET_ANIMATING', payload: false })
              dispatch({ type: 'SET_PROCESSING', payload: false })
            } catch (error) {
              console.error('Error in invalid move recovery:', error)
              dispatch({ type: 'FORCE_UNLOCK' })
            }
          }, 300)
          
          return
        }
        
      } catch (error) {
        console.error('Error in handleDragEnd:', error)
        dispatch({ type: 'FORCE_UNLOCK' })
      }
    } else {
      // No valid target - just unlock
      dispatch({ type: 'SET_PROCESSING', payload: false })
    }
  }, [gameData.dragState, gameData.board, gridSize, isValidMove, processMatches])

  // Handle drag start (mouse/touch)
  const handleDragStart = useCallback((row: number, col: number, clientX: number, clientY: number) => {
    if (gameData.isAnimating || gameData.isProcessing || gameData.gameState !== 'playing') {
      return
    }

    // Clear any active hints
    if (gameData.isHintActive) {
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current)
        hintTimeoutRef.current = null
      }
      dispatch({ type: 'CLEAR_HINT_BLOCKS' })
    }

    dispatch({ 
      type: 'START_DRAG', 
      payload: { 
        pos: { row, col }, 
        coords: { x: clientX, y: clientY } 
      } 
    })
  }, [gameData.isAnimating, gameData.isProcessing, gameData.gameState, gameData.isHintActive])

  // Handle drag move (real-time coordinate updates)
  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (gameData.dragState.isDragging) {
      dispatch({ 
        type: 'UPDATE_DRAG', 
        payload: { x: clientX, y: clientY } 
      })
    }
  }, [gameData.dragState.isDragging])

  // Calculate drag selection box coordinates (NO FRAME DESIGN - Fixed 50px cells)
  const calculateDragSelectionBox = useCallback(() => {
    if (!gameData.dragState.isDragging || !gameData.dragState.startPos || !gameData.dragState.currentCoords || !gameData.dragState.startCoords) {
      return null
    }

    // Get the game board container element to calculate relative positions
    const boardElement = document.querySelector('.game-board-no-frame')
    if (!boardElement) return null

    const boardRect = boardElement.getBoundingClientRect()
    const cellSize = 50 // Fixed 50px per cell
    // No padding since we removed the frame

    // Calculate which cell the current drag position is over
    const currentX = gameData.dragState.currentCoords.x - boardRect.left
    const currentY = gameData.dragState.currentCoords.y - boardRect.top
    
    const currentCol = Math.max(0, Math.min(gridSize - 1, Math.floor(currentX / cellSize)))
    const currentRow = Math.max(0, Math.min(gridSize - 1, Math.floor(currentY / cellSize)))

    const startPos = gameData.dragState.startPos
    
    // LIMIT DRAG TO MAXIMUM 2 BLOCKS (adjacent only)
    let limitedRow = currentRow
    let limitedCol = currentCol
    
    // Calculate distance from start position
    const deltaRow = Math.abs(currentRow - startPos.row)
    const deltaCol = Math.abs(currentCol - startPos.col)
    
    // If dragging more than 1 block away, limit to adjacent block only
    if (deltaRow > 1 || deltaCol > 1) {
      // Determine primary direction and limit to 1 block distance
      if (deltaRow > deltaCol) {
        // Vertical movement is primary
        limitedRow = startPos.row + (currentRow > startPos.row ? 1 : -1)
        limitedCol = startPos.col
      } else {
        // Horizontal movement is primary
        limitedCol = startPos.col + (currentCol > startPos.col ? 1 : -1)
        limitedRow = startPos.row
      }
      
      // Ensure we don't go out of bounds
      limitedRow = Math.max(0, Math.min(gridSize - 1, limitedRow))
      limitedCol = Math.max(0, Math.min(gridSize - 1, limitedCol))
    }
    
    // Calculate bounding box (always max 2 blocks)
    const minRow = Math.min(startPos.row, limitedRow)
    const minCol = Math.min(startPos.col, limitedCol)
    const maxRow = Math.max(startPos.row, limitedRow)
    const maxCol = Math.max(startPos.col, limitedCol)

    return {
      top: minRow * cellSize,
      left: minCol * cellSize,
      width: (maxCol - minCol + 1) * cellSize,
      height: (maxRow - minRow + 1) * cellSize
    }
  }, [gameData.dragState, gridSize])

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault()
    handleDragStart(row, col, e.clientX, e.clientY)
  }, [handleDragStart])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    handleDragEnd(e.clientX, e.clientY)
  }, [handleDragEnd])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleDragMove(e.clientX, e.clientY)
  }, [handleDragMove])

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent, row: number, col: number) => {
    e.preventDefault()
    const touch = e.touches[0]
    handleDragStart(row, col, touch.clientX, touch.clientY)
  }, [handleDragStart])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.changedTouches[0]
    handleDragEnd(touch.clientX, touch.clientY)
  }, [handleDragEnd])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0]
      handleDragMove(touch.clientX, touch.clientY)
    }
  }, [handleDragMove])

  // Global drag event listeners for outside-area detection
  useEffect(() => {
    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (gameData.dragState.isDragging) {
        handleDragEnd(e.clientX, e.clientY)
      }
    }

    const handleGlobalTouchEnd = (e: TouchEvent) => {
      if (gameData.dragState.isDragging && e.changedTouches.length > 0) {
        const touch = e.changedTouches[0]
        handleDragEnd(touch.clientX, touch.clientY)
      }
    }

    if (gameData.dragState.isDragging) {
      document.addEventListener('mouseup', handleGlobalMouseUp)
      document.addEventListener('touchend', handleGlobalTouchEnd)
    }

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      document.removeEventListener('touchend', handleGlobalTouchEnd)
    }
  }, [gameData.dragState.isDragging, handleDragEnd])

  // Hint timeout cleanup effect
  useEffect(() => {
    return () => {
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current)
        hintTimeoutRef.current = null
      }
    }
  }, [])

  // Clear hint when game state changes
  useEffect(() => {
    if (gameData.gameState !== 'playing' && gameData.isHintActive) {
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current)
        hintTimeoutRef.current = null
      }
      dispatch({ type: 'CLEAR_HINT_BLOCKS' })
    }
  }, [gameData.gameState, gameData.isHintActive])

  // Use hint with complete safety mechanisms
  const useHint = useCallback(() => {
    console.log('Hint button clicked')
    
    // Guard clauses - 실행 전 검사
    if (gameData.hintsLeft <= 0) {
      console.log('No hints left')
      return
    }
    
    if (gameData.isHintActive) {
      console.log('Hint already active, ignoring click')
      return
    }
    
    if (gameData.gameState !== 'playing') {
      console.log('Game not in playing state')
      return
    }
    
    if (gameData.isProcessing || gameData.isAnimating) {
      console.log('Game is processing or animating')
      return
    }

    try {
      console.log('Executing hint logic')
      
      // Clear any existing hint timeout
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current)
        hintTimeoutRef.current = null
      }

      // Find available moves
      const availableMoves = findAvailableMoves(gameData.board)
      
      if (availableMoves.length === 0) {
        console.log('No available moves found, not consuming hint')
        return
      }

      // Select random move
      const randomMove = availableMoves[Math.floor(Math.random() * availableMoves.length)]
      console.log('Selected hint move:', randomMove)
      
      // Update state - hint blocks and consume hint
      dispatch({ type: 'SET_HINT_BLOCKS', payload: randomMove })
      dispatch({ type: 'USE_HINT' })
      
      // Set auto cleanup timer
      hintTimeoutRef.current = setTimeout(() => {
        console.log('Auto clearing hint blocks')
        try {
          dispatch({ type: 'CLEAR_HINT_BLOCKS' })
          hintTimeoutRef.current = null
        } catch (error) {
          console.error('Error in hint cleanup:', error)
        }
      }, 2000) // 2초 후 자동 초기화
      
    } catch (error) {
      console.error('Error in useHint:', error)
      // 에러 발생 시 힌트 상태 강제 초기화
      dispatch({ type: 'CLEAR_HINT_BLOCKS' })
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current)
        hintTimeoutRef.current = null
      }
    }
  }, [
    gameData.hintsLeft, 
    gameData.isHintActive, 
    gameData.gameState, 
    gameData.isProcessing, 
    gameData.isAnimating,
    gameData.board,
    findAvailableMoves
  ])

  // Start game
  const startGame = useCallback(() => {
    if (!gameData.difficulty || gameData.selectedCharacters.length !== requiredCharacters) return
    
    const board = generateBoard(gridSize, gameData.selectedCharacters)
    dispatch({ type: 'SET_BOARD', payload: board })
    dispatch({ type: 'UPDATE_TIME', payload: 60 }) // Reset timer to 60 seconds
    dispatch({ type: 'SET_STATE', payload: 'playing' })
  }, [gameData.difficulty, gameData.selectedCharacters, requiredCharacters, gridSize, generateBoard])

  // Game timer effect - start timer when playing
  useEffect(() => {
    let timer: number | null = null
    
    if (gameData.gameState === 'playing' && gameData.timeLeft > 0) {
      timer = setInterval(() => {
        dispatch({ type: 'UPDATE_TIME', payload: gameData.timeLeft - 1 })
      }, 1000)
      setGameTimer(timer)
    } else if (gameTimer) {
      clearInterval(gameTimer)
      setGameTimer(null)
    }
    
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [gameData.gameState, gameData.timeLeft])

  // Check for time over
  useEffect(() => {
    if (gameData.timeLeft <= 0 && gameData.gameState === 'playing') {
      dispatch({ type: 'SET_STATE', payload: 'game-over' })
    }
  }, [gameData.timeLeft, gameData.gameState])

  // Check for game over (no moves available)
  useEffect(() => {
    if (gameData.gameState === 'playing' && 
        gameData.board.length > 0 && 
        !gameData.isAnimating && 
        !gameData.isProcessing) {
      const availableMoves = findAvailableMoves(gameData.board)
      if (availableMoves.length === 0) {
        dispatch({ type: 'SET_STATE', payload: 'game-over' })
      }
    }
  }, [gameData.board, gameData.gameState, gameData.isAnimating, gameData.isProcessing, findAvailableMoves])

  // Character selection handler
  const toggleCharacter = useCallback((character: string) => {
    const isSelected = gameData.selectedCharacters.includes(character)
    let newSelection: string[]
    
    if (isSelected) {
      newSelection = gameData.selectedCharacters.filter((c: string) => c !== character)
    } else {
      if (gameData.selectedCharacters.length < requiredCharacters) {
        newSelection = [...gameData.selectedCharacters, character]
      } else {
        return // Max characters reached
      }
    }
    
    dispatch({ type: 'SET_CHARACTERS', payload: newSelection })
  }, [gameData.selectedCharacters, requiredCharacters])

  // Random character selection (without auto-start)
  const selectRandomCharacters = useCallback(() => {
    const shuffled = [...ALL_CHARACTERS].sort(() => Math.random() - 0.5)
    const randomSelection = shuffled.slice(0, requiredCharacters)
    dispatch({ type: 'SET_CHARACTERS', payload: randomSelection })
    // Removed auto-start - user must click "게임 시작!" manually
  }, [requiredCharacters])

  // Render functions
  const renderMainMenu = () => (
    <div className="emotion-match-wrapper">
      <div 
        className="game-container main-menu"
        style={{ backgroundImage: `url(${mainPageNo})` }}
      >
        <div className="main-menu-buttons-container">
          <button 
            className="main-menu-button play-button"
            onClick={() => dispatch({ type: 'SET_STATE', payload: 'difficulty' })}
          >
            PLAY
          </button>
          <button 
            className="main-menu-button how-to-play-button"
            onClick={() => dispatch({ type: 'SET_STATE', payload: 'how-to-play' })}
          >
            HOW TO PLAY
          </button>
        </div>
      </div>
    </div>
  )

  const renderHowToPlay = () => (
    <div className="emotion-match-wrapper">
      <div 
        className="game-container main-menu"
        style={{ backgroundImage: `url(${mainPageNo})` }}
      >
        <div className="main-menu-buttons-container">
          <button 
            className="main-menu-button play-button"
            onClick={() => dispatch({ type: 'SET_STATE', payload: 'difficulty' })}
          >
            PLAY
          </button>
          <button 
            className="main-menu-button how-to-play-button"
            onClick={() => dispatch({ type: 'SET_STATE', payload: 'how-to-play' })}
          >
            HOW TO PLAY
          </button>
        </div>
        
        {/* Modal within the 16:9 container */}
        <div className="how-to-play-modal-container">
          <div className="how-to-play-modal">
            <div className="modal-header">
              <h2 className="modal-title">👻 How to Play 👻</h2>
              <button 
                className="close-button"
                onClick={() => dispatch({ type: 'SET_STATE', payload: 'menu' })}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-content">
              <div className="rule-item">
                <div className="rule-icon">🎯</div>
                <div className="rule-text">
                  <h3>3개 이상의 같은 유령 매칭!</h3>
                  <p>인접한 블록을 교환하여 3개 이상 연결하세요</p>
                </div>
              </div>
              
              <div className="rule-item">
                <div className="rule-icon">⏰</div>
                <div className="rule-text">
                  <h3>제한 시간 60초!</h3>
                  <p>시간이 다 되면 게임이 끝납니다 (하드코어 모드)</p>
                </div>
              </div>
              
              <div className="rule-item">
                <div className="rule-icon">🏔️</div>
                <div className="rule-text">
                  <h3>많이 터뜨리면 고도 UP!</h3>
                  <p>3개=3km, 4개=5km, 5개=7km, 6개+=10km</p>
                </div>
              </div>
              
              <div className="rule-item">
                <div className="rule-icon">💡</div>
                <div className="rule-text">
                  <h3>힌트는 2번!</h3>
                  <p>막힐 때 힌트 버튼으로 가능한 매칭을 확인하세요</p>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="cute-button primary"
                onClick={() => dispatch({ type: 'SET_STATE', payload: 'difficulty' })}
              >
                🎮 게임 시작하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderDifficultySelect = () => (
    <div className="emotion-match-wrapper">
      <div 
        className="game-container difficulty-select"
        style={{ backgroundImage: `url(${backgroundMorning})` }}
      >
        <div className="themed-screen-content">
          <div className="themed-container">
            <div className="container-header">
              <h2 className="themed-title">🎮 Select Game Mode</h2>
            </div>
            
            <div className="mode-selection-grid">
              <div 
                className="mode-card normal-mode"
                onClick={() => {
                  dispatch({ type: 'SET_DIFFICULTY', payload: 'normal' })
                  dispatch({ type: 'SET_STATE', payload: 'character-select' })
                }}
              >
                <div className="mode-header">
                  <div className="mode-title">Normal</div>
                  <div className="mode-subtitle">Perfect for beginners</div>
                </div>
                <div className="mode-details">
                  <div className="detail-item">
                    <span className="detail-icon">📏</span>
                    <span className="detail-text">10×10 Grid</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-icon">👻</span>
                    <span className="detail-text">6 Characters</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-icon">⭐</span>
                    <span className="detail-text">Recommended</span>
                  </div>
                </div>
              </div>
              
              <div 
                className="mode-card hard-mode"
                onClick={() => {
                  dispatch({ type: 'SET_DIFFICULTY', payload: 'hard' })
                  dispatch({ type: 'SET_STATE', payload: 'character-select' })
                }}
              >
                <div className="mode-header">
                  <div className="mode-title">Hard</div>
                  <div className="mode-subtitle">For experienced players</div>
                </div>
                <div className="mode-details">
                  <div className="detail-item">
                    <span className="detail-icon">📏</span>
                    <span className="detail-text">12×12 Grid</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-icon">👻</span>
                    <span className="detail-text">8 Characters</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-icon">🔥</span>
                    <span className="detail-text">Challenge</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="container-footer">
              <button 
                className="cute-button secondary"
                onClick={() => dispatch({ type: 'SET_STATE', payload: 'menu' })}
              >
                🔙 Back to Menu
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderCharacterSelect = () => (
    <div className="emotion-match-wrapper">
      <div 
        className="game-container character-select"
        style={{ backgroundImage: `url(${backgroundEvening})` }}
      >
        <div className="themed-screen-content">
          <div className="themed-container character-select">
            <div className="container-header">
              <h2 className="themed-title">👻 Character Selection</h2>
              <p className="subtitle">
                Choose {gameData.difficulty === 'normal' ? '6' : '8'} ghost friends for your adventure!
              </p>
            </div>
            
            <div className="character-selection-area">
              <div className="character-grid">
                {ALL_CHARACTERS.map((character: string) => (
                  <div
                    key={character}
                    className={`character-card ${gameData.selectedCharacters.includes(character) ? 'selected' : ''}`}
                    onClick={() => toggleCharacter(character)}
                  >
                    <div className="character-glow"></div>
                    <img 
                      src={getCharacterImage(character)}
                      alt={character}
                      className="character-image"
                    />
                    <div className="selection-indicator">✨</div>
                  </div>
                ))}
              </div>
              
              <div className="selection-status">
                <div className="status-text">
                  Selected: {gameData.selectedCharacters.length}/{requiredCharacters}
                </div>
                <div className="selection-progress">
                  <div 
                    className="progress-fill"
                    style={{ width: `${(gameData.selectedCharacters.length / requiredCharacters) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div className="container-footer">
              <div className="button-group">
                <button 
                  className="cute-button secondary"
                  onClick={() => dispatch({ type: 'SET_STATE', payload: 'difficulty' })}
                >
                  🔙 Back
                </button>
                
                <button 
                  className="cute-button magic"
                  onClick={selectRandomCharacters}
                >
                  🎲 Random
                </button>
                
                <button 
                  className="cute-button primary"
                  disabled={gameData.selectedCharacters.length !== requiredCharacters}
                  onClick={startGame}
                >
                  🚀 Start Game!
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderGameBoard = () => (
    <div className="emotion-match-wrapper">
      <div 
        className="game-container game-play"
        style={{ backgroundImage: `url(${backgroundNight})` }}
      >
        <div className="game-play-content">
          <div className="game-main-split">
            {/* Left Panel - Control & Time */}
            <div className="left-panel-split">
              {/* Pause Button - Top Left */}
              <button 
                className="pause-button-split"
                disabled={gameData.isProcessing}
                onClick={() => dispatch({ type: 'SET_STATE', payload: 'paused' })}
              >
                ⏸️
              </button>
              
              {/* Time Group - Right of pause button */}
              <div className="time-group-split">
                {/* Timer Bar - Match game board height */}
                <div className={`timer-bar-split grid-${gridSize}`}>
                  <div 
                    className="timer-fill"
                    style={{ height: `${(gameData.timeLeft / 60) * 100}%` }}
                  />
                </div>
                
                {/* Timer Text - Below bar */}
                <div className="timer-text-split">{gameData.timeLeft}s</div>
              </div>
            </div>
            
            {/* Center - Game Board (No Frame) */}
            <div className="game-board-container-split">
              <div 
                className="game-board-no-frame"
                style={{
                  width: `${gridSize * 50}px`,
                  height: `${gridSize * 50}px`
                }}
              >
                {gameData.board.map((row: Block[], rowIndex: number) =>
                  row.map((block: Block, colIndex: number) => {
                    if (!block || !block.type) return null
                    
                    const isSelected = gameData.selectedBlocks.some((pos: Position) => pos.row === rowIndex && pos.col === colIndex)
                    const isHinted = gameData.hintBlocks.some((pos: Position) => pos.row === rowIndex && pos.col === colIndex)
                    const isPopping = gameData.poppingBlocks.includes(block.id) // 블록 ID로 정확히 비교
                    
                    const cellSize = 50
                    
                    return (
                      <div
                        key={block.id}
                        className={`game-block-absolute ${
                          isSelected ? 'selected' : ''
                        } ${block.isMatched ? 'matched' : ''} ${isHinted ? 'hinted' : ''} ${block.isInvalid ? 'invalid' : ''} ${
                          isPopping ? 'block-popping' : ''
                        } ${
                          gameData.isProcessing ? 'processing' : ''
                        }`}
                        onMouseDown={(e) => handleMouseDown(e, rowIndex, colIndex)}
                        onMouseUp={handleMouseUp}
                        onMouseMove={handleMouseMove}
                        onTouchStart={(e) => handleTouchStart(e, rowIndex, colIndex)}
                        onTouchEnd={handleTouchEnd}
                        onTouchMove={handleTouchMove}
                        style={{ 
                          position: 'absolute',
                          width: `${cellSize}px`,
                          height: `${cellSize}px`,
                          left: `${colIndex * cellSize}px`,
                          top: `${rowIndex * cellSize}px`,
                          cursor: gameData.isProcessing ? 'not-allowed' : 'pointer',
                          userSelect: 'none',
                          transition: 'top 0.5s ease-out',
                          zIndex: isSelected ? 10 : 1
                        }}
                      >
                        <img 
                          src={getCharacterImage(block.type)}
                          alt={block.type}
                          className="block-image"
                          draggable={false}
                        />
                      </div>
                    )
                  })
                )}
                
                {/* Drag Selection Overlay */}
                {gameData.dragState.isDragging && (() => {
                  const selectionBox = calculateDragSelectionBox()
                  if (!selectionBox) return null
                  
                  return (
                    <div
                      className="drag-selection-overlay"
                      style={{
                        position: 'absolute',
                        top: selectionBox.top,
                        left: selectionBox.left,
                        width: selectionBox.width,
                        height: selectionBox.height,
                        border: '3px solid #FFD700',
                        backgroundColor: 'rgba(255, 215, 0, 0.3)',
                        borderRadius: '8px',
                        zIndex: 100,
                        pointerEvents: 'none',
                        transition: 'all 0.1s ease-out'
                      }}
                    />
                  )
                })()}
              </div>
            </div>
            
            {/* Right Panel - Info & Action */}
            <div className="right-panel-split">
              {/* Score - Top aligned with game board */}
              <div className="score-display-split">
                <div className="score-label-split">Altitude</div>
                <div className="score-value-split">{gameData.score}km</div>
              </div>
              
              {/* Hint Button - Below score */}
              <button 
                className="hint-button-split"
                disabled={
                  gameData.hintsLeft <= 0 || 
                  gameData.isProcessing || 
                  gameData.isAnimating || 
                  gameData.isHintActive ||
                  gameData.gameState !== 'playing'
                }
                onClick={useHint}
              >
                💡 Hint ({gameData.hintsLeft})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderPauseMenu = () => (
    <div className="emotion-match-overlay">
      <div className="pause-menu">
        <h2>Game Paused</h2>
        <div className="pause-buttons">
          <button 
            className="resume-button"
            onClick={() => dispatch({ type: 'SET_STATE', payload: 'playing' })}
          >
            Resume
          </button>
          <button 
            className="give-up-button"
            onClick={() => dispatch({ type: 'SET_STATE', payload: 'game-over' })}
          >
            Give Up
          </button>
        </div>
      </div>
    </div>
  )

  const renderGameOver = () => (
    <div className="game-over-overlay">
      <div className="game-over-popup">
        <div className="game-over-header">
          <h1 className="game-over-title">GAME OVER</h1>
        </div>
        
        <div className="game-over-content">
          <div className="final-score-display">
            <div className="score-label">Final Altitude</div>
            <div className="score-value">{gameData.score}km</div>
          </div>
          
          <div className="game-over-message">
            <p>🎮 Great job flying high! 🎮</p>
          </div>
        </div>
        
        <div className="game-over-footer">
          <button 
            className="game-over-button main-menu-btn"
            onClick={() => dispatch({ type: 'RESET_GAME' })}
          >
            🏠 MAIN
          </button>
        </div>
      </div>
    </div>
  )

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (gameTimer) {
        clearInterval(gameTimer)
      }
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current)
      }
    }
  }, [gameTimer])

  // Render based on game state
  switch (gameData.gameState) {
    case 'menu':
      return renderMainMenu()
    case 'how-to-play':
      return renderHowToPlay()
    case 'difficulty':
      return renderDifficultySelect()
    case 'character-select':
      return renderCharacterSelect()
    case 'playing':
      return renderGameBoard()
    case 'paused':
      return (
        <>
          {renderGameBoard()}
          {renderPauseMenu()}
        </>
      )
    case 'game-over':
      return (
        <>
          {renderGameBoard()}
          {renderGameOver()}
        </>
      )
    default:
      return renderMainMenu()
  }
}