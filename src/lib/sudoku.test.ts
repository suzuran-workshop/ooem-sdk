import { describe, expect, it } from 'vitest'
import {
  DIFFICULTIES,
  boxOf,
  colOf,
  countSolutions,
  findConflicts,
  formatTime,
  generatePuzzle,
  getPeers,
  isSolved,
  mulberry32,
  rowOf,
} from './sudoku'

function assertValidSolution(solution: number[]) {
  expect(solution).toHaveLength(81)
  for (let row = 0; row < 9; row += 1) {
    expect(new Set(solution.slice(row * 9, row * 9 + 9)).size).toBe(9)
  }
  for (let col = 0; col < 9; col += 1) {
    expect(new Set(Array.from({ length: 9 }, (_, row) => solution[row * 9 + col])).size).toBe(9)
  }
  for (let box = 0; box < 9; box += 1) {
    const values: number[] = []
    for (let index = 0; index < 81; index += 1) {
      if (boxOf(index) === box) values.push(solution[index])
    }
    expect(new Set(values).size).toBe(9)
  }
}

describe('puzzle generator', () => {
  it.each(DIFFICULTIES)('builds a unique, consistent $id puzzle', (difficulty) => {
    const puzzle = generatePuzzle(difficulty.id, 20261024)
    assertValidSolution(puzzle.solution)
    expect(puzzle.puzzle).toHaveLength(81)
    expect(puzzle.clueCount).toBeLessThanOrEqual(difficulty.targetClues + 2)
    expect(puzzle.clueCount).toBeGreaterThanOrEqual(difficulty.targetClues - 2)
    expect(countSolutions(puzzle.puzzle)).toBe(1)

    for (let index = 0; index < 81; index += 1) {
      if (puzzle.puzzle[index] === 0) continue
      expect(puzzle.puzzle[index]).toBe(puzzle.solution[index])
    }
  })

  it('is deterministic for a fixed seed and different across seeds', () => {
    const first = generatePuzzle('medium', 7)
    const again = generatePuzzle('medium', 7)
    const other = generatePuzzle('medium', 8)
    expect(first.puzzle).toEqual(again.puzzle)
    expect(first.solution).toEqual(again.solution)
    expect(first.puzzle).not.toEqual(other.puzzle)
  })

  it('keeps the expected solution counts for edge cases', () => {
    expect(
      countSolutions(
        Array.from({ length: 81 }, () => 0),
        2,
      ),
    ).toBe(2)
    const solved = generatePuzzle('easy', 99).solution
    expect(countSolutions(solved, 2)).toBe(1)
    const broken = solved.slice()
    broken[0] = broken[1] === 1 ? 2 : 1
    expect(countSolutions(broken, 2)).toBe(0)
  })
})

describe('board helpers', () => {
  it('finds duplicate values across a row, column and box', () => {
    const values = Array.from({ length: 81 }, () => 0)
    values[0] = 5
    values[1] = 5
    values[9] = 5
    const conflicts = findConflicts(values)
    expect(conflicts[0]).toBe(true)
    expect(conflicts[1]).toBe(true)
    expect(conflicts[9]).toBe(true)
    expect(conflicts[10]).toBe(false)
  })

  it('returns twenty peers without the cell itself', () => {
    for (const index of [0, 40, 80]) {
      const peers = getPeers(index)
      expect(peers).toHaveLength(20)
      expect(new Set(peers).size).toBe(20)
      expect(peers).not.toContain(index)
    }
    expect(rowOf(80)).toBe(8)
    expect(colOf(80)).toBe(8)
    expect(boxOf(80)).toBe(8)
  })

  it('formats elapsed time compactly', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(9)).toBe('0:09')
    expect(formatTime(65)).toBe('1:05')
    expect(formatTime(3661)).toBe('1:01:01')
    expect(formatTime(-3)).toBe('0:00')
  })

  it('recognizes a solved board', () => {
    const { solution } = generatePuzzle('easy', 12)
    expect(isSolved(solution, solution)).toBe(true)
    const values = solution.slice()
    values[0] = 0
    expect(isSolved(values, solution)).toBe(false)
  })

  it('keeps the PRNG reproducible', () => {
    const a = mulberry32(123)
    const b = mulberry32(123)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
})
