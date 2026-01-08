import { useState } from 'react'
import { useGameState } from './useGameState'
import { BOARD_COLS, BOARD_ROWS } from './types'
import './styles.css'

// Import images
import ghostImage from './single_ghost_crop.png'
import ghostScoreImage from './ghost_score.png'
import titleImage from './game_title_image.png'
import backgroundImage from './game_background.png'

export default function TenExorcism() {
  const {
    phase,
    board,
    score,
    selection,
    isDragging,
    timeRemaining,
    startGame,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetGame,
  } = useGameState()

  const [showHelp, setShowHelp] = useState(false)

  const isInSelection = (row: number, col: number) => {
    if (!selection) return false
    return (
      row >= selection.startRow &&
      row <= selection.endRow &&
      col >= selection.startCol &&
      col <= selection.endCol
    )
  }

  const getCellClassName = (row: number, col: number) => {
    const classes = ['ten-exorcism-cell']
    const cell = board[row][col]

    if (cell.power === null) {
      classes.push('empty')
    }

    if (isInSelection(row, col)) {
      classes.push('selected')
    }

    return classes.join(' ')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Title Screen - full background image
  if (phase === 'title') {
    return (
      <div 
        className="ten-exorcism-container ten-exorcism-title-bg"
        style={{ backgroundImage: `url(${titleImage})` }}
      >
        <div className="ten-exorcism-title-screen">
          <div className="ten-exorcism-title-buttons">
            <button className="ten-exorcism-start-btn" onClick={startGame}>
              게임 시작
            </button>
            <button className="ten-exorcism-help-btn" onClick={() => setShowHelp(true)}>
              게임 방법
            </button>
          </div>
        </div>

        {showHelp && (
          <div className="ten-exorcism-help-overlay" onClick={() => setShowHelp(false)}>
            <div className="ten-exorcism-help-popup" onClick={(e) => e.stopPropagation()}>
              <h3>🎮 게임 방법</h3>
              <p>드래그로 사각형 영역을 선택하세요.</p>
              <p>선택한 유령들의 숫자 합이 <strong>정확히 10</strong>이면 퇴치!</p>
              <p>제한 시간 내에 최대한 많은 유령을 퇴치하세요.</p>
              <p>⏱️ 제한 시간: 2분</p>
              <button onClick={() => setShowHelp(false)}>닫기</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Game Over - show popup over game board
  if (phase === 'gameover') {
    return (
      <div 
        className="ten-exorcism-container ten-exorcism-game-bg"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="ten-exorcism-header">
          <div className="ten-exorcism-score">👻 {score}</div>
          <div className="ten-exorcism-timer">⏱️ 0:00</div>
        </div>

        <div className="ten-exorcism-board-wrapper">
          <div className="ten-exorcism-board ten-exorcism-board-dimmed">
            {Array.from({ length: BOARD_ROWS }, (_, row) => (
              <div key={row} className="ten-exorcism-row">
                {Array.from({ length: BOARD_COLS }, (_, col) => {
                  const cell = board[row]?.[col]
                  return (
                    <div key={col} className="ten-exorcism-cell">
                      {cell?.power !== null && (
                        <>
                          <img
                            src={ghostImage}
                            alt="ghost"
                            className="ten-exorcism-ghost"
                            draggable={false}
                          />
                          <span className="ten-exorcism-power">{cell?.power}</span>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          <div className="ten-exorcism-popup">
            <h3>⏰ Time's Up!</h3>
            <div className="ten-exorcism-score-ghost">
              <img src={ghostScoreImage} alt="Score Ghost" />
              <span className="ten-exorcism-final-score">{score}</span>
            </div>
            <p>유령 {score}마리를 퇴치했습니다!</p>
            <button onClick={resetGame}>다시 하기</button>
          </div>
        </div>
      </div>
    )
  }

  // Playing Screen
  return (
    <div 
      className="ten-exorcism-container ten-exorcism-game-bg"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className="ten-exorcism-header">
        <div className="ten-exorcism-score">👻 {score}</div>
        <div className={`ten-exorcism-timer ${timeRemaining <= 10 ? 'warning' : ''}`}>
          ⏱️ {formatTime(timeRemaining)}
        </div>
      </div>

      <div
        className="ten-exorcism-board"
        onMouseLeave={() => {
          if (isDragging) handleMouseUp()
        }}
        onMouseUp={handleMouseUp}
      >
        {Array.from({ length: BOARD_ROWS }, (_, row) => (
          <div key={row} className="ten-exorcism-row">
            {Array.from({ length: BOARD_COLS }, (_, col) => {
              const cell = board[row][col]
              return (
                <div
                  key={col}
                  className={getCellClassName(row, col)}
                  onMouseDown={() => handleMouseDown(row, col)}
                  onMouseEnter={() => handleMouseMove(row, col)}
                >
                  {cell.power !== null && (
                    <>
                      <img
                        src={ghostImage}
                        alt="ghost"
                        className="ten-exorcism-ghost"
                        draggable={false}
                      />
                      <span className="ten-exorcism-power">{cell.power}</span>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
