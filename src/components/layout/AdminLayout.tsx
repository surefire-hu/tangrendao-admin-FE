import { useState, useEffect } from 'react'
import { Layout, Menu, Avatar, Dropdown, Typography, Space, theme, Badge } from 'antd'
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
  GiftOutlined,
  MonitorOutlined,
  MessageOutlined,
  CommentOutlined,
  VideoCameraOutlined,
  ReadOutlined,
  FireOutlined,
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

  useEffect(() => {
    const fetchUnread = () => {
      apiClient.get<{ count: number }>('/admin/feedback/unread-count/')
        .then(r => setFeedbackUnread(r.data.count))
        .catch(() => {})
      apiClient.get<{ count: number }>('/admin/promotions/unread-count/')
        .then(r => setPromotionsUnread(r.data.count))
        .catch(() => {})
      apiClient.get<{ unread_count: number }>('/support/inbox/unread-count/')
        .then(r => setSupportUnread(r.data.unread_count))
        .catch(() => {})
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 30_000)
    return () => clearInterval(interval)
  }, [])

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
      ],
    },
    {
      key: '/advertisements',
      icon: <NotificationOutlined />,
      label: '横幅广告',
    },
    {
      key: '/adcards',
      icon: <IdcardOutlined />,
      label: '卡片广告',
    },
    {
      key: '/currency',
      icon: <GiftOutlined />,
      label: '糖果/金币',
    },
    {
      key: '/monitoring',
      icon: <MonitorOutlined />,
      label: '监控分析',
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
    if (path.startsWith('/users')) return '/users'
    if (path.startsWith('/advertisements')) return '/advertisements'
    if (path.startsWith('/adcards')) return '/adcards'
    if (path.startsWith('/currency')) return '/currency'
    if (path.startsWith('/monitoring')) return '/monitoring'
    if (path.startsWith('/broadcast')) return '/broadcast'
    if (path.startsWith('/feedback')) return '/feedback'
    if (path.startsWith('/promotions')) return '/promotions'
    if (path.startsWith('/support')) return '/support'
    if (path.startsWith('/admin-log')) return '/admin-log'
    return '/'
  }

  const getOpenKeys = () => {
    const path = location.pathname
    if (path.startsWith('/publications')) return ['publications']
    if (path.startsWith('/forum')) return ['forum']
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
        </Header>

        <Content style={{ padding: 24, background: token.colorBgLayout }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
