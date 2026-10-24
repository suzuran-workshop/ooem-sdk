import { useCallback, useEffect, useRef, useState } from 'react'
import { M3eTheme } from '@m3e/react/theme'
import { M3eButton } from '@m3e/react/button'
import { M3eIconButton } from '@m3e/react/icon-button'
import { M3eSnackbar } from '@m3e/react/snackbar'
import {
  AlertTriangle,
  BarChart3,
  Eraser,
  Lightbulb,
  Pause,
  Pencil,
  Play,
  Plus,
  Settings as SettingsIcon,
  Timer,
  Undo2,
} from 'lucide-react'
import { SudokuBoard } from '@/components/SudokuBoard'
import { NumberPad } from '@/components/NumberPad'
import { NewGameDialog } from '@/components/NewGameDialog'
import { SettingsDialog } from '@/components/SettingsDialog'
import { StatsDialog } from '@/components/StatsDialog'
import { AboutDialog } from '@/components/AboutDialog'
import { ResultDialog } from '@/components/ResultDialog'
import { useSudokuGame } from '@/hooks/useSudokuGame'
import { MAX_HINTS, MAX_MISTAKES, type Settings, type Stats } from '@/lib/game'
import { loadSettings, loadStats, saveSettings, saveStats } from '@/lib/storage'
import {
  countFilled,
  formatTime,
  generatePuzzle,
  getDifficulty,
  rowOf,
  colOf,
  type Difficulty,
} from '@/lib/sudoku'

type DialogKind = 'new' | 'settings' | 'stats' | 'about' | null

function notify(message: string) {
  M3eSnackbar.open(message, { duration: 2200 })
}

function focusCell(index: number) {
  requestAnimationFrame(() => {
    const cell = document.querySelector<HTMLElement>(`[data-cell-index="${index}"]`)
    cell?.focus({ preventScroll: true })
  })
}

