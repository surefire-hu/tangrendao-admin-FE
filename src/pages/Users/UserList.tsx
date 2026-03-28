import { useEffect, useState, useCallback } from 'react'
import {
  Table, Input, Select, Tag, Avatar, Space, Typography,
  Button, Tooltip, Card, Row, Col, Statistic, theme,
} from 'antd'
import {
  UserOutlined, SearchOutlined, EyeOutlined,
  CheckCircleOutlined, StopOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import { adminApi } from '../../api/admin'
import type { AdminUser } from '../../types'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const { Text } = Typography

const roleColors: Record<string, string> = {
  admin: 'red',
  moderator: 'orange',
  merchant: 'blue',
  user: 'default',
}

const roleLabels: Record<string, string> = {
  admin: '管理员',
  moderator: '版主',
  merchant: '商家',
  user: '普通用户',
}

export function UserListPage() {
  const navigate = useNavigate()
  const { token } = theme.useToken()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.getUsers({
        page,
        page_size: PAGE_SIZE,
        search: search || undefined,
        role: role || undefined,
        ordering: '-created_at',
      })
      setUsers(res.data.results)
      setTotal(res.data.count)
    } catch {
      // handled by global interceptor
    } finally {
      setLoading(false)
    }
  }, [page, search, role])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const roleStats = users.reduce(
    (acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc },
    {} as Record<string, number>,
  )

  const columns: ColumnsType<AdminUser> = [
    {
      title: '用户',
      key: 'user',
      render: (_, u) => (
        <Space>
          <Avatar src={u.avatar} icon={<UserOutlined />} size="small" />
          <div>
            <div>
              <Text strong style={{ fontSize: 13 }}>
                {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : (u.username ?? '—')}
              </Text>
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>{u.email ?? '游客'}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      width: 110,
      render: (r: string) => <Tag color={roleColors[r]}>{roleLabels[r]}</Tag>,
    },
    {
      title: '国家',
      dataIndex: 'country',
      width: 70,
      render: (c: string) => <Text type="secondary">{c}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 90,
      render: (active: boolean) =>
        active
          ? <Tag icon={<CheckCircleOutlined />} color="success">正常</Tag>
          : <Tag icon={<StopOutlined />} color="error">封禁</Tag>,
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      width: 140,
      render: (d: string) => (
        <Tooltip title={dayjs(d).format('YYYY-MM-DD HH:mm')}>
          <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(d).fromNow()}</Text>
        </Tooltip>
      ),
    },
    {
      title: '最后登录',
      dataIndex: 'last_login',
      width: 140,
      render: (d: string | null) =>
        d ? (
          <Tooltip title={dayjs(d).format('YYYY-MM-DD HH:mm')}>
            <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(d).fromNow()}</Text>
          </Tooltip>
        ) : <Text type="secondary">—</Text>,
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_, u) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/users/${u.id}`)}
        />
      ),
    },
  ]

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 20 }}>用户管理</Typography.Title>

      <Row gutter={16} style={{ marginBottom: 20 }}>
        {Object.entries(roleLabels).map(([r, label]) => (
          <Col key={r} xs={12} sm={6}>
            <Card size="small" styles={{ body: { padding: '12px 16px' } }}>
              <Statistic
                title={<Text type="secondary" style={{ fontSize: 11 }}>{label}</Text>}
                value={roleStats[r] ?? 0}
                valueStyle={{ fontSize: 20, color: roleColors[r] === 'default' ? token.colorText : undefined }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="搜索邮箱、用户名..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            style={{ width: 260 }}
            allowClear
          />
          <Select
            placeholder="筛选角色"
            allowClear
            style={{ width: 160 }}
            value={role}
            onChange={(v) => { setRole(v); setPage(1) }}
            options={Object.entries(roleLabels).map(([v, l]) => ({ value: v, label: l }))}
          />
        </Space>

        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            onChange: setPage,
            showSizeChanger: false,
            showTotal: (t) => `共 ${t} 位用户`,
          }}
          onRow={(u) => ({ onClick: () => navigate(`/users/${u.id}`), style: { cursor: 'pointer' } })}
        />
      </Card>
    </div>
  )
}
