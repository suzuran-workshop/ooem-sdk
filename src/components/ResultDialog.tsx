import { M3eButton } from '@m3e/react/button'
import { RotateCcw, Sparkles, Trophy } from 'lucide-react'
import type { GameState } from '@/lib/game'
import { formatTime, getDifficulty } from '@/lib/sudoku'
import { Modal } from './Modal'

interface ResultDialogProps {
  open: boolean
  game: GameState
  newRecord: boolean
  onClose: () => void
  onPlayAgain: () => void
  onChooseDifficulty: () => void
}

export function ResultDialog({
  open,
  game,
  newRecord,
  onClose,
  onPlayAgain,
  onChooseDifficulty,
}: ResultDialogProps) {
  const won = game.status === 'won'
  const difficulty = getDifficulty(game.difficulty)

  return (
    <Modal
      open={open}
      title={won ? '漂亮，完成！' : '三次机会用完了'}
      onClose={onClose}
      className="result-dialog"
      actions={
        <>
          <M3eButton variant="text" onClick={onChooseDifficulty}>
            换难度
          </M3eButton>
          <M3eButton variant="filled" onClick={onPlayAgain}>
            {won ? <Sparkles slot="icon" size={18} /> : <RotateCcw slot="icon" size={18} />}
            再来一局
          </M3eButton>
        </>
      }
    >
      <div className={`result-hero${won ? ' is-win' : ' is-loss'}`}>
        <span className="result-icon" aria-hidden="true">
          {won ? <Trophy size={34} /> : <RotateCcw size={30} />}
        </span>
        <p>
          {won
            ? `你解开了这局${difficulty.label}数独。`
            : '别急，棋盘还在这里。调整一下，再开一局。'}
        </p>
        {won && newRecord ? <span className="record-badge">新的最佳时间</span> : null}
      </div>

      <div className="result-metrics">
        <div>
          <span>用时</span>
          <strong>{formatTime(game.elapsed)}</strong>
        </div>
        <div>
          <span>难度</span>
          <strong>{difficulty.label}</strong>
        </div>
        <div>
          <span>错误</span>
          <strong>
            {game.mistakes}
            <small> / 3</small>
          </strong>
        </div>
        <div>
          <span>提示</span>
          <strong>{game.hints}</strong>
        </div>
      </div>
    </Modal>
  )
}
