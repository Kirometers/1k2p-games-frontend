import { useEffect, useRef, useState } from 'react'
import { Box, SpaceBetween } from '@cloudscape-design/components'
import kiroImage from './krio.png'

// 게임 상수
const WALL_DESCENT_INTERVAL_MS = 30000  // 30초
const SHOOTER_LINE_ROW = 18              // 구슬라인 행 (격자 기준)
const SHOOTER_LINE_Y = 530               // 구슬라인 Y 좌표 (픽셀 기준)

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
  isWall?: boolean // 벽 블록인지 구분
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
  const [gameRunning, setGameRunning] = useState(true)
  const [gameOver, setGameOver] = useState(false)
  const [timeLeft, setTimeLeft] = useState(WALL_DESCENT_INTERVAL_MS / 1000)
  
  // 게임 상태
  const gameStateRef = useRef({
    bubbles: [] as Bubble[],
    boardOffsetRows: 0,  // 전체 보드 하강 오프셋 (정수)
    currentBubble: null as CurrentBubble | null,
    nextBubble: null as { color: string } | null,
    trajectory: null as Trajectory | null,
    shooter: { x: 0, y: 0 },
    bubbleRadius: BUBBLE_RADIUS,
    colors: ['#B8A7E8', '#F8A5A5', '#A5E8B8', '#A5C9F8', '#F8E5A5', '#F8A5E8', '#A5F8E8'],
    rows: 8,
    cols: 12,
    wallTimer: null as number | null,
    countdownTimer: null as number | null,
    bubbleIdCounter: 0,  // 개발 모드용 ID 생성 카운터
    kiroImage: null as HTMLImageElement | null,
    imageLoaded: false,
    // 애니메이션 상태
    popParticles: [] as PopParticle[],
    fallingBubbles: [] as FallingBubble[]
  })

  // 버블 배열 불변성 검증 헬퍼 함수들 (강화된 버전)
  const createBubbleSnapshot = (bubbles: Bubble[], snapshotName: string = '') => {
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
    
    console.log(`[DEV] 📸 버블 스냅샷 생성: ${snapshotName}`)
    console.log(`[DEV] 📸 총 ${snapshot.length}개 버블 기록됨`)
    console.table(snapshot.map(s => ({
      ID: s.id,
      색상: s.color,
      격자행: s.gridRow,
      격자열: s.gridCol,
      렌더X: Math.round(s.renderPos.x),
      렌더Y: Math.round(s.renderPos.y)
    })))
    
    return snapshot
  }

  const validateBubbleIntegrity = (beforeSnapshot: any[], afterBubbles: Bubble[], operation: string) => {
    if (!DEV_MODE_VALIDATION || !beforeSnapshot) return true

    console.log(`[DEV] 🔍 버블 무결성 검증 시작: ${operation}`)
    console.log(`[DEV] 🔍 이전 스냅샷: ${beforeSnapshot.length}개, 현재 배열: ${afterBubbles.length}개`)

    // 새로 추가된 버블과 기존 버블 분류
    const existingBubbles = afterBubbles.filter(bubble => 
      beforeSnapshot.some(snap => snap.id === bubble.id)
    )
    const newBubbles = afterBubbles.filter(bubble => 
      !beforeSnapshot.some(snap => snap.id === bubble.id)
    )
    const removedBubbles = beforeSnapshot.filter(snap => 
      !afterBubbles.some(bubble => bubble.id === snap.id)
    )

    console.log(`[DEV] 📊 버블 변화 요약:`)
    console.log(`[DEV] 📊   기존 유지: ${existingBubbles.length}개`)
    console.log(`[DEV] 📊   새로 추가: ${newBubbles.length}개`)
    console.log(`[DEV] 📊   제거됨: ${removedBubbles.length}개`)

    // 제거된 버블 상세 로그
    if (removedBubbles.length > 0) {
      console.log(`[DEV] 🗑️ 제거된 버블들:`)
      removedBubbles.forEach(removed => {
        console.log(`[DEV] 🗑️   ID: ${removed.id}, 색상: ${removed.color}, 위치: (${removed.gridRow}, ${removed.gridCol})`)
      })
    }

    // 새로 추가된 버블 상세 로그
    if (newBubbles.length > 0) {
      console.log(`[DEV] ➕ 새로 추가된 버블들:`)
      newBubbles.forEach(newBubble => {
        const renderPos = getBubbleRenderPosition(newBubble)
        console.log(`[DEV] ➕   ID: ${newBubble.id}, 색상: ${newBubble.color}, 격자: (${newBubble.gridRow}, ${newBubble.gridCol}), 렌더: (${Math.round(renderPos.x)}, ${Math.round(renderPos.y)})`)
      })
    }

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
        
        console.error(`[DEV] ⚠️ 버블 무결성 위반 감지! ${operation}`)
        console.error(`[DEV] ⚠️   버블 ID: ${bubble.id}`)
        console.error(`[DEV] ⚠️   색상 변화: ${originalSnap.color} → ${bubble.color}`)
        console.error(`[DEV] ⚠️   격자 행 변화: ${originalSnap.gridRow} → ${bubble.gridRow}`)
        console.error(`[DEV] ⚠️   격자 열 변화: ${originalSnap.gridCol} → ${bubble.gridCol}`)
        console.error(`[DEV] ⚠️   렌더 위치 변화: (${Math.round(originalSnap.renderPos.x)}, ${Math.round(originalSnap.renderPos.y)}) → (${Math.round(currentRenderPos.x)}, ${Math.round(currentRenderPos.y)})`)
      }
    })

    if (integrityViolations > 0) {
      console.error(`[DEV] 🚨 ${operation}에서 ${integrityViolations}개 버블의 데이터가 변경됨!`)
      console.error(`[DEV] 🚨 벽 하강은 버블 배열을 수정하지 말고 오프셋만 변경해야 합니다!`)
      console.table(violationDetails)
      
      // 현재 보드 오프셋 상태도 출력
      const state = gameStateRef.current
      console.error(`[DEV] 🚨 현재 보드 오프셋: ${state.boardOffsetRows}`)
      
      return false
    }

    console.log(`[DEV] ✅ ${operation}: 버블 배열 무결성 검증 통과`)
    console.log(`[DEV] ✅   기존 ${existingBubbles.length}개 버블의 데이터가 모두 보존됨`)
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
    state.boardOffsetRows = 0  // 초기에는 오프셋 없음
    state.currentBubble = null
    state.nextBubble = null
    state.trajectory = null
    state.bubbleIdCounter = 0
    
    // 애니메이션 상태 초기화
    state.popParticles = []
    state.fallingBubbles = []
    
    // React 상태 초기화
    setScore(0)
    setGameRunning(true)
    setGameOver(false)
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
      if (!gameRunning || gameOver || gameStateRef.current.currentBubble?.moving) return
      
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      
      calculateTrajectory(mouseX, mouseY)
    }

    const handleClick = (e: MouseEvent) => {
      if (!gameRunning || gameOver || gameStateRef.current.currentBubble?.moving) return
      
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
  }, [gameRunning, gameOver])



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
    
    console.log('[DEV] 🎮 초기 버블 생성 시작')
    console.log(`[DEV] 🎮 격자 설정: CELL_WIDTH=${CELL_WIDTH}, CELL_HEIGHT=${CELL_HEIGHT}, ROW_OFFSET_X=${ROW_OFFSET_X}`)
    
    for (let row = 0; row < 5; row++) {
      console.log(`[DEV] 🎮 행 ${row} 생성 시작 (${row % 2 === 0 ? '짝수' : '홀수'} 행)`)
      
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
          
          // 렌더링 위치 계산 및 검증
          const renderPos = getBubbleRenderPosition(newBubble)
          
          state.bubbles.push(newBubble)
          
          console.log(`[DEV] 🎮   초기 버블: ID=${newBubble.id}, 색상=${newBubble.color}, 격자=(${newBubble.gridRow}, ${newBubble.gridCol}), 렌더=(${Math.round(renderPos.x)}, ${Math.round(renderPos.y)})`)
        } else {
          console.log(`[DEV] 🎮   경계 초과로 스킵: 행=${row}, 열=${col}, x=${Math.round(x)}`)
        }
      }
    }
    
    console.log(`[DEV] 🎮 초기 버블 생성 완료: ${state.bubbles.length}개`)
    
    // 초기 버블들의 렌더링 위치 검증
    console.log(`[DEV] 🎮 초기 버블 렌더링 위치 검증:`)
    state.bubbles.forEach((bubble, index) => {
      const pos = getBubbleRenderPosition(bubble)
      if (index < 5) { // 처음 5개만 로그
        console.log(`[DEV] 🎮   버블 ${index}: (${bubble.gridRow}, ${bubble.gridCol}) → (${Math.round(pos.x)}, ${Math.round(pos.y)})`)
      }
    })
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
    
    // 애니메이션 업데이트
    updateAnimations()
    
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

  const updateAnimations = () => {
    const state = gameStateRef.current
    
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
      gridCol: bestPosition.gridCol,
      isWall: false // 쏜 버블은 항상 일반 버블
    })
    
    state.bubbles.push(newBubble)
    
    // 벽 블록이 아닌 경우에만 매칭 검사
    if (!nearBubble.isWall) {
      checkMatches(newBubble)
    }
    
    createNewBubble()
    createNextBubble()
    
    // 버블이 격자에 고정된 직후 게임오버 체크
    checkGameOver()
  }

  const findNearbyPositions = (nearBubble: Bubble) => {
    const state = gameStateRef.current
    const positions = []
    
    // 육각형 격자의 인접 위치 (홀수/짝수 행에 따라 다름)
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
    
    const directions = (nearBubble.gridRow % 2 === 0) ? evenRowDirections : oddRowDirections
    
    console.log(`[DEV] 🎯 인접 위치 탐색: 기준 버블 (${nearBubble.gridRow}, ${nearBubble.gridCol}), 행 타입: ${nearBubble.gridRow % 2 === 0 ? '짝수' : '홀수'}`)
    
    for (let [dx, dy] of directions) {
      const newRow = nearBubble.gridRow + dy
      const newCol = nearBubble.gridCol + dx
      
      // 경계 체크
      if (newRow < 0 || newCol < 0 || newCol >= state.cols) {
        continue
      }
      
      const offsetX = (newRow % 2) * ROW_OFFSET_X
      const x = newCol * CELL_WIDTH + BUBBLE_RADIUS + offsetX
      const y = newRow * CELL_HEIGHT + BUBBLE_RADIUS
      
      // 화면 경계 체크
      if (x < BUBBLE_RADIUS || x > 500 - BUBBLE_RADIUS) {
        continue
      }
      
      // 해당 위치에 이미 버블이 있는지 체크 (격자 좌표로 정확히 비교)
      const occupied = state.bubbles.some(bubble => {
        return bubble.gridRow === newRow && bubble.gridCol === newCol
      })
      
      if (!occupied) {
        positions.push({ x, y, gridRow: newRow, gridCol: newCol })
        console.log(`[DEV] 🎯   가능한 위치: (${newRow}, ${newCol}) → 픽셀(${Math.round(x)}, ${Math.round(y)})`)
      } else {
        console.log(`[DEV] 🎯   점유된 위치: (${newRow}, ${newCol})`)
      }
    }
    
    // 가능한 위치가 없으면 현재 버블 위치 기준으로 격자에 스냅
    if (positions.length === 0) {
      console.log(`[DEV] 🎯 인접 위치 없음 - 현재 위치 기준으로 격자 스냅`)
      const gridX = Math.round((state.currentBubble!.x - BUBBLE_RADIUS) / CELL_WIDTH)
      const gridY = Math.round((state.currentBubble!.y - BUBBLE_RADIUS) / CELL_HEIGHT)
      
      // 격자 경계 보정
      const clampedX = Math.max(0, Math.min(gridX, state.cols - 1))
      const clampedY = Math.max(0, gridY)
      
      const offsetX = (clampedY % 2) * ROW_OFFSET_X
      
      positions.push({
        x: clampedX * CELL_WIDTH + BUBBLE_RADIUS + offsetX,
        y: clampedY * CELL_HEIGHT + BUBBLE_RADIUS,
        gridRow: clampedY,
        gridCol: clampedX
      })
      
      console.log(`[DEV] 🎯   격자 스냅 위치: (${clampedY}, ${clampedX})`)
    }
    
    console.log(`[DEV] 🎯 인접 위치 탐색 완료: ${positions.length}개 위치 발견`)
    return positions
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
    
    console.log(`[DEV] 🎯 천장에 버블 부착: ID=${newBubble.id}, 색상=${newBubble.color}, 위치=(${newBubble.gridRow}, ${newBubble.gridCol})`)
    
    state.bubbles.push(newBubble)
    checkMatches(newBubble)
    
    createNewBubble()
    createNextBubble()
    
    // 버블이 격자에 고정된 직후 게임오버 체크
    checkGameOver()
  }

  const checkMatches = (bubble: Bubble) => {
    console.log(`[DEV] 🎯 매칭 검사 시작: 버블 ID=${bubble.id}, 색상=${bubble.color}, 위치=(${bubble.gridRow}, ${bubble.gridCol})`)
    
    // 매칭 검사 전 버블 상태 스냅샷
    const beforeSnapshot = createBubbleSnapshot(gameStateRef.current.bubbles, '매칭 검사 전')
    
    const matches = findMatches(bubble, bubble.color, [])
    
    console.log(`[DEV] 🎯 매칭 결과: ${matches.length}개 버블 발견`)
    
    if (matches.length >= 3) {
      const state = gameStateRef.current
      
      console.log(`[DEV] 🎯 매칭 성공! ${matches.length}개 버블 제거 시작`)
      
      // 터지는 효과 생성
      matches.forEach(match => {
        const pos = getBubbleRenderPosition(match)
        createPopEffect(pos.x, pos.y, match.color)
        console.log(`[DEV] 🎯   제거 대상: ID=${match.id}, 색상=${match.color}, 위치=(${match.gridRow}, ${match.gridCol})`)
      })
      
      for (let match of matches) {
        const index = state.bubbles.indexOf(match)
        if (index > -1) {
          state.bubbles.splice(index, 1)
        }
      }
      
      const newScore = score + matches.length * 10
      setScore(newScore)
      
      console.log(`[DEV] 🎯 점수 업데이트: ${score} → ${newScore} (+${matches.length * 10})`)
      
      // 매칭 후 버블 무결성 검증
      validateBubbleIntegrity(beforeSnapshot || [], state.bubbles, '버블 매칭 제거')
      
      // ⚠️ 중요: 떠있는 버블 제거는 매칭 시에만 실행 (벽 하강과 분리)
      console.log(`[DEV] 🎯 떠있는 버블 제거 시작...`)
      removeFloatingBubbles()
    } else {
      console.log(`[DEV] 🎯 매칭 실패: ${matches.length}개 < 3개 (제거 안 함)`)
    }
  }

  const findMatches = (bubble: Bubble, color: string, visited: Bubble[]): Bubble[] => {
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
      
      if (distance < BUBBLE_RADIUS * 2.5 && other.color === color) {
        matches = matches.concat(findMatches(other, color, visited))
      }
    }
    
    return matches
  }

  const removeFloatingBubbles = () => {
    const state = gameStateRef.current
    
    // ⚠️ 중요: 이 함수는 버블 매칭 시에만 호출되어야 함 (벽 하강과 분리)
    console.log('[DEV] 🌊 떠있는 버블 제거 시작 (매칭 후에만 실행)')
    console.log(`[DEV] 🌊 제거 전 버블 수: ${state.bubbles.length}개`)
    
    // 떠있는 버블 제거 전 스냅샷
    const beforeSnapshot = createBubbleSnapshot(state.bubbles, '떠있는 버블 제거 전')
    
    const connected: Bubble[] = []
    
    // 천장에 연결된 버블들 찾기 (단순하게 gridRow 0 이하)
    console.log(`[DEV] 🌊 천장 연결 버블 탐색 시작`)
    for (let bubble of state.bubbles) {
      if (bubble.gridRow <= 0) {  // 0행 이하는 천장에 연결
        console.log(`[DEV] 🌊   천장 연결: ID=${bubble.id}, 격자행=${bubble.gridRow}`)
        markConnected(bubble, connected)
      }
    }
    
    console.log(`[DEV] 🌊 천장 연결된 버블: ${connected.length}개`)
    
    const toRemove = state.bubbles.filter(bubble => !connected.includes(bubble))
    
    console.log(`[DEV] 🌊 떠있는 버블 발견: ${toRemove.length}개`)
    toRemove.forEach(floating => {
      console.log(`[DEV] 🌊   떠있음: ID=${floating.id}, 색상=${floating.color}, 격자행=${floating.gridRow}`)
    })
    
    // 떨어지는 효과 생성
    if (toRemove.length > 0) {
      createFallingEffect(toRemove)
    }
    
    for (let bubble of toRemove) {
      const index = state.bubbles.indexOf(bubble)
      if (index > -1) {
        state.bubbles.splice(index, 1)
      }
    }
    
    if (toRemove.length > 0) {
      const bonusScore = toRemove.length * 5
      setScore(prev => prev + bonusScore)
      
      console.log(`[DEV] 🌊 떠있는 버블 제거 완료: ${toRemove.length}개 제거됨`)
      console.log(`[DEV] 🌊 보너스 점수: +${bonusScore}`)
      
      // 떠있는 버블 제거 후 무결성 검증
      validateBubbleIntegrity(beforeSnapshot || [], state.bubbles, '떠있는 버블 제거')
    } else {
      console.log('[DEV] 🌊 떠있는 버블 없음 - 모든 버블이 천장에 연결됨')
    }
    
    console.log(`[DEV] 🌊 제거 후 버블 수: ${state.bubbles.length}개`)
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
      console.log('[DEV] 기존 벽 타이머 정리됨')
    }
    if (state.countdownTimer) {
      clearInterval(state.countdownTimer)
      console.log('[DEV] 기존 카운트다운 타이머 정리됨')
    }
    
    // 벽 하강 타이머 (30초마다)
    state.wallTimer = setInterval(() => {
      // 게임이 실행 중이 아니면 스킵
      if (!gameRunning || gameOver) {
        console.log('[DEV] ⚠️ 게임이 실행 중이 아님 - 벽 하강 스킵')
        return
      }
      
      console.log('[DEV] 🕐 30초 경과 - 벽 하강 즉시 실행')
      
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
    
    console.log('[DEV] 벽 하강 타이머 시작됨 (30초 간격)')
  }



  const pushWallDown = () => {
    const state = gameStateRef.current
    
    console.log(`[DEV] 🧱 벽 하강 시작 - 구슬들을 수직으로 아래로 밀어내기`)
    console.log(`[DEV] 🧱 하강 전 상태: 버블 ${state.bubbles.length}개, 오프셋 ${state.boardOffsetRows}`)
    
    // 벽 하강 전 구슬 위치 스냅샷 (픽셀 위치 기준)
    const beforePositions = state.bubbles.map(bubble => {
      const pos = getBubbleRenderPosition(bubble)
      return {
        id: bubble.id,
        color: bubble.color,
        gridRow: bubble.gridRow,
        gridCol: bubble.gridCol,
        pixelX: Math.round(pos.x),
        pixelY: Math.round(pos.y)
      }
    })
    
    // ⚠️ 핵심: 기존 구슬들은 데이터 변경 없이 오프셋으로 아래로 밀어내기
    // 각 구슬의 gridRow, gridCol은 그대로 유지하고 boardOffsetRows만 증가
    state.boardOffsetRows += 1
    
    console.log(`[DEV] 🧱 보드 오프셋 증가: ${state.boardOffsetRows - 1} → ${state.boardOffsetRows}`)
    console.log(`[DEV] 🧱 기존 구슬들이 오프셋으로 ${CELL_HEIGHT}px 아래로 이동됨`)
    
    // 벽 하강 후 구슬 위치 확인 (픽셀 위치가 정확히 아래로 이동했는지 검증)
    console.log(`[DEV] 🧱 구슬 위치 이동 검증...`)
    
    let correctMoves = 0
    let positionErrors = 0
    
    beforePositions.forEach(before => {
      const currentBubble = state.bubbles.find(b => b.id === before.id)
      if (currentBubble) {
        const afterPos = getBubbleRenderPosition(currentBubble)
        const expectedX = before.pixelX  // X는 그대로
        const expectedY = before.pixelY + CELL_HEIGHT  // Y는 CELL_HEIGHT만큼 증가
        
        const actualX = Math.round(afterPos.x)
        const actualY = Math.round(afterPos.y)
        
        // X 좌표 확인 (변하지 않아야 함)
        if (Math.abs(actualX - expectedX) <= 1) {
          // Y 좌표 확인 (정확히 CELL_HEIGHT만큼 증가해야 함)
          if (Math.abs(actualY - expectedY) <= 1) {
            correctMoves++
          } else {
            console.warn(`[DEV] ⚠️ Y 이동 오류: ID=${before.id}, 예상Y=${expectedY}, 실제Y=${actualY}`)
            positionErrors++
          }
        } else {
          console.warn(`[DEV] ⚠️ X 위치 변화: ID=${before.id}, 예상X=${expectedX}, 실제X=${actualX}`)
          positionErrors++
        }
      }
    })
    
    if (positionErrors === 0) {
      console.log(`[DEV] ✅ 구슬 수직 이동 성공: ${correctMoves}개 구슬이 정확히 아래로 이동`)
    } else {
      console.error(`[DEV] 🚨 구슬 이동 오류: ${positionErrors}개 구슬의 위치가 잘못됨`)
    }
    
    // 새로운 최상단 행에 벽 블록들 추가
    console.log(`[DEV] 🧱 새 벽 블록 행 추가 시작...`)
    
    // 현재 오프셋을 고려한 최상단 격자 행 계산
    const newTopGridRow = -state.boardOffsetRows
    
    let addedCount = 0
    for (let col = 0; col < state.cols; col++) {
      // 새 행의 오프셋 계산 (실제 렌더링 행 기준)
      const actualRenderRow = newTopGridRow + state.boardOffsetRows  // 0이 되어야 함
      const offsetX = (actualRenderRow % 2) * ROW_OFFSET_X
      const x = col * CELL_WIDTH + BUBBLE_RADIUS + offsetX
      
      if (x < 500 - BUBBLE_RADIUS) {
        const newWallBlock = assignBubbleId({
          color: '#666666', // 회색 벽 색상
          gridRow: newTopGridRow,
          gridCol: col,
          isWall: true // 벽 블록으로 표시
        })
        
        state.bubbles.push(newWallBlock)
        addedCount++
        
        if (col < 3) { // 처음 3개만 로그
          const renderPos = getBubbleRenderPosition(newWallBlock)
          console.log(`[DEV] 🧱   새 벽 블록: 격자=(${newWallBlock.gridRow}, ${col}), 렌더=(${Math.round(renderPos.x)}, ${Math.round(renderPos.y)})`)
        }
      }
    }
    
    console.log(`[DEV] 🧱 새 벽 블록 추가 완료: ${addedCount}개`)
    console.log(`[DEV] 🧱 벽 하강 완료 - 총 구슬 수: ${state.bubbles.length}개, 오프셋: ${state.boardOffsetRows}`)
    
    // 게임오버 체크
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
        console.log(`[DEV] 🎯 게임오버 감지: 버블 ID=${bubble.id}, 하단Y=${Math.round(bubbleBottomY)}, 구슬라인Y=${SHOOTER_LINE_Y}`)
        triggerGameOver()
        return
      }
      
      // 격자 좌표 기준: 버블 행이 구슬라인 행에 닿거나 넘으면 게임오버
      if (bubble.gridRow >= SHOOTER_LINE_ROW) {
        console.log(`[DEV] 🎯 게임오버 감지: 버블 ID=${bubble.id}, 격자행=${bubble.gridRow}, 구슬라인행=${SHOOTER_LINE_ROW}`)
        triggerGameOver()
        return
      }
    }
    
    // 모든 버블 제거 시 승리
    if (state.bubbles.length === 0) {
      console.log(`[DEV] 🎯 승리 조건 달성: 모든 버블 제거됨`)
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
    
    console.log('[DEV] 게임오버 - 모든 상태 초기화됨')
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
    
    console.log('[DEV] 승리 - 모든 상태 초기화됨')
  }

  const draw = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const state = gameStateRef.current
    
    // 화면 지우기
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // 배경 버블들과 벽 그리기
    const wallRows = new Set<number>()
    const normalBubbles: Bubble[] = []
    
    // 벽 행과 일반 버블 분리
    for (let bubble of state.bubbles) {
      if (bubble.isWall) {
        wallRows.add(bubble.gridRow + state.boardOffsetRows) // 렌더링 행 기준
      } else {
        normalBubbles.push(bubble)
      }
    }
    
    // 벽 행들을 연속된 벽으로 그리기
    for (let wallRow of wallRows) {
      drawWallRow(ctx, wallRow)
    }
    
    // 일반 버블들 그리기
    for (let bubble of normalBubbles) {
      const bubblePos = getBubbleRenderPosition(bubble)
      drawBubble(ctx, bubblePos.x, bubblePos.y, bubble.color)
    }
    
    // 떨어지는 버블들 그리기
    for (let falling of state.fallingBubbles) {
      ctx.save()
      ctx.translate(falling.x, falling.y)
      ctx.rotate(falling.rotation)
      ctx.globalAlpha = 0.8
      drawBubble(ctx, 0, 0, falling.bubble.color)
      ctx.restore()
    }
    
    // 현재 버블 그리기
    if (state.currentBubble) {
      drawBubble(ctx, state.currentBubble.x, state.currentBubble.y, state.currentBubble.color)
    }
    
    // 터지는 파티클들 그리기
    for (let particle of state.popParticles) {
      const alpha = particle.life / particle.maxLife
      ctx.globalAlpha = alpha
      ctx.fillStyle = particle.color
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1.0
    
    // 조준선 그리기 (게임 진행 중일 때만)
    if (gameRunning && !gameOver && !state.currentBubble?.moving && state.trajectory) {
      drawTrajectory(ctx)
    }
    
    // 다음 버블 미리보기
    if (state.nextBubble) {
      ctx.fillStyle = '#fff'
      ctx.font = '12px Arial'
      ctx.fillText('다음:', canvas.width - 70, canvas.height - 60)
      drawBubble(ctx, canvas.width - 35, canvas.height - 35, state.nextBubble.color)
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

  const drawWallRow = (ctx: CanvasRenderingContext2D, renderRow: number) => {
    const y = renderRow * CELL_HEIGHT + BUBBLE_RADIUS
    const height = CELL_HEIGHT
    const width = 500 // 전체 캔버스 너비
    
    // 1. 소프트한 그라데이션 배경
    const gradient = ctx.createLinearGradient(0, y - height/2, 0, y + height/2)
    gradient.addColorStop(0, '#8a8a8a')    // 상단 밝은 회색
    gradient.addColorStop(0.3, '#6a6a6a')  // 중간 회색
    gradient.addColorStop(0.7, '#4a4a4a')  // 어두운 회색
    gradient.addColorStop(1, '#3a3a3a')    // 하단 가장 어두운 회색
    
    // 2. 메인 벽 사각형
    ctx.fillStyle = gradient
    ctx.fillRect(0, y - height/2, width, height)
    
    // 3. 상단 하이라이트
    const topGradient = ctx.createLinearGradient(0, y - height/2, 0, y - height/2 + 6)
    topGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)')
    topGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    
    ctx.fillStyle = topGradient
    ctx.fillRect(0, y - height/2, width, 6)
    
    // 4. 하단 그림자
    const bottomGradient = ctx.createLinearGradient(0, y + height/2 - 4, 0, y + height/2)
    bottomGradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    bottomGradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)')
    
    ctx.fillStyle = bottomGradient
    ctx.fillRect(0, y + height/2 - 4, width, 4)
    
    // 5. 미세한 텍스처 라인들
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 0.5
    for (let i = 0; i < 3; i++) {
      const lineY = y - height/2 + (i + 1) * height/4
      ctx.beginPath()
      ctx.moveTo(0, lineY)
      ctx.lineTo(width, lineY)
      ctx.stroke()
    }
    
    // 6. 상하 테두리
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, y - height/2)
    ctx.lineTo(width, y - height/2)
    ctx.moveTo(0, y + height/2)
    ctx.lineTo(width, y + height/2)
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



  const drawShooterLine = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    // 픽셀 기준 구슬라인 (고정)
    const lineY = SHOOTER_LINE_Y
    
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
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <canvas
              ref={canvasRef}
              width={500}
              height={650}
              style={{
                border: '3px solid #fff',
                borderRadius: '10px',
                background: '#000',
                cursor: !gameRunning ? 'not-allowed' : 'crosshair'
              }}
            />
          </div>
          
          <Box color="text-body-secondary" textAlign="center">
            <div style={{ color: 'white', fontSize: '13px' }}>
              마우스로 조준하고 클릭해서 버블을 쏘세요! 🎯<br />
              같은 색깔 3개 이상을 맞춰서 터뜨리세요! ✨<br />
              30초마다 벽이 내려옵니다!<br />
              <span style={{ color: '#ffff00' }}>⚠️ 버블이 노란 구슬라인을 넘으면 게임오버!</span>
            </div>
          </Box>
        </SpaceBetween>
      </div>
    </div>
  )
}