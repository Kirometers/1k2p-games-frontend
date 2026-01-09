import { execSync } from 'node:child_process'

function getChangedFiles() {
  const baseRefEnv = process.env.GITHUB_BASE_REF
  const baseRef = baseRefEnv ? `origin/${baseRefEnv}` : 'HEAD~1'
  const headRef = process.env.GITHUB_SHA || 'HEAD'

  try {
    const output = execSync(`git diff --name-only ${baseRef}...${headRef}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return output.split(/\r?\n/).filter(Boolean)
  } catch (error) {
    const output = execSync('git diff --name-only HEAD~1...HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return output.split(/\r?\n/).filter(Boolean)
  }
}

if (process.env.BYPASS_GAME_SCOPE === 'true') {
  process.stdout.write('Game scope check skipped (BYPASS_GAME_SCOPE=true).\n')
  process.exit(0)
}

const changedFiles = getChangedFiles()

if (changedFiles.length === 0) {
  process.stdout.write('No file changes detected.\n')
  process.exit(0)
}

const invalidFiles = changedFiles.filter((file) => {
  // Allow changes in src/games/ folder
  if (file.startsWith('src/games/')) return false
  
  // Allow changes in public/assets/<game-id>/ folder for game assets
  if (file.startsWith('public/assets/') && file.split('/').length >= 4) {
    const gameId = file.split('/')[2] // Extract game-id from public/assets/<game-id>/
    // Check if this game-id exists in src/games/
    const hasCorrespondingGame = changedFiles.some(f => f.startsWith(`src/games/${gameId}/`))
    if (hasCorrespondingGame) return false
  }
  
  return true
})

if (invalidFiles.length > 0) {
  process.stderr.write(
    `Changes outside src/games are not allowed:\n${invalidFiles.map((file) => `- ${file}`).join('\n')}\n`,
  )
  process.exit(1)
}

const shallowFiles = changedFiles.filter((file) => file.split('/').length < 4)

if (shallowFiles.length > 0) {
  process.stderr.write(
    `Changes must live inside src/games/<game-id>/. Invalid paths:\n${shallowFiles
      .map((file) => `- ${file}`)
      .join('\n')}\n`,
  )
  process.exit(1)
}

const gameIds = new Set(
  changedFiles
    .map((file) => file.split('/').slice(0, 3).join('/'))
    .map((prefix) => prefix.replace('src/games/', ''))
    .filter(Boolean),
)

if (gameIds.size > 1) {
  process.stderr.write(
    `Only one game folder per PR is allowed. Found: ${[...gameIds].join(', ')}\n`,
  )
  process.exit(1)
}

process.stdout.write(`Game scope check passed for ${[...gameIds][0]}.\n`)
