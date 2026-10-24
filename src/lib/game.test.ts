import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  MAX_HINTS,
  MAX_MISTAKES,
  createGame,
  gameReducer,
  remainingForDigit,
  type GameState,
} from './game'
import { generatePuzzle } from './sudoku'

function makeGame(): { game: GameState; empty: number } {
  const puzzle = generatePuzzle('easy', 4242)
  const game = createGame(puzzle)
  const empty = game.puzzle.findIndex((value) => value === 0)
  return { game, empty }
}

describe('game reducer', () => {
  it('toggles notes and undoes the change', () => {
    const { game, empty } = makeGame()
    let state = gameReducer(game, { type: 'toggle-notes-mode' })
    state = gameReducer(state, { type: 'select', index: empty })
    state = gameReducer(state, { type: 'input', digit: 1, settings: DEFAULT_SETTINGS })
    expect(state.notes[empty]).toBe(1)
    expect(state.values[empty]).toBe(0)

    state = gameReducer(state, { type: 'undo' })
    expect(state.notes[empty]).toBe(0)
    expect(state.history).toHaveLength(0)
  })

  it('writes values, erases them and clears notes with auto-remove', () => {
    const { game, empty } = makeGame()
    let state = gameReducer(game, { type: 'select', index: empty })

    for (let digit = 1; digit <= 9; digit += 1) {
      const hasPeer = game.puzzle.some((value, index) => {
        if (index === empty) return false
        return value === digit
      })
      if (hasPeer) {
        state = gameReducer(state, { type: 'toggle-notes-mode' })
        state = gameReducer(state, { type: 'input', digit, settings: DEFAULT_SETTINGS })
        state = gameReducer(state, { type: 'toggle-notes-mode' })
        break
      }
    }

    const value = state.solution[empty]
    state = gameReducer(state, { type: 'input', digit: value, settings: DEFAULT_SETTINGS })
    expect(state.values[empty]).toBe(value)
    expect(state.notes[empty]).toBe(0)

    state = gameReducer(state, { type: 'erase' })
    expect(state.values[empty]).toBe(0)
  })

  it('locks the game after three wrong entries', () => {
    const { game, empty } = makeGame()
    const correct = game.solution[empty]
    const wrongDigits = [1, 2, 3].filter((digit) => digit !== correct)
    let state = gameReducer(game, { type: 'select', index: empty })

    for (const digit of wrongDigits) {
      state = gameReducer(state, { type: 'input', digit, settings: DEFAULT_SETTINGS })
      if (state.status === 'lost') break
    }

    expect(state.mistakes).toBeGreaterThanOrEqual(MAX_MISTAKES)
    expect(state.status).toBe('lost')
    const locked = gameReducer(state, { type: 'input', digit: correct, settings: DEFAULT_SETTINGS })
    expect(locked).toBe(state)
  })

  it('does not count mistakes when auto-check is off', () => {
    const { game, empty } = makeGame()
    const settings = { ...DEFAULT_SETTINGS, autoCheck: false }
    const correct = game.solution[empty]
    const wrong = correct === 1 ? 2 : 1
    let state = gameReducer(game, { type: 'select', index: empty })
    state = gameReducer(state, { type: 'input', digit: wrong, settings })
    expect(state.mistakes).toBe(0)
    expect(state.status).toBe('playing')
  })

  it('reveals a correct digit with a hint and marks it', () => {
    const { game, empty } = makeGame()
    let state = gameReducer(game, { type: 'select', index: empty })
    state = gameReducer(state, { type: 'hint', settings: DEFAULT_SETTINGS })
    expect(state.values[empty]).toBe(state.solution[empty])
    expect(state.hinted[empty]).toBe(true)
    expect(state.hints).toBe(1)
  })

  it('clears the hint mark when the cell is overwritten, erased or undone', () => {
    const { game, empty } = makeGame()
    let state = gameReducer(game, { type: 'select', index: empty })

    state = gameReducer(state, { type: 'hint', settings: DEFAULT_SETTINGS })
    expect(state.hinted[empty]).toBe(true)
    state = gameReducer(state, { type: 'undo' })
    expect(state.hinted[empty]).toBe(false)
    expect(state.values[empty]).toBe(0)

    state = gameReducer(state, { type: 'hint', settings: DEFAULT_SETTINGS })
    const correct = state.solution[empty]
    const wrong = correct === 1 ? 2 : 1
    state = gameReducer(state, { type: 'input', digit: wrong, settings: DEFAULT_SETTINGS })
    expect(state.hinted[empty]).toBe(false)

    state = gameReducer(state, { type: 'hint', settings: DEFAULT_SETTINGS })
    expect(state.hinted[empty]).toBe(true)
    state = gameReducer(state, { type: 'erase' })
    expect(state.hinted[empty]).toBe(false)
    expect(state.values[empty]).toBe(0)
  })

  it('stops giving hints after the per-game limit', () => {
    const { game } = makeGame()
    let state = game
    state = gameReducer(state, { type: 'hint', settings: DEFAULT_SETTINGS })
    state = gameReducer(state, { type: 'hint', settings: DEFAULT_SETTINGS })
    state = gameReducer(state, { type: 'hint', settings: DEFAULT_SETTINGS })
    expect(state.hints).toBe(MAX_HINTS)
    const valuesAtLimit = state.values.slice()
    const blocked = gameReducer(state, { type: 'hint', settings: DEFAULT_SETTINGS })
    expect(blocked).toBe(state)
    expect(blocked.values).toEqual(valuesAtLimit)
  })

  it('wins when the final cell is solved', () => {
    const { solution } = generatePuzzle('easy', 777)
    const puzzle = solution.slice()
    const empty = puzzle.findIndex((value) => value === 0)
    const finalCell = empty === -1 ? 40 : empty
    puzzle[finalCell] = 0
    const game = createGame({ puzzle, solution, difficulty: 'easy', clueCount: 80 })
    let state = gameReducer(game, { type: 'select', index: finalCell })
    state = gameReducer(state, { type: 'hint', settings: DEFAULT_SETTINGS })
    expect(state.status).toBe('won')
    expect(state.values).toEqual(solution)
  })

  it('pauses, ticks and restarts', () => {
    const { game } = makeGame()
    let state = gameReducer(game, { type: 'pause' })
    expect(state.paused).toBe(true)
    expect(gameReducer(state, { type: 'tick' })).toBe(state)
    state = gameReducer(state, { type: 'resume' })
    state = gameReducer(state, { type: 'tick' })
    expect(state.elapsed).toBe(1)
    state = gameReducer(state, { type: 'restart' })
    expect(state.elapsed).toBe(0)
    expect(state.values).toEqual(state.puzzle)
    expect(state.history).toHaveLength(0)
  })
})

describe('derived values', () => {
  it('computes remaining digits', () => {
    const values = Array.from({ length: 81 }, () => 0)
    values[0] = 1
    values[1] = 1
    values[2] = 1
    expect(remainingForDigit(values, 1)).toBe(6)
    expect(remainingForDigit(values, 2)).toBe(9)
  })
})
