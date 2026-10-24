export const GRID_SIZE = 9
export const CELL_COUNT = GRID_SIZE * GRID_SIZE
export const FULL_MASK = 0x1ff

export type Grid = number[]

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'

export interface DifficultyConfig {
  id: Difficulty
  label: string
  caption: string
  targetClues: number
}

export const DIFFICULTIES: readonly DifficultyConfig[] = [
  { id: 'easy', label: '简单', caption: '从容热身', targetClues: 40 },
  { id: 'medium', label: '中等', caption: '恰到好处', targetClues: 34 },
  { id: 'hard', label: '困难', caption: '专注推演', targetClues: 29 },
  { id: 'expert', label: '专家', caption: '极限挑战', targetClues: 24 },
] as const

export interface Puzzle {
  puzzle: Grid
  solution: Grid
  difficulty: Difficulty
  clueCount: number
}

export function getDifficulty(id: Difficulty): DifficultyConfig {
  return DIFFICULTIES.find((item) => item.id === id) ?? DIFFICULTIES[1]
}

export function isDifficulty(value: unknown): value is Difficulty {
  return DIFFICULTIES.some((item) => item.id === value)
}

export function randomSeed(): number {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buffer = new Uint32Array(1)
    crypto.getRandomValues(buffer)
    return buffer[0] ?? Math.floor(Math.random() * 0xffffffff)
  }
  return Math.floor(Math.random() * 0xffffffff)
}

