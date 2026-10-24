import { expect, test } from '@playwright/test'

async function loadGame(page: import('@playwright/test').Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Sudoku' })).toBeVisible()
  await expect(page.locator('[data-cell-index]')).toHaveCount(81)
}

async function filledCells(page: import('@playwright/test').Page) {
  return page.locator('[data-given="true"]').count()
}

async function openNewGame(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: '新游戏' }).click()
}

test('plays with notes, undo, hint and pause', async ({ page }) => {
  await loadGame(page)

  const givens = await filledCells(page)
  expect(givens).toBeGreaterThanOrEqual(22)
  expect(givens).toBeLessThanOrEqual(42)

  await expect(page.getByRole('button', { name: '新游戏' })).toBeVisible()

  const timer = page.getByTestId('timer')
  await expect(timer).toHaveText('0:00')
  await page.waitForTimeout(1200)
  await expect(timer).toHaveText('0:01')

  const empty = page.locator('[data-given="false"]').first()
  const index = await empty.getAttribute('data-cell-index')
  await empty.click()
  await expect(empty).toHaveClass(/is-selected/)

  await page.getByRole('button', { name: '笔记' }).click()
  await page.locator('.number-key').first().click()
  await expect(empty).toHaveAttribute('data-note-mask', '1')

  const cellHeights = await page
    .locator('.sudoku-cell')
    .evaluateAll((cells) => cells.map((cell) => cell.getBoundingClientRect().height))
  expect(Math.max(...cellHeights) - Math.min(...cellHeights)).toBeLessThan(1)

  await page.getByRole('button', { name: '撤销' }).click()
  await expect(empty).toHaveAttribute('data-note-mask', '0')

  await page.getByRole('button', { name: '笔记' }).click()
  const hint = page.getByRole('button', { name: '提示', exact: true })
  await expect(page.locator('.hint-chip')).toHaveText('3')
  await hint.click()
  await expect(page.locator('.hint-chip')).toHaveText('2')
  await expect(empty).toHaveAttribute('data-value', /[1-9]/)
  await expect(empty).toHaveAttribute('data-hinted', 'true')
  await expect(empty).toHaveClass(/is-hinted/)

  await page.getByRole('button', { name: '暂停游戏' }).click()
  await expect(page.locator('.board-overlay')).toBeVisible()
  await expect(
    page.locator('.board-overlay').getByRole('button', { name: '继续游戏' }),
  ).toBeVisible()
  await expect(page.locator('.board-overlay').getByRole('button', { name: '新游戏' })).toHaveCount(
    0,
  )
  await expect(page.locator('.overlay-card')).toHaveCount(0)
  const pausedAt = await timer.innerText()
  await page.waitForTimeout(1200)
  await expect(timer).toHaveText(pausedAt)
  await page.locator('.board-overlay').getByRole('button', { name: '继续游戏' }).click()
  await expect(page.locator('.board-overlay')).toHaveCount(0)

  await page.reload()
  await expect(page.locator(`[data-cell-index="${index}"]`)).toHaveAttribute('data-value', /[1-9]/)
  await expect(page.locator(`[data-cell-index="${index}"]`)).toHaveAttribute('data-hinted', 'true')
})

test('starts a new easy game and respects settings', async ({ page }) => {
  await loadGame(page)

  await openNewGame(page)
  await expect(page.getByText('选一个难度。')).toBeVisible()
  await page.locator('.difficulty-option').filter({ hasText: '简单' }).click()
  await page.getByRole('button', { name: '开始' }).click()

  await expect(page.getByTestId('difficulty')).toHaveText('简单')
  const givens = await filledCells(page)
  expect(givens).toBeGreaterThanOrEqual(36)
  expect(givens).toBeLessThanOrEqual(42)

  await page.getByRole('button', { name: '打开设置' }).click()
  await expect(page.getByText('自动检查错误')).toBeVisible()
  await page.locator('.setting-row').filter({ hasText: '自动检查错误' }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByText('自动检查错误')).toBeHidden()
  await expect(page.getByTestId('mistakes')).toHaveText('不限')

  await page.getByRole('button', { name: '查看统计' }).click()
  await expect(page.getByText('各难度最佳时间')).toBeVisible()
  await expect(page.locator('.stat-tile').filter({ hasText: '完成局数' })).toBeVisible()
})

