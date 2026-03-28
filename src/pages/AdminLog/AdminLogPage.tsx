import { useEffect, useState } from 'react'
import {
  Table, Tag, Button, DatePicker, Select, Space, Typography, Card, Row, Col, Tooltip,
} from 'antd'
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { adminApi } from '../../api/admin'
import type { AdminActivityLog, AdminActionType } from '../../types'

const { Title } = Typography
const { RangePicker } = DatePicker

const ACTION_LABELS: Record<AdminActionType, string> = {
  approve:      '审核通过',
  reject:       '审核拒绝',
  ban_user:     '封禁用户',
  unban_user:   '解封用户',
  role_change:  '修改角色',
  broadcast:    '广播通知',
  staff_change: '修改员工权限',
}

const ACTION_COLORS: Record<AdminActionType, string> = {
  approve:      'green',
  reject:       'red',
  ban_user:     'volcano',
  unban_user:   'blue',
  role_change:  'purple',
  broadcast:    'cyan',
  staff_change: 'orange',
}

export function AdminLogPage() {
  const [logs, setLogs] = useState<AdminActivityLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [action, setAction] = useState<string>()
  const [dateRange, setDateRange] = useState<[string, string] | null>(null)

  const fetchLogs = async (p = page) => {
    setLoading(true)
    try {
      const res = await adminApi.getActivityLog({
        page: p,
        page_size: 50,
        action,
        date_from: dateRange?.[0],
        date_to: dateRange?.[1],
      })
      setLogs(res.data.results)
      setTotal(res.data.count)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLogs(1); setPage(1) }, [action, dateRange])
  useEffect(() => { fetchLogs(page) }, [page])

  const handleExport = () => {
    const token = JSON.parse(localStorage.getItem('auth_tokens') || '{}')?.access
    const url = adminApi.getActivityLogExportUrl({
      action,
      date_from: dateRange?.[0],
      date_to: dateRange?.[1],
    })
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = 'admin_activity_log.csv'
        a.click()
        URL.revokeObjectURL(a.href)
      })
  }

  const columns: ColumnsType<AdminActivityLog> = [
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 170,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '管理员',
      dataIndex: 'admin_email',
      render: (_: string, row) =>
        row.admin_username
          ? <Tooltip title={row.admin_email}>{row.admin_username}</Tooltip>
          : row.admin_email ?? '—',
    },
    {
      title: '操作',
      dataIndex: 'action',
      width: 150,
      render: (v: AdminActionType) => (
        <Tag color={ACTION_COLORS[v]}>{ACTION_LABELS[v] ?? v}</Tag>
      ),
    },
    {
      title: '目标',
      render: (_: unknown, row) =>
        row.target_type
          ? `${row.target_type}${row.target_id ? ` #${row.target_id.slice(0, 8)}…` : ''}`
          : '—',
    },
    {
      title: '详情',
      dataIndex: 'details',
      render: (v: Record<string, unknown>) =>
        Object.keys(v).length
          ? <Tooltip title={JSON.stringify(v, null, 2)}>
              <span style={{ cursor: 'help', color: '#1890ff' }}>
                {Object.entries(v).slice(0, 2).map(([k, val]) => `${k}: ${val}`).join(', ')}
              </span>
            </Tooltip>
          : '—',
    },
  ]

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>管理员操作日志</Title>
        </Col>
        <Col>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            导出 CSV
          </Button>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            allowClear
            placeholder="筛选操作类型"
            style={{ width: 180 }}
            onChange={v => setAction(v)}
            options={Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <RangePicker
            format="YYYY-MM-DD"
            onChange={dates => {
              if (dates && dates[0] && dates[1]) {
                setDateRange([dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')])
              } else {
                setDateRange(null)
              }
            }}
          />
          <Button icon={<ReloadOutlined />} onClick={() => fetchLogs(page)}>
            刷新
          </Button>
        </Space>
      </Card>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={logs}
        loading={loading}
        pagination={{
          current: page,
          pageSize: 50,
          total,
          onChange: p => setPage(p),
          showTotal: t => `共 ${t} 条记录`,
        }}
      />
    </div>
  )
}
