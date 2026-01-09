import type { GameMeta } from '../registry'
import thumbnailImage from './thumdnail_image.png'
import heroImage from './hero_image.png'

const game: GameMeta = {
  id: 'emotion-match',
  title: '고스트 매치 파티',
  mode: '3-매치 퍼즐',
  status: 'open',
  description: '제한 시간 내에 감정 블록을 매치하여 높은 고도에 도달하세요.',
  thumbnail: thumbnailImage,
  heroImage: heroImage,
}

export default game