/** Small, fast deterministic PRNG used by the generator and by tests. */
export function mulberry32(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value = (value + 0x6d2b79f5) >>> 0
    let t = value
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

export function rowOf(index: number): number {
  return Math.floor(index / GRID_SIZE)
}

export function colOf(index: number): number {
  return index % GRID_SIZE
}

export function boxOf(index: number): number {
  return Math.floor(rowOf(index) / 3) * 3 + Math.floor(colOf(index) / 3)
}

export function digitMask(digit: number): number {
  return 1 << (digit - 1)
}

export function popCount(mask: number): number {
  let value = mask
  let count = 0
  while (value) {
    value &= value - 1
    count += 1
  }
  return count
}

export function maskToDigits(mask: number): number[] {
  const digits: number[] = []
  for (let digit = 1; digit <= 9; digit += 1) {
    if (mask & digitMask(digit)) digits.push(digit)
  }
  return digits
}

function randomGrid(rng: () => number): Uint8Array {
  const board = new Uint8Array(CELL_COUNT)
  const rows = new Uint16Array(9)
  const cols = new Uint16Array(9)
  const boxes = new Uint16Array(9)

  const fill = (): boolean => {
    let bestIndex = -1
    let bestMask = 0
    let bestCount = 10

    for (let index = 0; index < CELL_COUNT; index += 1) {
      if (board[index] !== 0) continue
      const mask = FULL_MASK & ~(rows[rowOf(index)] | cols[colOf(index)] | boxes[boxOf(index)])
      if (mask === 0) return false
      const count = popCount(mask)
      if (count < bestCount) {
        bestCount = count
        bestIndex = index
        bestMask = mask
        if (count === 1) break
      }
    }

    if (bestIndex === -1) return true

    const digits = shuffle(maskToDigits(bestMask), rng)
    const row = rowOf(bestIndex)
    const col = colOf(bestIndex)
    const box = boxOf(bestIndex)

    for (const digit of digits) {
      const mask = digitMask(digit)
      board[bestIndex] = digit
      rows[row] |= mask
      cols[col] |= mask
      boxes[box] |= mask

      if (fill()) return true

      board[bestIndex] = 0
      rows[row] &= ~mask
      cols[col] &= ~mask
      boxes[box] &= ~mask
    }

    return false
  }

  fill()
  return board
}

/** Counts solutions, stopping as soon as `limit` solutions are found. */
export function countSolutions(grid: readonly number[], limit = 2): number {
  const board = Uint8Array.from(grid)
  const rows = new Uint16Array(9)
  const cols = new Uint16Array(9)
  const boxes = new Uint16Array(9)
  let remaining = 0

  for (let index = 0; index < CELL_COUNT; index += 1) {
    const value = board[index]
    if (!value) {
      remaining += 1
      continue
    }
    const mask = digitMask(value)
    const row = rowOf(index)
    const col = colOf(index)
    const box = boxOf(index)
    if (rows[row] & mask || cols[col] & mask || boxes[box] & mask) return 0
    rows[row] |= mask
    cols[col] |= mask
    boxes[box] |= mask
  }

  let found = 0

  const search = (): void => {
    if (found >= limit) return
    if (remaining === 0) {
      found += 1
      return
    }

    let bestIndex = -1
    let bestMask = 0
    let bestCount = 10

    for (let index = 0; index < CELL_COUNT; index += 1) {
      if (board[index] !== 0) continue
      const mask = FULL_MASK & ~(rows[rowOf(index)] | cols[colOf(index)] | boxes[boxOf(index)])
      if (mask === 0) return
      const count = popCount(mask)
      if (count < bestCount) {
        bestCount = count
        bestIndex = index
        bestMask = mask
        if (count === 1) break
      }
    }

    if (bestIndex === -1) return

    const row = rowOf(bestIndex)
    const col = colOf(bestIndex)
    const box = boxOf(bestIndex)
    const digits = maskToDigits(bestMask)

    for (const digit of digits) {
      const mask = digitMask(digit)
      board[bestIndex] = digit
      rows[row] |= mask
      cols[col] |= mask
      boxes[box] |= mask
      remaining -= 1

      search()

      remaining += 1
      board[bestIndex] = 0
      rows[row] &= ~mask
      cols[col] &= ~mask
      boxes[box] &= ~mask

      if (found >= limit) return
    }
  }

  search()
  return found
}

export function generatePuzzle(difficulty: Difficulty, seed = randomSeed()): Puzzle {
  const rng = mulberry32(seed)
  const solution = Array.from(randomGrid(rng))
  const target = Math.min(getDifficulty(difficulty).targetClues, 55)
  const puzzle = solution.slice()
  let clues = CELL_COUNT

  const pairs: Array<[number, number]> = []
  for (let index = 0; index < Math.floor(CELL_COUNT / 2); index += 1) {
    pairs.push([index, CELL_COUNT - 1 - index])
  }
  shuffle(pairs, rng)

  // First remove 180°-symmetric pairs, which gives the board a calmer look.
  for (const [a, b] of pairs) {
    if (clues <= target) break
    if (puzzle[a] === 0 || puzzle[b] === 0) continue

    puzzle[a] = 0
    puzzle[b] = 0
    if (countSolutions(puzzle, 2) === 1) {
      clues -= 2
    } else {
      puzzle[a] = solution[a]
      puzzle[b] = solution[b]
    }
  }

  // Then remove individual cells if the target has not been reached yet.
  if (clues > target) {
    const indices = shuffle(
      Array.from({ length: CELL_COUNT }, (_, index) => index),
      rng,
    )
    for (const index of indices) {
      if (clues <= target) break
      if (puzzle[index] === 0) continue
      const value = puzzle[index]
      puzzle[index] = 0
      if (countSolutions(puzzle, 2) === 1) {
        clues -= 1
      } else {
        puzzle[index] = value
      }
    }
  }

  return {
    puzzle,
    solution,
    difficulty,
    clueCount: clues,
  }
}

/** Returns a boolean per cell marking every value that duplicates inside a unit. */
export function findConflicts(values: readonly number[]): boolean[] {
  const conflicts = Array.from({ length: CELL_COUNT }, () => false)

  const mark = (indices: number[]) => {
    const positions = new Map<number, number[]>()
    for (const index of indices) {
      const value = values[index]
      if (!value) continue
      const list = positions.get(value)
      if (list) list.push(index)
      else positions.set(value, [index])
    }
    for (const list of positions.values()) {
      if (list.length < 2) continue
      for (const index of list) conflicts[index] = true
    }
  }

  for (let row = 0; row < 9; row += 1) {
    mark(Array.from({ length: 9 }, (_, col) => row * 9 + col))
  }
  for (let col = 0; col < 9; col += 1) {
    mark(Array.from({ length: 9 }, (_, row) => row * 9 + col))
  }
  for (let box = 0; box < 9; box += 1) {
    const startRow = Math.floor(box / 3) * 3
    const startCol = (box % 3) * 3
    const indices: number[] = []
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        indices.push((startRow + row) * 9 + startCol + col)
      }
    }
    mark(indices)
  }

  return conflicts
}

export function getPeers(index: number): number[] {
  const peers = new Set<number>()
  for (let i = 0; i < 9; i += 1) {
    peers.add(rowOf(index) * 9 + i)
    peers.add(i * 9 + colOf(index))
  }
  const startRow = Math.floor(rowOf(index) / 3) * 3
  const startCol = Math.floor(colOf(index) / 3) * 3
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      peers.add((startRow + row) * 9 + startCol + col)
    }
  }
  peers.delete(index)
  return [...peers]
}

export function isSolved(values: readonly number[], solution: readonly number[]): boolean {
  return values.every((value, index) => value === solution[index])
}

export function countFilled(values: readonly number[]): number {
  let count = 0
  for (const value of values) if (value) count += 1
  return count
}

export function formatTime(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
  }
  return `${minutes}:${String(rest).padStart(2, '0')}`
}
