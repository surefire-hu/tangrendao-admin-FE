import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Table, Input, Select, Tag, Avatar, Space, Typography,
  Button, Tooltip, Card, Row, Col, Statistic, theme,
  Modal, Form, Switch, Upload, message, Slider, InputNumber, Alert,
} from 'antd'
import {
  UserOutlined, SearchOutlined, EyeOutlined, PlusOutlined,
  CheckCircleOutlined, StopOutlined, UploadOutlined, RobotOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import { adminApi } from '../../api/admin'
import { geographyApi, type AdminCountry } from '../../api/geography'
import { mediaUrl } from '../../api/client'
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
  const [botFilter, setBotFilter] = useState<'all' | 'bot' | 'real' | 'guest'>('all')
  const [countryFilter, setCountryFilter] = useState<string | undefined>()
  const [countries, setCountries] = useState<AdminCountry[]>([])
  const [counts, setCounts] = useState<{ real: number; bot: number; guest: number }>({ real: 0, bot: 0, guest: 0 })
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createForm] = Form.useForm()
  const avatarRef = useRef<File | null>(null)
  const PAGE_SIZE = 20

  // ── Bulk-create-bots Modal ────────────────────────────────────────────────
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ created: number; skipped: number } | null>(null)
  const [bulkCount, setBulkCount] = useState(20)
  const [bulkFemalePct, setBulkFemalePct] = useState(50)
  const [bulkWeights, setBulkWeights] = useState({ anime: 2, wangtu: 4, animals: 2, environments: 1 })
  const [bulkCountry, setBulkCountry] = useState('IT')

  async function runBulk() {
    setBulkRunning(true)
    setBulkResult(null)
    try {
      const res = await adminApi.bulkCreateBots({
        count:          bulkCount,
        female_ratio:   bulkFemalePct / 100,
        source_weights: bulkWeights,
        country:        bulkCountry,
      })
      setBulkResult({ created: res.data.created, skipped: res.data.skipped })
      message.success(`创建 ${res.data.created} 个机器人，跳过 ${res.data.skipped}`)
      setBotFilter('bot')
      setPage(1)
      fetchUsers()
      fetchCounts()
    } catch (e: any) {
      message.error(e?.response?.data?.detail ?? '批量创建失败')
    } finally {
      setBulkRunning(false)
    }
  }

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      // Translate the bot/registered toolbar into backend flags. 'all' shows
      // everything (real + bot + guest); the other modes pick a single bucket.
      let is_registered: boolean | undefined
      let is_bot: boolean | undefined
      if (botFilter === 'bot')        { is_bot = true }
      else if (botFilter === 'real')  { is_bot = false; is_registered = true }
      else if (botFilter === 'guest') { is_bot = false; is_registered = false }

      const res = await adminApi.getUsers({
        page,
        page_size: PAGE_SIZE,
        search: search || undefined,
        role: role || undefined,
        country: countryFilter || undefined,
        ordering: '-created_at',
        is_registered,
        is_bot,
      })
      setUsers(res.data.results)
      setTotal(res.data.count)
    } catch {
      // handled by global interceptor
    } finally {
      setLoading(false)
    }
  }, [page, search, role, botFilter, countryFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const fetchCounts = useCallback(async () => {
    try {
      const res = await adminApi.getUserCounts({
        search:  search || undefined,
        role:    role || undefined,
        country: countryFilter || undefined,
      })
      setCounts(res.data)
    } catch {
      // non-blocking
    }
  }, [search, role, countryFilter])

  useEffect(() => { fetchCounts() }, [fetchCounts])

  useEffect(() => {
    geographyApi.list()
      .then((res) => setCountries(res.data.filter(c => c.is_active)))
      .catch(() => {})
  }, [])

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
      fetchCounts()
    } catch (e: any) {
      if (e?.errorFields) return  // antd validation
      message.error(e?.response?.data?.detail ?? '创建失败')
    } finally {
      setCreating(false)
    }
  }

  async function toggleBan(u: AdminUser) {
    const next = !u.is_active
    Modal.confirm({
      title: next ? '解封用户' : '封禁用户',
      content: next
        ? `确认解封 ${u.first_name || u.username || u.email}？`
        : `确认封禁 ${u.first_name || u.username || u.email}？该用户将无法登录。`,
      okText: next ? '解封' : '封禁',
      okButtonProps: { danger: !next },
      cancelText: '取消',
      onOk: async () => {
        try {
          await adminApi.updateUser(u.id, { is_active: next })
          message.success(next ? '已解封' : '已封禁')
          fetchUsers()
        } catch (e: any) {
          message.error(e?.response?.data?.detail ?? '操作失败')
        }
      },
    })
  }

  const columns: ColumnsType<AdminUser> = [
    {
      title: '用户',
      key: 'user',
      render: (_, u) => (
        <Space>
          <Avatar src={mediaUrl(u.avatar)} icon={<UserOutlined />} size={40} />
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
          {u.is_bot && <Tag color="purple">BOT</Tag>}
          {u.gender === 'male' && <Tag color="blue">男</Tag>}
          {u.gender === 'female' && <Tag color="pink">女</Tag>}
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
      width: 110,
      render: (_, u) => (
        <Space size={2} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/users/${u.id}`)}
            />
          </Tooltip>
          <Tooltip title={u.is_active ? '封禁' : '解封'}>
            <Button
              type="text"
              danger={u.is_active}
              icon={u.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
              onClick={() => toggleBan(u)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>用户管理</Typography.Title>
        <Space>
          <Button icon={<RobotOutlined />} onClick={() => { setBulkResult(null); setBulkOpen(true) }}>
            批量创建机器人
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            新建用户
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 20 }}>
        {([
          { key: 'real',  label: '真实用户',   color: token.colorSuccess },
          { key: 'bot',   label: '机器人 (BOT)', color: token.colorPrimary },
          { key: 'guest', label: '游客',       color: token.colorWarning },
        ] as const).map(({ key, label, color }) => (
          <Col key={key} xs={24} sm={8}>
            <Card size="small" styles={{ body: { padding: '12px 16px' } }}>
              <Statistic
                title={<Text type="secondary" style={{ fontSize: 11 }}>{label}</Text>}
                value={counts[key]}
                valueStyle={{ fontSize: 20, color }}
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
            style={{ width: 160 }}
            value={botFilter}
            onChange={(v) => { setBotFilter(v); setPage(1) }}
            options={[
              { value: 'all',   label: '全部账号' },
              { value: 'real',  label: '真实用户' },
              { value: 'bot',   label: '机器人 (BOT)' },
              { value: 'guest', label: '游客' },
            ]}
          />
          <Select
            placeholder="筛选国家"
            allowClear
            showSearch
            style={{ width: 200 }}
            value={countryFilter}
            onChange={(v) => { setCountryFilter(v); setPage(1) }}
            optionFilterProp="label"
            options={countries.map(c => ({
              value: c.code,
              label: `${c.flag_emoji ? c.flag_emoji + ' ' : ''}${c.name_zh || c.name} (${c.code})`,
            }))}
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
          <Form.Item name="is_bot" label="机器人账号 (BOT)" valuePropName="checked">
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

          <Form.Item name="country" label="国家" rules={[{ required: true, message: '请选择国家' }]}>
            <Select
              showSearch
              placeholder="选择国家"
              optionFilterProp="label"
              options={countries.map(c => ({
                value: c.code,
                label: `${c.flag_emoji ? c.flag_emoji + ' ' : ''}${c.name_zh || c.name} (${c.code})`,
              }))}
            />
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

      <Modal
        title="批量创建机器人"
        open={bulkOpen}
        onCancel={() => !bulkRunning && setBulkOpen(false)}
        onOk={runBulk}
        okText={bulkRunning ? '生成中…' : `生成 ${bulkCount} 个`}
        cancelText="关闭"
        confirmLoading={bulkRunning}
        maskClosable={!bulkRunning}
        keyboard={!bulkRunning}
        destroyOnHidden
        width={560}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="网名由 AI 生成 (OpenAI/Groq/Claude)，头像随机抓取公开 API。每个机器人约 1–2 秒，最多 1000 个/次。"
        />

        <Form layout="vertical">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="数量">
                <InputNumber
                  min={1}
                  max={1000}
                  value={bulkCount}
                  onChange={(v) => setBulkCount(Number(v) || 1)}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="国家">
                <Select
                  showSearch
                  value={bulkCountry}
                  onChange={setBulkCountry}
                  optionFilterProp="label"
                  options={countries.map(c => ({
                    value: c.code,
                    label: `${c.flag_emoji ? c.flag_emoji + ' ' : ''}${c.name_zh || c.name} (${c.code})`,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label={`女性比例：${bulkFemalePct}%`}>
            <Slider
              min={0}
              max={100}
              value={bulkFemalePct}
              onChange={setBulkFemalePct}
              marks={{ 0: '全男', 50: '一半', 100: '全女' }}
            />
          </Form.Item>

          <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
            头像来源权重
          </Typography.Text>
          {([
            { key: 'wangtu',       label: '真人网图 (按性别匹配)' },
            { key: 'anime',        label: '二次元 (waifu/neko)' },
            { key: 'animals',      label: '动物 (猫狗)' },
            { key: 'environments', label: '风景照' },
          ] as const).map(({ key, label }) => (
            <Form.Item key={key} label={`${label}：${bulkWeights[key]}`} style={{ marginBottom: 8 }}>
              <Slider
                min={0}
                max={10}
                value={bulkWeights[key]}
                onChange={(v) => setBulkWeights({ ...bulkWeights, [key]: v as number })}
              />
            </Form.Item>
          ))}
        </Form>

        {bulkResult && (
          <Alert
            type={bulkResult.skipped > 0 ? 'warning' : 'success'}
            style={{ marginTop: 8 }}
            message={`已创建 ${bulkResult.created} 个，跳过 ${bulkResult.skipped} 个`}
          />
        )}
      </Modal>
    </div>
  )
}
