import { useEffect, useState } from 'react'
import { Modal, Input, Space, Button } from 'antd'

// Mirrors the client-fe moderator reject reasons (ModeratorFab REJECTION_REASONS).
const PRESET_REASONS = ['图片不清晰', '内容不完整', '信息虚假', '重复发布', '违规内容', '其他']

interface Props {
  open: boolean
  title?: string
  loading?: boolean
  onCancel: () => void
  onSubmit: (reason: string) => void
}

/** Reject (不通过) modal: pick a preset reason or write a custom one. */
export function RejectReasonModal({ open, title = '不通过', loading, onCancel, onSubmit }: Props) {
  const [selected, setSelected] = useState<string>('')
  const [custom, setCustom] = useState<string>('')

  useEffect(() => {
    if (open) { setSelected(''); setCustom('') }
  }, [open])

  const reason = selected === '其他' ? custom.trim() : selected
  const canSubmit = reason.length > 0

  return (
    <Modal
      open={open}
      title={title}
      onCancel={onCancel}
      okText="确定不通过"
      cancelText="取消"
      okButtonProps={{ danger: true, disabled: !canSubmit, loading }}
      onOk={() => canSubmit && onSubmit(reason)}
    >
      <p style={{ color: '#888', marginTop: 0 }}>选择或填写不通过的原因（会通知发布者）：</p>
      <Space wrap>
        {PRESET_REASONS.map((r) => (
          <Button
            key={r}
            type={selected === r ? 'primary' : 'default'}
            danger={selected === r}
            onClick={() => setSelected(r)}
          >
            {r}
          </Button>
        ))}
      </Space>
      {selected === '其他' && (
        <Input.TextArea
          style={{ marginTop: 12 }}
          rows={3}
          maxLength={200}
          showCount
          placeholder="请填写具体原因…"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
        />
      )}
    </Modal>
  )
}
