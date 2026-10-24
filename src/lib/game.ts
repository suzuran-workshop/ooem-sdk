import {
  CELL_COUNT,
  digitMask,
  getPeers,
  isSolved,
  type Difficulty,
  type Puzzle,
  generatePuzzle,
} from './sudoku'

export const MAX_MISTAKES = 3
export const MAX_HINTS = 3
export const MAX_HISTORY = 120

export type GameStatus = 'playing' | 'won' | 'lost'
export type Appearance = 'auto' | 'light' | 'dark'

export interface Settings {
  autoCheck: boolean
  highlightDuplicates: boolean
  highlightSameNumbers: boolean
  autoRemoveNotes: boolean
  showTimer: boolean
  appearance: Appearance
}

export const DEFAULT_SETTINGS: Settings = {
  autoCheck: true,
  highlightDuplicates: true,
  highlightSameNumbers: true,
  autoRemoveNotes: true,
  showTimer: true,
  appearance: 'auto',
}

export interface Stats {
  won: number
  streak: number
  bestStreak: number
  totalHints: number
  bestTimes: Record<Difficulty, number | null>
}

export const DEFAULT_STATS: Stats = {
  won: 0,
  streak: 0,
  bestStreak: 0,
  totalHints: 0,
  bestTimes: { easy: null, medium: null, hard: null, expert: null },
}

interface Snapshot {
  values: number[]
  notes: number[]
  hinted: boolean[]
}

export interface GameState {
  id: string
  difficulty: Difficulty
  clueCount: number
  puzzle: number[]
  solution: number[]
  values: number[]
  notes: number[]
  hinted: boolean[]
  selected: number | null
  notesMode: boolean
  mistakes: number
  hints: number
  elapsed: number
  status: GameStatus
  paused: boolean
  history: Snapshot[]
}

export type GameAction =
  | { type: 'select'; index: number | null }
  | { type: 'input'; digit: number; settings: Settings }
  | { type: 'erase' }
  | { type: 'toggle-notes-mode' }
  | { type: 'undo' }
  | { type: 'hint'; settings: Settings }
  | { type: 'tick' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'restart' }
  | { type: 'new'; puzzle: Puzzle }

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function createGame(puzzle: Puzzle): GameState {
  return {
    id: makeId(),
    difficulty: puzzle.difficulty,
    clueCount: puzzle.clueCount,
    puzzle: puzzle.puzzle.slice(),
    solution: puzzle.solution.slice(),
    values: puzzle.puzzle.slice(),
    notes: Array.from({ length: CELL_COUNT }, () => 0),
    hinted: Array.from({ length: CELL_COUNT }, () => false),
    selected: null,
    notesMode: false,
    mistakes: 0,
    hints: 0,
    elapsed: 0,
    status: 'playing',
    paused: false,
    history: [],
  }
}

export function createNewGame(difficulty: Difficulty): GameState {
  return createGame(generatePuzzle(difficulty))
}

function pushSnapshot(state: GameState): GameState {
  const snapshot: Snapshot = {
    values: state.values.slice(),
    notes: state.notes.slice(),
    hinted: state.hinted.slice(),
  }
  return {
    ...state,
    history: [...state.history.slice(-(MAX_HISTORY - 1)), snapshot],
  }
}

function clearNote(notes: number[], index: number, digit: number): void {
  notes[index] &= ~digitMask(digit)
}

function finishIfSolved(state: GameState): GameState {
  if (state.status !== 'playing') return state
  if (!isSolved(state.values, state.solution)) return state
  return { ...state, status: 'won', paused: false, selected: state.selected }
}

