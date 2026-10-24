import { useEffect, useReducer } from 'react'
import { createNewGame, gameReducer, type GameState } from '@/lib/game'
import { loadGame, saveGame } from '@/lib/storage'

function initialize(): GameState {
  return loadGame() ?? createNewGame('medium')
}

export function useSudokuGame() {
  const [game, dispatch] = useReducer(gameReducer, null, initialize)

  useEffect(() => {
    saveGame(game)
  }, [game])

  useEffect(() => {
    if (game.status !== 'playing' || game.paused) return
    const timer = window.setInterval(() => dispatch({ type: 'tick' }), 1000)
    return () => window.clearInterval(timer)
  }, [game.status, game.paused])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') dispatch({ type: 'pause' })
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  return { game, dispatch }
}
