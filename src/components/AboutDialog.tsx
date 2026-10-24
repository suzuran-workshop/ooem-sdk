import { useEffect, useState } from 'react'
import { M3eButton } from '@m3e/react/button'
import { RefreshCw } from 'lucide-react'
import { COMMIT_HASH, GITHUB_URL } from '@/lib/project'
import { clearOfflineCache } from '@/lib/updates'
import { Modal } from './Modal'

interface AboutDialogProps {
  open: boolean
  onClose: () => void
}

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  const [updating, setUpdating] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setUpdating(false)
    setStatus(null)
  }, [open])

  const checkForUpdates = async () => {
    if (updating) return
    setUpdating(true)
    setStatus('正在清除离线缓存…')
    try {
      await clearOfflineCache()
      setStatus('已清除缓存，正在载入最新版本…')
      window.setTimeout(() => window.location.reload(), 600)
    } catch {
      setUpdating(false)
      setStatus('清除缓存失败，请手动刷新页面重试。')
    }
  }

  return (
    <Modal
      open={open}
      title="关于"
      onClose={onClose}
      className="about-dialog"
      actions={
        <M3eButton variant="filled" disabled={updating} onClick={checkForUpdates}>
          <RefreshCw slot="icon" size={18} />
          {updating ? '正在更新' : '检查更新'}
        </M3eButton>
      }
    >
      <p className="about-name">Sudoku · 数独</p>

      <dl className="about-meta">
        <div>
          <dt>提交</dt>
          <dd className="selectable">
            <code>{COMMIT_HASH}</code>
          </dd>
        </div>
        <div>
          <dt>仓库</dt>
          <dd>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer">
              {GITHUB_URL}
            </a>
          </dd>
        </div>
      </dl>

      {status ? (
        <p className="dialog-footnote" role="status">
          {status}
        </p>
      ) : null}
    </Modal>
  )
}
