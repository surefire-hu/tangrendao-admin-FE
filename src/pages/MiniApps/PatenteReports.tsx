// 意驾通 · 题目反馈: statements users flagged as badly translated/explained
// (most reported first). Fix the Chinese by hand, or send it back to the AI.
import { useEffect, useState } from 'react'
import { Table, Button, Space, Typography, message, Tag, Modal, Form, Input, Tooltip } from 'antd'
import { EditOutlined, ReloadOutlined, CheckOutlined } from '@ant-design/icons'
import { adminApi } from '../../api/admin'
import type { PatenteReportedQuestion } from '../../types'

const { Title, Paragraph, Text } = Typography

export function PatenteReportsPage() {
  const [items, setItems] = useState<PatenteReportedQuestion[]>([])
  const [pendingAi, setPendingAi] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<PatenteReportedQuestion | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  async function load(q = search) {
    setLoading(true)
    try {
      const res = await adminApi.getPatenteReports(q.trim() || undefined)
      setItems(res.data.results)
      setPendingAi(res.data.pending_ai)
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load('') }, [])

  function openEdit(q: PatenteReportedQuestion) {
    form.setFieldsValue({ text_zh: q.text_zh, explanation_zh: q.explanation_zh })
    setEditing(q)
  }

  async function update(id: string, data: Parameters<typeof adminApi.updatePatenteQuestion>[1], ok: string) {
    setSaving(true)
    try {
      const res = await adminApi.updatePatenteQuestion(id, data)
      setItems(prev => prev.map(x => (x.id === id ? res.data : x)).filter(x => search.trim() || x.reports > 0))
      message.success(ok)
      return true
    } catch {
      message.error('保存失败')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function saveEdit() {
    if (!editing) return
    const values = await form.validateFields()
    if (await update(editing.id, { ...values, reset_reports: true }, '已保存，App 里立即生效')) setEditing(null)
  }

  const columns = [
    { title: '反馈', dataIndex: 'reports', width: 64, render: (n: number) => (n ? <Tag color="red">{n}</Tag> : '—') },
    {
      title: '题目',
      render: (_: unknown, q: PatenteReportedQuestion) => (
        <Space direction="vertical" size={4}>
          <Text>{q.text_it}</Text>
          <Text type={q.text_zh ? undefined : 'secondary'}>{q.text_zh || '（中文还没生成）'}</Text>
          <Space size={6} wrap>
            <Tag color={q.answer ? 'green' : 'volcano'}>{q.answer ? 'VERO 正确' : 'FALSO 错误'}</Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>#{q.id} · {q.chapter_title}</Text>
            {!q.is_active && <Tag>已从官方题库移除</Tag>}
          </Space>
        </Space>
      ),
    },
    {
      title: 'AI 解析',
      width: 320,
      render: (_: unknown, q: PatenteReportedQuestion) => (
        <Text style={{ fontSize: 13 }} type={q.explanation_zh ? undefined : 'secondary'}>{q.explanation_zh || '—'}</Text>
      ),
    },
    {
      title: '操作',
      width: 120,
      render: (_: unknown, q: PatenteReportedQuestion) => (
        <Space>
          <Tooltip title="手动修改"><Button size="small" icon={<EditOutlined />} onClick={() => openEdit(q)} /></Tooltip>
          <Tooltip title="让 AI 重新翻译和解析">
            <Button size="small" icon={<ReloadOutlined />} onClick={() => update(q.id, { regenerate: true, reset_reports: true }, '已安排 AI 重新生成，几分钟内完成')} />
          </Tooltip>
          {q.reports > 0 && (
            <Tooltip title="没问题，清除反馈">
              <Button size="small" icon={<CheckOutlined />} onClick={() => update(q.id, { reset_reports: true }, '已清除反馈')} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>意驾通 · 题目反馈</Title>
      <Paragraph type="secondary">
        用户在题目解析里点「翻译或解析有误」会出现在这里，反馈多的排在前面。也可以按题号或文字搜索任意题目。
        {pendingAi > 0 && <> 还有 <b>{pendingAi}</b> 道题的中文正在由 AI 生成。</>}
      </Paragraph>
      <Input.Search
        placeholder="题号、意大利语或中文" allowClear style={{ maxWidth: 360, marginBottom: 16 }}
        value={search} onChange={e => setSearch(e.target.value)} onSearch={v => load(v)}
      />
      <Table rowKey="id" loading={loading} dataSource={items} columns={columns} pagination={{ pageSize: 20 }} />

      <Modal open={!!editing} title={`修改 #${editing?.id}`} onCancel={() => setEditing(null)} onOk={saveEdit} confirmLoading={saving} okText="保存" width={640}>
        {editing && <Paragraph><Text strong>{editing.text_it}</Text> <Tag color={editing.answer ? 'green' : 'volcano'}>{editing.answer ? 'VERO' : 'FALSO'}</Tag></Paragraph>}
        <Form form={form} layout="vertical">
          <Form.Item name="text_zh" label="中文翻译" rules={[{ required: true, message: '请填写翻译' }]}>
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} />
          </Form.Item>
          <Form.Item name="explanation_zh" label="AI 解析（可修改）">
            <Input.TextArea autoSize={{ minRows: 4, maxRows: 10 }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
