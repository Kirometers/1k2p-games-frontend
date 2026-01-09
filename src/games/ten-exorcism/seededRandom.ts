/**
 * Mulberry32 - A simple and fast 32-bit seeded PRNG
 * Produces deterministic sequences for the same seed value
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed
  return function () {
    let t = (state += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Generate a random seed using Math.random()
 */
export function generateSeed(): number {
  return Math.floor(Math.random() * 0xffffffff)
}
