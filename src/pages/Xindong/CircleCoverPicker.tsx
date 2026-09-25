import { useEffect, useRef, useState } from 'react'
import { Button, Space, Typography } from 'antd'
import { PictureOutlined } from '@ant-design/icons'

const { Text } = Typography

interface Props {
  /** Already-uploaded cover (edit mode) — shown until a new file is picked. */
  currentUrl?: string | null
  file: File | null
  onChange: (file: File | null) => void
}

/** 圈子封面 picker — the client renders it as a ~16:10 card image. */
export function CircleCoverPicker({ currentUrl, file, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const shown = preview || currentUrl || null

  return (
    <Space direction="vertical" size={6}>
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          width: 240, height: 150, borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
          background: '#F3DEDA', display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px dashed #d9a3b0',
        }}
      >
        {shown
          ? <img src={shown} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <PictureOutlined style={{ fontSize: 32, color: '#B84C6B' }} />}
      </div>
      <Space>
        <Button size="small" onClick={() => inputRef.current?.click()}>{shown ? '更换封面' : '上传封面'}</Button>
        <Text type="secondary" style={{ fontSize: 12 }}>建议横图 16:10，JPG / PNG / WebP</Text>
      </Space>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) onChange(f)
          e.target.value = ''
        }}
      />
    </Space>
  )
}