test('wins from a near-complete board and records stats', async ({ page }) => {
  const solution = [
    5, 3, 4, 6, 7, 8, 9, 1, 2, 6, 7, 2, 1, 9, 5, 3, 4, 8, 1, 9, 8, 3, 4, 2, 5, 6, 7, 8, 5, 9, 7, 6,
    1, 4, 2, 3, 4, 2, 6, 8, 5, 3, 7, 9, 1, 7, 1, 3, 9, 2, 4, 8, 5, 6, 9, 6, 1, 5, 3, 7, 2, 8, 4, 2,
    8, 7, 4, 1, 9, 6, 3, 5, 3, 4, 5, 2, 8, 6, 1, 7, 9,
  ]
  const empty = 40
  const puzzle = solution.slice()
  puzzle[empty] = 0
  const game = {
    id: 'e2e-near-complete',
    difficulty: 'easy',
    clueCount: 80,
    puzzle,
    solution,
    values: puzzle.slice(),
    notes: Array.from({ length: 81 }, () => 0),
    hinted: Array.from({ length: 81 }, () => false),
    selected: empty,
    notesMode: false,
    mistakes: 0,
    hints: 0,
    elapsed: 0,
    status: 'playing',
    paused: false,
  }

  await page.addInitScript((state) => {
    localStorage.setItem('sudoku.game.v1', JSON.stringify(state))
  }, game)
  await page.goto('/')
  await expect(page.locator('[data-cell-index]')).toHaveCount(81)

  await page.getByRole('button', { name: '提示', exact: true }).click()
  await expect(page.getByText('漂亮，完成！')).toBeVisible()
  await expect(page.locator('.result-metrics')).toContainText('用时')

  await page.getByRole('button', { name: '再来一局' }).click()
  await expect(page.getByText('漂亮，完成！')).toHaveCount(0)
  await page.getByRole('button', { name: '查看统计' }).click()
  await expect(page.getByText('各难度最佳时间')).toBeVisible()
  await expect(
    page.locator('.stat-tile').filter({ hasText: '完成局数' }).locator('strong'),
  ).toHaveText('1')
})

test('limits hints to three per game', async ({ page }) => {
  await loadGame(page)
  const hint = page.getByRole('button', { name: '提示', exact: true })
  const chip = page.locator('.hint-chip')
  await expect(chip).toHaveText('3')
  await hint.click()
  await expect(chip).toHaveText('2')
  await hint.click()
  await expect(chip).toHaveText('1')
  await hint.click()
  await expect(chip).toHaveText('0')
  await expect(hint).toBeDisabled()
  await expect(chip).toHaveAttribute('aria-label', '剩余 0 次提示')
})

test('shows shortcuts on desktop hover without a permanent legend', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop')
  await loadGame(page)
  await expect(page.locator('.keyboard-hint')).toHaveCount(0)
  await expect(page.locator('.number-grid')).toHaveAttribute('title', '数字键 1–9 填数')
  const slot = page.locator('.tool-slot').first()
  expect(await slot.evaluate((element) => getComputedStyle(element, '::after').content)).toBe(
    'none',
  )
  await slot.hover()
  expect(await slot.evaluate((element) => getComputedStyle(element, '::after').content)).toContain(
    '撤销',
  )
})

test('ends the game after three wrong entries', async ({ page }) => {
  await loadGame(page)

  const empty = page.locator('[data-given="false"]').first()
  await empty.click()

  for (let digit = 1; digit <= 6; digit += 1) {
    if (
      await page
        .getByText('三次机会用完了')
        .isVisible()
        .catch(() => false)
    )
      break
    const key = page.locator('.number-key').nth(digit - 1)
    if (await key.isDisabled()) break
    await key.click()
  }

  await expect(page.getByText('三次机会用完了')).toBeVisible()
  await expect(page.getByTestId('mistakes')).toContainText('3 / 3')
})

test('header keeps a single stats entry and no GitHub shortcut', async ({ page }) => {
  await loadGame(page)

  await expect(page.locator('.topbar-actions').getByRole('button', { name: '新游戏' })).toHaveCount(
    1,
  )
  await expect(page.getByRole('button', { name: '查看统计' })).toHaveCount(1)
  await expect(page.getByRole('button', { name: '打开设置' })).toHaveCount(1)
  await expect(page.locator('.topbar-actions m3e-icon-button')).toHaveCount(3)
  await expect(page.locator('[aria-label="打开 GitHub 仓库"]')).toHaveCount(0)
  await expect(page.locator('.board-progress')).toHaveCount(0)
})

