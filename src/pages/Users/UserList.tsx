import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Table, Input, Select, Tag, Avatar, Space, Typography,
  Button, Tooltip, Card, Row, Col, Statistic, theme,
  Modal, Form, Switch, Upload, message,
} from 'antd'
import {
  UserOutlined, SearchOutlined, EyeOutlined, PlusOutlined,
  CheckCircleOutlined, StopOutlined, UploadOutlined,
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
  const [botFilter, setBotFilter] = useState<'all' | 'bot' | 'real'>('all')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createForm] = Form.useForm()
  const avatarRef = useRef<File | null>(null)
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
        is_registered: botFilter === 'bot' ? undefined : true,
        is_bot: botFilter === 'bot' ? true : botFilter === 'real' ? false : undefined,
      })
      setUsers(
        botFilter === 'bot'
          ? res.data.results
          : res.data.results.filter(u => u.is_registered)
      )
      setTotal(res.data.count)
    } catch {
      // handled by global interceptor
    } finally {
      setLoading(false)
    }
  }, [page, search, role, botFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function submitCreate() {
    try {
      const v = await createForm.validateFields()
      setCreating(true)
      await adminApi.createUser({
        email:      v.email || undefined,
        username:   v.username || undefined,
        password:   v.password || undefined,
        first_name: v.first_name || undefined,
        last_name:  v.last_name || undefined,
        role:       v.role || 'user',
        is_bot:     !!v.is_bot,
        gender:     v.gender || null,
        country:    v.country || 'IT',
        avatar:     avatarRef.current,
      })
      message.success('用户已创建')
      setCreateOpen(false)
      createForm.resetFields()
      avatarRef.current = null
      setPage(1)
      fetchUsers()
    } catch (e: any) {
      if (e?.errorFields) return  // antd validation
      message.error(e?.response?.data?.detail ?? '创建失败')
    } finally {
      setCreating(false)
    }
  }

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
      render: (r: string, u) => (
        <Space size={4}>
          <Tag color={roleColors[r]}>{roleLabels[r]}</Tag>
          {u.is_bot && <Tag color="purple">🤖</Tag>}
          {u.gender === 'male' && <Tag color="blue">♂</Tag>}
          {u.gender === 'female' && <Tag color="pink">♀</Tag>}
        </Space>
      ),
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>用户管理</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          新建用户
        </Button>
      </div>

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
          <Select
            style={{ width: 140 }}
            value={botFilter}
            onChange={(v) => { setBotFilter(v); setPage(1) }}
            options={[
              { value: 'all',  label: '全部账号' },
              { value: 'real', label: '真实用户' },
              { value: 'bot',  label: '🤖 机器人' },
            ]}
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

      <Modal
        title="新建用户"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={submitCreate}
        confirmLoading={creating}
        okText="创建"
        cancelText="取消"
        destroyOnHidden
      >
        <Form
          form={createForm}
          layout="vertical"
          initialValues={{ role: 'user', country: 'IT', is_bot: false }}
        >
          <Form.Item name="is_bot" label="🤖 机器人账号" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="username" />
          </Form.Item>

          <Form.Item name="email" label="邮箱" rules={[{ type: 'email', message: '邮箱格式不正确' }]}>
            <Input placeholder="user@example.com" />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) => prev.is_bot !== cur.is_bot || prev.email !== cur.email}
          >
            {({ getFieldValue }) =>
              !getFieldValue('is_bot') && getFieldValue('email') ? (
                <Form.Item
                  name="password"
                  label="密码"
                  rules={[{ required: true, min: 8, message: '至少 8 位' }]}
                >
                  <Input.Password placeholder="至少 8 位" />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="first_name" label="名">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="last_name" label="姓">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="role" label="角色">
                <Select
                  options={Object.entries(roleLabels).map(([v, l]) => ({ value: v, label: l }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="gender" label="性别">
                <Select
                  allowClear
                  placeholder="未指定"
                  options={[
                    { value: 'male',   label: '男' },
                    { value: 'female', label: '女' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="country" label="国家 (ISO-2)">
            <Input maxLength={2} style={{ width: 100, textTransform: 'uppercase' }} />
          </Form.Item>

          <Form.Item label="头像">
            <Upload
              beforeUpload={(file) => { avatarRef.current = file as File; return false }}
              onRemove={() => { avatarRef.current = null }}
              maxCount={1}
              listType="picture"
              accept="image/*"
            >
              <Button icon={<UploadOutlined />}>选择图片</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
