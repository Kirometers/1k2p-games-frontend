import type { ComponentType } from 'react'

export type Locale = 'ko' | 'en'

export type LocalizedString = string | { ko: string; en: string }

export type GameStatus = 'open' | 'prototype' | 'planned'

export type GameMeta = {
  id: string
  title: LocalizedString
  mode: LocalizedString
  status: GameStatus
  description: LocalizedString
  thumbnail?: string
  heroImage?: string
}

type GameModule = {
  default: GameMeta
}

const modules = import.meta.glob<GameModule>('./*/game.ts', { eager: true })
const componentModules = import.meta.glob<{ default: ComponentType }>('./*/index.tsx')

export function resolveLocaleString(value: LocalizedString, locale: Locale) {
  if (typeof value === 'string') {
    return value
  }
  return value[locale] ?? value.en ?? value.ko
}

export const games = Object.values(modules)
  .map((mod) => mod.default)
  .sort((a, b) =>
    resolveLocaleString(a.title, 'en').localeCompare(resolveLocaleString(b.title, 'en')),
  )

const componentEntries = Object.entries(componentModules).map(([path, loader]) => {
  const [, folder] = path.split('/')
  return [folder, loader] as const
})

export const gameLoaders = Object.fromEntries(componentEntries)

export function getGameLoader(gameId: string) {
  return gameLoaders[gameId]
}
