import { useEffect, useRef, useState } from 'react'
import { SpaceBetween } from '@cloudscape-design/components'
import kiroImage from './krio.png'
import gameclearKiroImage from './gameclear_kiro.png'
import gameclearBgImage from './gameclear.png'
import gameoverKiroImage from './gameover_kiro.png'
import gameoverBgImage from './gameover.png'
import startBgImage from './start.png'
import backgroundImage from './background.png'
import cloudImage from './cloud.png'
import cloud2Image from './cloud2.png'
import popSoundFile from './pop.wav'

// 사운드 파일들 import
const popSound = new Audio(popSoundFile)

// 사운드 재생 함수
const playPopSound = () => {
  try {
    popSound.currentTime = 0 // 사운드를 처음부터 재생
    popSound.volume = 0.4 // 볼륨 조절
    popSound.play().catch(() => {})
  } catch {
    // 사운드 에러 무시
  }
}

// 게임 상수
const WALL_DESCENT_INTERVAL_MS = 30000  // 30초
const SHOOTER_LINE_ROW = 18              // 구슬라인 행 (격자 기준)
const SHOOTER_LINE_Y = 530               // 구슬라인 Y 좌표 (픽셀 기준)

// 격자 렌더링 상수 (부동소수 오차 방지)
const BUBBLE_RADIUS = 20
const CELL_WIDTH = BUBBLE_RADIUS * 2     // 40px
const CELL_HEIGHT = Math.floor(BUBBLE_RADIUS * 1.7)  // 34px (정수로 고정)
const ROW_OFFSET_X = BUBBLE_RADIUS       // 홀수 행 오프셋

// 개발 모드 검증 비활성화
const DEV_MODE_VALIDATION = false

interface Bubble {
  color: string
  gridRow: number  // 생성 시점의 격자 행 (불변)
  gridCol: number  // 생성 시점의 격자 열 (불변)
  id?: string      // 개발 모드 검증용 고유 식별자
  isWall?: boolean // 벽 블록인지 구분
}

interface CurrentBubble {
  x: number
  y: number
  color: string
  dx: number
  dy: number
  moving: boolean
  // 충돌 판정 개선을 위한 추가 상태
  collisionCandidate?: Bubble | null  // 충돌 후보 버블
  collisionFrames?: number            // 충돌 상태 지속 프레임 수
  lastCollisionDistance?: number      // 마지막 충돌 거리
}

interface Trajectory {
  dx: number
  dy: number
}

// 터지는 효과를 위한 파티클
interface PopParticle {
  x: number
  y: number
  dx: number
  dy: number
  color: string
  life: number
  maxLife: number
  size: number
}

// 떨어지는 버블 애니메이션
interface FallingBubble {
  bubble: Bubble
  x: number
  y: number
  dx: number
  dy: number
  rotation: number
  rotationSpeed: number
}

