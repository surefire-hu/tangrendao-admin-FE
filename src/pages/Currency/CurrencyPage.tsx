import { useEffect, useState, useCallback } from 'react'
import {
  Tabs, Card, Row, Col, Statistic, Table, Tag, Typography,
  Form, InputNumber, Input, Button, Select, Space, Alert,
  Tooltip, message, Spin, theme, Divider, Descriptions,
} from 'antd'
import {
  SearchOutlined, SendOutlined, WarningOutlined,
  ReloadOutlined, UserOutlined, CheckCircleOutlined,
  SafetyOutlined, ScissorOutlined, InfoCircleOutlined,
} from '@ant-design/icons'
import { Modal, Popconfirm } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { adminApi } from '../../api/admin'
import { apiClient } from '../../api/client'
import type { AdminUser, CurrencyHolder, CurrencyStats, CurrencyTopupRecord, CandyAnomaly, CandyAnomalyLog } from '../../types'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const { Title, Text } = Typography

// ── Top-up Tab ────────────────────────────────────────────────────────────────

function TopupTab() {
  const { token } = theme.useToken()
  const [form] = Form.useForm()
  const [search, setSearch]         = useState('')
  const [searching, setSearching]   = useState(false)
  const [users, setUsers]           = useState<AdminUser[]>([])
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult]         = useState<{ new_candy: number; new_coin: number } | null>(null)

  const handleSearch = async () => {
    if (!search.trim()) return
    setSearching(true)
    setSelectedUser(null)
    setResult(null)
    try {
      const res = await adminApi.getUsers({ search: search.trim(), page_size: 10 })
      setUsers(res.data.results)
      if (!res.data.results.length) message.info('未找到用户')
    } catch {
      message.error('搜索失败')
    } finally {
      setSearching(false)
    }
  }

  const handleSubmit = async (values: { candy_amount: number; coin_amount: number; note?: string }) => {
    if (!selectedUser) { message.warning('请先选择用户'); return }
    setSubmitting(true)
    setResult(null)
    try {
      const res = await adminApi.topupCurrency(selectedUser.id, {
        candy_amount: values.candy_amount ?? 0,
        coin_amount:  values.coin_amount  ?? 0,
        note:         values.note?.trim() ?? '',
      })
      setResult(res.data)
      message.success(`充值成功！已通知用户。`)
      form.resetFields()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      message.error(err?.response?.data?.error ?? '充值失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Row gutter={[24, 24]}>
      {/* Left: user search */}
      <Col xs={24} md={10}>
        <Card title="搜索用户" size="small">
          <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
            <Input
              placeholder="邮箱 / 用户名"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={handleSearch}
              prefix={<SearchOutlined />}
            />
            <Button type="primary" loading={searching} onClick={handleSearch}>
              搜索
            </Button>
          </Space.Compact>

          <Select
            style={{ width: '100%' }}
            placeholder="选择用户..."
            value={selectedUser?.id}
            onChange={(id) => {
              const u = users.find((u) => u.id === id) ?? null
              setSelectedUser(u)
              setResult(null)
            }}
            options={users.map((u) => ({
              value: u.id,
              label: (
                <Space>
                  <UserOutlined />
                  <span>{u.email ?? u.username}</span>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    🍬{u.candy ?? '?'} 🪙{u.coin ?? '?'}
                  </Text>
                </Space>
              ),
            }))}
            notFoundContent={searching ? <Spin size="small" /> : null}
          />

          {selectedUser && (
            <Card
              size="small"
              style={{ marginTop: 12, background: token.colorFillAlter }}
            >
              <Space direction="vertical" size={2} style={{ width: '100%' }}>
                <Text strong>{selectedUser.email ?? selectedUser.username}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ID: {selectedUser.id.slice(0, 8)}…
                </Text>
                <Space>
                  <Tag color="gold">🍬 糖果：{selectedUser.candy ?? 0}</Tag>
                  <Tag color="blue">🪙 金币：{selectedUser.coin ?? 0}</Tag>
                </Space>
              </Space>
            </Card>
          )}
        </Card>
      </Col>

      {/* Right: topup form */}
      <Col xs={24} md={14}>
        <Card title="充值表单" size="small">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{ candy_amount: 0, coin_amount: 0 }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="candy_amount"
                  label="糖果数量 🍬"
                  tooltip="正数为充值，负数为扣除"
                  rules={[{ required: true }]}
                >
                  <InputNumber style={{ width: '100%' }} step={10} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="coin_amount"
                  label="金币数量 🪙"
                  tooltip="正数为充值，负数为扣除"
                  rules={[{ required: true }]}
                >
                  <InputNumber style={{ width: '100%' }} step={10} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="note" label="备注（可选）">
              <Input placeholder="例：活动奖励、手动修正..." maxLength={200} />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SendOutlined />}
                loading={submitting}
                disabled={!selectedUser}
                block
              >
                确认充值并通知用户
              </Button>
            </Form.Item>
          </Form>

          {result && (
            <Alert
              type="success"
              showIcon
              message="充值成功"
              description={
                <Space>
                  <Tag color="gold">🍬 糖果余额：{result.new_candy}</Tag>
                  <Tag color="blue">🪙 金币余额：{result.new_coin}</Tag>
                </Space>
              }
            />
          )}
        </Card>
      </Col>
    </Row>
  )
}

