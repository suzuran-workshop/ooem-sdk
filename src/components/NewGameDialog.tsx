import { useEffect, useState } from 'react'
import { M3eButton } from '@m3e/react/button'
import { Sparkles } from 'lucide-react'
import { DIFFICULTIES, type Difficulty } from '@/lib/sudoku'
import { Modal } from './Modal'

interface NewGameDialogProps {
  open: boolean
  currentDifficulty: Difficulty
  onClose: () => void
  onStart: (difficulty: Difficulty) => void
  onRestart: () => void
}

export function NewGameDialog({
  open,
  currentDifficulty,
  onClose,
  onStart,
  onRestart,
}: NewGameDialogProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(currentDifficulty)

  useEffect(() => {
    if (open) setDifficulty(currentDifficulty)
  }, [open, currentDifficulty])

  return (
    <Modal
      open={open}
      title="新游戏"
      onClose={onClose}
      className="new-game-dialog"
      actions={
        <>
          <M3eButton variant="text" onClick={onRestart}>
            重开本局
          </M3eButton>
          <M3eButton variant="filled" onClick={() => onStart(difficulty)}>
            <Sparkles slot="icon" size={18} />
            开始
          </M3eButton>
        </>
      }
    >
      <p className="dialog-lead">选一个难度。每局都由唯一解生成，随时可以暂停。</p>
      <div className="difficulty-grid" role="radiogroup" aria-label="难度">
        {DIFFICULTIES.map((item) => {
          const active = item.id === difficulty
          return (
            <M3eButton
              key={item.id}
              role="radio"
              aria-checked={active}
              variant={active ? 'tonal' : 'outlined'}
              shape="square"
              className={`difficulty-option${active ? ' is-active' : ''}`}
              onClick={() => setDifficulty(item.id)}
            >
              <span className="difficulty-content">
                <span className="difficulty-name">{item.label}</span>
                <span className="difficulty-caption">{item.caption}</span>
                <span className="difficulty-count">约 {item.targetClues} 个数字</span>
              </span>
            </M3eButton>
          )
        })}
      </div>
      <p className="dialog-footnote">开始新游戏会替换当前棋盘；「重开本局」保留题目并清空进度。</p>
    </Modal>
  )
}
