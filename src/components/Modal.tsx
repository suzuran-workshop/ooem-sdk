import type { ReactNode } from 'react'
import { M3eDialog } from '@m3e/react/dialog'

interface ModalProps {
  open: boolean
  title: string
  children: ReactNode
  actions?: ReactNode
  className?: string
  onClose: () => void
}

export function Modal({ open, title, children, actions, className, onClose }: ModalProps) {
  const handleClosed = () => {
    onClose()
    // 弹窗关闭会把焦点还给触发按钮，顶部栏因此残留焦点圈；这里主动释放焦点。
    requestAnimationFrame(() => {
      const active = document.activeElement
      if (active instanceof HTMLElement && active.closest('.topbar')) active.blur()
    })
  }

  return (
    <M3eDialog
      open={open}
      dismissible
      closeLabel="关闭"
      className={`app-dialog${className ? ` ${className}` : ''}`}
      onClosed={handleClosed}
    >
      <span slot="header">{title}</span>
      <div className="dialog-body">{children}</div>
      {actions ? (
        <div slot="actions" className="dialog-actions">
          {actions}
        </div>
      ) : null}
    </M3eDialog>
  )
}
