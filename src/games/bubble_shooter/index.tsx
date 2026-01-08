import { useEffect, useRef, useState } from 'react'
import { Box, SpaceBetween } from '@cloudscape-design/components'
import kiroImage from './krio.png'

// 게임 상수
const WALL_DESCENT_INTERVAL_MS = 30000  // 30초
const WALL_DESCENT_ROWS = 1              // 1칸씩 내려오기
const SHOOTER_LINE_ROW = 18              // 구슬라인 행 (격자 기준)
const SHOOTER_LINE_Y = 530               // 구슬라인 Y 좌표 (픽셀 기준)
const SHOOTING_LOCK_DURATION_MS = 200    // 벽 하강 시 발사 잠금 시간
const WALL_DESCENT_ANIMATION_MS = 300    // 벽 하강 애니메이션 시간

// 격자 렌더링 상수 (부동소수 오차 방지)
const BUBBLE_RADIUS = 20
const CELL_WIDTH = BUBBLE_RADIUS * 2     // 40px
const CELL_HEIGHT = Math.floor(BUBBLE_RADIUS * 1.7)  // 34px (정수로 고정)
const ROW_OFFSET_X = BUBBLE_RADIUS       // 홀수 행 오프셋

// 개발 모드 검증 활성화 (프로덕션에서는 false)
const DEV_MODE_VALIDATION = typeof window !== 'undefined' && window.location.hostname === 'localhost'

interface Bubble {
  color: string
  gridRow: number  // 생성 시점의 격자 행 (불변)
  gridCol: number  // 생성 시점의 격자 열 (불변)
  id?: string      // 개발 모드 검증용 고유 식별자
}

interface CurrentBubble {
  x: number
  y: number
  color: string
  dx: number
  dy: number
  moving: boolean
}

interface Trajectory {
  dx: number
  dy: number
}

