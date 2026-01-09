import iconImage from './icon.png'
import heroImageFile from './hero.png'

export default {
  id: 'bubble_shooter',
  title: { en: 'Bubble Shooter', ko: '버블 슈터' },
  mode: { en: 'Single Player', ko: '싱글 플레이어' },
  description: { 
    en: 'Aim and shoot bubbles to match 3 or more of the same color!', 
    ko: '같은 색깔 버블 3개 이상을 맞춰서 터뜨리세요!' 
  },
  status: 'open' as const,
  thumbnail: iconImage,
  heroImage: heroImageFile
}