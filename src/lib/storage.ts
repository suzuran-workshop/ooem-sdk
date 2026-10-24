import { CELL_COUNT, isDifficulty, type Difficulty } from './sudoku'
import {
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  type GameState,
  type GameStatus,
  type Settings,
  type Stats,
} from './game'

const GAME_KEY = 'sudoku.game.v1'
const SETTINGS_KEY = 'sudoku.settings.v1'
const STATS_KEY = 'sudoku.stats.v1'

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be unavailable or full; the game still works in memory.
  }
}

function isNumberArray(value: unknown, length: number): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every((item) => typeof item === 'number' && Number.isFinite(item))
  )
}

function isStatus(value: unknown): value is GameStatus {
  return value === 'playing' || value === 'won' || value === 'lost'
}

interface PersistedGame {
  id: string
  difficulty: Difficulty
  clueCount: number
  puzzle: number[]
  solution: number[]
  values: number[]
  notes: number[]
  hinted?: boolean[]
  selected: number | null
  notesMode: boolean
  mistakes: number
  hints: number
  elapsed: number
  status: GameStatus
  paused: boolean
}

function isPersistedGame(value: unknown): value is PersistedGame {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    isDifficulty(record.difficulty) &&
    typeof record.clueCount === 'number' &&
    isNumberArray(record.puzzle, CELL_COUNT) &&
    isNumberArray(record.solution, CELL_COUNT) &&
    isNumberArray(record.values, CELL_COUNT) &&
    isNumberArray(record.notes, CELL_COUNT) &&
    (record.hinted === undefined ||
      (Array.isArray(record.hinted) &&
        record.hinted.length === CELL_COUNT &&
        record.hinted.every((item) => typeof item === 'boolean'))) &&
    (record.selected === null ||
      (typeof record.selected === 'number' &&
        record.selected >= 0 &&
        record.selected < CELL_COUNT)) &&
    typeof record.notesMode === 'boolean' &&
    typeof record.mistakes === 'number' &&
    typeof record.hints === 'number' &&
    typeof record.elapsed === 'number' &&
    isStatus(record.status) &&
    typeof record.paused === 'boolean'
  )
}

export function loadGame(): GameState | null {
  const value = readJson(GAME_KEY)
  if (!isPersistedGame(value)) return null
  return {
    ...value,
    hinted: value.hinted ?? Array.from({ length: CELL_COUNT }, () => false),
    history: [],
  }
}

export function saveGame(game: GameState): void {
  const { history: _history, ...persisted } = game
  writeJson(GAME_KEY, persisted)
}

export function clearGame(): void {
  try {
    localStorage.removeItem(GAME_KEY)
  } catch {
    // Ignore unavailable storage.
  }
}

function isAppearance(value: unknown): value is Settings['appearance'] {
  return value === 'auto' || value === 'light' || value === 'dark'
}

export function loadSettings(): Settings {
  const value = readJson(SETTINGS_KEY)
  if (!value || typeof value !== 'object') return { ...DEFAULT_SETTINGS }
  const record = value as Record<string, unknown>
  const bool = (key: keyof Settings, fallback: boolean) =>
    typeof record[key] === 'boolean' ? (record[key] as boolean) : fallback
  return {
    autoCheck: bool('autoCheck', DEFAULT_SETTINGS.autoCheck),
    highlightDuplicates: bool('highlightDuplicates', DEFAULT_SETTINGS.highlightDuplicates),
    highlightSameNumbers: bool('highlightSameNumbers', DEFAULT_SETTINGS.highlightSameNumbers),
    autoRemoveNotes: bool('autoRemoveNotes', DEFAULT_SETTINGS.autoRemoveNotes),
    showTimer: bool('showTimer', DEFAULT_SETTINGS.showTimer),
    appearance: isAppearance(record.appearance) ? record.appearance : DEFAULT_SETTINGS.appearance,
  }
}

export function saveSettings(settings: Settings): void {
  writeJson(SETTINGS_KEY, settings)
}

export function loadStats(): Stats {
  const value = readJson(STATS_KEY)
  if (!value || typeof value !== 'object') return structuredClone(DEFAULT_STATS)
  const record = value as Record<string, unknown>
  const numberOr = (input: unknown, fallback: number) =>
    typeof input === 'number' && Number.isFinite(input) ? input : fallback
  const bestTimesRaw =
    record.bestTimes && typeof record.bestTimes === 'object'
      ? (record.bestTimes as Record<string, unknown>)
      : {}
  const bestTimes = { ...DEFAULT_STATS.bestTimes }
  for (const difficulty of ['easy', 'medium', 'hard', 'expert'] as const) {
    const time = bestTimesRaw[difficulty]
    bestTimes[difficulty] =
      typeof time === 'number' && Number.isFinite(time) && time >= 0 ? time : null
  }
  return {
    won: numberOr(record.won, 0),
    streak: numberOr(record.streak, 0),
    bestStreak: numberOr(record.bestStreak, 0),
    totalHints: numberOr(record.totalHints, 0),
    bestTimes,
  }
}

export function saveStats(stats: Stats): void {
  writeJson(STATS_KEY, stats)
}
