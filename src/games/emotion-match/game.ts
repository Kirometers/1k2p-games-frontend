import type { GameMeta } from '../registry'
import thumbnailImage from './thumdnail_image.png'
import heroImage from './hero_image.png'

const game: GameMeta = {
  id: 'emotion-match',
  title: 'Ghost Match Party',
  mode: '3-Match Puzzle',
  status: 'open',
  description: 'Match emotion blocks to reach high altitudes within the time limit. Choose your characters and aim for the sky!',
  thumbnail: thumbnailImage,
  heroImage: heroImage,
}

export default game