export default function BubbleShooter() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wallDescentOverlayRef = useRef<HTMLDivElement>(null)
  const [score, setScore] = useState(0)
  const [gameRunning, setGameRunning] = useState(true)
  const [gameOver, setGameOver] = useState(false)
  const [timeLeft, setTimeLeft] = useState(WALL_DESCENT_INTERVAL_MS / 1000)
  const [isShootingLocked, setIsShootingLocked] = useState(false)
  const [isWallAnimating, setIsWallAnimating] = useState(false)
  const [showWallDescentEffect, setShowWallDescentEffect] = useState(false)
  
  // 게임 상태
  const gameStateRef = useRef({
    bubbles: [] as Bubble[],
    boardOffsetRows: 0,  // 전체 보드 하강 오프셋 (정수)
    animationOffsetY: 0, // 애니메이션용 Y 오프셋 (실수)
    currentBubble: null as CurrentBubble | null,
    nextBubble: null as { color: string } | null,
    trajectory: null as Trajectory | null,
    shooter: { x: 0, y: 0 },
    bubbleRadius: BUBBLE_RADIUS,
    colors: ['#8B5CF6', '#EF4444', '#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#06B6D4'],
    rows: 8,
    cols: 12,
    wallTimer: null as number | null,
    countdownTimer: null as number | null,
    shootingLockTimer: null as number | null,
    bubbleIdCounter: 0,  // 개발 모드용 ID 생성 카운터
    animationStartTime: 0, // 애니메이션 시작 시간
    kiroImage: null as HTMLImageElement | null,
    imageLoaded: false
  })

  // 버블 배열 불변성 검증 헬퍼 함수들
  const createBubbleSnapshot = (bubbles: Bubble[]) => {
    if (!DEV_MODE_VALIDATION) return null
    
    return bubbles.map(bubble => ({
      id: bubble.id,
      color: bubble.color,
      gridRow: bubble.gridRow,
      gridCol: bubble.gridCol,
      checksum: `${bubble.color}-${bubble.gridRow}-${bubble.gridCol}`
    }))
  }

  const validateBubbleIntegrity = (beforeSnapshot: any[], afterBubbles: Bubble[], operation: string) => {
    if (!DEV_MODE_VALIDATION || !beforeSnapshot) return true

    // 새로 추가된 버블 제외하고 기존 버블들만 검증
    const existingBubbles = afterBubbles.filter(bubble => 
      beforeSnapshot.some(snap => snap.id === bubble.id)
    )

    // 기존 버블 수가 줄어들었는지 확인 (제거된 경우)
    const removedCount = beforeSnapshot.length - existingBubbles.length
    if (removedCount > 0) {
      console.log(`[DEV] ${operation}: ${removedCount}개 버블이 제거됨 (정상)`)
    }

    // 기존 버블들의 데이터 무결성 검증
    let integrityViolations = 0
    
    existingBubbles.forEach(bubble => {
      const originalSnap = beforeSnapshot.find(snap => snap.id === bubble.id)
      if (!originalSnap) return

      const currentChecksum = `${bubble.color}-${bubble.gridRow}-${bubble.gridCol}`
      
      if (originalSnap.checksum !== currentChecksum) {
        console.warn(`[DEV] 버블 무결성 위반 감지! ${operation}`)
        console.warn(`  버블 ID: ${bubble.id}`)
        console.warn(`  이전: ${originalSnap.checksum}`)
        console.warn(`  현재: ${currentChecksum}`)
        integrityViolations++
      }
    })

    if (integrityViolations > 0) {
      console.error(`[DEV] ${operation}에서 ${integrityViolations}개 버블의 데이터가 변경됨!`)
      return false
    }

    console.log(`[DEV] ${operation}: 버블 배열 무결성 검증 통과 ✓`)
    return true
  }

  const assignBubbleId = (bubble: Bubble): Bubble => {
    if (!DEV_MODE_VALIDATION) return bubble
    
    const state = gameStateRef.current
    return {
      ...bubble,
      id: `bubble_${++state.bubbleIdCounter}`
    }
  }

  const restartGame = () => {
    const state = gameStateRef.current
    
    // 게임 상태 초기화
    state.bubbles = []
    state.boardOffsetRows = 0
    state.animationOffsetY = 0
    state.currentBubble = null
    state.nextBubble = null
    state.trajectory = null
    state.bubbleIdCounter = 0
    state.animationStartTime = 0
    
    // React 상태 초기화
    setScore(0)
    setGameRunning(true)
    setGameOver(false)
    setTimeLeft(WALL_DESCENT_INTERVAL_MS / 1000)
    setIsShootingLocked(false)
    setIsWallAnimating(false)
    setShowWallDescentEffect(false)
    
    // 모든 타이머 정리
    if (state.wallTimer) {
      clearInterval(state.wallTimer)
      state.wallTimer = null
    }
    if (state.countdownTimer) {
      clearInterval(state.countdownTimer)
      state.countdownTimer = null
    }
    if (state.shootingLockTimer) {
      clearTimeout(state.shootingLockTimer)
      state.shootingLockTimer = null
    }
    
    // 게임 재시작
    const canvas = canvasRef.current
    if (canvas) {
      initGame(canvas)
      startWallTimer()
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 게임 초기화
    initGame(canvas)
    
    // 게임 루프 시작
    const gameLoop = () => {
      if (gameRunning) {
        updateBubble()
      }
      draw(canvas, ctx)
      requestAnimationFrame(gameLoop)
    }
    gameLoop()

    // 30초 타이머 시작
    startWallTimer()

    // 이벤트 리스너 설정
    const handleMouseMove = (e: MouseEvent) => {
      if (!gameRunning || gameOver || isShootingLocked || isWallAnimating || gameStateRef.current.currentBubble?.moving) return
      
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      
      calculateTrajectory(mouseX, mouseY)
    }

    const handleClick = (e: MouseEvent) => {
      if (!gameRunning || gameOver || isShootingLocked || isWallAnimating || gameStateRef.current.currentBubble?.moving) return
      
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      
      // 게임 종료 상태에서 재시작 버튼 클릭 체크
      if (!gameRunning) {
        const restartButtonX = canvas.width / 2 - 80
        const restartButtonY = canvas.height / 2 + 40
        const restartButtonWidth = 160
        const restartButtonHeight = 50
        
        if (mouseX >= restartButtonX && mouseX <= restartButtonX + restartButtonWidth &&
            mouseY >= restartButtonY && mouseY <= restartButtonY + restartButtonHeight) {
          restartGame()
          return
        }
      }
      
      shootBubble(mouseX, mouseY)
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('click', handleClick)

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('click', handleClick)
      if (gameStateRef.current.wallTimer) {
        clearInterval(gameStateRef.current.wallTimer)
      }
      if (gameStateRef.current.countdownTimer) {
        clearInterval(gameStateRef.current.countdownTimer)
      }
      if (gameStateRef.current.shootingLockTimer) {
        clearTimeout(gameStateRef.current.shootingLockTimer)
      }
    }
  }, [gameRunning, gameOver, isShootingLocked, isWallAnimating])

  const initGame = (canvas: HTMLCanvasElement) => {
    const state = gameStateRef.current
    state.shooter = { x: canvas.width / 2, y: canvas.height - 50 }
    
    // 키로 이미지 로드
    state.kiroImage = new Image()
    state.kiroImage.src = kiroImage
    state.kiroImage.onload = () => {
      state.imageLoaded = true
    }
    state.kiroImage.onerror = () => {
      console.warn('[DEV] kiro 이미지를 로드할 수 없습니다.')
      state.imageLoaded = false
    }
    
    // 초기 버블 배치
    createInitialBubbles()
    createNewBubble()
    createNextBubble()
  }

  const createInitialBubbles = () => {
    const state = gameStateRef.current
    state.bubbles = []
    
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < state.cols; col++) {
        const offsetX = (row % 2) * ROW_OFFSET_X
        const x = col * CELL_WIDTH + BUBBLE_RADIUS + offsetX
        
        if (x < 500 - BUBBLE_RADIUS) {
          const newBubble = assignBubbleId({
            color: state.colors[Math.floor(Math.random() * state.colors.length)],
            gridRow: row,
            gridCol: col
          })
          state.bubbles.push(newBubble)
        }
      }
    }
  }

  // 버블의 실제 렌더링 위치 계산 (격자 스냅, 부동소수 오차 방지)
  const getBubbleRenderPosition = (bubble: Bubble) => {
    const state = gameStateRef.current
    const actualRow = bubble.gridRow + state.boardOffsetRows
    const offsetX = (actualRow % 2) * ROW_OFFSET_X
    
    return {
      x: bubble.gridCol * CELL_WIDTH + BUBBLE_RADIUS + offsetX,
      y: actualRow * CELL_HEIGHT + BUBBLE_RADIUS + state.animationOffsetY
    }
  }

  const createNewBubble = () => {
    const state = gameStateRef.current
    state.currentBubble = {
      x: state.shooter.x,
      y: state.shooter.y,
      color: state.nextBubble ? state.nextBubble.color : state.colors[Math.floor(Math.random() * state.colors.length)],
      dx: 0,
      dy: 0,
      moving: false
    }
  }

  const createNextBubble = () => {
    const state = gameStateRef.current
    state.nextBubble = {
      color: state.colors[Math.floor(Math.random() * state.colors.length)]
    }
  }

  const calculateTrajectory = (mouseX: number, mouseY: number) => {
    const state = gameStateRef.current
    const dx = mouseX - state.shooter.x
    const dy = mouseY - state.shooter.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance > 0) {
      state.trajectory = {
        dx: dx / distance,
        dy: dy / distance
      }
    }
  }

  const shootBubble = (mouseX: number, mouseY: number) => {
    const state = gameStateRef.current
    if (!state.currentBubble) return
    
    const dx = mouseX - state.shooter.x
    const dy = mouseY - state.shooter.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance > 0 && dy < 0) {
      const speed = 16
      state.currentBubble.dx = (dx / distance) * speed
      state.currentBubble.dy = (dy / distance) * speed
      state.currentBubble.moving = true
    }
  }

  const updateBubble = () => {
    const state = gameStateRef.current
    if (!state.currentBubble?.moving) return
    
    // 버블 이동
    state.currentBubble.x += state.currentBubble.dx
    state.currentBubble.y += state.currentBubble.dy
    
    // 벽 충돌 처리
    if (state.currentBubble.x <= BUBBLE_RADIUS || 
        state.currentBubble.x >= 500 - BUBBLE_RADIUS) {
      state.currentBubble.dx = -state.currentBubble.dx
    }
    
    // 천장에 닿으면 붙이기
    if (state.currentBubble.y <= BUBBLE_RADIUS + 2) {
      attachBubbleToTop()
      return
    }
    
    // 다른 버블과 충돌 검사
    let closestBubble = null
    let minDistance = Infinity
    
    for (let bubble of state.bubbles) {
      const bubblePos = getBubbleRenderPosition(bubble)
      const distance = Math.sqrt(
        Math.pow(state.currentBubble.x - bubblePos.x, 2) + 
        Math.pow(state.currentBubble.y - bubblePos.y, 2)
      )
      
      if (distance <= BUBBLE_RADIUS * 2.1 && distance < minDistance) {
        minDistance = distance
        closestBubble = bubble
      }
    }
    
    if (closestBubble && minDistance <= BUBBLE_RADIUS * 2.1) {
      attachBubble(closestBubble)
      return
    }
  }

  const attachBubble = (nearBubble: Bubble) => {
    const state = gameStateRef.current
    if (!state.currentBubble) return
    
    const possiblePositions = findNearbyPositions(nearBubble)
    
    let bestPosition = possiblePositions[0]
    let minDistance = Infinity
    
    for (let pos of possiblePositions) {
      const distance = Math.sqrt(
        Math.pow(state.currentBubble.x - pos.x, 2) + 
        Math.pow(state.currentBubble.y - pos.y, 2)
      )
      
      if (distance < minDistance) {
        minDistance = distance
        bestPosition = pos
      }
    }
    
    const newBubble = assignBubbleId({
      color: state.currentBubble.color,
      gridRow: bestPosition.gridRow,
      gridCol: bestPosition.gridCol
    })
    
    state.bubbles.push(newBubble)
    checkMatches(newBubble)
    
    createNewBubble()
    createNextBubble()
    
    // 버블이 격자에 고정된 직후 게임오버 체크
    checkGameOver()
  }

  const findNearbyPositions = (nearBubble: Bubble) => {
    const state = gameStateRef.current
    const positions = []
    const directions = [
      [-1, -1], [0, -1], [1, -1],
      [-1, 0],           [1, 0],
      [-1, 1],  [0, 1],  [1, 1]
    ]
    
    for (let [dx, dy] of directions) {
      const newRow = nearBubble.gridRow + dy
      const newCol = nearBubble.gridCol + dx
      
      const offsetX = (newRow % 2) * ROW_OFFSET_X
      const x = newCol * CELL_WIDTH + BUBBLE_RADIUS + offsetX
      const y = newRow * CELL_HEIGHT + BUBBLE_RADIUS
      
      if (x >= BUBBLE_RADIUS && x <= 500 - BUBBLE_RADIUS && 
          y >= BUBBLE_RADIUS && newRow >= 0) {
        
        const occupied = state.bubbles.some(bubble => {
          const bubblePos = getBubbleRenderPosition(bubble)
          return Math.sqrt(Math.pow(bubblePos.x - x, 2) + Math.pow(bubblePos.y - y, 2)) < BUBBLE_RADIUS
        })
        
        if (!occupied) {
          positions.push({ x, y, gridRow: newRow, gridCol: newCol })
        }
      }
    }
    
    if (positions.length === 0) {
      const gridX = Math.round((state.currentBubble!.x - BUBBLE_RADIUS) / CELL_WIDTH)
      const gridY = Math.round((state.currentBubble!.y - BUBBLE_RADIUS) / CELL_HEIGHT) - state.boardOffsetRows
      const offsetX = (gridY % 2) * ROW_OFFSET_X
      
      positions.push({
        x: gridX * CELL_WIDTH + BUBBLE_RADIUS + offsetX,
        y: (gridY + state.boardOffsetRows) * CELL_HEIGHT + BUBBLE_RADIUS,
        gridRow: gridY,
        gridCol: gridX
      })
    }
    
    return positions
  }

  const attachBubbleToTop = () => {
    const state = gameStateRef.current
    if (!state.currentBubble) return
    
    const gridX = Math.round((state.currentBubble.x - BUBBLE_RADIUS) / CELL_WIDTH)
    const gridY = -state.boardOffsetRows  // 보드 오프셋 고려한 최상단
    
    const newBubble = assignBubbleId({
      color: state.currentBubble.color,
      gridRow: gridY,
      gridCol: gridX
    })
    
    state.bubbles.push(newBubble)
    checkMatches(newBubble)
    
    createNewBubble()
    createNextBubble()
    
    // 버블이 격자에 고정된 직후 게임오버 체크
    checkGameOver()
  }

  const checkMatches = (bubble: Bubble) => {
    // 매칭 검사 전 버블 상태 스냅샷
    const beforeSnapshot = createBubbleSnapshot(gameStateRef.current.bubbles)
    
    const matches = findMatches(bubble, bubble.color, [])
    
    if (matches.length >= 3) {
      const state = gameStateRef.current
      
      for (let match of matches) {
        const index = state.bubbles.indexOf(match)
        if (index > -1) {
          state.bubbles.splice(index, 1)
        }
      }
      
      const newScore = score + matches.length * 10
      setScore(newScore)
      
      // 매칭 후 버블 무결성 검증
      validateBubbleIntegrity(beforeSnapshot || [], state.bubbles, '버블 매칭 제거')
      
      removeFloatingBubbles()
    }
  }

  const findMatches = (bubble: Bubble, color: string, visited: Bubble[]): Bubble[] => {
    if (visited.includes(bubble) || bubble.color !== color) {
      return []
    }
    
    visited.push(bubble)
    let matches = [bubble]
    
    const state = gameStateRef.current
    const bubblePos = getBubbleRenderPosition(bubble)
    
    for (let other of state.bubbles) {
      if (other === bubble || visited.includes(other)) continue
      
      const otherPos = getBubbleRenderPosition(other)
      const distance = Math.sqrt(
        Math.pow(bubblePos.x - otherPos.x, 2) + 
        Math.pow(bubblePos.y - otherPos.y, 2)
      )
      
      if (distance < BUBBLE_RADIUS * 2.5 && other.color === color) {
        matches = matches.concat(findMatches(other, color, visited))
      }
    }
    
    return matches
  }

  const removeFloatingBubbles = () => {
    const state = gameStateRef.current
    
    // 떠있는 버블 제거 전 스냅샷
    const beforeSnapshot = createBubbleSnapshot(state.bubbles)
    
    const connected: Bubble[] = []
    
    for (let bubble of state.bubbles) {
      if (bubble.gridRow + state.boardOffsetRows <= 0) {  // 천장에 연결된 버블
        markConnected(bubble, connected)
      }
    }
    
    const toRemove = state.bubbles.filter(bubble => !connected.includes(bubble))
    for (let bubble of toRemove) {
      const index = state.bubbles.indexOf(bubble)
      if (index > -1) {
        state.bubbles.splice(index, 1)
      }
    }
    
    if (toRemove.length > 0) {
      setScore(prev => prev + toRemove.length * 5)
      
      // 떠있는 버블 제거 후 무결성 검증
      validateBubbleIntegrity(beforeSnapshot || [], state.bubbles, '떠있는 버블 제거')
    }
  }

  const markConnected = (bubble: Bubble, connected: Bubble[]) => {
    if (connected.includes(bubble)) return
    
    connected.push(bubble)
    
    const state = gameStateRef.current
    const bubblePos = getBubbleRenderPosition(bubble)
    
    for (let other of state.bubbles) {
      if (other === bubble || connected.includes(other)) continue
      
      const otherPos = getBubbleRenderPosition(other)
      const distance = Math.sqrt(
        Math.pow(bubblePos.x - otherPos.x, 2) + 
        Math.pow(bubblePos.y - otherPos.y, 2)
      )
      
      if (distance < BUBBLE_RADIUS * 2.5) {
        markConnected(other, connected)
      }
    }
  }

  const startWallTimer = () => {
    const state = gameStateRef.current
    
    // 벽 하강 타이머 (30초마다)
    state.wallTimer = setInterval(() => {
      lockShooting() // 하강 시작 전 발사 잠금
      
      // 잠시 후 벽 하강 애니메이션 시작
      setTimeout(() => {
        startWallDescentAnimation()
        setTimeLeft(WALL_DESCENT_INTERVAL_MS / 1000) // 타이머 리셋
      }, 50) // 50ms 후 하강 시작
      
    }, WALL_DESCENT_INTERVAL_MS)
    
    // 카운트다운 타이머 (1초마다)
    state.countdownTimer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          return WALL_DESCENT_INTERVAL_MS / 1000
        }
        return prev - 1
      })
    }, 1000)
  }

  const lockShooting = () => {
    const state = gameStateRef.current
    
    // 발사 잠금 활성화
    setIsShootingLocked(true)
    
    // 벽 하강 시각 효과 시작
    setShowWallDescentEffect(true)
    
    // 기존 타이머가 있으면 정리
    if (state.shootingLockTimer) {
      clearTimeout(state.shootingLockTimer)
    }
    
    // 지정된 시간 후 잠금 해제
    state.shootingLockTimer = setTimeout(() => {
      setIsShootingLocked(false)
      setShowWallDescentEffect(false)
      state.shootingLockTimer = null
    }, SHOOTING_LOCK_DURATION_MS)
  }

  const startWallDescentAnimation = () => {
    const state = gameStateRef.current
    
    setIsWallAnimating(true)
    state.animationStartTime = performance.now()
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - state.animationStartTime
      const progress = Math.min(elapsed / WALL_DESCENT_ANIMATION_MS, 1)
      
      // easeOutCubic 이징 함수 (부드러운 감속)
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      
      // 애니메이션 오프셋 계산 (격자 크기 기준)
      state.animationOffsetY = easeProgress * CELL_HEIGHT
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        // 애니메이션 완료
        completeWallDescent()
      }
    }
    
    requestAnimationFrame(animate)
  }

  const completeWallDescent = () => {
    const state = gameStateRef.current
    
    // 애니메이션 오프셋 리셋
    state.animationOffsetY = 0
    setIsWallAnimating(false)
    
    // 실제 데이터 업데이트 (버블 배열은 불변)
    pushWallDown()
  }

  const pushWallDown = () => {
    const state = gameStateRef.current
    
    // 벽 하강 전 버블 상태 스냅샷 생성
    const beforeSnapshot = createBubbleSnapshot(state.bubbles)
    
    // 전체 보드를 지정된 행 수만큼 아래로 밀기 (버블 배열 수정 없음)
    state.boardOffsetRows += WALL_DESCENT_ROWS
    
    // 벽 하강 후 기존 버블 무결성 검증
    validateBubbleIntegrity(beforeSnapshot || [], state.bubbles, '벽 하강 (기존 버블)')
    
    // 새로운 맨 위 행들 추가
    for (let newRowOffset = 0; newRowOffset < WALL_DESCENT_ROWS; newRowOffset++) {
      const newGridRow = -state.boardOffsetRows + newRowOffset
      
      for (let col = 0; col < state.cols; col++) {
        const offsetX = (newGridRow % 2) * ROW_OFFSET_X
        const x = col * CELL_WIDTH + BUBBLE_RADIUS + offsetX
        
        if (x < 500 - BUBBLE_RADIUS) {
          const newBubble = assignBubbleId({
            color: state.colors[Math.floor(Math.random() * state.colors.length)],
            gridRow: newGridRow,
            gridCol: col
          })
          state.bubbles.push(newBubble)
        }
      }
    }
    
    // 게임오버 체크 (구슬라인 침범) - 벽 하강 완료 직후
    checkGameOver()
  }

  const checkGameOver = () => {
    const state = gameStateRef.current
    
    // 버블이 구슬라인에 닿거나 침범했는지 체크
    for (let bubble of state.bubbles) {
      const bubblePos = getBubbleRenderPosition(bubble)
      const bubbleBottomY = bubblePos.y + BUBBLE_RADIUS
      
      // 픽셀 좌표 기준: 버블 하단이 구슬라인에 닿거나 넘으면 게임오버
      if (bubbleBottomY >= SHOOTER_LINE_Y) {
        triggerGameOver()
        return
      }
      
      // 격자 좌표 기준: 버블 행이 구슬라인 행에 닿거나 넘으면 게임오버
      const actualRow = bubble.gridRow + state.boardOffsetRows
      if (actualRow >= SHOOTER_LINE_ROW) {
        triggerGameOver()
        return
      }
    }
    
    // 모든 버블 제거 시 승리
    if (state.bubbles.length === 0) {
      triggerVictory()
    }
  }

  const triggerGameOver = () => {
    const state = gameStateRef.current
    
    setGameRunning(false)
    setGameOver(true)
    
    // 모든 타이머 정리
    if (state.wallTimer) {
      clearInterval(state.wallTimer)
      state.wallTimer = null
    }
    if (state.countdownTimer) {
      clearInterval(state.countdownTimer)
      state.countdownTimer = null
    }
    if (state.shootingLockTimer) {
      clearTimeout(state.shootingLockTimer)
      state.shootingLockTimer = null
    }
    
    // 발사 잠금도 해제
    setIsShootingLocked(false)
    setShowWallDescentEffect(false)
  }

  const triggerVictory = () => {
    const state = gameStateRef.current
    
    setGameRunning(false)
    // 승리 시에는 gameOver를 false로 유지 (승리 상태 구분)
    
    // 모든 타이머 정리
    if (state.wallTimer) {
      clearInterval(state.wallTimer)
      state.wallTimer = null
    }
    if (state.countdownTimer) {
      clearInterval(state.countdownTimer)
      state.countdownTimer = null
    }
    if (state.shootingLockTimer) {
      clearTimeout(state.shootingLockTimer)
      state.shootingLockTimer = null
    }
    
    // 발사 잠금도 해제
    setIsShootingLocked(false)
    setShowWallDescentEffect(false)
  }

  const draw = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const state = gameStateRef.current
    
    // 화면 지우기
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // 배경 버블들 그리기
    for (let bubble of state.bubbles) {
      const bubblePos = getBubbleRenderPosition(bubble)
      drawBubble(ctx, bubblePos.x, bubblePos.y, bubble.color)
    }
    
    // 현재 버블 그리기
    if (state.currentBubble) {
      drawBubble(ctx, state.currentBubble.x, state.currentBubble.y, state.currentBubble.color)
    }
    
    // 조준선 그리기 (게임 진행 중이고 발사 잠금/애니메이션이 아닐 때만)
    if (gameRunning && !gameOver && !isShootingLocked && !isWallAnimating && !state.currentBubble?.moving && state.trajectory) {
      drawTrajectory(ctx)
    }
    
    // 다음 버블 미리보기
    if (state.nextBubble) {
      ctx.fillStyle = '#fff'
      ctx.font = '12px Arial'
      ctx.fillText('다음:', canvas.width - 70, canvas.height - 60)
      drawBubble(ctx, canvas.width - 35, canvas.height - 35, state.nextBubble.color)
    }
    
    // 발사 잠금 또는 애니메이션 상태 표시
    if (isShootingLocked || isWallAnimating) {
      drawShootingLockIndicator(ctx, canvas)
    }
    
    // 구슬라인 그리기 (시각적 참조용)
    drawShooterLine(ctx, canvas)
    
    // 슈터 키로 그리기
    drawShooterKiro(ctx)
    
    // 게임 종료 상태 표시
    if (!gameRunning) {
      showGameEnd(ctx, canvas)
    }
  }

  const drawBubble = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    // 1. 외부 글로우 효과 (그림자로 구현)
    ctx.shadowColor = color
    ctx.shadowBlur = 8
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    
    // 2. 메인 버블 - 방사형 그라데이션 (더 입체적)
    const mainGradient = ctx.createRadialGradient(
      x - 6, y - 6, 0,  // 하이라이트 위치 (좌상단)
      x, y, BUBBLE_RADIUS
    )
    mainGradient.addColorStop(0, lightenColor(color, 0.6))    // 밝은 하이라이트
    mainGradient.addColorStop(0.3, lightenColor(color, 0.2))  // 중간 톤
    mainGradient.addColorStop(0.7, color)                     // 원본 색상
    mainGradient.addColorStop(1, darkenColor(color, 0.4))     // 어두운 테두리
    
    ctx.beginPath()
    ctx.arc(x, y, BUBBLE_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = mainGradient
    ctx.fill()
    
    // 그림자 효과 제거
    ctx.shadowBlur = 0
    
    // 3. 내부 하이라이트 (큰 반사광)
    const highlightGradient = ctx.createRadialGradient(
      x - 7, y - 7, 0,
      x - 7, y - 7, BUBBLE_RADIUS * 0.5
    )
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)')
    highlightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)')
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    
    ctx.beginPath()
    ctx.arc(x - 7, y - 7, BUBBLE_RADIUS * 0.5, 0, Math.PI * 2)
    ctx.fillStyle = highlightGradient
    ctx.fill()
    
    // 4. 작은 반짝임 하이라이트
    ctx.beginPath()
    ctx.arc(x - 9, y - 9, BUBBLE_RADIUS * 0.15, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.fill()
    
    // 5. 미세한 테두리 하이라이트
    ctx.beginPath()
    ctx.arc(x, y, BUBBLE_RADIUS - 1, 0, Math.PI * 2)
    ctx.strokeStyle = lightenColor(color, 0.3)
    ctx.lineWidth = 1
    ctx.stroke()
    
    // 6. 외부 테두리 (입체감 강화)
    ctx.beginPath()
    ctx.arc(x, y, BUBBLE_RADIUS, 0, Math.PI * 2)
    ctx.strokeStyle = darkenColor(color, 0.2)
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  const darkenColor = (color: string, factor: number) => {
    const hex = color.replace('#', '')
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) * (1 - factor))
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) * (1 - factor))
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) * (1 - factor))
    
    return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`
  }

  const lightenColor = (color: string, factor: number) => {
    const hex = color.replace('#', '')
    const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + (255 - parseInt(hex.substr(0, 2), 16)) * factor)
    const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + (255 - parseInt(hex.substr(2, 2), 16)) * factor)
    const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + (255 - parseInt(hex.substr(4, 2), 16)) * factor)
    
    return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`
  }

  const drawTrajectory = (ctx: CanvasRenderingContext2D) => {
    const state = gameStateRef.current
    if (!state.trajectory) return
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    
    ctx.beginPath()
    ctx.moveTo(state.shooter.x, state.shooter.y)
    
    const endX = state.shooter.x + state.trajectory.dx * 100
    const endY = state.shooter.y + state.trajectory.dy * 100
    
    ctx.lineTo(endX, endY)
    ctx.stroke()
    ctx.setLineDash([])
  }

  const drawShooterKiro = (ctx: CanvasRenderingContext2D) => {
    const state = gameStateRef.current
    const kiroX = state.shooter.x - 60
    const kiroY = state.shooter.y + 10
    const size = 70 // 기존 유령과 비슷한 크기
    
    // 키로 이미지가 로드되었으면 이미지 사용
    if (state.imageLoaded && state.kiroImage) {
      ctx.drawImage(
        state.kiroImage, 
        kiroX - size/2, 
        kiroY - size/2, 
        size, 
        size
      )
    } else {
      // 이미지 로딩 실패 시 간단한 플레이스홀더
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.beginPath()
      ctx.arc(kiroX, kiroY, size/2, 0, Math.PI * 2)
      ctx.fill()
      
      ctx.fillStyle = '#000'
      ctx.font = '12px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('KIRO', kiroX, kiroY + 4)
    }
  }

  const drawShootingLockIndicator = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    // 화면 중앙 상단에 잠금 표시
    const message = isWallAnimating ? '🔄 벽 하강 중...' : '🔒 발사 잠금 중...'
    ctx.fillStyle = 'rgba(255, 0, 0, 0.8)'
    ctx.font = '20px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(message, canvas.width / 2, 50)
    
    // 슈터 주변에 빨간 테두리 표시
    const state = gameStateRef.current
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)'
    ctx.lineWidth = 3
    ctx.setLineDash([5, 5])
    
    ctx.beginPath()
    ctx.arc(state.shooter.x, state.shooter.y, 40, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
  }

  const drawShooterLine = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const state = gameStateRef.current
    
    // 픽셀 기준 구슬라인 (고정)
    const lineY = SHOOTER_LINE_Y + state.animationOffsetY
    
    // 구슬라인이 화면에 보일 때만 그리기
    if (lineY > 0 && lineY < canvas.height) {
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)'  // 더 진한 노란색
      ctx.lineWidth = 3
      ctx.setLineDash([15, 8])
      
      ctx.beginPath()
      ctx.moveTo(0, lineY)
      ctx.lineTo(canvas.width, lineY)
      ctx.stroke()
      ctx.setLineDash([])
      
      // 구슬라인 라벨
      ctx.fillStyle = 'rgba(255, 255, 0, 0.8)'
      ctx.font = '12px Arial'
      ctx.textAlign = 'right'
      ctx.fillText('구슬라인', canvas.width - 10, lineY - 5)
    }
  }

  const showGameEnd = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const state = gameStateRef.current
    
    // 반투명 오버레이
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    const isVictory = state.bubbles.length === 0 && !gameOver
    const isGameOver = gameOver
    
    // 메인 텍스트
    if (isVictory) {
      ctx.fillStyle = '#4ecdc4'
      ctx.font = 'bold 48px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('🎉 승리! 🎉', canvas.width / 2, canvas.height / 2 - 80)
      
      ctx.fillStyle = '#fff'
      ctx.font = '20px Arial'
      ctx.fillText('모든 버블을 제거했습니다!', canvas.width / 2, canvas.height / 2 - 40)
    } else if (isGameOver) {
      ctx.fillStyle = '#ff4444'
      ctx.font = 'bold 48px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('💥 게임 오버! 💥', canvas.width / 2, canvas.height / 2 - 80)
      
      // 게임오버 원인 설명
      ctx.fillStyle = '#fff'
      ctx.font = '18px Arial'
      ctx.fillText('버블이 구슬라인에 닿았습니다!', canvas.width / 2, canvas.height / 2 - 40)
    }
    
    // 점수 표시
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 28px Arial'
    ctx.fillText(`최종 점수: ${score}`, canvas.width / 2, canvas.height / 2 + 10)
    
    // 재시작 버튼 영역 표시
    ctx.fillStyle = 'rgba(76, 175, 80, 0.9)'
    ctx.fillRect(canvas.width / 2 - 80, canvas.height / 2 + 40, 160, 50)
    
    ctx.strokeStyle = '#4CAF50'
    ctx.lineWidth = 2
    ctx.strokeRect(canvas.width / 2 - 80, canvas.height / 2 + 40, 160, 50)
    
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 18px Arial'
    ctx.fillText('🔄 다시 시작', canvas.width / 2, canvas.height / 2 + 70)
    
    // 새로고침 안내 (보조)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.font = '14px Arial'
    ctx.fillText('또는 새로고침(F5)하세요', canvas.width / 2, canvas.height / 2 + 110)
  }

  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '10px'
    }}>
      <div style={{
        textAlign: 'center',
        background: 'rgba(255, 255, 255, 0.1)',
        padding: '15px',
        borderRadius: '15px',
        backdropFilter: 'blur(10px)',
        position: 'relative'
      }}>
        <SpaceBetween size="s">
          <div style={{ color: 'white', fontSize: '20px' }}>
            점수: {score}
          </div>
          {gameRunning && !gameOver && !isShootingLocked && !isWallAnimating && (
            <div style={{ color: 'white', fontSize: '16px' }}>
              벽이 내려올 때까지: {timeLeft}초
            </div>
          )}
          {(isShootingLocked || isWallAnimating) && (
            <div style={{ color: '#ff6666', fontSize: '16px', fontWeight: 'bold' }}>
              {isWallAnimating ? '🔄 벽 하강 중...' : '🔒 발사 잠금 중...'}
            </div>
          )}
          {gameOver && (
            <div style={{ color: '#ff4444', fontSize: '18px', fontWeight: 'bold' }}>
              💥 게임 오버! 버블이 구슬라인에 닿았습니다!
            </div>
          )}
          {!gameRunning && !gameOver && (
            <div style={{ color: '#4ecdc4', fontSize: '18px', fontWeight: 'bold' }}>
              🎉 승리! 모든 버블을 제거했습니다!
            </div>
          )}
          
          {/* 게임 캔버스 컨테이너 */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <canvas
              ref={canvasRef}
              width={500}
              height={650}
              style={{
                border: '3px solid #fff',
                borderRadius: '10px',
                background: '#000',
                cursor: (isShootingLocked || isWallAnimating || !gameRunning) ? 'not-allowed' : 'crosshair'
              }}
            />
            
            {/* 벽 하강 시각 효과 오버레이 */}
            {showWallDescentEffect && (
              <div
                ref={wallDescentOverlayRef}
                style={{
                  position: 'absolute',
                  top: '3px',
                  left: '3px',
                  width: '500px',
                  height: '650px',
                  borderRadius: '7px',
                  pointerEvents: 'none',
                  background: `
                    linear-gradient(
                      180deg,
                      rgba(255, 255, 255, 0.3) 0%,
                      rgba(255, 255, 255, 0.1) 20%,
                      rgba(0, 0, 0, 0.1) 40%,
                      rgba(0, 0, 0, 0.2) 60%,
                      rgba(0, 0, 0, 0.3) 80%,
                      rgba(0, 0, 0, 0.4) 100%
                    ),
                    repeating-linear-gradient(
                      180deg,
                      transparent 0px,
                      transparent 8px,
                      rgba(255, 255, 255, 0.1) 8px,
                      rgba(255, 255, 255, 0.1) 12px,
                      transparent 12px,
                      transparent 20px
                    )
                  `,
                  animation: 'wallDescentEffect 0.4s ease-out forwards',
                  overflow: 'hidden'
                }}
              >
                {/* 하강 방향 화살표들 */}
                <div style={{
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  width: '100%',
                  height: '100%',
                  background: `
                    repeating-linear-gradient(
                      180deg,
                      transparent 0px,
                      transparent 30px,
                      rgba(255, 255, 255, 0.2) 30px,
                      rgba(255, 255, 255, 0.2) 35px,
                      transparent 35px,
                      transparent 40px,
                      rgba(255, 255, 255, 0.2) 40px,
                      rgba(255, 255, 255, 0.2) 45px,
                      transparent 45px,
                      transparent 50px,
                      rgba(255, 255, 255, 0.2) 50px,
                      rgba(255, 255, 255, 0.2) 55px,
                      transparent 55px,
                      transparent 80px
                    )
                  `,
                  animation: 'arrowsFlow 0.4s ease-out forwards'
                }}>
                </div>
                
                {/* 중앙 하강 표시 */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
                  animation: 'descentText 0.4s ease-out forwards'
                }}>
                  ⬇ 벽 하강 ⬇
                </div>
              </div>
            )}
          </div>
          
          <Box color="text-body-secondary" textAlign="center">
            <div style={{ color: 'white', fontSize: '13px' }}>
              마우스로 조준하고 클릭해서 버블을 쏘세요! 🎯<br />
              같은 색깔 3개 이상을 맞춰서 터뜨리세요! ✨<br />
              30초마다 벽이 내려옵니다! (하강 시 잠시 발사 잠금)<br />
              <span style={{ color: '#ffff00' }}>⚠️ 버블이 노란 구슬라인을 넘으면 게임오버!</span>
            </div>
          </Box>
        </SpaceBetween>
        
        {/* CSS 애니메이션 정의 */}
        <style>{`
          @keyframes wallDescentEffect {
            0% {
              opacity: 0;
              transform: translateY(-20px);
            }
            20% {
              opacity: 1;
              transform: translateY(0px);
            }
            80% {
              opacity: 1;
              transform: translateY(10px);
            }
            100% {
              opacity: 0;
              transform: translateY(30px);
            }
          }
          
          @keyframes arrowsFlow {
            0% {
              transform: translateY(-40px);
              opacity: 0;
            }
            30% {
              opacity: 1;
            }
            100% {
              transform: translateY(40px);
              opacity: 0;
            }
          }
          
          @keyframes descentText {
            0% {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.8);
            }
            50% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1.1);
            }
            100% {
              opacity: 0;
              transform: translate(-50%, -50%) scale(1);
            }
          }
        `}</style>
      </div>
    </div>
  )
}