export function App() {
  const { game, dispatch } = useSudokuGame()
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [stats, setStats] = useState<Stats>(loadStats)
  const [dialog, setDialog] = useState<DialogKind>(null)
  const [resultOpen, setResultOpen] = useState(false)
  const [newRecord, setNewRecord] = useState(false)
  const previousStatus = useRef(game.status)

  const difficulty = getDifficulty(game.difficulty)
  const selectedValue = game.selected === null ? 0 : game.values[game.selected]
  const filled = countFilled(game.values)
  const anyDialogOpen = dialog !== null || resultOpen

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark =
        settings.appearance === 'dark' || (settings.appearance === 'auto' && media.matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
      document.documentElement.style.colorScheme =
        settings.appearance === 'auto' ? 'light dark' : settings.appearance
    }
    apply()
    if (settings.appearance === 'auto') {
      media.addEventListener('change', apply)
      return () => media.removeEventListener('change', apply)
    }
    return undefined
  }, [settings.appearance])

  useEffect(() => {
    saveStats(stats)
  }, [stats])

  // Record a result exactly once when the board transitions out of play.
  useEffect(() => {
    const previous = previousStatus.current
    previousStatus.current = game.status
    if (previous !== 'playing' || game.status === 'playing') return

    const isWin = game.status === 'won'
    const previousBest = stats.bestTimes[game.difficulty]
    const isRecord = isWin && (previousBest === null || game.elapsed < previousBest)
    setNewRecord(isRecord)
    setStats((current) => ({
      won: current.won + (isWin ? 1 : 0),
      streak: isWin ? current.streak + 1 : 0,
      bestStreak: isWin ? Math.max(current.bestStreak, current.streak + 1) : current.bestStreak,
      totalHints: current.totalHints + game.hints,
      bestTimes: isWin
        ? {
            ...current.bestTimes,
            [game.difficulty]: isRecord ? game.elapsed : current.bestTimes[game.difficulty],
          }
        : current.bestTimes,
    }))
    setResultOpen(true)
  }, [game.status, game.difficulty, game.elapsed, game.hints, stats.bestTimes])

  const startGame = useCallback(
    (nextDifficulty: Difficulty) => {
      dispatch({ type: 'new', puzzle: generatePuzzle(nextDifficulty) })
      setDialog(null)
      setResultOpen(false)
      setNewRecord(false)
    },
    [dispatch],
  )

  const handleDigit = useCallback(
    (digit: number) => {
      if (game.status !== 'playing' || game.paused) return
      if (game.selected === null) {
        notify('先点选一个格子')
        return
      }
      if (game.puzzle[game.selected] !== 0) {
        notify('题目数字不能修改')
        return
      }
      if (game.notesMode && game.values[game.selected] !== 0) {
        notify('笔记只能写在空格里')
        return
      }
      dispatch({ type: 'input', digit, settings })
    },
    [dispatch, game, settings],
  )

  const handleErase = useCallback(() => {
    if (game.status !== 'playing' || game.paused) return
    if (game.selected !== null && game.puzzle[game.selected] !== 0) {
      notify('题目数字不能修改')
      return
    }
    dispatch({ type: 'erase' })
  }, [dispatch, game])

  const togglePause = useCallback(() => {
    if (game.status !== 'playing') return
    dispatch(game.paused ? { type: 'resume' } : { type: 'pause' })
  }, [dispatch, game.paused, game.status])

  const handleHint = useCallback(() => {
    if (game.status !== 'playing' || game.paused) return
    if (game.hints >= MAX_HINTS) {
      notify('本局提示已用完')
      return
    }
    dispatch({ type: 'hint', settings })
  }, [dispatch, game.hints, game.paused, game.status, settings])

  const moveSelection = useCallback(
    (rowDelta: number, colDelta: number) => {
      const current = game.selected ?? 40
      const row = Math.min(8, Math.max(0, rowOf(current) + rowDelta))
      const col = Math.min(8, Math.max(0, colOf(current) + colDelta))
      const next = row * 9 + col
      dispatch({ type: 'select', index: next })
      focusCell(next)
    },
    [dispatch, game.selected],
  )

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (anyDialogOpen) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return

      if (event.metaKey || event.ctrlKey) {
        if (event.key.toLowerCase() === 'z' && !event.shiftKey) {
          event.preventDefault()
          dispatch({ type: 'undo' })
        }
        return
      }
      if (event.altKey) return

      const key = event.key
      if (key >= '1' && key <= '9') {
        event.preventDefault()
        handleDigit(Number(key))
        return
      }
      if (key === 'Backspace' || key === 'Delete' || key === '0') {
        event.preventDefault()
        handleErase()
        return
      }
      if (key === 'ArrowUp') {
        event.preventDefault()
        moveSelection(-1, 0)
        return
      }
      if (key === 'ArrowDown') {
        event.preventDefault()
        moveSelection(1, 0)
        return
      }
      if (key === 'ArrowLeft') {
        event.preventDefault()
        moveSelection(0, -1)
        return
      }
      if (key === 'ArrowRight') {
        event.preventDefault()
        moveSelection(0, 1)
        return
      }

      const interactive = target?.closest('button, m3e-button, m3e-icon-button, [role="button"]')
      if (key === ' ' && interactive) return

      switch (key.toLowerCase()) {
        case 'n':
          event.preventDefault()
          dispatch({ type: 'toggle-notes-mode' })
          break
        case 'u':
          event.preventDefault()
          dispatch({ type: 'undo' })
          break
        case 'h':
          event.preventDefault()
          handleHint()
          break
        case 'p':
        case ' ':
          event.preventDefault()
          togglePause()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [anyDialogOpen, dispatch, handleDigit, handleErase, handleHint, moveSelection, togglePause])

  const mistakesDanger = settings.autoCheck && game.mistakes >= MAX_MISTAKES - 1
  const paused = game.paused && game.status === 'playing'
  const gameDisabled = game.status !== 'playing' || game.paused
  const remainingHints = Math.max(0, MAX_HINTS - game.hints)

  return (
    <M3eTheme
      color="#3157d5"
      variant="tonal-spot"
      scheme={settings.appearance}
      motion="expressive"
      strongFocus
    >
      <div className="app-shell">
        <header className="topbar">
          <h1 className="brand-title">
            <button
              type="button"
              className="brand-button"
              aria-haspopup="dialog"
              onClick={() => setDialog('about')}
            >
              Sudoku
            </button>
          </h1>
          <div className="topbar-actions">
            <M3eIconButton aria-label="新游戏" title="新游戏" onClick={() => setDialog('new')}>
              <Plus size={20} />
            </M3eIconButton>
            <span className="topbar-divider" aria-hidden="true" />
            <M3eIconButton aria-label="查看统计" onClick={() => setDialog('stats')}>
              <BarChart3 size={21} />
            </M3eIconButton>
            <M3eIconButton aria-label="打开设置" onClick={() => setDialog('settings')}>
              <SettingsIcon size={21} />
            </M3eIconButton>
          </div>
        </header>

        <main className="game-layout">
          <section className="board-column" aria-label="棋局">
            <div className="board-card">
              <div className="board-stage">
                <SudokuBoard
                  puzzle={game.puzzle}
                  solution={game.solution}
                  values={game.values}
                  notes={game.notes}
                  hinted={game.hinted}
                  selected={game.selected}
                  status={game.status}
                  paused={paused}
                  autoCheck={settings.autoCheck}
                  highlightDuplicates={settings.highlightDuplicates}
                  highlightSameNumbers={settings.highlightSameNumbers}
                  onSelect={(index) => dispatch({ type: 'select', index })}
                />
                {paused ? (
                  <div className="board-overlay">
                    <M3eIconButton
                      aria-label="继续游戏"
                      title="继续游戏"
                      className="pause-resume-button"
                      size="extra-large"
                      variant="filled"
                      onClick={togglePause}
                    >
                      <Play size={34} />
                    </M3eIconButton>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <div className="side-rail">
            <div className="status-bar">
              <div className="status-left">
                <span className="difficulty-pill" data-testid="difficulty">
                  {difficulty.label}
                </span>
                <span className="status-soft">{filled} / 81</span>
              </div>
              <div className="status-right">
                <span
                  className={`metric${mistakesDanger ? ' is-danger' : ''}`}
                  data-testid="mistakes"
                  title={settings.autoCheck ? '本局最多允许 3 次错误' : '自动检查已关闭'}
                >
                  <AlertTriangle size={17} />
                  {settings.autoCheck ? `${game.mistakes} / ${MAX_MISTAKES}` : '不限'}
                </span>
                {settings.showTimer ? (
                  <span className="metric" data-testid="timer" title="本局用时">
                    <Timer size={17} />
                    {formatTime(game.elapsed)}
                  </span>
                ) : null}
                <span
                  className="shortcut-wrap"
                  data-shortcut={game.paused ? '继续 · 空格' : '暂停 · 空格'}
                  data-placement="bottom"
                >
                  <M3eIconButton
                    aria-label={game.paused ? '继续游戏' : '暂停游戏'}
                    disabled={game.status !== 'playing'}
                    onClick={togglePause}
                  >
                    {game.paused ? <Play size={20} /> : <Pause size={20} />}
                  </M3eIconButton>
                </span>
              </div>
            </div>

            <aside className="control-column" aria-label="操作区">
              <section className="panel numbers-panel" aria-label="数字键盘">
                <NumberPad
                  values={game.values}
                  selectedValue={selectedValue}
                  disabled={gameDisabled}
                  onDigit={handleDigit}
                />
              </section>

              <section className="panel tools-panel">
                <div className="tools-grid">
                  <div className="tool-slot" data-shortcut="撤销 · U">
                    <M3eButton
                      variant="text"
                      className="tool-button"
                      disabled={gameDisabled || game.history.length === 0}
                      onClick={() => dispatch({ type: 'undo' })}
                    >
                      <Undo2 slot="icon" size={18} />
                      撤销
                    </M3eButton>
                  </div>
                  <div className="tool-slot" data-shortcut="擦除 · Backspace">
                    <M3eButton
                      variant="text"
                      className="tool-button"
                      disabled={gameDisabled}
                      onClick={handleErase}
                    >
                      <Eraser slot="icon" size={18} />
                      擦除
                    </M3eButton>
                  </div>
                  <div className="tool-slot" data-shortcut="笔记 · N">
                    <M3eButton
                      variant={game.notesMode ? 'tonal' : 'text'}
                      className={`tool-button${game.notesMode ? ' is-active' : ''}`}
                      disabled={gameDisabled}
                      aria-pressed={game.notesMode}
                      onClick={() => dispatch({ type: 'toggle-notes-mode' })}
                    >
                      <Pencil slot="icon" size={18} />
                      笔记
                    </M3eButton>
                  </div>
                  <div className="tool-slot" data-shortcut="提示 · H">
                    <M3eButton
                      variant="text"
                      className="tool-button"
                      disabled={gameDisabled || remainingHints === 0}
                      onClick={handleHint}
                    >
                      <Lightbulb slot="icon" size={18} />
                      提示
                    </M3eButton>
                    <span
                      className={`hint-chip${remainingHints === 0 ? ' is-empty' : ''}`}
                      role="status"
                      aria-label={`剩余 ${remainingHints} 次提示`}
                    >
                      {remainingHints}
                    </span>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </main>
      </div>

      <NewGameDialog
        open={dialog === 'new'}
        currentDifficulty={game.difficulty}
        onClose={() => setDialog(null)}
        onStart={startGame}
        onRestart={() => {
          dispatch({ type: 'restart' })
          setDialog(null)
          setResultOpen(false)
        }}
      />
      <SettingsDialog
        open={dialog === 'settings'}
        settings={settings}
        onClose={() => setDialog(null)}
        onChange={setSettings}
      />
      <StatsDialog open={dialog === 'stats'} stats={stats} onClose={() => setDialog(null)} />
      <AboutDialog open={dialog === 'about'} onClose={() => setDialog(null)} />
      <ResultDialog
        open={resultOpen}
        game={game}
        newRecord={newRecord}
        onClose={() => setResultOpen(false)}
        onPlayAgain={() => startGame(game.difficulty)}
        onChooseDifficulty={() => {
          setResultOpen(false)
          setDialog('new')
        }}
      />
    </M3eTheme>
  )
}
