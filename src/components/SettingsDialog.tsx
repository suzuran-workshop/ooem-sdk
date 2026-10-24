import { M3eButton } from '@m3e/react/button'
import { M3eSwitch } from '@m3e/react/switch'
import { Moon, Monitor, Sun } from 'lucide-react'
import type { Appearance, Settings } from '@/lib/game'
import { Modal } from './Modal'

interface SettingsDialogProps {
  open: boolean
  settings: Settings
  onClose: () => void
  onChange: (settings: Settings) => void
}

const APPEARANCES: Array<{ id: Appearance; label: string; icon: typeof Sun }> = [
  { id: 'auto', label: '跟随系统', icon: Monitor },
  { id: 'light', label: '浅色', icon: Sun },
  { id: 'dark', label: '深色', icon: Moon },
]

const TOGGLES: Array<{
  key: keyof Pick<
    Settings,
    'autoCheck' | 'highlightDuplicates' | 'highlightSameNumbers' | 'autoRemoveNotes' | 'showTimer'
  >
  title: string
  caption: string
}> = [
  {
    key: 'autoCheck',
    title: '自动检查错误',
    caption: '填错时立刻标红；累计 3 次错误本局结束。',
  },
  {
    key: 'highlightDuplicates',
    title: '高亮重复数字',
    caption: '同一行、列或宫里的重复数字会得到提示。',
  },
  {
    key: 'highlightSameNumbers',
    title: '高亮相同数字',
    caption: '选中一个数字时，棋盘上相同的数字一起亮起。',
  },
  {
    key: 'autoRemoveNotes',
    title: '自动清理笔记',
    caption: '填入数字后，自动擦掉同行、列、宫中的相应笔记。',
  },
  {
    key: 'showTimer',
    title: '显示计时器',
    caption: '计时不会影响游戏，只是留个记录。',
  },
]

export function SettingsDialog({ open, settings, onClose, onChange }: SettingsDialogProps) {
  const toggle = (key: (typeof TOGGLES)[number]['key']) => (event: Event) => {
    const target = event.target as HTMLElement & { checked?: boolean }
    const checked = typeof target.checked === 'boolean' ? target.checked : !settings[key]
    onChange({ ...settings, [key]: checked })
  }

  return (
    <Modal open={open} title="设置" onClose={onClose} className="settings-dialog">
      <section className="dialog-section" aria-labelledby="appearance-heading">
        <h3 id="appearance-heading" className="section-label">
          外观
        </h3>
        <div className="appearance-grid" role="radiogroup" aria-label="外观">
          {APPEARANCES.map(({ id, label, icon: Icon }) => (
            <M3eButton
              key={id}
              role="radio"
              aria-checked={settings.appearance === id}
              variant={settings.appearance === id ? 'tonal' : 'outlined'}
              className="appearance-option"
              onClick={() => onChange({ ...settings, appearance: id })}
            >
              <Icon slot="icon" size={18} />
              {label}
            </M3eButton>
          ))}
        </div>
      </section>

      <section className="dialog-section" aria-labelledby="play-heading">
        <h3 id="play-heading" className="section-label">
          玩法
        </h3>
        <div className="setting-list">
          {TOGGLES.map(({ key, title, caption }) => (
            <label key={key} className="setting-row">
              <span className="setting-copy">
                <span className="setting-title">{title}</span>
                <span className="setting-caption">{caption}</span>
              </span>
              <M3eSwitch checked={settings[key]} onChange={toggle(key)} />
            </label>
          ))}
        </div>
      </section>
    </Modal>
  )
}
