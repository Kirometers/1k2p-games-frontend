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

// Allow changes in:
// 1. src/games/<game-id>/ - game source code
// 2. public/games/<game-id>/ - game static assets
// 3. src/games/shared/ - shared utilities (if exists)
// 4. Test infrastructure files (with warning)
// 5. Documentation files (with warning)
// 6. Deployment configuration files (with warning)
const allowedTestInfraFiles = [
  'package.json',
  'package-lock.json',
  'vite.config.ts',
  'vitest.config.ts',
  'jest.config.js',
  'playwright.config.ts',
  'tsconfig.json',
  'tsconfig.app.json',
]

const allowedDocFiles = [
  'src/games/README.md',
  'README.md',
]

const allowedDeploymentFiles = [
  'vercel.json',
  'netlify.toml',
  '.env.example',
]

const invalidFiles = changedFiles.filter((file) => {
  // Allow game source files
  if (file.startsWith('src/games/')) {
    // Block changes to registry.ts (core infrastructure)
    if (file === 'src/games/registry.ts') return true
    return false
  }
  
  // Allow game public assets
  if (file.startsWith('public/games/')) return false
  
  // Allow test infrastructure files
  if (allowedTestInfraFiles.includes(file)) return false
  
  // Allow documentation files
  if (allowedDocFiles.includes(file)) return false
  
  // Allow deployment configuration files
  if (allowedDeploymentFiles.includes(file)) return false
  
  return true
})

if (invalidFiles.length > 0) {
  process.stderr.write(
    `Changes outside src/games are not allowed:\n${invalidFiles.map((file) => `- ${file}`).join('\n')}\n`,
  )
  process.exit(1)
}

// Warn about test infrastructure changes
const testInfraChanges = changedFiles.filter((file) => allowedTestInfraFiles.includes(file))
if (testInfraChanges.length > 0) {
  process.stdout.write(
    `⚠️  Test infrastructure files modified:\n${testInfraChanges.map((file) => `- ${file}`).join('\n')}\n`,
  )
  process.stdout.write('These changes will require maintainer review.\n\n')
}

// Warn about documentation changes
const docChanges = changedFiles.filter((file) => allowedDocFiles.includes(file))
if (docChanges.length > 0) {
  process.stdout.write(
    `📝 Documentation files modified:\n${docChanges.map((file) => `- ${file}`).join('\n')}\n`,
  )
  process.stdout.write('Please ensure changes improve clarity and accuracy.\n\n')
}

// Warn about deployment configuration changes
const deploymentChanges = changedFiles.filter((file) => allowedDeploymentFiles.includes(file))
if (deploymentChanges.length > 0) {
  process.stdout.write(
    `🚀 Deployment configuration files modified:\n${deploymentChanges.map((file) => `- ${file}`).join('\n')}\n`,
  )
  process.stdout.write('These changes affect production deployment and require careful review.\n\n')
}

const shallowFiles = changedFiles.filter((file) => {
  // Only check game files (src/games/ and public/games/)
  if (!file.startsWith('src/games/') && !file.startsWith('public/games/')) {
    return false
  }
  
  // Allow src/games/README.md and src/games/shared/
  if (file === 'src/games/README.md' || file.startsWith('src/games/shared/')) {
    return false
  }
  
  return file.split('/').length < 4
})

if (shallowFiles.length > 0) {
  process.stderr.write(
    `Changes must live inside src/games/<game-id>/ or public/games/<game-id>/. Invalid paths:\n${shallowFiles
      .map((file) => `- ${file}`)
      .join('\n')}\n`,
  )
  process.exit(1)
}

// Extract game IDs from both src/games/ and public/games/
const gameIds = new Set(
  changedFiles
    .filter((file) => file.startsWith('src/games/') || file.startsWith('public/games/'))
    .filter((file) => !file.startsWith('src/games/shared/')) // Exclude shared utilities
    .filter((file) => file !== 'src/games/README.md') // Exclude docs
    .map((file) => {
      if (file.startsWith('src/games/')) {
        return file.split('/').slice(0, 3).join('/')
      }
      if (file.startsWith('public/games/')) {
        return file.split('/').slice(0, 3).join('/')
      }
      return null
    })
    .filter(Boolean)
    .map((prefix) => prefix.replace(/^(src|public)\/games\//, ''))
    .filter(Boolean),
)

if (gameIds.size > 1) {
  process.stderr.write(
    `Only one game folder per PR is allowed. Found: ${[...gameIds].join(', ')}\n`,
  )
  process.exit(1)
}

// If only shared utilities or docs changed, that's okay
if (gameIds.size === 0) {
  const hasSharedChanges = changedFiles.some((file) => file.startsWith('src/games/shared/'))
  const hasDocChanges = changedFiles.some((file) => allowedDocFiles.includes(file))
  const hasInfraChanges = changedFiles.some((file) => allowedTestInfraFiles.includes(file))
  const hasDeploymentChanges = changedFiles.some((file) => allowedDeploymentFiles.includes(file))
  
  if (hasSharedChanges || hasDocChanges || hasInfraChanges || hasDeploymentChanges) {
    process.stdout.write('Game scope check passed (infrastructure/shared changes only).\n')
    process.exit(0)
  }
  
  process.stderr.write('No game changes detected. Please modify at least one game folder.\n')
  process.exit(1)
}

process.stdout.write(`Game scope check passed for ${[...gameIds][0]}.\n`)