export default function BubbleShooter() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const scoreRef = useRef(0) // 점수를 ref로도 관리
  const [gameRunning, setGameRunning] = useState(false) // 시작 시 false로 변경
  const [gameOver, setGameOver] = useState(false)
  const [timeLeft, setTimeLeft] = useState(WALL_DESCENT_INTERVAL_MS / 1000)
  const [gameState, setGameState] = useState<'start' | 'playing' | 'tutorial'>('start') // 게임 상태 추가
  
  // 엔딩 화면을 위한 상태
  const [gameResult, setGameResult] = useState<{
    isClear: boolean
    starCount: number
    totalBubbles: number
    clearedBubbles: number
    finalScore: number
  } | null>(null)

  // CSS 애니메이션 스타일 추가
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @keyframes sparkle {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }
      
      @keyframes float {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-20px) rotate(10deg); }
      }
      
      @keyframes bounce {
        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-10px); }
        60% { transform: translateY(-5px); }
      }
      
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      
      @keyframes wiggle {
        0%, 100% { transform: rotate(0deg); }
        25% { transform: rotate(2deg); }
        75% { transform: rotate(-2deg); }
      }
      
      @keyframes sway {
        0%, 100% { transform: translateX(0px); }
        50% { transform: translateX(5px); }
      }
      
      @keyframes twinkle {
        0%, 100% { transform: scale(1) rotate(0deg); }
        50% { transform: scale(1.1) rotate(5deg); }
      }
    `
    document.head.appendChild(style)
    
    return () => {
      document.head.removeChild(style)
    }
  }, [])
  
  // 게임 상태
  const gameStateRef = useRef({
    bubbles: [] as Bubble[],
    boardOffsetRows: 0,  // 전체 보드 하강 오프셋 (정수)
    currentBubble: null as CurrentBubble | null,
    nextBubble: null as { color: string } | null,
    trajectory: null as Trajectory | null,
    shooter: { x: 0, y: 0 },
    bubbleRadius: BUBBLE_RADIUS,
    colors: ['#FF69B4', '#FF6347', '#32CD32', '#1E90FF', '#FFD700', '#FF1493', '#00CED1'],
    rows: 8,
    cols: 12,
    wallTimer: null as number | null,
    countdownTimer: null as number | null,
    bubbleIdCounter: 0,  // 개발 모드용 ID 생성 카운터
    kiroImage: null as HTMLImageElement | null,
    imageLoaded: false,
    // 엔딩 화면 이미지들
    gameclearKiroImage: null as HTMLImageElement | null,
    gameclearBgImage: null as HTMLImageElement | null,
    gameoverKiroImage: null as HTMLImageElement | null,
    gameoverBgImage: null as HTMLImageElement | null,
    startBgImage: null as HTMLImageElement | null, // 시작 화면 배경 추가
    cloudImage: null as HTMLImageElement | null, // 구름 이미지 추가
    cloud2Image: null as HTMLImageElement | null, // 구름2 이미지 추가 (부드러운 애니메이션용)
    endingImagesLoaded: false,
    // 애니메이션 상태
    popParticles: [] as PopParticle[],
    fallingBubbles: [] as FallingBubble[],
    // 벽 하강 애니메이션 상태
    wallDescentAnimation: {
      isAnimating: false,
      startTime: 0,
      duration: 250, // 0.25초 애니메이션
      startHeight: 0,
      targetHeight: 0
    },
    // 단일 구름 벽 상태 (이미지 아래쪽 일부가 점점 드러나는 방식)
    cloudWall: {
      revealedHeight: 0, // 현재 드러난 높이 (픽셀 단위)
      maxHeight: 400, // 구름 이미지의 최대 높이
      isVisible: false, // 벽이 보이는지 여부
      stepCount: 0 // 내려온 단계 수
    },
    // 키로 모션 상태
    kiroMotion: {
      type: 'idle' as 'idle' | 'jump' | 'spin' | 'bounce',
      startTime: 0,
      duration: 0,
      intensity: 1
    },
    // 엔딩 계산용 상태
    totalBubbles: 0,      // 스테이지 시작 시 총 버블 수
    clearedBubbles: 0     // 제거된 버블 수
  })

  // 버블 배열 불변성 검증 헬퍼 함수들 (강화된 버전)
  const createBubbleSnapshot = (bubbles: Bubble[]) => {
    if (!DEV_MODE_VALIDATION) return null
    
    const snapshot = bubbles.map((bubble, index) => ({
      index,
      id: bubble.id || `unknown_${index}`,
      color: bubble.color,
      gridRow: bubble.gridRow,
      gridCol: bubble.gridCol,
      checksum: `${bubble.color}-${bubble.gridRow}-${bubble.gridCol}`,
      renderPos: getBubbleRenderPosition(bubble) // 렌더링 위치도 기록
    }))
    
    return snapshot
  }

  const validateBubbleIntegrity = (beforeSnapshot: any[], afterBubbles: Bubble[]) => {
    if (!DEV_MODE_VALIDATION || !beforeSnapshot) return true

    // 새로 추가된 버블과 기존 버블 분류
    const existingBubbles = afterBubbles.filter(bubble => 
      beforeSnapshot.some(snap => snap.id === bubble.id)
    )

    // ⚠️ 핵심: 기존 버블들의 데이터 무결성 검증 (벽 하강 시 절대 변경되면 안 됨)
    let integrityViolations = 0
    const violationDetails: any[] = []
    
    existingBubbles.forEach(bubble => {
      const originalSnap = beforeSnapshot.find(snap => snap.id === bubble.id)
      if (!originalSnap) return

      const currentChecksum = `${bubble.color}-${bubble.gridRow}-${bubble.gridCol}`
      const currentRenderPos = getBubbleRenderPosition(bubble)
      
      if (originalSnap.checksum !== currentChecksum) {
        const violation = {
          id: bubble.id,
          originalColor: originalSnap.color,
          currentColor: bubble.color,
          originalRow: originalSnap.gridRow,
          currentRow: bubble.gridRow,
          originalCol: originalSnap.gridCol,
          currentCol: bubble.gridCol,
          originalRenderX: Math.round(originalSnap.renderPos.x),
          currentRenderX: Math.round(currentRenderPos.x),
          originalRenderY: Math.round(originalSnap.renderPos.y),
          currentRenderY: Math.round(currentRenderPos.y)
        }
        
        violationDetails.push(violation)
        integrityViolations++
      }
    })

    if (integrityViolations > 0) {
      return false
    }

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

  // 키로 모션 트리거 함수들
  const triggerKiroMotion = (type: 'jump' | 'spin' | 'bounce', intensity: number = 1) => {
    const state = gameStateRef.current
    const now = Date.now()
    
    // 기존 모션이 진행 중이면 더 강한 모션으로만 교체
    if (state.kiroMotion.type !== 'idle' && 
        now - state.kiroMotion.startTime < state.kiroMotion.duration) {
      if (intensity <= state.kiroMotion.intensity) return
    }
    
    let duration = 800 // 기본 지속시간
    if (type === 'jump') duration = 600
    else if (type === 'spin') duration = 1200
    else if (type === 'bounce') duration = 1000
    
    state.kiroMotion = {
      type,
      startTime: now,
      duration: duration * intensity, // 강도에 따라 지속시간 조정
      intensity
    }
  }

  const restartGame = () => {
    const state = gameStateRef.current
    
    // 게임 상태 초기화
    state.bubbles = []
    state.boardOffsetRows = 0  // 초기에는 오프셋 없음
    state.currentBubble = null
    state.nextBubble = null
    state.trajectory = null
    state.bubbleIdCounter = 0
    state.totalBubbles = 0
    state.clearedBubbles = 0
    
    // 애니메이션 상태 초기화
    state.popParticles = []
    state.fallingBubbles = []
    
    // 구름 벽 상태 초기화
    state.cloudWall.revealedHeight = 0
    state.cloudWall.isVisible = false
    state.cloudWall.stepCount = 0
    state.wallDescentAnimation.isAnimating = false
    
    // React 상태 초기화
    setScore(0)
    scoreRef.current = 0 // ref도 초기화
    setGameRunning(true)
    setGameOver(false)
    setGameResult(null)
    setGameState('playing') // 게임 상태를 playing으로 변경
    setTimeLeft(WALL_DESCENT_INTERVAL_MS / 1000)
    
    // 모든 타이머 정리
    if (state.wallTimer) {
      clearInterval(state.wallTimer)
      state.wallTimer = null
    }
    if (state.countdownTimer) {
      clearInterval(state.countdownTimer)
      state.countdownTimer = null
    }
    
    // 게임 재시작
    const canvas = canvasRef.current
    if (canvas) {
      initGame(canvas)
      startWallTimer()
    }
  }

  const startNewGame = () => {
    setGameState('playing')
    setGameRunning(true)
    restartGame()
  }

  const showTutorial = () => {
    setGameState('tutorial')
  }

  const backToStart = () => {
    setGameState('start')
    setGameRunning(false)
    setGameOver(false)
    setGameResult(null)
  }

  // 컴포넌트 마운트 시 이미지 로드
  useEffect(() => {
    // 시작화면에서도 이미지를 미리 로드
    loadEndingImages()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 게임 상태가 playing일 때만 게임 초기화
    if (gameState === 'playing') {
      // 게임 초기화
      initGame(canvas)
      
      // 30초 타이머 시작
      startWallTimer()
    }
    
    // 게임 루프 시작 (항상 실행하여 시작화면도 렌더링)
    const gameLoop = () => {
      if (gameRunning && gameState === 'playing') {
        updateBubble()
      }
      draw(canvas, ctx)
      requestAnimationFrame(gameLoop)
    }
    gameLoop()

    // 이벤트 리스너 설정
    const handleMouseMove = (e: MouseEvent) => {
      if (!gameRunning || gameOver || gameStateRef.current.currentBubble?.moving || gameState !== 'playing') return
      
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      
      calculateTrajectory(mouseX, mouseY)
    }

    const handleClick = (e: MouseEvent) => {
      if (!gameRunning || gameOver || gameStateRef.current.currentBubble?.moving || gameState !== 'playing') return
      
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
    }
  }, [gameRunning, gameOver, gameState])



  const initGame = (canvas: HTMLCanvasElement) => {
    const state = gameStateRef.current
    state.shooter = { x: canvas.width / 2, y: canvas.height - 50 }
    
    // 키로 이미지 로드 (게임용)
    if (!state.kiroImage) {
      state.kiroImage = new Image()
      state.kiroImage.src = kiroImage
      state.kiroImage.onload = () => {
        state.imageLoaded = true
      }
      state.kiroImage.onerror = () => {
        state.imageLoaded = false
      }
    }
    
    // 초기 버블 배치
    createInitialBubbles()
    createNewBubble()
    createNextBubble()
  }

  const loadEndingImages = () => {
    const state = gameStateRef.current
    let loadedCount = 0
    const totalImages = 7 // cloud2 이미지 추가로 7개
    
    const checkAllLoaded = () => {
      loadedCount++
      if (loadedCount === totalImages) {
        state.endingImagesLoaded = true
      }
    }
    
    // 시작 화면 배경 이미지
    state.startBgImage = new Image()
    state.startBgImage.src = startBgImage
    state.startBgImage.onload = () => {
      checkAllLoaded()
    }
    state.startBgImage.onerror = () => {
      checkAllLoaded()
    }
    
    // 게임 클리어 키로 이미지
    state.gameclearKiroImage = new Image()
    state.gameclearKiroImage.src = gameclearKiroImage
    state.gameclearKiroImage.onload = () => {
      checkAllLoaded()
    }
    state.gameclearKiroImage.onerror = () => {
      checkAllLoaded()
    }
    
    // 게임 클리어 배경 이미지
    state.gameclearBgImage = new Image()
    state.gameclearBgImage.src = gameclearBgImage
    state.gameclearBgImage.onload = () => {
      checkAllLoaded()
    }
    state.gameclearBgImage.onerror = () => {
      checkAllLoaded()
    }
    
    // 게임 오버 키로 이미지
    state.gameoverKiroImage = new Image()
    state.gameoverKiroImage.src = gameoverKiroImage
    state.gameoverKiroImage.onload = () => {
      checkAllLoaded()
    }
    state.gameoverKiroImage.onerror = () => {
      checkAllLoaded()
    }
    
    // 게임 오버 배경 이미지
    state.gameoverBgImage = new Image()
    state.gameoverBgImage.src = gameoverBgImage
    state.gameoverBgImage.onload = () => {
      checkAllLoaded()
    }
    state.gameoverBgImage.onerror = () => {
      checkAllLoaded()
    }
    
    // 구름 이미지
    state.cloudImage = new Image()
    state.cloudImage.src = cloudImage
    state.cloudImage.onload = () => {
      checkAllLoaded()
    }
    state.cloudImage.onerror = () => {
      checkAllLoaded()
    }
    
    // 구름2 이미지 (부드러운 애니메이션용)
    state.cloud2Image = new Image()
    state.cloud2Image.src = cloud2Image
    state.cloud2Image.onload = () => {
      checkAllLoaded()
    }
    state.cloud2Image.onerror = () => {
      checkAllLoaded()
    }
  }

  const createInitialBubbles = () => {
    const state = gameStateRef.current
    state.bubbles = []
    
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < state.cols; col++) {
        const offsetX = (row % 2) * ROW_OFFSET_X
        const x = col * CELL_WIDTH + BUBBLE_RADIUS + offsetX
        
        // 화면 경계 체크
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
    
    // 초기 버블 수 저장 (벽 블록 제외)
    state.totalBubbles = state.bubbles.filter(bubble => !bubble.isWall).length
    state.clearedBubbles = 0
  }

  // 버블의 실제 렌더링 위치 계산 (오프셋 기반 수직 이동)
  const getBubbleRenderPosition = (bubble: Bubble) => {
    const state = gameStateRef.current
    
    // ⚠️ 핵심: 벽 하강 시 수직 이동을 위해 오프셋 적용
    // 버블의 원래 격자 위치는 그대로 유지하고, 전체 보드 오프셋만 적용
    const renderRow = bubble.gridRow + state.boardOffsetRows
    
    // 원래 격자 행의 홀짝 패턴 유지 (지그재그 방지)
    const offsetX = (bubble.gridRow % 2) * ROW_OFFSET_X
    
    return {
      x: bubble.gridCol * CELL_WIDTH + BUBBLE_RADIUS + offsetX,
      y: renderRow * CELL_HEIGHT + BUBBLE_RADIUS
    }
  }

  const createNewBubble = () => {
    const state = gameStateRef.current
    
    // 다음 버블 색상 결정
    let nextColor: string
    if (state.nextBubble) {
      nextColor = state.nextBubble.color
    } else {
      nextColor = getRandomBubbleColor()
    }
    
    state.currentBubble = {
      x: state.shooter.x,
      y: state.shooter.y,
      color: nextColor,
      dx: 0,
      dy: 0,
      moving: false,
      // 충돌 상태 초기화
      collisionCandidate: null,
      collisionFrames: 0,
      lastCollisionDistance: undefined
    }
  }

  const createNextBubble = () => {
    const state = gameStateRef.current
    state.nextBubble = {
      color: getRandomBubbleColor()
    }
  }

  const getRandomBubbleColor = (): string => {
    const state = gameStateRef.current
    
    // 현재 보드에 있는 일반 버블들 (벽 블록 제외)
    const normalBubbles = state.bubbles.filter(bubble => !bubble.isWall)
    
    // 10개 이하로 남으면 남은 구슬 색상에서만 선택
    if (normalBubbles.length <= 10 && normalBubbles.length > 0) {
      // 현재 보드에 있는 색상들만 추출
      const existingColors = [...new Set(normalBubbles.map(bubble => bubble.color))]
      
      if (existingColors.length > 0) {
        const selectedColor = existingColors[Math.floor(Math.random() * existingColors.length)]
        return selectedColor
      }
    }
    
    // 일반 모드: 전체 색상에서 랜덤 선택
    const selectedColor = state.colors[Math.floor(Math.random() * state.colors.length)]
    return selectedColor
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
    
    // 애니메이션 업데이트
    updateAnimations()
    
    if (!state.currentBubble?.moving) return
    
    // 현재 속도 계산
    const speed = Math.sqrt(
      Math.pow(state.currentBubble.dx, 2) + 
      Math.pow(state.currentBubble.dy, 2)
    )
    
    // 서브스텝 계산 (빠른 이동 시 여러 번으로 나누기)
    const maxMovePerStep = BUBBLE_RADIUS * 0.8 // 조금 더 큰 스텝 허용
    const frameMoveDistance = speed
    const subSteps = Math.max(1, Math.ceil(frameMoveDistance / maxMovePerStep))
    
    let subStepDx = state.currentBubble.dx / subSteps
    let subStepDy = state.currentBubble.dy / subSteps
    
    // 서브스텝으로 이동 및 충돌 검사
    for (let step = 0; step < subSteps; step++) {
      const prevX = state.currentBubble.x
      const prevY = state.currentBubble.y
      
      // 서브스텝 이동
      state.currentBubble.x += subStepDx
      state.currentBubble.y += subStepDy
      
      // 벽 충돌 처리 (서브스텝마다 체크)
      let wallBounced = false
      if (state.currentBubble.x <= BUBBLE_RADIUS) {
        state.currentBubble.x = BUBBLE_RADIUS
        state.currentBubble.dx = -state.currentBubble.dx
        wallBounced = true
      } else if (state.currentBubble.x >= 500 - BUBBLE_RADIUS) {
        state.currentBubble.x = 500 - BUBBLE_RADIUS
        state.currentBubble.dx = -state.currentBubble.dx
        wallBounced = true
      }
      
      // 벽 반사 후 남은 서브스텝들의 이동량 재계산
      if (wallBounced && step < subSteps - 1) {
        subStepDx = state.currentBubble.dx / subSteps
        subStepDy = state.currentBubble.dy / subSteps
      }
      
      // 천장에 닿으면 붙이기
      if (state.currentBubble.y <= BUBBLE_RADIUS + 2) {
        attachBubbleToTop()
        return
      }
      
      // 완화된 충돌 감지 (이동 종료 트리거로만 사용)
      const shouldStop = checkMovementTermination(prevX, prevY, state.currentBubble.x, state.currentBubble.y)
      
      if (shouldStop) {
        // 현재 위치 기준으로 최적의 빈 셀 찾기
        snapToOptimalEmptyCell()
        return
      }
    }
  }

  const checkMovementTermination = (startX: number, startY: number, endX: number, endY: number): boolean => {
    const state = gameStateRef.current
    
    // 이동 벡터
    const rayDx = endX - startX
    const rayDy = endY - startY
    const rayLength = Math.sqrt(rayDx * rayDx + rayDy * rayDy)
    
    if (rayLength < 0.001) return false
    
    // 정규화된 방향 벡터
    const rayDirX = rayDx / rayLength
    const rayDirY = rayDy / rayLength
    
    // 완화된 충돌 검사 (더 관대한 기준)
    for (let bubble of state.bubbles) {
      const bubblePos = getBubbleRenderPosition(bubble)
      
      // 현재 위치에서 버블까지의 거리
      const distanceToEnd = Math.sqrt(
        Math.pow(endX - bubblePos.x, 2) + 
        Math.pow(endY - bubblePos.y, 2)
      )
      
      // 완화된 충돌 반지름 (1.8배로 줄임)
      const collisionRadius = BUBBLE_RADIUS * 1.8
      
      if (distanceToEnd <= collisionRadius) {
        // 스치기 충돌인지 확인
        const isGlancing = checkIfGlancingCollision(endX, endY, rayDirX, rayDirY, bubblePos)
        
        if (!isGlancing) {
          return true
        }
      }
    }
    
    return false
  }

  const checkIfGlancingCollision = (
    currentX: number, currentY: number,
    dirX: number, dirY: number,
    bubblePos: {x: number, y: number}
  ): boolean => {
    // 현재 위치에서 버블로의 벡터
    const toBubbleX = bubblePos.x - currentX
    const toBubbleY = bubblePos.y - currentY
    const toBubbleLength = Math.sqrt(toBubbleX * toBubbleX + toBubbleY * toBubbleY)
    
    if (toBubbleLength === 0) return false
    
    // 정규화
    const toBubbleDirX = toBubbleX / toBubbleLength
    const toBubbleDirY = toBubbleY / toBubbleLength
    
    // 이동 방향과 버블 방향의 내적
    const dot = dirX * toBubbleDirX + dirY * toBubbleDirY
    
    // 스치기 판정 (더 관대하게 - 45도 이하면 스치기로 판정)
    const glancingThreshold = 0.7 // cos(45°) ≈ 0.707
    
    return dot < glancingThreshold
  }

  const snapToOptimalEmptyCell = () => {
    const state = gameStateRef.current
    if (!state.currentBubble) return
    
    // 1단계: 현재 위치 주변의 모든 빈 셀 찾기
    const emptyCells = findAllEmptyCells(state.currentBubble.x, state.currentBubble.y)
    
    if (emptyCells.length === 0) {
      attachBubbleToTop()
      return
    }
    
    // 2단계: 기존 덩어리와 인접한 빈 셀만 필터링
    const validCells = emptyCells.filter(cell => isAdjacentToExistingBubbles(cell.gridRow, cell.gridCol))
    
    if (validCells.length === 0) {
      attachBubbleToTop()
      return
    }
    
    // 3단계: 현재 위치에서 가장 가까운 유효한 셀 선택
    let bestCell = validCells[0]
    let minDistance = Infinity
    
    for (let i = 0; i < validCells.length; i++) {
      const cell = validCells[i]
      const distance = Math.sqrt(
        Math.pow(state.currentBubble.x - cell.x, 2) + 
        Math.pow(state.currentBubble.y - cell.y, 2)
      )
      
      if (distance < minDistance) {
        minDistance = distance
        bestCell = cell
      }
    }
    
    // 4단계: 선택된 빈 셀에 버블 배치
    const newBubble = assignBubbleId({
      color: state.currentBubble.color,
      gridRow: bestCell.gridRow,
      gridCol: bestCell.gridCol,
      isWall: false
    })
    
    state.bubbles.push(newBubble)
    
    // 매칭 검사
    checkMatches(newBubble)
    
    createNewBubble()
    createNextBubble()
    checkGameOver()
  }

  const findAllEmptyCells = (currentX: number, currentY: number) => {
    const state = gameStateRef.current
    const emptyCells: Array<{x: number, y: number, gridRow: number, gridCol: number, distance: number}> = []
    
    // 현재 위치를 그리드 좌표로 변환
    const currentGridCol = Math.round((currentX - BUBBLE_RADIUS) / CELL_WIDTH)
    const currentGridRow = Math.round((currentY - BUBBLE_RADIUS) / CELL_HEIGHT) - state.boardOffsetRows
    
    // 현재 위치 주변 5x5 영역 검사
    const searchRadius = 2
    for (let rowOffset = -searchRadius; rowOffset <= searchRadius; rowOffset++) {
      for (let colOffset = -searchRadius; colOffset <= searchRadius; colOffset++) {
        const testRow = currentGridRow + rowOffset
        const testCol = currentGridCol + colOffset
        
        // 경계 체크
        if (testRow < 0 || testCol < 0 || testCol >= state.cols) continue
        
        // 이미 점유된 셀인지 확인
        const isOccupied = state.bubbles.some(bubble => 
          bubble.gridRow === testRow && bubble.gridCol === testCol
        )
        
        if (isOccupied) continue
        
        // 그리드 셀의 실제 픽셀 위치 계산
        const offsetX = (testRow % 2) * ROW_OFFSET_X
        const cellX = testCol * CELL_WIDTH + BUBBLE_RADIUS + offsetX
        const cellY = (testRow + state.boardOffsetRows) * CELL_HEIGHT + BUBBLE_RADIUS
        
        // 화면 경계 체크
        if (cellX < BUBBLE_RADIUS || cellX > 500 - BUBBLE_RADIUS) continue
        
        // 현재 위치에서의 거리 계산
        const distance = Math.sqrt(
          Math.pow(currentX - cellX, 2) + 
          Math.pow(currentY - cellY, 2)
        )
        
        emptyCells.push({
          x: cellX,
          y: cellY,
          gridRow: testRow,
          gridCol: testCol,
          distance: distance
        })
      }
    }
    
    // 거리순 정렬
    emptyCells.sort((a, b) => a.distance - b.distance)
    
    return emptyCells
  }









  const updateAnimations = () => {
    const state = gameStateRef.current
    
    // 구름 벽 드러나기 애니메이션 업데이트
    if (state.wallDescentAnimation.isAnimating) {
      const now = Date.now()
      const elapsed = now - state.wallDescentAnimation.startTime
      const progress = Math.min(elapsed / state.wallDescentAnimation.duration, 1)
      
      // ease-out 함수 적용 (부드러운 감속)
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      
      // 현재 드러난 높이 계산 (부드럽게 변화)
      const currentHeight = state.wallDescentAnimation.startHeight + 
        (state.wallDescentAnimation.targetHeight - state.wallDescentAnimation.startHeight) * easedProgress
      
      state.cloudWall.revealedHeight = currentHeight
      
      // 애니메이션이 완료되면 정확한 값으로 설정하고 애니메이션 종료
      if (progress >= 1) {
        state.cloudWall.revealedHeight = state.wallDescentAnimation.targetHeight
        state.wallDescentAnimation.isAnimating = false
        
        // 애니메이션 완료 후 게임오버 체크
        checkGameOver()
      }
    }
    
    // 터지는 파티클 업데이트
    state.popParticles = state.popParticles.filter(particle => {
      particle.x += particle.dx
      particle.y += particle.dy
      particle.dy += 0.3 // 중력
      particle.life--
      
      return particle.life > 0
    })
    
    // 떨어지는 버블 업데이트
    state.fallingBubbles = state.fallingBubbles.filter(falling => {
      falling.x += falling.dx
      falling.y += falling.dy
      falling.dy += 0.4 // 중력
      falling.rotation += falling.rotationSpeed
      
      // 화면 밖으로 나가면 제거
      return falling.y < 700
    })
  }

  const createPopEffect = (x: number, y: number, color: string) => {
    const state = gameStateRef.current
    
    // 터지는 파티클 생성
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const speed = 3 + Math.random() * 4
      
      state.popParticles.push({
        x: x,
        y: y,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        color: color,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        size: 3 + Math.random() * 4
      })
    }
  }

  const createFallingEffect = (bubbles: Bubble[]) => {
    const state = gameStateRef.current
    
    // 떨어지는 버블 애니메이션 생성
    for (let bubble of bubbles) {
      const pos = getBubbleRenderPosition(bubble)
      
      state.fallingBubbles.push({
        bubble: bubble,
        x: pos.x,
        y: pos.y,
        dx: (Math.random() - 0.5) * 4, // 좌우 랜덤 속도
        dy: Math.random() * 2, // 초기 하향 속도
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.3 // 회전 속도
      })
    }
  }

  const isAdjacentToExistingBubbles = (testRow: number, testCol: number): boolean => {
    const state = gameStateRef.current
    
    // 육각형 격자의 인접 위치 확인
    const evenRowDirections = [
      [-1, -1], [0, -1],        // 위쪽 2개
      [-1, 0],           [1, 0], // 좌우 2개  
      [-1, 1],  [0, 1]          // 아래쪽 2개
    ]
    const oddRowDirections = [
      [0, -1], [1, -1],         // 위쪽 2개
      [-1, 0],          [1, 0], // 좌우 2개
      [0, 1],  [1, 1]           // 아래쪽 2개
    ]
    
    const directions = (testRow % 2 === 0) ? evenRowDirections : oddRowDirections
    
    for (let [dx, dy] of directions) {
      const adjRow = testRow + dy
      const adjCol = testCol + dx
      
      // 인접 위치에 버블이 있는지 확인
      const hasAdjacentBubble = state.bubbles.some(bubble => 
        bubble.gridRow === adjRow && bubble.gridCol === adjCol
      )
      
      if (hasAdjacentBubble) {
        return true
      }
    }
    
    return false
  }

  const attachBubbleToTop = () => {
    const state = gameStateRef.current
    if (!state.currentBubble) return
    
    const gridX = Math.round((state.currentBubble.x - BUBBLE_RADIUS) / CELL_WIDTH)
    const gridY = 0  // 항상 최상단(0행)에 부착
    
    const newBubble = assignBubbleId({
      color: state.currentBubble.color,
      gridRow: gridY,
      gridCol: gridX,
      isWall: false // 쏜 버블은 항상 일반 버블
    })
    
    state.bubbles.push(newBubble)
    
    // 매칭 검사 전 주변 상황 로깅
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
      
      // 버블 터지는 사운드 재생
      playPopSound()
      
      // 키로 모션 트리거 (버블 개수에 따라 다른 모션)
      if (matches.length >= 8) {
        triggerKiroMotion('spin', 2) // 8개 이상: 큰 회전
      } else if (matches.length >= 6) {
        triggerKiroMotion('spin', 1.5) // 6개 이상: 회전
      } else if (matches.length >= 4) {
        triggerKiroMotion('jump', 1.5) // 4개 이상: 큰 점프
      } else {
        triggerKiroMotion('jump', 1) // 3개: 작은 점프
      }
      
      // 터지는 효과 생성
      matches.forEach(match => {
        const pos = getBubbleRenderPosition(match)
        createPopEffect(pos.x, pos.y, match.color)
      })
      
      // 제거된 버블 수 누적 (벽 블록 제외)
      const removedNormalBubbles = matches.filter(match => !match.isWall).length
      state.clearedBubbles += removedNormalBubbles
      
      for (let match of matches) {
        const index = state.bubbles.indexOf(match)
        if (index > -1) {
          state.bubbles.splice(index, 1)
        }
      }
      
      const matchScore = matches.length * 10
      setScore(prev => {
        const newScore = prev + matchScore
        scoreRef.current = newScore // ref도 업데이트
        return newScore
      })
      
      // 매칭 후 버블 무결성 검증
      validateBubbleIntegrity(beforeSnapshot || [], state.bubbles)
      
      // ⚠️ 중요: 떠있는 버블 제거는 매칭 시에만 실행 (벽 하강과 분리)
      
      // ref의 최신 점수를 사용
      setTimeout(() => removeFloatingBubbles(), 0)
    }
  }

  const findMatches = (bubble: Bubble, color: string, visited: Bubble[]): Bubble[] => {
    // 벽 블록이거나 이미 방문했거나 색상이 다르면 제외
    if (visited.includes(bubble) || bubble.color !== color || bubble.isWall) {
      return []
    }
    
    visited.push(bubble)
    let matches = [bubble]
    
    const state = gameStateRef.current
    const bubblePos = getBubbleRenderPosition(bubble)
    
    for (let other of state.bubbles) {
      if (other === bubble || visited.includes(other) || other.isWall) continue
      
      const otherPos = getBubbleRenderPosition(other)
      const distance = Math.sqrt(
        Math.pow(bubblePos.x - otherPos.x, 2) + 
        Math.pow(bubblePos.y - otherPos.y, 2)
      )
      
      // 인접 거리 기준 (2.5배)
      if (distance < BUBBLE_RADIUS * 2.5 && other.color === color) {
        matches = matches.concat(findMatches(other, color, visited))
      }
    }
    
    return matches
  }

  const removeFloatingBubbles = () => {
    const state = gameStateRef.current
    
    // ⚠️ 중요: 이 함수는 버블 매칭 시에만 호출되어야 함 (벽 하강과 분리)
    
    // 떠있는 버블 제거 전 스냅샷
    const beforeSnapshot = createBubbleSnapshot(state.bubbles)
    
    const connected: Bubble[] = []
    
    // 천장에 연결된 버블들 찾기 (단순하게 gridRow 0 이하)
    for (let bubble of state.bubbles) {
      if (bubble.gridRow <= 0) {  // 0행 이하는 천장에 연결
        markConnected(bubble, connected)
      }
    }
    
    const toRemove = state.bubbles.filter(bubble => !connected.includes(bubble))
    
    // 떨어지는 효과 생성
    if (toRemove.length > 0) {
      createFallingEffect(toRemove)
      
      // 키로 모션 트리거 (떨어지는 버블 개수에 따라)
      if (toRemove.length >= 10) {
        triggerKiroMotion('spin', 2.5) // 10개 이상: 매우 큰 회전
      } else if (toRemove.length >= 6) {
        triggerKiroMotion('spin', 1.8) // 6개 이상: 큰 회전
      } else if (toRemove.length >= 3) {
        triggerKiroMotion('bounce', 1.5) // 3개 이상: 바운스
      }
      
      // 제거된 버블 수 누적 (벽 블록 제외)
      const removedNormalBubbles = toRemove.filter(bubble => !bubble.isWall).length
      state.clearedBubbles += removedNormalBubbles
    }
    
    for (let bubble of toRemove) {
      const index = state.bubbles.indexOf(bubble)
      if (index > -1) {
        state.bubbles.splice(index, 1)
      }
    }
    
    if (toRemove.length > 0) {
      const bonusScore = toRemove.length * 5
      setScore(prev => {
        const newScore = prev + bonusScore
        scoreRef.current = newScore // ref도 업데이트
        
        // 게임 종료 조건 확인 (업데이트된 점수 전달)
        setTimeout(() => checkGameOver(newScore), 0)
        
        return newScore
      })
      
      // 떠있는 버블 제거 후 무결성 검증
      validateBubbleIntegrity(beforeSnapshot || [], state.bubbles)
    } else {
      // 떠있는 버블이 없어도 게임 종료 조건 확인
      setTimeout(() => checkGameOver(scoreRef.current), 0)
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
    
    // 기존 타이머들 정리 (중복 방지)
    if (state.wallTimer) {
      clearInterval(state.wallTimer)
    }
    if (state.countdownTimer) {
      clearInterval(state.countdownTimer)
    }
    
    // 벽 하강 타이머 (30초마다)
    state.wallTimer = setInterval(() => {
      // 게임이 실행 중이 아니면 스킵
      if (!gameRunning || gameOver) {
        return
      }
      
      // 애니메이션 없이 즉시 벽 하강 실행
      pushWallDown()
      
      setTimeLeft(WALL_DESCENT_INTERVAL_MS / 1000) // 타이머 리셋
    }, WALL_DESCENT_INTERVAL_MS)
    
    // 카운트다운 타이머 (1초마다)
    state.countdownTimer = setInterval(() => {
      // 게임이 실행 중일 때만 카운트다운
      if (gameRunning && !gameOver) {
        setTimeLeft(prev => {
          if (prev <= 1) {
            return WALL_DESCENT_INTERVAL_MS / 1000
          }
          return prev - 1
        })
      }
    }, 1000)
  }



  const pushWallDown = () => {
    const state = gameStateRef.current
    
    // 이미 애니메이션 중이면 무시
    if (state.wallDescentAnimation.isAnimating) {
      return
    }
    
    // 구름 벽이 처음 나타나는 경우
    if (!state.cloudWall.isVisible) {
      state.cloudWall.isVisible = true
      state.cloudWall.revealedHeight = 0
      state.cloudWall.stepCount = 0
    }
    
    // 애니메이션 설정 (한 칸씩 더 드러나기)
    const revealStep = CELL_HEIGHT // 버블 한 줄 높이만큼 더 드러남 (34px)
    
    state.wallDescentAnimation = {
      isAnimating: true,
      startTime: Date.now(),
      duration: 250, // 0.25초 애니메이션
      startHeight: state.cloudWall.revealedHeight,
      targetHeight: Math.min(state.cloudWall.revealedHeight + revealStep, state.cloudWall.maxHeight)
    }
    
    // 단계 수 증가
    state.cloudWall.stepCount += 1
    
    // 기존 벽 블록 시스템도 유지 (충돌 판정용)
    state.boardOffsetRows += 1
    
    // 새로운 최상단 행에 벽 블록들 추가 (충돌 판정용)
    const newTopGridRow = -state.boardOffsetRows
    
    let addedCount = 0
    for (let col = 0; col < state.cols; col++) {
      const actualRenderRow = newTopGridRow + state.boardOffsetRows
      const offsetX = (actualRenderRow % 2) * ROW_OFFSET_X
      const x = col * CELL_WIDTH + BUBBLE_RADIUS + offsetX
      
      if (x < 500 - BUBBLE_RADIUS) {
        const newWallBlock = assignBubbleId({
          color: '#666666',
          gridRow: newTopGridRow,
          gridCol: col,
          isWall: true
        })
        
        state.bubbles.push(newWallBlock)
        addedCount++
      }
    }
  }



  const checkGameOver = (currentScore: number = scoreRef.current) => {
    const state = gameStateRef.current
    
    // 구름 벽이 게임오버 라인에 도달했는지 체크
    if (state.cloudWall.isVisible && state.cloudWall.revealedHeight >= SHOOTER_LINE_Y) {
      triggerGameOver(currentScore)
      return
    }
    
    // 버블이 구슬라인에 닿거나 침범했는지 체크
    for (let bubble of state.bubbles) {
      const bubblePos = getBubbleRenderPosition(bubble)
      const bubbleBottomY = bubblePos.y + BUBBLE_RADIUS
      
      // 픽셀 좌표 기준: 버블 하단이 구슬라인에 닿거나 넘으면 게임오버
      if (bubbleBottomY >= SHOOTER_LINE_Y) {
        triggerGameOver(currentScore)
        return
      }
      
      // 격자 좌표 기준: 버블 행이 구슬라인 행에 닿거나 넘으면 게임오버
      if (bubble.gridRow >= SHOOTER_LINE_ROW) {
        triggerGameOver(currentScore)
        return
      }
    }
    
    // 일반 버블(벽 블록 제외)이 모두 제거되면 승리
    const normalBubbles = state.bubbles.filter(bubble => !bubble.isWall)
    if (normalBubbles.length === 0) {
      triggerVictory(currentScore)
    }
  }

  const triggerGameOver = (currentScore: number = scoreRef.current) => {
    const state = gameStateRef.current
    
    setGameRunning(false)
    setGameOver(true)
    
    // 별 계산 (클리어 비율과 점수를 모두 고려)
    const clearRatio = state.totalBubbles > 0 ? state.clearedBubbles / state.totalBubbles : 0
    let starCount = 0
    
    // 점수 기준 별 계산
    let scoreStars = 0
    if (currentScore >= 1000) {
      scoreStars = 3
    } else if (currentScore >= 500) {
      scoreStars = 2
    } else if (currentScore >= 200) {
      scoreStars = 1
    }
    
    // 클리어 비율 기준 별 계산
    let clearStars = 0
    if (clearRatio >= 0.8) {        // 80% 이상 깨면 별 2개
      clearStars = 2
    } else if (clearRatio >= 0.5) { // 50% 이상 깨면 별 1개
      clearStars = 1
    }
    
    // 두 기준 중 높은 것을 선택 (하지만 최대 2개까지)
    starCount = Math.min(2, Math.max(scoreStars, clearStars))
    
    // 엔딩 결과 설정
    setGameResult({
      isClear: false,
      starCount: starCount,
      totalBubbles: state.totalBubbles,
      clearedBubbles: state.clearedBubbles,
      finalScore: currentScore
    })
    
    // 모든 타이머 정리
    if (state.wallTimer) {
      clearInterval(state.wallTimer)
      state.wallTimer = null
    }
    if (state.countdownTimer) {
      clearInterval(state.countdownTimer)
      state.countdownTimer = null
    }
  }

  const triggerVictory = (currentScore: number = scoreRef.current) => {
    const state = gameStateRef.current
    
    setGameRunning(false)
    // 승리 시에는 gameOver를 false로 유지 (승리 상태 구분)
    
    // sol결과 설정 (클리어 시 무조건 별 3개)
    setGameResult({
      isClear: true,
      starCount: 3,
      totalBubbles: state.totalBubbles,
      clearedBubbles: state.clearedBubbles,
      finalScore: currentScore
    })
    
    // 모든 타이머 정리
    if (state.wallTimer) {
      clearInterval(state.wallTimer)
      state.wallTimer = null
    }
    if (state.countdownTimer) {
      clearInterval(state.countdownTimer)
      state.countdownTimer = null
    }
  }

  const draw = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const state = gameStateRef.current
    
    // 시작화면이나 튜토리얼 화면일 때는 게임 요소를 그리지 않음
    if (gameState === 'start' || gameState === 'tutorial') {
      // 투명한 배경으로 지우기
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      return
    }
    
    // 화면 지우기 (투명하게)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // 1. 일반 버블들 그리기 (가장 아래 레이어)
    const normalBubbles = state.bubbles.filter(bubble => !bubble.isWall)
    for (let bubble of normalBubbles) {
      const bubblePos = getBubbleRenderPosition(bubble)
      drawBubble(ctx, bubblePos.x, bubblePos.y, bubble.color)
    }
    
    // 2. 떨어지는 버블들 그리기
    for (let falling of state.fallingBubbles) {
      ctx.save()
      ctx.translate(falling.x, falling.y)
      ctx.rotate(falling.rotation)
      ctx.globalAlpha = 0.8
      drawBubble(ctx, 0, 0, falling.bubble.color)
      ctx.restore()
    }
    
    // 3. 현재 버블 그리기
    if (state.currentBubble) {
      drawBubble(ctx, state.currentBubble.x, state.currentBubble.y, state.currentBubble.color)
    }
    
    // 4. 터지는 파티클들 그리기
    for (let particle of state.popParticles) {
      const alpha = particle.life / particle.maxLife
      ctx.globalAlpha = alpha
      ctx.fillStyle = particle.color
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1.0
    
    // 5. 구름 벽 그리기 (버블들 위에, UI 아래)
    if (state.cloudWall.isVisible) {
      drawCloudWall(ctx, canvas)
    }
    
    // 6. 조준선 그리기 (게임 진행 중일 때만)
    if (gameRunning && !gameOver && !state.currentBubble?.moving && state.trajectory) {
      drawTrajectory(ctx)
    }
    
    // 7. 다음 버블 미리보기 (UI 레이어)
    if (state.nextBubble) {
      ctx.fillStyle = '#fff'
      ctx.font = '12px Arial'
      ctx.fillText('다음:', canvas.width - 70, canvas.height - 60)
      drawBubble(ctx, canvas.width - 35, canvas.height - 35, state.nextBubble.color)
    }
    
    // 8. 구슬라인 그리기 (시각적 참조용)
    drawShooterLine(ctx, canvas)
    
    // 9. 슈터 키로 그리기
    drawShooterKiro(ctx)
    
    // 10. 게임 종료 상태 표시 (최상위 레이어)
    if (!gameRunning) {
      showGameEnd(ctx, canvas)
    }
  }

  const drawCloudWall = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const state = gameStateRef.current
    
    // cloud2 이미지가 로드되었는지 확인
    if (!state.cloud2Image || !state.endingImagesLoaded) {
      drawDefaultCloudWall(ctx, canvas)
      return
    }
    
    // cloud2 이미지의 아래쪽 일부만 그리기
    const canvasWidth = canvas.width
    const revealedHeight = state.cloudWall.revealedHeight
    
    if (revealedHeight <= 0) return // 아직 드러날 부분이 없으면 그리지 않음
    
    // 이미지의 원본 크기
    const imageWidth = state.cloud2Image.width
    const imageHeight = state.cloud2Image.height
    
    // 화면 너비에 맞게 스케일 조정
    const scaleX = canvasWidth / imageWidth
    const scale = scaleX // 가로 비율에 맞춤
    
    const scaledWidth = imageWidth * scale
    
    // 중앙 정렬을 위한 오프셋
    const offsetX = (canvasWidth - scaledWidth) / 2
    
    // 이미지의 아래쪽 일부만 잘라서 그리기
    const sourceY = imageHeight - (revealedHeight / scale) // 이미지에서 잘라낼 Y 시작점
    const sourceHeight = revealedHeight / scale // 이미지에서 잘라낼 높이
    
    // 화면 상단에 그리기
    const destY = 0
    const destHeight = revealedHeight
    
    // 이미지의 아래쪽 일부를 화면 상단에 그리기
    ctx.drawImage(
      state.cloud2Image,
      0, sourceY, imageWidth, sourceHeight, // 소스 영역 (이미지의 아래쪽 일부)
      offsetX, destY, scaledWidth, destHeight // 대상 영역 (화면 상단)
    )
  }
  
  const drawDefaultCloudWall = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const state = gameStateRef.current
    
    // 기본 그라데이션 구름 벽
    const revealedHeight = state.cloudWall.revealedHeight
    if (revealedHeight <= 0) return
    
    const gradient = ctx.createLinearGradient(0, 0, 0, revealedHeight)
    gradient.addColorStop(0, '#8a8a8a')
    gradient.addColorStop(0.3, '#6a6a6a')
    gradient.addColorStop(0.7, '#4a4a4a')
    gradient.addColorStop(1, '#3a3a3a')
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, revealedHeight)
  }

  const drawBubble = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    // 1. 외부 소프트 글로우 (파스텔 톤)
    ctx.shadowColor = lightenColor(color, 0.4)
    ctx.shadowBlur = 6
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    
    // 2. 메인 젤리 버블 - 파스텔 그라데이션
    const mainGradient = ctx.createRadialGradient(
      x - 8, y - 8, 0,  // 상단 좌측 하이라이트 위치
      x, y, BUBBLE_RADIUS
    )
    
    // 파스텔 젤리 그라데이션 (상단 밝음 → 하단 어둠)
    mainGradient.addColorStop(0, lightenColor(color, 0.7))     // 매우 밝은 파스텔
    mainGradient.addColorStop(0.2, lightenColor(color, 0.4))   // 밝은 파스텔
    mainGradient.addColorStop(0.6, color)                      // 기본 파스텔 색상
    mainGradient.addColorStop(0.85, darkenColor(color, 0.15))  // 살짝 어두운 파스텔
    mainGradient.addColorStop(1, darkenColor(color, 0.25))     // 하단 그림자
    
    ctx.beginPath()
    ctx.arc(x, y, BUBBLE_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = mainGradient
    ctx.fill()
    
    // 그림자 효과 제거
    ctx.shadowBlur = 0
    
    // 3. 상단 젤리 하이라이트 (큰 반사광)
    const jellyhighlightGradient = ctx.createRadialGradient(
      x - 9, y - 9, 0,
      x - 9, y - 9, BUBBLE_RADIUS * 0.6
    )
    jellyhighlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
    jellyhighlightGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.5)')
    jellyhighlightGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)')
    jellyhighlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    
    ctx.beginPath()
    ctx.arc(x - 9, y - 9, BUBBLE_RADIUS * 0.6, 0, Math.PI * 2)
    ctx.fillStyle = jellyhighlightGradient
    ctx.fill()
    
    // 4. 작은 반짝임 (젤리 텍스처)
    ctx.beginPath()
    ctx.arc(x - 11, y - 11, BUBBLE_RADIUS * 0.18, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.fill()
    
    // 5. 미세한 보조 하이라이트 (젤리 질감)
    ctx.beginPath()
    ctx.arc(x + 6, y - 4, BUBBLE_RADIUS * 0.12, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.fill()
    
    // 6. 부드러운 테두리 (연한 흰색)
    ctx.beginPath()
    ctx.arc(x, y, BUBBLE_RADIUS - 0.5, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.lineWidth = 1
    ctx.stroke()
    
    // 7. 외부 소프트 테두리 (젤리 경계)
    ctx.beginPath()
    ctx.arc(x, y, BUBBLE_RADIUS, 0, Math.PI * 2)
    ctx.strokeStyle = lightenColor(color, 0.2)
    ctx.lineWidth = 0.8
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
    
    // 키로 모션 변환 적용
    ctx.save()
    ctx.translate(kiroX, kiroY)
    
    // 모션에 따른 변환 적용
    const motion = state.kiroMotion
    if (motion.type !== 'idle') {
      const now = Date.now()
      const elapsed = now - motion.startTime
      const progress = Math.min(elapsed / motion.duration, 1)
      
      if (progress < 1) {
        const easeOut = 1 - Math.pow(1 - progress, 3)
        const bounce = Math.sin(progress * Math.PI * 4) * (1 - progress)
        
        switch (motion.type) {
          case 'jump':
            const jumpHeight = 15 * motion.intensity * (1 - Math.pow(progress - 0.5, 2) * 4)
            ctx.translate(0, -Math.max(0, jumpHeight))
            break
            
          case 'spin':
            const rotation = (360 * motion.intensity * easeOut) * (Math.PI / 180)
            ctx.rotate(rotation)
            break
            
          case 'bounce':
            const bounceY = Math.abs(bounce) * 8 * motion.intensity
            const bounceX = bounce * 3 * motion.intensity
            ctx.translate(bounceX, -bounceY)
            break
        }
      } else {
        // 모션 완료 시 idle로 복귀
        state.kiroMotion.type = 'idle'
      }
    }
    
    // 키로 이미지가 로드되었으면 이미지 사용
    if (state.imageLoaded && state.kiroImage) {
      ctx.drawImage(
        state.kiroImage, 
        -size/2, 
        -size/2, 
        size, 
        size
      )
    } else {
      // 이미지 로딩 실패 시 간단한 플레이스홀더
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.beginPath()
      ctx.arc(0, 0, size/2, 0, Math.PI * 2)
      ctx.fill()
      
      ctx.fillStyle = '#000'
      ctx.font = '12px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('KIRO', 0, 4)
    }
    
    ctx.restore()
  }



  const drawShooterLine = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    // 픽셀 기준 구슬라인 (고정)
    const lineY = SHOOTER_LINE_Y
    
    // 구슬라인이 화면에 보일 때만 그리기 (텍스트 제거)
    if (lineY > 0 && lineY < canvas.height) {
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)'  // 더 진한 노란색
      ctx.lineWidth = 3
      ctx.setLineDash([15, 8])
      
      ctx.beginPath()
      ctx.moveTo(0, lineY)
      ctx.lineTo(canvas.width, lineY)
      ctx.stroke()
      ctx.setLineDash([])
      
      // 구슬라인 라벨 제거 (주석 처리)
      // ctx.fillStyle = 'rgba(255, 255, 0, 0.8)'
      // ctx.font = '12px Arial'
      // ctx.textAlign = 'right'
      // ctx.fillText('구슬라인', canvas.width - 10, lineY - 5)
    }
  }

  const showGameEnd = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    // 캔버스에는 간단한 오버레이만 표시
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const renderStars = (starCount: number) => {
    const stars = []
    for (let i = 0; i < 3; i++) {
      const filled = i < starCount
      stars.push(
        <span 
          key={i} 
          style={{ 
            fontSize: '48px', 
            color: filled ? '#FFD700' : 'rgba(255, 255, 255, 0.3)',
            textShadow: filled ? '0 0 15px #FFFFFF, 0 0 30px #FFFFFF' : '0 0 10px rgba(255, 255, 255, 0.5)',
            margin: '0 8px',
            filter: filled ? 'drop-shadow(0 4px 8px rgba(255, 255, 255, 0.4))' : 'none',
            transition: 'all 0.3s ease'
          }}
        >
          ★
        </span>
      )
    }
    return stars
  }

  return (
    <div style={{ 
      background: gameState === 'playing' 
        ? `url(${backgroundImage}) center/contain no-repeat` 
        : 'transparent',
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '10px',
      position: 'relative'
    }}>
      {/* 시작 화면 */}
      {gameState === 'start' && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          background: 'transparent'
        }}>
          {/* 이미지를 img 태그로 직접 표시 */}
          <img 
            src={startBgImage}
            alt="Start Background"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              zIndex: -1
            }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
            onLoad={() => {
            }}
          />
          
          {/* 시작 화면 버튼들 */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            alignItems: 'center',
            zIndex: 2,
            marginTop: '350px' // 버튼을 더 아래로 이동
          }}>
            <button
              onClick={startNewGame}
              style={{
                background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7))',
                color: '#4a5568',
                border: '2px solid rgba(255, 255, 255, 0.8)',
                padding: '18px 55px', // 패딩을 통일
                fontSize: '20px', // 폰트 크기 통일
                fontWeight: '700',
                fontFamily: '"Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
                borderRadius: '50px',
                cursor: 'pointer',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                letterSpacing: '1px',
                backdropFilter: 'blur(10px)',
                minWidth: '220px', // 최소 너비 통일
                height: '60px' // 높이 통일
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)'
                e.currentTarget.style.boxShadow = '0 15px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                e.currentTarget.style.background = 'linear-gradient(145deg, rgba(255, 255, 255, 1), rgba(255, 255, 255, 0.8))'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0px) scale(1)'
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
                e.currentTarget.style.background = 'linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7))'
              }}
            >
              🎮 PLAY
            </button>
            
            <button
              onClick={showTutorial}
              style={{
                background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.5))',
                color: '#4a5568',
                border: '2px solid rgba(255, 255, 255, 0.6)',
                padding: '18px 55px', // 패딩을 통일
                fontSize: '20px', // 폰트 크기 통일
                fontWeight: '600',
                fontFamily: '"Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
                borderRadius: '50px',
                cursor: 'pointer',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                letterSpacing: '0.5px',
                backdropFilter: 'blur(10px)',
                minWidth: '220px', // 최소 너비 통일
                height: '60px' // 높이 통일
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)'
                e.currentTarget.style.boxShadow = '0 12px 35px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.7)'
                e.currentTarget.style.background = 'linear-gradient(145deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.6))'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0px) scale(1)'
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
                e.currentTarget.style.background = 'linear-gradient(145deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.5))'
              }}
            >
              📖 HOW TO PLAY
            </button>
          </div>
        </div>
      )}

      {/* 튜토리얼 화면 */}
      {gameState === 'tutorial' && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.9))',
            padding: '40px',
            borderRadius: '25px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(20px)',
            border: '2px solid rgba(255, 255, 255, 0.8)'
          }}>
            <h2 style={{
              color: '#4a5568',
              fontSize: '28px',
              fontWeight: '700',
              marginBottom: '30px',
              textAlign: 'center',
              fontFamily: '"Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'
            }}>
              🎯 게임 방법
            </h2>
            
            <div style={{
              color: '#2d3748',
              fontSize: '16px',
              lineHeight: '1.8',
              marginBottom: '30px',
              fontFamily: '"Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'
            }}>
              <div style={{ marginBottom: '15px' }}>
                <strong>🎮 조작법:</strong><br />
                • 마우스로 조준하고 클릭해서 버블을 발사하세요
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <strong>🎯 목표:</strong><br />
                • 같은 색깔 버블 3개 이상을 맞춰서 터뜨리세요<br />
                • 모든 컬러 버블을 제거하면 클리어!
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <strong>⚠️ 주의사항:</strong><br />
                • 30초마다 벽이 내려옵니다<br />
                • 버블이 노란 구슬라인을 넘으면 게임오버!
              </div>
              
              <div>
                <strong>⭐ 별점 시스템:</strong><br />
                • 클리어 시: ⭐⭐⭐ (3개)<br />
                • 2/3 이상 제거: ⭐⭐ (2개)<br />
                • 1/3 이상 제거: ⭐ (1개)
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={backToStart}
                style={{
                  background: 'linear-gradient(145deg, #667eea, #764ba2)',
                  color: 'white',
                  border: 'none',
                  padding: '15px 40px',
                  fontSize: '16px',
                  fontWeight: '600',
                  borderRadius: '50px',
                  cursor: 'pointer',
                  boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)',
                  transition: 'all 0.3s ease',
                  fontFamily: '"Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)'
                  e.currentTarget.style.boxShadow = '0 12px 35px rgba(102, 126, 234, 0.6)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0px) scale(1)'
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)'
                }}
              >
                ← 돌아가기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 게임 화면 (기존 코드) */}
      {gameState === 'playing' && (
      <div style={{
        textAlign: 'center',
        background: 'rgba(255, 255, 255, 0.3)',
        padding: '15px',
        borderRadius: '15px',
        position: 'relative'
      }}>
        <SpaceBetween size="s">
          <div style={{ color: 'white', fontSize: '20px' }}>
            점수: {score}
          </div>
          {gameRunning && !gameOver && (
            <div style={{ color: 'white', fontSize: '16px' }}>
              벽이 내려올 때까지: {timeLeft}초
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
          <div style={{ 
            position: 'relative', 
            display: 'inline-block',
            visibility: gameState === 'playing' ? 'visible' : 'hidden'
          }}>
            <canvas
              ref={canvasRef}
              width={500}
              height={650}
              style={{
                border: '3px solid #fff',
                borderRadius: '10px',
                background: 'transparent',
                cursor: !gameRunning ? 'not-allowed' : 'crosshair'
              }}
            />
          </div>
        </SpaceBetween>
      </div>
      )}

      {/* 엔딩 화면 오버레이 */}
      {gameResult && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            position: 'relative',
            maxWidth: '500px',
            width: '90%',
            height: '600px',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 0 30px rgba(255, 255, 255, 0.3)',
            border: '3px solid #fff'
          }}>
            {/* 배경 이미지 */}
            {gameStateRef.current.endingImagesLoaded && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: gameResult.starCount >= 2 
                  ? `url(${gameclearBgImage})` 
                  : `url(${gameoverBgImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }} />
            )}
            
            {/* 배경 이미지 로딩 실패 시 그라데이션 폴백 */}
            {!gameStateRef.current.endingImagesLoaded && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: gameResult.starCount >= 2 
                  ? 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)'
                  : 'linear-gradient(135deg, #ff4444 0%, #cc3333 100%)'
              }} />
            )}
            
            {/* 콘텐츠 오버레이 */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(45deg, rgba(255, 182, 193, 0.3), rgba(221, 160, 221, 0.3), rgba(173, 216, 230, 0.3))',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px',
              textAlign: 'center',
              zIndex: 1,
              animation: gameResult.starCount >= 2 ? 'sparkle 2s ease-in-out infinite' : 'none'
            }}>
              {/* 떠다니는 하트와 별 장식 제거 */}
              {false && (
                <>
                  <div style={{
                    position: 'absolute',
                    top: '10%',
                    left: '10%',
                    fontSize: '24px',
                    animation: 'float 3s ease-in-out infinite',
                    animationDelay: '0s'
                  }}>💖</div>
                  <div style={{
                    position: 'absolute',
                    top: '20%',
                    right: '15%',
                    fontSize: '20px',
                    animation: 'float 3s ease-in-out infinite',
                    animationDelay: '1s'
                  }}>✨</div>
                  <div style={{
                    position: 'absolute',
                    bottom: '30%',
                    left: '20%',
                    fontSize: '18px',
                    animation: 'float 3s ease-in-out infinite',
                    animationDelay: '2s'
                  }}>🌟</div>
                  <div style={{
                    position: 'absolute',
                    bottom: '20%',
                    right: '10%',
                    fontSize: '22px',
                    animation: 'float 3s ease-in-out infinite',
                    animationDelay: '0.5s'
                  }}>💕</div>
                </>
              )}

              {/* 타이틀 - 더 깔끔하게 */}
              <div style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#fff',
                marginBottom: '20px',
                textShadow: '2px 2px 8px rgba(0, 0, 0, 0.5)',
                zIndex: 3,
                background: gameResult.starCount >= 2 
                  ? 'linear-gradient(135deg, rgba(255, 182, 193, 0.9), rgba(255, 192, 203, 0.9))'
                  : 'linear-gradient(135deg, rgba(100, 100, 100, 0.9), rgba(80, 80, 80, 0.9))',
                padding: '15px 25px',
                borderRadius: '20px',
                border: gameResult.starCount >= 2 
                  ? '2px solid rgba(255, 105, 180, 0.6)' 
                  : '2px solid rgba(120, 120, 120, 0.6)',
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)',
                fontFamily: '"Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'
              }}>
                {gameResult.starCount === 3 ? 'PERFECT CLEAR!' : gameResult.starCount === 2 ? 'GAME CLEAR' : 'GAME OVER'}
              </div>

              {/* 키로 캐릭터 이미지 - 정적으로 */}
              {gameStateRef.current.endingImagesLoaded ? (
                <div style={{
                  width: '320px',
                  height: '320px',
                  backgroundImage: gameResult.starCount >= 2 
                    ? `url(${gameclearKiroImage})` 
                    : `url(${gameoverKiroImage})`,
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  marginBottom: '-20px',
                  filter: gameResult.starCount >= 2 
                    ? 'drop-shadow(0 0 30px rgba(255, 182, 193, 0.8)) brightness(1.1)'
                    : 'drop-shadow(0 0 20px rgba(100, 100, 100, 0.6))',
                  zIndex: 0
                }} />
              ) : (
                <div style={{
                  width: '320px',
                  height: '320px',
                  background: gameResult.starCount >= 2 
                    ? 'linear-gradient(45deg, #ffb6c1, #ffc0cb)'
                    : 'linear-gradient(45deg, #a0a0a0, #808080)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '-20px',
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: '#fff',
                  zIndex: 0,
                  boxShadow: gameResult.starCount >= 2 
                    ? '0 0 30px rgba(255, 182, 193, 0.8)'
                    : '0 0 20px rgba(100, 100, 100, 0.6)'
                }}>
                  {gameResult.starCount >= 2 ? '🥰' : '😊'} KIRO
                </div>
              )}

              {/* 별 표시 - 정적으로 */}
              <div style={{ 
                marginBottom: '10px',
                zIndex: 4,
                position: 'relative'
              }}>
                {renderStars(gameResult.starCount)}
              </div>

              {/* 하단 정보 영역 - 더 깔끔하게 */}
              <div style={{
                position: 'relative',
                zIndex: 1,
                background: gameResult.starCount >= 2 
                  ? 'linear-gradient(145deg, rgba(255, 182, 193, 0.95), rgba(255, 192, 203, 0.95))'
                  : 'linear-gradient(145deg, rgba(120, 120, 120, 0.95), rgba(100, 100, 100, 0.95))',
                padding: '30px',
                borderRadius: '25px',
                border: 'none',
                backdropFilter: 'blur(20px)',
                maxWidth: '350px',
                width: '85%',
                marginTop: '-30px',
                boxShadow: gameResult.starCount >= 2 
                  ? '0 20px 40px rgba(255, 182, 193, 0.4), 0 10px 20px rgba(255, 182, 193, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                  : '0 20px 40px rgba(100, 100, 100, 0.4), 0 10px 20px rgba(100, 100, 100, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                overflow: 'hidden'
              }}>
                {/* 글래스모피즘 효과를 위한 배경 */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: gameResult.starCount >= 2 
                    ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0.05) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.03) 100%)',
                  borderRadius: '25px',
                  zIndex: -1
                }} />

                {/* 점수 정보 - 흰색 배경 추가 */}
                <div style={{
                  marginBottom: '20px',
                  marginTop: '20px',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.9)',
                  padding: '20px 30px',
                  borderRadius: '15px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}>
                  <div style={{
                    color: gameResult.starCount >= 2 ? '#e91e63' : '#333333',
                    fontSize: '32px',
                    fontWeight: '800',
                    textAlign: 'center',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                    fontFamily: '"Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
                    letterSpacing: '1px',
                    marginBottom: '8px'
                  }}>
                    {gameResult.finalScore.toLocaleString()}
                  </div>
                  
                  <div style={{
                    color: gameResult.starCount >= 2 ? '#c2185b' : '#666666',
                    fontSize: '14px',
                    fontWeight: '500',
                    textAlign: 'center',
                    fontFamily: '"Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
                    opacity: 0.8
                  }}>
                    FINAL SCORE
                  </div>
                </div>

                {/* 버튼들 - 수평 배치로 변경 */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'row',
                  gap: '35px', 
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: '-5px'
                }}>
                  <button
                    onClick={restartGame}
                    style={{
                      background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.1))',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      padding: '12px 20px',
                      fontSize: '14px',
                      fontWeight: '600',
                      fontFamily: '"Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
                      borderRadius: '25px',
                      cursor: 'pointer',
                      boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
                      transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      letterSpacing: '0.5px',
                      backdropFilter: 'blur(10px)',
                      position: 'relative',
                      overflow: 'hidden',
                      minWidth: '120px',
                      textAlign: 'center'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'
                      e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
                      e.currentTarget.style.background = 'linear-gradient(145deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.15))'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0px) scale(1)'
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
                      e.currentTarget.style.background = 'linear-gradient(145deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.1))'
                    }}
                  >
                    RETRY
                  </button>
                  
                  <button
                    onClick={backToStart}
                    style={{
                      background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.1))',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      padding: '12px 20px',
                      fontSize: '14px',
                      fontWeight: '600',
                      fontFamily: '"Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
                      borderRadius: '25px',
                      cursor: 'pointer',
                      boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
                      transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      letterSpacing: '0.5px',
                      backdropFilter: 'blur(10px)',
                      position: 'relative',
                      overflow: 'hidden',
                      minWidth: '120px',
                      textAlign: 'center'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'
                      e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
                      e.currentTarget.style.background = 'linear-gradient(145deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.15))'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0px) scale(1)'
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
                      e.currentTarget.style.background = 'linear-gradient(145deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.1))'
                    }}
                  >
                    MAIN
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}