// ── Circulation Monitor Tab ────────────────────────────────────────────────────

function MonitorTab() {
  const { token } = theme.useToken()
  const [stats, setStats]     = useState<CurrencyStats | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.getCurrencyStats()
      setStats(res.data)
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const holderColumns = (type: 'candy' | 'coin'): ColumnsType<CurrencyHolder> => [
    {
      title: '用户',
      key: 'user',
      render: (_, r) => (
        <Space size={4}>
          <Text style={{ fontSize: 12 }}>{r.email}</Text>
          {r.username && <Text type="secondary" style={{ fontSize: 11 }}>({r.username})</Text>}
        </Space>
      ),
    },
    {
      title: type === 'candy' ? '🍬 糖果' : '🪙 金币',
      key: 'value',
      width: 100,
      render: (_, r) => (
        <Text strong>
          {(type === 'candy' ? r.candy : r.coin).toLocaleString()}
        </Text>
      ),
    },
    {
      title: '对方',
      key: 'other',
      width: 85,
      render: (_, r) => (
        <Text type="secondary" style={{ fontSize: 11 }}>
          {type === 'candy' ? `🪙${r.coin.toLocaleString()}` : `🍬${r.candy.toLocaleString()}`}
        </Text>
      ),
    },
  ]

  const historyColumns: ColumnsType<CurrencyTopupRecord> = [
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 100,
      render: (d: string) => (
        <Tooltip title={dayjs(d).format('YYYY-MM-DD HH:mm')}>
          <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(d).fromNow()}</Text>
        </Tooltip>
      ),
    },
    {
      title: '目标用户',
      key: 'target',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>{r.target_email}</Text>
          {r.target_username !== '—' && (
            <Text type="secondary" style={{ fontSize: 11 }}>{r.target_username}</Text>
          )}
        </Space>
      ),
    },
    {
      title: '糖果',
      dataIndex: 'candy_amount',
      width: 80,
      render: (v: number) => v !== 0 ? (
        <Tag color={v > 0 ? 'gold' : 'red'}>{v > 0 ? `+${v}` : v}🍬</Tag>
      ) : <Text type="secondary">—</Text>,
    },
    {
      title: '金币',
      dataIndex: 'coin_amount',
      width: 80,
      render: (v: number) => v !== 0 ? (
        <Tag color={v > 0 ? 'blue' : 'red'}>{v > 0 ? `+${v}` : v}🪙</Tag>
      ) : <Text type="secondary">—</Text>,
    },
    {
      title: '备注',
      dataIndex: 'note',
      render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{v || '—'}</Text>,
    },
    {
      title: '来源',
      dataIndex: 'source',
      width: 80,
      render: (v: string) => v === 'stripe'
        ? <Tag color="green">Stripe</Tag>
        : <Tag color="purple">管理员</Tag>,
    },
    {
      title: '操作方',
      dataIndex: 'admin_email',
      width: 150,
      render: (v: string, r) => (
        <Text type="secondary" style={{ fontSize: 11 }}>
          {r.source === 'stripe' ? r.target_email : v}
        </Text>
      ),
    },
  ]

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
  if (!stats) return null

  const isHealthy = stats.candy_discrepancy === 0
  const discrepancyAbs = Math.abs(stats.candy_discrepancy)

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button icon={<ReloadOutlined />} onClick={load} size="small">刷新</Button>
      </div>

      {/* KPI wallet totals */}
      <Row gutter={[16, 16]}>
        {[
          { label: '🍬 钱包总糖果', value: stats.total_candy, color: token.colorWarning },
          { label: '🪙 钱包总金币', value: stats.total_coin,  color: token.colorPrimary },
          { label: '注册用户数',    value: stats.total_users,  color: token.colorTextSecondary },
        ].map((s) => (
          <Col key={s.label} xs={12} sm={8}>
            <Card size="small" styles={{ body: { padding: '12px 16px' } }}>
              <Statistic
                title={<Text type="secondary" style={{ fontSize: 11 }}>{s.label}</Text>}
                value={s.value}
                valueStyle={{ fontSize: 22, color: s.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Top holders */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="🍬 糖果排行 Top 30" size="small" styles={{ body: { padding: 0 } }}>
            <Table
              rowKey="id"
              columns={holderColumns('candy')}
              dataSource={stats.top_candy_holders}
              pagination={false}
              size="small"
              scroll={{ y: 340 }}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="🪙 金币排行 Top 30" size="small" styles={{ body: { padding: 0 } }}>
            <Table
              rowKey="id"
              columns={holderColumns('coin')}
              dataSource={stats.top_coin_holders}
              pagination={false}
              size="small"
              scroll={{ y: 340 }}
            />
          </Card>
        </Col>
      </Row>

      <Divider style={{ margin: '4px 0' }} />

      <Card title="管理员充值记录（最新50条）" size="small" styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="id"
          columns={historyColumns}
          dataSource={stats.recent_topups}
          pagination={false}
          size="small"
          scroll={{ y: 320 }}
        />
      </Card>
    </Space>
  )
}

// ── Anomaly Detection Tab ─────────────────────────────────────────────────────

function AnomalyTab() {
  const { token } = theme.useToken()
  const [anomalies, setAnomalies] = useState<CandyAnomaly[]>([])
  const [loading, setLoading]     = useState(true)
  const [log, setLog]             = useState<CandyAnomalyLog[]>([])
  const [logLoading, setLogLoading] = useState(true)
  const [acting, setActing]       = useState<string | null>(null)
  const [noteModal, setNoteModal] = useState<{ userId: string; action: 'clear' | 'deduct'; email: string; discrepancy: number; anomalyType: 'wallet' | 'spending' } | null>(null)
  const [noteText, setNoteText]   = useState('')

  const loadLog = useCallback(async () => {
    setLogLoading(true)
    try {
      const res = await apiClient.get<CandyAnomalyLog[]>('/admin/currency/anomalies/log/')
      setLog(res.data)
    } catch {
      // non bloccare la pagina se il log fallisce
    } finally {
      setLogLoading(false)
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient.get<CandyAnomaly[]>('/admin/currency/anomalies/')
      setAnomalies(res.data)
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(); loadLog() }, [load, loadLog])

  const handleAction = async (userId: string, action: 'clear' | 'deduct', note: string) => {
    setActing(userId)
    try {
      await apiClient.post(`/admin/currency/anomalies/${userId}/review/`, { action, note })
      message.success(action === 'deduct' ? '已扣除多余糖果并通知用户' : '已标记为合法，已从异常列表移除')
      await Promise.all([load(), loadLog()])
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      message.error(err?.response?.data?.error ?? '操作失败')
    } finally {
      setActing(null)
      setNoteModal(null)
      setNoteText('')
    }
  }

  const columns: ColumnsType<CandyAnomaly> = [
    {
      title: '用户',
      key: 'user',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 13 }}>{r.email}</Text>
          {r.username !== '—' && <Text type="secondary" style={{ fontSize: 11 }}>{r.username}</Text>}
        </Space>
      ),
    },
    {
      title: (
        <span>
          异常类型
          <Tooltip title="wallet=钱包余额超出可解释范围；spending=推广消耗超出所有已知来源（疑似黑客充值后花完）">
            <InfoCircleOutlined style={{ marginLeft: 4, color: '#8c8c8c', fontSize: 11 }} />
          </Tooltip>
        </span>
      ),
      dataIndex: 'anomaly_type',
      width: 110,
      render: (v: string, r: CandyAnomaly) => v === 'spending'
        ? (
          <Tooltip title={`用户消耗了 ${r.promo_net} 颗糖果，但只有 ${r.stripe_in + r.admin_net} 颗有据可查的来源。多消耗了 ${r.spending_excess} 颗。`}>
            <Tag color="volcano" style={{ cursor: 'help' }}>⚠️ 消费超出</Tag>
          </Tooltip>
        ) : (
          <Tooltip title="用户钱包余额超出Stripe+管理员记录的总和">
            <Tag color="red" style={{ cursor: 'help' }}>钱包超额</Tag>
          </Tooltip>
        ),
    },
    {
      title: (
        <span>
          实际余额
          <Tooltip title="用户钱包里现在的糖果数量">
            <InfoCircleOutlined style={{ marginLeft: 4, color: '#8c8c8c', fontSize: 11 }} />
          </Tooltip>
        </span>
      ),
      dataIndex: 'actual',
      width: 90,
      render: (v: number) => <Tag color="gold">{v.toLocaleString()} 🍬</Tag>,
    },
    {
      title: (
        <span>
          预期余额
          <Tooltip title="根据 Stripe充值 + 管理员操作 − 推广消耗 计算出的合理余额">
            <InfoCircleOutlined style={{ marginLeft: 4, color: '#8c8c8c', fontSize: 11 }} />
          </Tooltip>
        </span>
      ),
      dataIndex: 'expected',
      width: 90,
      render: (v: number) => <Text>{v.toLocaleString()} 🍬</Text>,
    },
    {
      title: (
        <span>
          多余糖果
          <Tooltip title="实际 − 预期。这部分糖果无法通过账目解释，可能是Bug或未授权操作。">
            <InfoCircleOutlined style={{ marginLeft: 4, color: '#8c8c8c', fontSize: 11 }} />
          </Tooltip>
        </span>
      ),
      dataIndex: 'discrepancy',
      width: 110,
      sorter: (a, b) => b.discrepancy - a.discrepancy,
      defaultSortOrder: 'ascend',
      render: (v: number) => <Tag color="red">+{v.toLocaleString()} 🍬</Tag>,
    },
    {
      title: '账目来源',
      key: 'breakdown',
      width: 200,
      render: (_, r) => (
        <Space size={[4, 2]} wrap>
          <Tooltip title="通过Stripe购买的糖果总量">
            <Tag color="green" style={{ fontSize: 10 }}>Stripe +{r.stripe_in}</Tag>
          </Tooltip>
          <Tooltip title="管理员充值/扣除净值（正=充值，负=扣除）">
            <Tag color="purple" style={{ fontSize: 10 }}>
              管理员 {r.admin_net >= 0 ? '+' : ''}{r.admin_net}
            </Tag>
          </Tooltip>
          <Tooltip title="推广活动净消耗（已扣除退款）">
            <Tag color="orange" style={{ fontSize: 10 }}>推广 −{r.promo_net}</Tag>
          </Tooltip>
        </Space>
      ),
    },
    {
      title: '上次处理',
      dataIndex: 'last_review',
      width: 100,
      render: (r: CandyAnomaly['last_review']) => r ? (
        <Tooltip title={`${dayjs(r.created_at).format('YYYY-MM-DD HH:mm')}${r.note ? '：' + r.note : ''}`}>
          <Tag color={r.status === 'cleared' ? 'cyan' : 'volcano'} style={{ cursor: 'help' }}>
            {r.status === 'cleared' ? '已确认' : '已扣除'}
          </Tag>
        </Tooltip>
      ) : <Text type="secondary" style={{ fontSize: 11 }}>未处理</Text>,
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, r) => (
        <Space>
          <Tooltip title="确认此用户的异常是合法的，不再显示为异常">
            <Button
              size="small"
              icon={<SafetyOutlined />}
              loading={acting === r.user_id}
              onClick={() => setNoteModal({ userId: r.user_id, action: 'clear', email: r.email, discrepancy: r.discrepancy, anomalyType: r.anomaly_type })}
              style={{ color: token.colorSuccess, borderColor: token.colorSuccess }}
            >
              标记合法
            </Button>
          </Tooltip>
          <Tooltip title={r.anomaly_type === 'spending'
            ? `消费超出类型：钱包已是0，无法直接扣除。点击查看详情。`
            : `扣除多余的 ${r.discrepancy} 颗糖果，恢复到预期余额 ${r.expected}`
          }>
            <Button
              size="small"
              danger
              icon={<ScissorOutlined />}
              loading={acting === r.user_id}
              disabled={r.anomaly_type === 'spending' && r.actual === 0}
              onClick={() => setNoteModal({ userId: r.user_id, action: 'deduct', email: r.email, discrepancy: r.discrepancy, anomalyType: r.anomaly_type })}
            >
              扣除多余
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <WarningOutlined style={{ color: token.colorError }} />
          <Text>
            共检测到 <Text strong style={{ color: token.colorError }}>{anomalies.length}</Text> 个异常账户
          </Text>
          <Tooltip title="两种异常：①钱包超额=当前余额超出可追踪来源；②消费超出=推广消耗超过所有已知来源（疑似黑客充值后花完）。两种都需要处理。">
            <InfoCircleOutlined style={{ color: '#8c8c8c', cursor: 'help' }} />
          </Tooltip>
        </Space>
        <Button icon={<ReloadOutlined />} size="small" onClick={load}>刷新</Button>
      </div>

      {anomalies.length === 0 && !loading && (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          message="暂无糖果异常 ✅"
          description="所有用户的糖果余额均在账目可解释范围内。"
        />
      )}

      <Table
        rowKey="user_id"
        columns={columns}
        dataSource={anomalies}
        loading={loading}
        size="small"
        pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 个异常账户` }}
        scroll={{ x: 800 }}
      />

      {/* ── Review log ── */}
      <Card
        title={
          <Space>
            <span>处理记录</span>
            <Tag>{log.length} 条</Tag>
          </Space>
        }
        size="small"
        styles={{ body: { padding: 0 } }}
        extra={<Button icon={<ReloadOutlined />} size="small" onClick={loadLog}>刷新</Button>}
      >
        <Table
          rowKey="id"
          dataSource={log}
          loading={logLoading}
          size="small"
          pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
          scroll={{ x: 700 }}
          columns={[
            {
              title: '时间',
              dataIndex: 'created_at',
              width: 140,
              render: (v: string) => (
                <Tooltip title={dayjs(v).format('YYYY-MM-DD HH:mm:ss')}>
                  <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(v).fromNow()}</Text>
                </Tooltip>
              ),
            },
            {
              title: '处理结果',
              dataIndex: 'status',
              width: 100,
              render: (v: string) => v === 'cleared'
                ? <Tag color="cyan">已确认合法</Tag>
                : <Tag color="volcano">已扣除糖果</Tag>,
            },
            {
              title: '涉及用户',
              key: 'target',
              render: (_: unknown, r: CandyAnomalyLog) => (
                <Space direction="vertical" size={0}>
                  <Text style={{ fontSize: 12 }}>{r.target_email}</Text>
                  {r.target_username !== '—' && (
                    <Text type="secondary" style={{ fontSize: 11 }}>{r.target_username}</Text>
                  )}
                </Space>
              ),
            },
            {
              title: '异常量',
              dataIndex: 'discrepancy',
              width: 100,
              render: (v: number) => <Tag color="red">+{v.toLocaleString()} 🍬</Tag>,
            },
            {
              title: '备注',
              dataIndex: 'note',
              ellipsis: true,
              render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{v || '—'}</Text>,
            },
            {
              title: '处理管理员',
              dataIndex: 'admin_email',
              width: 170,
              ellipsis: true,
              render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{v}</Text>,
            },
          ] as ColumnsType<CandyAnomalyLog>}
        />
      </Card>

      {/* Note modal for both actions */}
      <Modal
        open={!!noteModal}
        title={
          noteModal?.action === 'deduct'
            ? `确认扣除 ${noteModal?.discrepancy} 颗多余糖果`
            : `确认标记为合法`
        }
        okText={noteModal?.action === 'deduct' ? '确认扣除' : '确认标记合法'}
        okButtonProps={{ danger: noteModal?.action === 'deduct' }}
        cancelText="取消"
        onOk={() => noteModal && handleAction(noteModal.userId, noteModal.action, noteText)}
        onCancel={() => { setNoteModal(null); setNoteText('') }}
        confirmLoading={!!acting}
      >
        {noteModal && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>
              用户：<Text strong>{noteModal.email}</Text>
            </Text>
            {noteModal.action === 'deduct' ? (
              <Alert
                type="warning"
                showIcon
                message={`将从该用户账户扣除 ${noteModal.discrepancy} 🍬，恢复到预期余额。用户会收到通知。`}
                description={
                  noteModal.anomalyType === 'spending'
                    ? '⚠️ 此用户属于「消费超出」类型：钱包已是0，无法扣除。建议使用「标记合法」并在备注说明（如确认是合理历史消费），或进一步封禁账号。'
                    : undefined
                }
              />
            ) : (
              <Alert
                type="info"
                showIcon
                message={
                  noteModal.anomalyType === 'spending'
                    ? '该用户消耗了来源不明的糖果但钱包已清空。标记后从异常列表移除，建议在备注中说明原因。'
                    : '标记后该用户将从异常列表中移除（如余额继续增加将重新出现）。'
                }
              />
            )}
            <Input.TextArea
              placeholder="备注原因（可选）：例如 活动奖励、误操作已确认..."
              rows={3}
              maxLength={200}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
          </Space>
        )}
      </Modal>
    </Space>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function CurrencyPage() {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 20 }}>🍬 糖果 / 🪙 金币管理</Title>
      <Tabs
        defaultActiveKey="topup"
        items={[
          { key: 'topup',   label: '充值管理',   children: <TopupTab /> },
          { key: 'monitor', label: '流通监控',   children: <MonitorTab /> },
          {
            key: 'anomaly',
            label: (
              <span>
                <WarningOutlined style={{ color: '#cf1322', marginRight: 4 }} />
                异常检测
              </span>
            ),
            children: <AnomalyTab />,
          },
        ]}
      />
    </div>
  )
}
