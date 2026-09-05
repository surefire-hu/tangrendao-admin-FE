import { useState, useEffect } from 'react'
import { Layout, Menu, Avatar, Dropdown, Typography, Space, theme, Badge, Switch, Tooltip, message } from 'antd'
import { supportApi } from '../../api/support'
import {
  DashboardOutlined,
  UserOutlined,
  NotificationOutlined,
  ShoppingOutlined,
  HomeOutlined,
  SolutionOutlined,
  AppstoreOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ToolOutlined,
  TeamOutlined,
  SendOutlined,
  AuditOutlined,
  IdcardOutlined,
  MobileOutlined,
  GiftOutlined,
  MessageOutlined,
  CommentOutlined,
  VideoCameraOutlined,
  ReadOutlined,
  FireOutlined,
  GlobalOutlined,
  MedicineBoxOutlined,
  PartitionOutlined,
  StopOutlined,
  FileTextOutlined,
  CrownOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { apiClient } from '../../api/client'

const { Header, Sider, Content } = Layout
const { Text } = Typography

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { token } = theme.useToken()
  const [feedbackUnread, setFeedbackUnread]     = useState(0)
  const [promotionsUnread, setPromotionsUnread] = useState(0)
  const [supportUnread, setSupportUnread]       = useState(0)
  const [claimsUnread, setClaimsUnread]         = useState(0)
  const [unbanPending, setUnbanPending]         = useState(0)
  const [refundsPending, setRefundsPending]     = useState(0)
  const [supportOnline, setSupportOnline]       = useState(false)
  const [supportOnlineLoading, setSupportOnlineLoading] = useState(false)

  useEffect(() => {
    // Support is time-sensitive (a customer just opened a chat) → poll it
    // frequently so the red dot appears without a manual refresh.
    const fetchSupportUnread = () => {
      apiClient.get<{ unread_count: number }>('/chat/support/admin/inbox/unread-count/')
        .then(r => setSupportUnread(r.data.unread_count))
        .catch(() => {})
    }
    const fetchOthers = () => {
      apiClient.get<{ count: number }>('/admin/feedback/unread-count/')
        .then(r => setFeedbackUnread(r.data.count))
        .catch(() => {})
      apiClient.get<{ count: number }>('/admin/promotions/unread-count/')
        .then(r => setPromotionsUnread(r.data.count))
        .catch(() => {})
      apiClient.get<{ count: number }>('/admin/listing-claims/unread-count/')
        .then(r => setClaimsUnread(r.data.count))
        .catch(() => {})
      apiClient.get<{ count: number }>('/admin/unban-requests/?status=pending&page_size=1')
        .then(r => setUnbanPending(r.data.count ?? 0))
        .catch(() => {})
      apiClient.get<{ count: number }>('/specialists/admin/refund-requests/?status=pending&page_size=1')
        .then(r => setRefundsPending(r.data.count ?? 0))
        .catch(() => {})
    }
    fetchSupportUnread()
    fetchOthers()
    const supportInterval = setInterval(fetchSupportUnread, 8_000)
    const othersInterval  = setInterval(fetchOthers, 30_000)
    // Catch up the moment the tab regains focus (browsers throttle background timers).
    const onFocus = () => { fetchSupportUnread(); fetchOthers() }
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(supportInterval)
      clearInterval(othersInterval)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  // Real-time support badge: a customer opening/writing a support chat pushes
  // the live unread count over the inbox WebSocket (polling above is a fallback).
  useEffect(() => {
    let ws: WebSocket | null = null
    let retry: ReturnType<typeof setTimeout> | null = null
    let closed = false
    const connect = () => {
      ws = supportApi.openInboxSocket((count) => setSupportUnread(count))
      ws.onclose = () => { if (!closed) retry = setTimeout(connect, 5_000) }
    }
    connect()
    return () => {
      closed = true
      if (retry) clearTimeout(retry)
      ws?.close()
    }
  }, [])

  useEffect(() => {
    supportApi.getPresence()
      .then(r => setSupportOnline(r.online))
      .catch(() => {})
  }, [])

  const toggleSupportOnline = async (next: boolean) => {
    setSupportOnlineLoading(true)
    try {
      const res = await supportApi.setPresence(next)
      setSupportOnline(res.online)
      message.success(res.online ? '已上线，可接受客服咨询' : '已下线')
    } catch {
      message.error('切换失败')
    } finally {
      setSupportOnlineLoading(false)
    }
  }

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '控制台',
    },
    {
      key: '/users',
      icon: <TeamOutlined />,
      label: '用户管理',
    },
    {
      key: 'publications',
      icon: <AppstoreOutlined />,
      label: '内容发布',
      children: [
        { key: '/publications/market', icon: <ShoppingOutlined />, label: '买卖市场' },
        { key: '/publications/local-services', icon: <ToolOutlined />, label: '本地服务' },
        { key: '/publications/jobs', icon: <SolutionOutlined />, label: '招聘求职' },
        { key: '/publications/housing', icon: <HomeOutlined />, label: '房屋租售' },
        { key: '/publications/listings', icon: <AppstoreOutlined />, label: '商家列表' },
      ],
    },
    {
      key: 'forum',
      icon: <CommentOutlined />,
      label: '论坛管理',
      children: [
        { key: '/forum/posts', icon: <ReadOutlined />, label: '帖子' },
        { key: '/forum/videos', icon: <VideoCameraOutlined />, label: '视频' },
        { key: '/forum/hot-keywords', icon: <FireOutlined />, label: '买热搜' },
      ],
    },
    {
      key: '/leaderboard',
      icon: <TrophyOutlined />,
      label: '内容排行榜',
    },
    {
      key: 'ads',
      icon: <NotificationOutlined />,
      label: '广告',
      children: [
        { key: '/adcards', icon: <IdcardOutlined />, label: '卡片广告' },
        { key: '/advertisements', icon: <NotificationOutlined />, label: '横幅广告' },
        { key: '/splash', icon: <MobileOutlined />, label: '全屏广告' },
      ],
    },
    {
      key: '/currency',
      icon: <GiftOutlined />,
      label: '糖果/金币',
    },
    {
      key: 'cosmetics-events',
      icon: <CrownOutlined />,
      label: '装扮 / 活动',
      children: [
        { key: '/cosmetics', icon: <CrownOutlined />, label: '头像框' },
        { key: '/events', icon: <TrophyOutlined />, label: '活动/抽奖' },
      ],
    },
    {
      key: '/broadcast',
      icon: <SendOutlined />,
      label: '广播通知',
    },
    {
      key: '/feedback',
      icon: <MessageOutlined />,
      label: (
        <Badge count={feedbackUnread} size="small" offset={[6, 0]}>
          问题反馈
        </Badge>
      ),
    },
    {
      key: '/support',
      icon: <CommentOutlined />,
      label: (
        <Badge count={supportUnread} size="small" offset={[6, 0]}>
          客服对话
        </Badge>
      ),
    },
    {
      key: '/promotions',
      icon: <FireOutlined />,
      label: (
        <Badge count={promotionsUnread} size="small" offset={[6, 0]}>
          推广记录
        </Badge>
      ),
    },
    {
      key: '/claims',
      icon: <IdcardOutlined />,
      label: (
        <Badge count={claimsUnread} size="small" offset={[6, 0]}>
          商家认领
        </Badge>
      ),
    },
    {
      key: '/unban-requests',
      icon: <StopOutlined />,
      label: (
        <Badge count={unbanPending} size="small" offset={[6, 0]}>
          解封申诉
        </Badge>
      ),
    },
    {
      key: '/news',
      icon: <FileTextOutlined />,
      label: '新闻管理',
    },
    {
      key: '/geography',
      icon: <GlobalOutlined />,
      label: '国家管理',
    },
    {
      key: '/specialists',
      icon: <MedicineBoxOutlined />,
      label: '专家咨询',
    },
    {
      key: '/specialist-refunds',
      icon: <MedicineBoxOutlined />,
      label: (
        <Badge count={refundsPending} size="small" offset={[6, 0]}>
          专家退款申请
        </Badge>
      ),
    },
    {
      key: '/navigation',
      icon: <PartitionOutlined />,
      label: '服务导航',
    },
    ...(user?.is_superuser
      ? [{
          key: '/admin-log',
          icon: <AuditOutlined />,
          label: '操作日志',
        }]
      : []),
  ]

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  const getSelectedKey = () => {
    const path = location.pathname
    if (path.startsWith('/publications/market')) return '/publications/market'
    if (path.startsWith('/publications/local-services')) return '/publications/local-services'
    if (path.startsWith('/publications/jobs')) return '/publications/jobs'
    if (path.startsWith('/publications/housing')) return '/publications/housing'
    if (path.startsWith('/publications/listings')) return '/publications/listings'
    if (path.startsWith('/forum/posts')) return '/forum/posts'
    if (path.startsWith('/forum/videos')) return '/forum/videos'
    if (path.startsWith('/forum/hot-keywords')) return '/forum/hot-keywords'
    if (path.startsWith('/users')) return '/users'
    if (path.startsWith('/advertisements')) return '/advertisements'
    if (path.startsWith('/adcards')) return '/adcards'
    if (path.startsWith('/splash')) return '/splash'
    if (path.startsWith('/currency')) return '/currency'
    if (path.startsWith('/broadcast')) return '/broadcast'
    if (path.startsWith('/feedback')) return '/feedback'
    if (path.startsWith('/promotions')) return '/promotions'
    if (path.startsWith('/support')) return '/support'
    if (path.startsWith('/geography')) return '/geography'
    if (path.startsWith('/specialist-refunds')) return '/specialist-refunds'
    if (path.startsWith('/specialists')) return '/specialists'
    if (path.startsWith('/navigation')) return '/navigation'
    if (path.startsWith('/claims')) return '/claims'
    if (path.startsWith('/unban-requests')) return '/unban-requests'
    if (path.startsWith('/news')) return '/news'
    if (path.startsWith('/cosmetics')) return '/cosmetics'
    if (path.startsWith('/events')) return '/events'
    if (path.startsWith('/admin-log')) return '/admin-log'
    return '/'
  }

  const getOpenKeys = () => {
    const path = location.pathname
    if (path.startsWith('/publications')) return ['publications']
    if (path.startsWith('/forum')) return ['forum']
    if (path.startsWith('/advertisements') || path.startsWith('/adcards') || path.startsWith('/splash')) return ['ads']
    if (path.startsWith('/cosmetics') || path.startsWith('/events')) return ['cosmetics-events']
    return []
  }

  const userMenu = {
    items: [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        onClick: async () => {
          await logout()
          navigate('/login')
        },
      },
    ],
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={220}
        style={{
          background: token.colorBgContainer,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          position: 'fixed',
          height: '100vh',
          left: 0,
          top: 0,
          zIndex: 100,
          overflow: 'auto',
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? 0 : '0 16px',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            gap: 10,
          }}
        >
          <UserOutlined style={{ fontSize: 22, color: token.colorPrimary }} />
          {!collapsed && (
            <Text strong style={{ fontSize: 15, color: token.colorPrimary }}>
              唐人道 Admin
            </Text>
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          defaultOpenKeys={getOpenKeys()}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0, marginTop: 8 }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 220, transition: 'margin-left 0.2s' }}>
        <Header
          style={{
            padding: '0 24px',
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 99,
          }}
        >
          <span
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 18, cursor: 'pointer', color: token.colorText }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </span>

          <Space size={16}>
            <Tooltip title={supportOnline ? '当前对客服上线 — 用户可见“客服在线”' : '当前离线 — 用户看到“客服不在线”'}>
              <Space size={6}>
                <Badge status={supportOnline ? 'success' : 'default'} />
                <Text style={{ fontSize: 13, color: supportOnline ? '#52c41a' : token.colorTextSecondary }}>
                  {supportOnline ? '客服在线' : '客服离线'}
                </Text>
                <Switch
                  size="small"
                  checked={supportOnline}
                  loading={supportOnlineLoading}
                  onChange={toggleSupportOnline}
                />
              </Space>
            </Tooltip>

            <Dropdown menu={userMenu} trigger={['click']}>
              <Space style={{ cursor: 'pointer' }}>
                <Avatar
                  size="small"
                  icon={<UserOutlined />}
                  src={user?.avatar}
                  style={{ background: token.colorPrimary }}
                />
                <Text>{user?.email ?? user?.username ?? '管理员'}</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ padding: 24, background: token.colorBgLayout }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
