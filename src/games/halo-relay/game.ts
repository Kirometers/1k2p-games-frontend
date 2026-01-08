import type { GameMeta } from '../registry'

const game: GameMeta = {
  id: 'halo-relay',
  title: { en: 'Halo Relay', ko: '헤일로 릴레이' },
  mode: { en: 'Team Trial', ko: '팀 타임트라이얼' },
  status: 'open',
  description: {
    en: 'Pass the halo through checkpoints, one miss resets.',
    ko: '체크포인트를 헤일로로 전달하고 한 번 미스하면 리셋.',
  },
  heroImage: '/src/games/halo-relay/assets/hero.svg',
}

export default game
