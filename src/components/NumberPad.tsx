import { M3eButton } from '@m3e/react/button'
import { remainingForDigit } from '@/lib/game'
import type { Grid } from '@/lib/sudoku'

interface NumberPadProps {
  values: Grid
  selectedValue: number
  disabled: boolean
  onDigit: (digit: number) => void
}

export function NumberPad({ values, selectedValue, disabled, onDigit }: NumberPadProps) {
  return (
    <div className="number-grid" role="group" aria-label="选择数字" title="数字键 1–9 填数">
      {Array.from({ length: 9 }, (_, i) => {
        const digit = i + 1
        const remaining = remainingForDigit(values, digit)
        const complete = remaining === 0
        return (
          <M3eButton
            key={digit}
            variant={selectedValue === digit ? 'filled' : 'tonal'}
            className={`number-key${complete ? ' is-complete' : ''}`}
            aria-label={`${digit}，还剩 ${remaining} 个`}
            disabled={disabled}
            onClick={() => onDigit(digit)}
          >
            <span className="key-inner" aria-hidden="true">
              <span className="key-digit">{digit}</span>
              <span className="key-count">{complete ? '✓' : remaining}</span>
            </span>
          </M3eButton>
        )
      })}
    </div>
  )
}
