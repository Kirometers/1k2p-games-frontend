import type { ComponentType } from 'react'

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
const componentModules = import.meta.glob<{ default: ComponentType }>('./*/index.tsx')

export const games = Object.values(modules)
  .map((mod) => mod.default)
  .sort((a, b) => a.title.localeCompare(b.title))

const componentEntries = Object.entries(componentModules).map(([path, loader]) => {
  const [, folder] = path.split('/')
  return [folder, loader] as const
})

export const gameLoaders = Object.fromEntries(componentEntries)

export function getGameLoader(gameId: string) {
  return gameLoaders[gameId]
}
