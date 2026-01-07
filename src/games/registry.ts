export type GameStatus = 'Open' | 'Prototype' | 'Planned'

export type GameMeta = {
  id: string
  title: string
  mode: string
  status: GameStatus
  description: string
}

type GameModule = {
  default: GameMeta
}

const modules = import.meta.glob<GameModule>('./*/game.ts', { eager: true })

export const games = Object.values(modules)
  .map((mod) => mod.default)
  .sort((a, b) => a.title.localeCompare(b.title))
