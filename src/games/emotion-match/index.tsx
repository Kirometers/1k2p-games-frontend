import { useState, useEffect, useCallback, useReducer } from 'react'
import './styles.css'

// Types
type BlockType = string
type Position = { row: number; col: number }
type Block = {
  type: BlockType
  id: string
  isMatched?: boolean
  isHinted?: boolean
  isInvalid?: boolean
}

type GameState = 'menu' | 'difficulty' | 'character-select' | 'playing' | 'paused' | 'game-over'
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

// Game reducer
type GameAction = 
  | { type: 'SET_STATE'; payload: GameState }
  | { type: 'SET_DIFFICULTY'; payload: Difficulty }
  | { type: 'SET_CHARACTERS'; payload: string[] }
  | { type: 'SET_BOARD'; payload: Block[][] }
  | { type: 'UPDATE_SCORE'; payload: number }
  | { type: 'UPDATE_TIME'; payload: number }
  | { type: 'USE_HINT' }
  | { type: 'SELECT_BLOCK'; payload: Position }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_ANIMATING'; payload: boolean }
  | { type: 'SET_PROCESSING'; payload: boolean }
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
  isProcessing: false
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
    case 'FORCE_UNLOCK':
      return { 
        ...state, 
        isAnimating: false, 
        isProcessing: false, 
        selectedBlocks: [],
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
          id: `${row}-${col}-${Date.now()}-${Math.random()}`
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

  // Apply gravity and fill empty spaces
  const applyGravity = useCallback((board: Block[][], characters: string[]): Block[][] => {
    const newBoard = board.map((row: Block[]) => [...row])
    const size = newBoard.length

    for (let col = 0; col < size; col++) {
      // Move blocks down
      let writePos = size - 1
      for (let row = size - 1; row >= 0; row--) {
        if (!newBoard[row][col].isMatched) {
          if (writePos !== row) {
            newBoard[writePos][col] = { ...newBoard[row][col] }
            newBoard[row][col] = { type: '', id: '', isMatched: true }
          }
          writePos--
        }
      }

      // Fill empty spaces with new blocks
      for (let row = 0; row <= writePos; row++) {
        const blockType = characters[Math.floor(Math.random() * characters.length)]
        newBoard[row][col] = {
          type: blockType,
          id: `${row}-${col}-${Date.now()}-${Math.random()}`
        }
      }
    }

    return newBoard
  }, [])

  // Process matches and update score
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

        // Mark matched blocks
        matches.forEach((pos: Position) => {
          if (currentBoard[pos.row] && currentBoard[pos.row][pos.col]) {
            currentBoard[pos.row][pos.col].isMatched = true
          }
        })

        // Calculate score
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

        // Apply gravity
        currentBoard = applyGravity(currentBoard, gameData.selectedCharacters)
        
        // Small delay for animation
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      if (totalScore > 0) {
        dispatch({ type: 'UPDATE_SCORE', payload: totalScore })
        dispatch({ type: 'UPDATE_TIME', payload: gameData.timeLeft + 2 }) // Bonus time
      }

    } catch (error) {
      console.error('Error in processMatches:', error)
    } finally {
      // 항상 애니메이션 상태 해제
      dispatch({ type: 'SET_ANIMATING', payload: false })
      dispatch({ type: 'SET_PROCESSING', payload: false })
    }

    return currentBoard
  }, [findMatches, applyGravity, gameData.selectedCharacters, gameData.timeLeft])

  // Safety timeout for selected blocks
  useEffect(() => {
    let timeoutId: number | null = null
    
    if (gameData.selectedBlocks.length > 0 && gameData.gameState === 'playing') {
      timeoutId = setTimeout(() => {
        console.log('Safety timeout: Force clearing selection')
        dispatch({ type: 'FORCE_UNLOCK' })
      }, 1000) // 1초 후 자동 해제
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [gameData.selectedBlocks, gameData.gameState])

  // Handle block click with safety mechanisms
  const handleBlockClick = useCallback(async (row: number, col: number) => {
    // 기본 조건 체크
    if (gameData.isAnimating || gameData.isProcessing || gameData.gameState !== 'playing') {
      console.log('Click blocked: game not ready')
      return
    }

    const position = { row, col }
    
    try {
      dispatch({ type: 'SET_PROCESSING', payload: true })
      
      if (gameData.selectedBlocks.length === 0) {
        // 첫 번째 블록 선택
        dispatch({ type: 'SELECT_BLOCK', payload: position })
        
      } else if (gameData.selectedBlocks.length === 1) {
        const firstPos = gameData.selectedBlocks[0]
        
        // 같은 블록 클릭 시 선택 해제
        if (firstPos.row === row && firstPos.col === col) {
          dispatch({ type: 'CLEAR_SELECTION' })
          return
        }
        
        // 인접성 체크
        const isAdjacent = Math.abs(firstPos.row - row) + Math.abs(firstPos.col - col) === 1
        
        if (!isAdjacent) {
          // 인접하지 않으면 새로운 블록 선택
          dispatch({ type: 'SELECT_BLOCK', payload: position })
          return
        }

        // 유효한 이동인지 체크
        const isValid = isValidMove(gameData.board, firstPos, position)
        
        if (isValid) {
          // 유효한 이동 - 스왑 및 매칭 처리
          dispatch({ type: 'SET_ANIMATING', payload: true })
          
          // 블록 스왑
          const newBoard = gameData.board.map((row: Block[]) => [...row])
          const temp = newBoard[firstPos.row][firstPos.col]
          newBoard[firstPos.row][firstPos.col] = newBoard[row][col]
          newBoard[row][col] = temp
          
          dispatch({ type: 'SET_BOARD', payload: newBoard })
          dispatch({ type: 'CLEAR_SELECTION' })
          
          // 매칭 처리
          const processedBoard = await processMatches(newBoard)
          dispatch({ type: 'SET_BOARD', payload: processedBoard })
          
        } else {
          // 무효한 이동 - 에러 애니메이션 표시
          dispatch({ type: 'SET_ANIMATING', payload: true })
          
          // 에러 상태 표시
          const errorBoard = gameData.board.map((row: Block[]) => [...row])
          errorBoard[firstPos.row][firstPos.col].isInvalid = true
          errorBoard[row][col].isInvalid = true
          
          dispatch({ type: 'SET_BOARD', payload: errorBoard })
          
          // 300ms 후 복구
          setTimeout(() => {
            try {
              const clearedBoard = errorBoard.map((row: Block[]) => 
                row.map((block: Block) => ({ ...block, isInvalid: false }))
              )
              dispatch({ type: 'SET_BOARD', payload: clearedBoard })
              dispatch({ type: 'CLEAR_SELECTION' })
              dispatch({ type: 'SET_ANIMATING', payload: false })
              dispatch({ type: 'SET_PROCESSING', payload: false })
            } catch (error) {
              console.error('Error in invalid move recovery:', error)
              dispatch({ type: 'FORCE_UNLOCK' })
            }
          }, 300)
          
          return // 여기서 함수 종료
        }
      }
      
    } catch (error) {
      console.error('Error in handleBlockClick:', error)
      // 에러 발생 시 강제 초기화
      dispatch({ type: 'FORCE_UNLOCK' })
      
    } finally {
      // 유효한 이동이 아닌 경우가 아니라면 처리 상태 해제
      if (gameData.selectedBlocks.length === 0 || 
          (gameData.selectedBlocks.length === 1 && 
           !isValidMove(gameData.board, gameData.selectedBlocks[0], position))) {
        setTimeout(() => {
          dispatch({ type: 'SET_PROCESSING', payload: false })
          dispatch({ type: 'SET_ANIMATING', payload: false })
        }, 50)
      }
    }
  }, [gameData, isValidMove, processMatches])

  // Use hint
  const useHint = useCallback(() => {
    if (gameData.hintsLeft <= 0 || gameData.isProcessing || gameData.isAnimating) return
    
    try {
      const availableMoves = findAvailableMoves(gameData.board)
      if (availableMoves.length > 0) {
        const randomMove = availableMoves[Math.floor(Math.random() * availableMoves.length)]
        
        // Highlight the blocks
        const newBoard = gameData.board.map((row: Block[]) => [...row])
        randomMove.forEach((pos: Position) => {
          if (newBoard[pos.row] && newBoard[pos.row][pos.col]) {
            newBoard[pos.row][pos.col].isHinted = true
          }
        })
        
        dispatch({ type: 'SET_BOARD', payload: newBoard })
        dispatch({ type: 'USE_HINT' })
        
        // Remove hint after 3 seconds
        setTimeout(() => {
          try {
            const clearedBoard = newBoard.map((row: Block[]) => 
              row.map((block: Block) => ({ ...block, isHinted: false }))
            )
            dispatch({ type: 'SET_BOARD', payload: clearedBoard })
          } catch (error) {
            console.error('Error clearing hint:', error)
          }
        }, 3000)
      }
    } catch (error) {
      console.error('Error in useHint:', error)
    }
  }, [gameData.board, gameData.hintsLeft, gameData.isProcessing, gameData.isAnimating, findAvailableMoves])

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

  // Render functions
  const renderMainMenu = () => (
    <div className="emotion-match-menu">
      <div className="menu-content">
        <h1 className="game-title">Emotion Match</h1>
        <p className="game-description">
          Match emotion blocks to reach high altitudes within the time limit!
        </p>
        <button 
          className="menu-button"
          onClick={() => dispatch({ type: 'SET_STATE', payload: 'difficulty' })}
        >
          Start Game
        </button>
      </div>
    </div>
  )

  const renderDifficultySelect = () => (
    <div className="emotion-match-menu">
      <div className="menu-content">
        <h2>Select Difficulty</h2>
        <div className="difficulty-buttons">
          <button 
            className="difficulty-button"
            onClick={() => {
              dispatch({ type: 'SET_DIFFICULTY', payload: 'normal' })
              dispatch({ type: 'SET_STATE', payload: 'character-select' })
            }}
          >
            <div className="difficulty-title">Normal</div>
            <div className="difficulty-desc">10x10 Grid • 6 Characters</div>
          </button>
          <button 
            className="difficulty-button"
            onClick={() => {
              dispatch({ type: 'SET_DIFFICULTY', payload: 'hard' })
              dispatch({ type: 'SET_STATE', payload: 'character-select' })
            }}
          >
            <div className="difficulty-title">Hard</div>
            <div className="difficulty-desc">12x12 Grid • 8 Characters</div>
          </button>
        </div>
        <button 
          className="back-button"
          onClick={() => dispatch({ type: 'SET_STATE', payload: 'menu' })}
        >
          Back
        </button>
      </div>
    </div>
  )

  const renderCharacterSelect = () => (
    <div className="emotion-match-menu">
      <div className="menu-content">
        <h2>Select Characters</h2>
        <p>Choose {requiredCharacters} emotion characters for your game</p>
        <div className="character-grid">
          {ALL_CHARACTERS.map((character: string) => (
            <div
              key={character}
              className={`character-option ${gameData.selectedCharacters.includes(character) ? 'selected' : ''}`}
              onClick={() => toggleCharacter(character)}
            >
              <img 
                src={`/src/games/emotion-match/re_${character}.png`}
                alt={character}
                className="character-image"
              />
            </div>
          ))}
        </div>
        <div className="character-select-footer">
          <span>Selected: {gameData.selectedCharacters.length}/{requiredCharacters}</span>
          <div className="character-select-buttons">
            <button 
              className="back-button"
              onClick={() => dispatch({ type: 'SET_STATE', payload: 'difficulty' })}
            >
              Back
            </button>
            <button 
              className="start-button"
              disabled={gameData.selectedCharacters.length !== requiredCharacters}
              onClick={startGame}
            >
              Start Game
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderGameBoard = () => (
    <div className="emotion-match-game">
      <div className="game-main">
        <div className="left-dashboard">
          <div className="score-display">
            <div className="score-label">Current Altitude</div>
            <div className="score-value">{gameData.score}km</div>
          </div>
          
          <div className="timer-hint-container">
            <div className="vertical-timer">
              <div className="timer-container">
                <div 
                  className="timer-fill"
                  style={{ height: `${(gameData.timeLeft / 60) * 100}%` }}
                />
              </div>
              <div className="timer-text">{gameData.timeLeft}s</div>
            </div>
            
            <button 
              className="hint-button"
              disabled={gameData.hintsLeft <= 0 || gameData.isProcessing}
              onClick={useHint}
            >
              💡<br/>Hint<br/>({gameData.hintsLeft})
            </button>
          </div>
        </div>
        
        <div className="game-board-container">
          <div 
            className="game-board"
            style={{ 
              gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
              gridTemplateRows: `repeat(${gridSize}, 1fr)`
            }}
          >
            {gameData.board.map((row: Block[], rowIndex: number) =>
              row.map((block: Block, colIndex: number) => (
                <div
                  key={block.id}
                  className={`game-block ${
                    gameData.selectedBlocks.some((pos: Position) => pos.row === rowIndex && pos.col === colIndex) 
                      ? 'selected' : ''
                  } ${block.isMatched ? 'matched' : ''} ${block.isHinted ? 'hinted' : ''} ${block.isInvalid ? 'invalid' : ''} ${
                    gameData.isProcessing ? 'processing' : ''
                  }`}
                  onClick={() => handleBlockClick(rowIndex, colIndex)}
                >
                  <img 
                    src={`/src/games/emotion-match/re_${block.type}.png`}
                    alt={block.type}
                    className="block-image"
                  />
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="right-panel">
          <button 
            className="pause-button"
            disabled={gameData.isProcessing}
            onClick={() => dispatch({ type: 'SET_STATE', payload: 'paused' })}
          >
            ⏸️
          </button>
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
    <div className="emotion-match-menu">
      <div className="menu-content">
        <h2>Game Over!</h2>
        <div className="final-score">
          <div className="score-label">Final Altitude</div>
          <div className="score-value">{gameData.score}km</div>
        </div>
        <button 
          className="menu-button"
          onClick={() => dispatch({ type: 'RESET_GAME' })}
        >
          Main Menu
        </button>
      </div>
    </div>
  )

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (gameTimer) {
        clearInterval(gameTimer)
      }
    }
  }, [gameTimer])

  // Render based on game state
  switch (gameData.gameState) {
    case 'menu':
      return renderMainMenu()
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
      return renderGameOver()
    default:
      return renderMainMenu()
  }
}