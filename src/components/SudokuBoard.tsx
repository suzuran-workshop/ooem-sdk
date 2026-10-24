import { useMemo } from 'react'
import { CELL_COUNT, colOf, findConflicts, rowOf, type Grid } from '@/lib/sudoku'
import type { GameStatus } from '@/lib/game'

interface SudokuBoardProps {
  puzzle: Grid
  solution: Grid
  values: Grid
  notes: number[]
  hinted: boolean[]
  selected: number | null
  status: GameStatus
  paused: boolean
  autoCheck: boolean
  highlightDuplicates: boolean
  highlightSameNumbers: boolean
  onSelect: (index: number) => void
}

function cellLabel(
  index: number,
  given: boolean,
  value: number,
  notes: number,
  hinted: boolean,
): string {
  const row = rowOf(index) + 1
  const col = colOf(index) + 1
  const parts = [`第 ${row} 行第 ${col} 列`]
  if (given) parts.push('题目数字')
  if (hinted) parts.push('提示填入')
  parts.push(value ? String(value) : '空白')
  if (!value && notes) {
    const digits = Array.from({ length: 9 }, (_, i) => i + 1).filter(
      (digit) => notes & (1 << (digit - 1)),
    )
    if (digits.length) parts.push(`笔记 ${digits.join('、')}`)
  }
  return parts.join('，')
}

export function SudokuBoard({
  puzzle,
  solution,
  values,
  notes,
  hinted,
  selected,
  status,
  paused,
  autoCheck,
  highlightDuplicates,
  highlightSameNumbers,
  onSelect,
}: SudokuBoardProps) {
  const conflicts = useMemo(() => findConflicts(values), [values])
  const selectedValue = selected === null ? 0 : values[selected]
  const selectedRow = selected === null ? -1 : rowOf(selected)
  const selectedCol = selected === null ? -1 : colOf(selected)
  const selectedBox =
    selected === null ? -1 : Math.floor(selectedRow / 3) * 3 + Math.floor(selectedCol / 3)

  return (
    <div
      className={`sudoku-board${status !== 'playing' ? ' is-finished' : ''}${paused ? ' is-paused' : ''}`}
      role="group"
      aria-label="数独棋盘"
    >
      {Array.from({ length: CELL_COUNT }, (_, index) => {
        const value = values[index]
        const given = puzzle[index] !== 0
        const row = rowOf(index)
        const col = colOf(index)
        const box = Math.floor(row / 3) * 3 + Math.floor(col / 3)
        const related =
          selected !== null &&
          index !== selected &&
          (row === selectedRow || col === selectedCol || box === selectedBox)
        const same =
          selectedValue > 0 && index !== selected && value === selectedValue && highlightSameNumbers
        const conflict = highlightDuplicates && conflicts[index]
        const wrong = autoCheck && !given && value !== 0 && value !== solution[index]
        const noteMask = notes[index]
        const hintedCell = hinted[index] === true
        const classes = [
          'sudoku-cell',
          given ? 'is-given' : '',
          selected === index ? 'is-selected' : '',
          related ? 'is-related' : '',
          same ? 'is-same' : '',
          conflict ? 'is-conflict' : '',
          wrong ? 'is-wrong' : '',
          hintedCell ? 'is-hinted' : '',
          col === 2 || col === 5 ? 'is-box-right' : '',
          row === 2 || row === 5 ? 'is-box-bottom' : '',
          col === 8 ? 'is-edge-right' : '',
          row === 8 ? 'is-edge-bottom' : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <button
            key={index}
            type="button"
            className={classes}
            data-cell-index={index}
            data-value={value || ''}
            data-given={given ? 'true' : 'false'}
            data-note-mask={noteMask}
            data-hinted={hintedCell ? 'true' : 'false'}
            aria-label={cellLabel(index, given, value, noteMask, hintedCell)}
            aria-selected={selected === index}
            aria-invalid={wrong || conflict}
            aria-disabled={status !== 'playing' || paused}
            tabIndex={selected === index || (selected === null && index === 0) ? 0 : -1}
            onClick={() => onSelect(index)}
            onFocus={() => onSelect(index)}
          >
            {value ? (
              <span className="cell-value">{value}</span>
            ) : noteMask ? (
              <span className="cell-notes" aria-hidden="true">
                {Array.from({ length: 9 }, (_, i) => {
                  const digit = i + 1
                  const active = (noteMask & (1 << i)) !== 0
                  return (
                    <span key={digit} className={active ? 'note is-on' : 'note'}>
                      {active ? digit : ''}
                    </span>
                  )
                })}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