test('closing a topbar dialog leaves no focus ring behind', async ({ page }) => {
  await loadGame(page)

  await page.getByRole('button', { name: '打开设置' }).click()
  await expect(page.locator('m3e-dialog[open]')).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(page.locator('m3e-dialog[open]')).toHaveCount(0)

  await expect
    .poll(() => page.evaluate(() => document.activeElement?.tagName ?? null))
    .not.toBe('M3E-ICON-BUTTON')
  await expect(page.locator('.topbar-actions m3e-icon-button:focus')).toHaveCount(0)
})

test('fits common viewports without page scrolling', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop')

  const viewports = [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 375, height: 667 },
    { width: 320, height: 568 },
  ]

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(page.locator('[data-cell-index]')).toHaveCount(81)
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
    }))
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth)
    expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.innerHeight + 1)
  }
})

test('responsive: layout, keyboard and dialog fit', async ({ page }) => {
  await loadGame(page)

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    boardWidth: document.querySelector('.sudoku-board')?.getBoundingClientRect().width ?? 0,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth)
  expect(dimensions.boardWidth).toBeGreaterThan(240)
  expect(dimensions.boardWidth).toBeLessThan(dimensions.innerWidth)

  // 棋盘内容贴着卡片边缘，只隔一层 1px 边框。
  const boardInset = await page.evaluate(() => {
    const card = document.querySelector('.board-card')?.getBoundingClientRect()
    const board = document.querySelector('.sudoku-board')?.getBoundingClientRect()
    if (!card || !board) return Number.POSITIVE_INFINITY
    return Math.max(board.x - card.x, card.x + card.width - (board.x + board.width))
  })
  expect(boardInset).toBeLessThanOrEqual(1.5)
  if (dimensions.innerWidth > 1080) {
    await expect(page.locator('.tip-card')).toHaveCount(0)
    const boardBox = await page.locator('.board-card').boundingBox()
    const statusBox = await page.locator('.status-bar').boundingBox()
    expect(boardBox).not.toBeNull()
    expect(statusBox).not.toBeNull()
    expect(statusBox!.x).toBeGreaterThan(boardBox!.x + boardBox!.width)
  }

  await expect(page.locator('.number-key')).toHaveCount(9)

  const empty = page.locator('[data-given="false"]').first()
  await empty.click()
  await page.keyboard.press('5')
  await expect(empty).toHaveAttribute('data-value', '5')
  await page.keyboard.press('Backspace')
  await expect(empty).toHaveAttribute('data-value', '')
  await page.keyboard.press('n')
  await page.keyboard.press('3')
  await expect(empty).toHaveAttribute('data-note-mask', '4')
  await page.keyboard.press('u')
  await expect(empty).toHaveAttribute('data-note-mask', '0')

  await openNewGame(page)
  await expect(page.getByText('选一个难度。')).toBeVisible()
  const dialogBox = await page.locator('.difficulty-grid').boundingBox()
  expect(dialogBox).not.toBeNull()
  expect(dialogBox!.x).toBeGreaterThan(0)
  expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(dimensions.innerWidth)
})

test('title opens an about dialog with commit, repository and update action', async ({ page }) => {
  await loadGame(page)

  await page.getByRole('heading', { name: 'Sudoku' }).click()
  const dialog = page.locator('.about-dialog')
  await expect(dialog).toHaveAttribute('open', '')

  await expect(dialog.locator('.about-meta code')).toHaveText(/^(?:[0-9a-f]{7}|dev)$/)
  await expect(dialog.locator('.about-meta a')).toHaveAttribute(
    'href',
    'https://github.com/wpy030414/sudoku',
  )
  await expect(dialog.getByRole('button', { name: '检查更新' })).toBeVisible()
})

test('checking for updates drops the offline cache and reloads the app', async ({ page }) => {
  await loadGame(page)
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })

  await page.getByRole('heading', { name: 'Sudoku' }).click()
  const dialog = page.locator('.about-dialog')
  await expect(dialog).toHaveAttribute('open', '')

  const navigated = page.waitForEvent('framenavigated')
  await dialog.getByRole('button', { name: '检查更新' }).click()
  await navigated

  await expect(page.locator('[data-cell-index]')).toHaveCount(81)
  await expect(page.locator('m3e-dialog[open]')).toHaveCount(0)
})
