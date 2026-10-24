import type { Stats } from '@/lib/game'
import { DIFFICULTIES, formatTime } from '@/lib/sudoku'
import { Modal } from './Modal'

interface StatsDialogProps {
  open: boolean
  stats: Stats
  onClose: () => void
}

export function StatsDialog({ open, stats, onClose }: StatsDialogProps) {
  return (
    <Modal open={open} title="统计" onClose={onClose} className="stats-dialog">
      <div className="stats-overview">
        <div className="stat-tile is-accent">
          <strong>{stats.won}</strong>
          <span>完成局数</span>
        </div>
        <div className="stat-tile">
          <strong>{stats.streak}</strong>
          <span>当前连胜</span>
        </div>
        <div className="stat-tile">
          <strong>{stats.bestStreak}</strong>
          <span>最佳连胜</span>
        </div>
        <div className="stat-tile">
          <strong>{stats.totalHints}</strong>
          <span>提示使用</span>
        </div>
      </div>

      <section className="dialog-section" aria-labelledby="best-time-heading">
        <h3 id="best-time-heading" className="section-label">
          各难度最佳时间
        </h3>
        <div className="best-time-list">
          {DIFFICULTIES.map((difficulty) => {
            const time = stats.bestTimes[difficulty.id]
            return (
              <div key={difficulty.id} className="best-time-row">
                <span>
                  <span className="best-time-label">{difficulty.label}</span>
                  <span className="best-time-caption">{difficulty.caption}</span>
                </span>
                <strong>{time === null ? '—' : formatTime(time)}</strong>
              </div>
            )
          })}
        </div>
      </section>
      <p className="dialog-footnote">统计只保存在这台设备的浏览器里。</p>
    </Modal>
  )
}
