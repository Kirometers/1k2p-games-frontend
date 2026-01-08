import type { GameMeta } from '../registry'

const game: GameMeta = {
  id: 'ten-exorcism',
  title: { en: 'Ten Exorcism', ko: '텐 엑소시즘' },
  mode: { en: 'Solo Puzzle', ko: '솔로 퍼즐' },
  status: 'prototype',
  description: {
    en: 'Exorcise ghosts by selecting rectangles that sum to exactly 10.',
    ko: '합이 정확히 10이 되는 사각형을 선택하여 유령을 퇴치하세요.',
  },
}

export default game