function applyDigit(state: GameState, digit: number, settings: Settings): GameState {
  if (state.status !== 'playing' || state.paused || state.selected === null) return state
  const index = state.selected
  if (state.puzzle[index] !== 0) return state

  if (state.notesMode) {
    if (state.values[index] !== 0) return state
    const next = pushSnapshot(state)
    const notes = next.notes.slice()
    notes[index] ^= digitMask(digit)
    return { ...next, notes }
  }

  if (state.values[index] === digit) return state

  const next = pushSnapshot(state)
  const values = next.values.slice()
  const notes = next.notes.slice()
  const hinted = next.hinted.slice()
  values[index] = digit
  notes[index] = 0
  hinted[index] = false

  if (settings.autoRemoveNotes) {
    for (const peer of getPeers(index)) clearNote(notes, peer, digit)
  }

  let mistakes = state.mistakes
  let status: GameStatus = state.status
  if (settings.autoCheck && digit !== state.solution[index]) {
    mistakes += 1
    if (mistakes >= MAX_MISTAKES) status = 'lost'
  }

  const updated: GameState = { ...next, values, notes, hinted, mistakes, status }
  if (status === 'lost') return { ...updated, paused: false }
  return finishIfSolved(updated)
}

function applyHint(state: GameState, settings: Settings): GameState {
  if (state.status !== 'playing' || state.paused) return state
  if (state.hints >= MAX_HINTS) return state

  const candidates: number[] = []
  for (let index = 0; index < CELL_COUNT; index += 1) {
    if (state.puzzle[index] !== 0) continue
    if (state.values[index] !== state.solution[index]) candidates.push(index)
  }
  if (candidates.length === 0) return state

  const selected = state.selected
  const target =
    selected !== null && candidates.includes(selected)
      ? selected
      : candidates[Math.floor(Math.random() * candidates.length)]

  const next = pushSnapshot(state)
  const values = next.values.slice()
  const notes = next.notes.slice()
  const hinted = next.hinted.slice()
  values[target] = state.solution[target]
  notes[target] = 0
  hinted[target] = true

  if (settings.autoRemoveNotes) {
    for (const peer of getPeers(target)) clearNote(notes, peer, values[target])
  }

  return finishIfSolved({
    ...next,
    values,
    notes,
    hinted,
    hints: state.hints + 1,
  })
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'select': {
      if (action.index !== null && (action.index < 0 || action.index >= CELL_COUNT)) return state
      return { ...state, selected: action.index }
    }
    case 'input':
      return applyDigit(state, action.digit, action.settings)
    case 'erase': {
      if (state.status !== 'playing' || state.paused || state.selected === null) return state
      const index = state.selected
      if (state.puzzle[index] !== 0) return state
      if (state.values[index] === 0 && state.notes[index] === 0) return state
      const next = pushSnapshot(state)
      const values = next.values.slice()
      const notes = next.notes.slice()
      const hinted = next.hinted.slice()
      values[index] = 0
      notes[index] = 0
      hinted[index] = false
      return { ...next, values, notes, hinted }
    }
    case 'toggle-notes-mode':
      return { ...state, notesMode: !state.notesMode }
    case 'undo': {
      if (state.status !== 'playing' || state.paused) return state
      const snapshot = state.history.at(-1)
      if (!snapshot) return state
      return {
        ...state,
        values: snapshot.values.slice(),
        notes: snapshot.notes.slice(),
        hinted: snapshot.hinted.slice(),
        history: state.history.slice(0, -1),
      }
    }
    case 'hint':
      return applyHint(state, action.settings)
    case 'tick':
      if (state.status !== 'playing' || state.paused) return state
      return { ...state, elapsed: state.elapsed + 1 }
    case 'pause':
      if (state.status !== 'playing' || state.paused) return state
      return { ...state, paused: true }
    case 'resume':
      if (state.status !== 'playing' || !state.paused) return state
      return { ...state, paused: false }
    case 'restart':
      return {
        ...state,
        values: state.puzzle.slice(),
        notes: Array.from({ length: CELL_COUNT }, () => 0),
        hinted: Array.from({ length: CELL_COUNT }, () => false),
        selected: null,
        mistakes: 0,
        hints: 0,
        elapsed: 0,
        status: 'playing',
        paused: false,
        history: [],
      }
    case 'new':
      return createGame(action.puzzle)
    default:
      return state
  }
}

export function remainingForDigit(values: readonly number[], digit: number): number {
  let count = 0
  for (const value of values) if (value === digit) count += 1
  return Math.max(0, 9 - count)
}
