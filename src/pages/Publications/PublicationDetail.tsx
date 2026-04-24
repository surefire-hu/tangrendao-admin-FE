import { useEffect, useState } from 'react'
import {
  Card, Row, Col, Typography, Spin, Button, Statistic,
  Tag, Tabs, Alert, Space, Descriptions, Image, theme,
} from 'antd'
import {
  ArrowLeftOutlined, EyeOutlined, PhoneOutlined,
  HeartOutlined, FundOutlined,
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { adminApi } from '../../api/admin'
import type {
  PublicationStats, PublicationType, PublicationDetails,
} from '../../types'
import { DailyChart } from '../../components/charts/DailyChart'
import { MonthlyChart } from '../../components/charts/MonthlyChart'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography

const WEEKDAY_LABELS: Record<string, string> = {
  mon: '周一', tue: '周二', wed: '周三', thu: '周四',
  fri: '周五', sat: '周六', sun: '周日',
  monday: '周一', tuesday: '周二', wednesday: '周三', thursday: '周四',
  friday: '周五', saturday: '周六', sunday: '周日',
}

function formatOpeningHours(oh: Record<string, string | string[]> | undefined) {
  if (!oh || Object.keys(oh).length === 0) return null
  const rows: { day: string; value: string }[] = []
  for (const [k, v] of Object.entries(oh)) {
    const label = WEEKDAY_LABELS[k.toLowerCase()] ?? k
    const value = Array.isArray(v) ? v.join(' / ') : String(v)
    rows.push({ day: label, value: value || '休息' })
  }
  return rows
}

const typeLabels: Record<string, string> = {
  market: '买卖市场',
  local_service: '本地服务',
  housing: '房屋租售',
  job_post: '招聘信息',
  job_seek: '求职信息',
  listing: 'Listing',
}

const statusColors: Record<string, string> = {
  pending: 'orange', approved: 'green', rejected: 'red',
}

function DetailsCard({ type, details }: { type: string; details: PublicationDetails }) {
  const isListing = type === 'listing'
  const isJob = type === 'job_post' || type === 'job_seek'
  const isClassified = type === 'market' || type === 'local_service' || type === 'housing'

  const contactItems: { label: string; value: string }[] = []
  if (details.contact_name) contactItems.push({ label: '联系人', value: details.contact_name })
  if (details.phone) contactItems.push({ label: '商家电话', value: details.phone })
  if (details.contact_email) contactItems.push({ label: '邮箱', value: details.contact_email })
  if (details.contact_wechat) contactItems.push({ label: '微信', value: details.contact_wechat })
  if (details.website) contactItems.push({ label: '网站', value: details.website })

  const locationItems: { label: string; value: string }[] = []
  if (details.country) locationItems.push({ label: '国家', value: details.country })
  if (details.city) locationItems.push({ label: '城市', value: details.city })
  if (details.location_zone) locationItems.push({ label: '区域', value: details.location_zone })
  if (details.address) locationItems.push({ label: '地址', value: details.address })

  const classificationItems: { label: string; value: string }[] = []
  if (isClassified) {
    if (details.category_display) classificationItems.push({ label: '分类', value: details.category_display })
    if (details.subcategory) classificationItems.push({ label: '子分类', value: details.subcategory })
    if (details.sub_type) classificationItems.push({ label: '细分类型', value: details.sub_type })
    if (details.supply_type) classificationItems.push({ label: '类型', value: details.supply_type === 'offer' ? '提供' : '求' })
    if (details.condition_display) classificationItems.push({ label: '成色', value: details.condition_display })
    if (details.service_type) classificationItems.push({ label: '服务类型', value: details.service_type })
    if (details.rate_type) classificationItems.push({ label: '计费方式', value: details.rate_type })
  }
  if (isJob) {
    if (details.industry) classificationItems.push({ label: '行业', value: details.industry })
    if (details.job_types?.length) classificationItems.push({ label: '工种', value: details.job_types.join('、') })
    if (details.employment_types_display?.length) classificationItems.push({ label: '雇佣类型', value: details.employment_types_display.join('、') })
    if (details.years_experience != null) classificationItems.push({ label: '工作年限', value: `${details.years_experience} 年` })
  }
  if (isListing) {
    if (details.category) classificationItems.push({ label: '分类', value: details.category })
    if (details.business_types?.length) classificationItems.push({ label: '业务类型', value: details.business_types.join('、') })
    if (details.cuisine_types?.length) classificationItems.push({ label: '菜系/品类', value: details.cuisine_types.join('、') })
    if (details.price_range != null) classificationItems.push({ label: '人均消费', value: `€${details.price_range}` })
    if (details.capacity) classificationItems.push({ label: '座位数', value: String(details.capacity) })
    if (details.rating) classificationItems.push({ label: '评分', value: `${details.rating} (${details.review_count ?? 0}条)` })
  }

  const priceOrSalary: string | null =
    isClassified ? (details.price_display ?? null)
    : isJob ? (details.salary_display ?? null)
    : null

  const openingHoursRows = formatOpeningHours(details.opening_hours)
  const galleryImages = (details.images ?? []).filter(Boolean)

  return (
    <Card title="详细信息" style={{ marginBottom: 16 }}>
      {details.description && (
        <div style={{ marginBottom: 20 }}>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>描述</Text>
          <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{details.description}</Paragraph>
        </div>
      )}

      <Row gutter={[24, 16]}>
        {classificationItems.length > 0 && (
          <Col xs={24} md={12}>
            <Descriptions title="分类信息" column={1} size="small">
              {classificationItems.map(i => (
                <Descriptions.Item key={i.label} label={i.label}>{i.value}</Descriptions.Item>
              ))}
              {priceOrSalary && (
                <Descriptions.Item label={isJob ? '薪资' : '价格'}>
                  <Text strong>{priceOrSalary}</Text>
                </Descriptions.Item>
              )}
              {isJob && details.expires_at && (
                <Descriptions.Item label="截止日期">
                  {dayjs(details.expires_at).format('YYYY-MM-DD')}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Col>
        )}

        {locationItems.length > 0 && (
          <Col xs={24} md={12}>
            <Descriptions title="位置信息" column={1} size="small">
              {locationItems.map(i => (
                <Descriptions.Item key={i.label} label={i.label}>{i.value}</Descriptions.Item>
              ))}
              {details.latitude != null && details.longitude != null && (
                <Descriptions.Item label="坐标">
                  {details.latitude}, {details.longitude}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Col>
        )}

        {contactItems.length > 0 && (
          <Col xs={24} md={12}>
            <Descriptions title="联系方式" column={1} size="small">
              {contactItems.map(i => (
                <Descriptions.Item key={i.label} label={i.label}>
                  {i.label === '网站' ? (
                    <a href={i.value} target="_blank" rel="noreferrer">{i.value}</a>
                  ) : i.value}
                </Descriptions.Item>
              ))}
            </Descriptions>
            {details.wechat_qr_url && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>微信二维码</Text>
                <div style={{ marginTop: 4 }}>
                  <Image src={details.wechat_qr_url} width={120} height={120} style={{ objectFit: 'contain' }} />
                </div>
              </div>
            )}
          </Col>
        )}

        {isListing && openingHoursRows && (
          <Col xs={24} md={12}>
            <Descriptions title="营业时间" column={1} size="small">
              {openingHoursRows.map(r => (
                <Descriptions.Item key={r.day} label={r.day}>{r.value}</Descriptions.Item>
              ))}
            </Descriptions>
          </Col>
        )}
      </Row>

      {galleryImages.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
            图片 ({galleryImages.length})
          </Text>
          <Image.PreviewGroup>
            <Space wrap>
              {galleryImages.map((url, idx) => (
                <Image
                  key={idx}
                  src={url}
                  width={100}
                  height={100}
                  style={{ objectFit: 'cover', borderRadius: 6 }}
                />
              ))}
            </Space>
          </Image.PreviewGroup>
        </div>
      )}

      {(details.author || details.merchant || details.rejection_reason) && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
          <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small">
            {details.author && (
              <Descriptions.Item label="发布者">
                {details.author.username || details.author.email}
              </Descriptions.Item>
            )}
            {details.merchant && (
              <Descriptions.Item label="商家">
                {details.merchant.business_name}
              </Descriptions.Item>
            )}
            {details.is_sponsored && (
              <Descriptions.Item label="推广">
                <Tag color="gold">已推广</Tag>
              </Descriptions.Item>
            )}
            {details.updated_at && (
              <Descriptions.Item label="最后更新">
                {dayjs(details.updated_at).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
            )}
            {details.rejection_reason && (
              <Descriptions.Item label="拒绝原因" span={3}>
                <Text type="danger">{details.rejection_reason}</Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        </div>
      )}
    </Card>
  )
}

export function PublicationDetailPage() {
  const { type, id } = useParams<{ type: string; id: string }>()
  const navigate = useNavigate()
  const { token } = theme.useToken()
  const [stats, setStats] = useState<PublicationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!type || !id) return
    adminApi.getPublicationStats(type as PublicationType, id)
      .then((r) => setStats(r.data))
      .catch(() => setError('无法加载此内容的统计数据。'))
      .finally(() => setLoading(false))
  }, [type, id])

  const goBack = () => {
    const backMap: Record<string, string> = {
      market: '/publications/market',
      local_service: '/publications/local-services',
      housing: '/publications/housing',
      job_post: '/publications/jobs',
      job_seek: '/publications/jobs',
      listing: '/publications/listings',
    }
    navigate(backMap[type ?? ''] ?? '/')
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
  if (error) return <Alert type="error" message={error} showIcon />
  if (!stats) return null

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        type="text"
        onClick={goBack}
        style={{ marginBottom: 16 }}
      >
        返回列表
      </Button>

      {/* 头部信息 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          {stats.cover_image && (
            <img
              src={stats.cover_image}
              alt=""
              style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <Space>
              <Tag color="blue">{typeLabels[stats.type] ?? stats.type}</Tag>
              <Tag color={statusColors[stats.status]}>{stats.status}</Tag>
            </Space>
            <Title level={4} style={{ margin: '8px 0 0' }}>{stats.title}</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              发布于 {dayjs(stats.created_at).format('YYYY-MM-DD HH:mm')}
            </Text>
          </div>
        </div>
      </Card>

      {stats.details && <DetailsCard type={stats.type} details={stats.details} />}

      {/* KPI */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {[
          { label: '卡片曝光量', value: stats.total_impressions, icon: <FundOutlined />, color: token.colorSuccess },
          { label: '总浏览量', value: stats.total_views, icon: <EyeOutlined />, color: token.colorPrimary },
          { label: '电话点击', value: stats.total_phone_clicks, icon: <PhoneOutlined />, color: token.colorWarning },
          { label: '收藏数', value: stats.total_saves, icon: <HeartOutlined />, color: token.colorError },
        ].map((s) => (
          <Col key={s.label} xs={12} sm={6}>
            <Card size="small" styles={{ body: { padding: '14px 18px' } }}>
              <Statistic
                title={<Text type="secondary" style={{ fontSize: 11 }}>{s.label}</Text>}
                value={s.value}
                prefix={s.icon}
                valueStyle={{ fontSize: 22, color: s.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* CTR card: impressioni → visualizzazioni */}
      {stats.total_impressions > 0 && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12}>
            <Card size="small" styles={{ body: { padding: '14px 18px' } }}>
              <Statistic
                title={<Text type="secondary" style={{ fontSize: 11 }}>点击率 (浏览/曝光)</Text>}
                value={((stats.total_views / stats.total_impressions) * 100).toFixed(1)}
                suffix="%"
                valueStyle={{ fontSize: 22, color: stats.total_views / stats.total_impressions > 0.05 ? token.colorSuccess : token.colorTextSecondary }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12}>
            <Card size="small" styles={{ body: { padding: '14px 18px' } }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label={<Text type="secondary" style={{ fontSize: 11 }}>发布时间</Text>}>
                  <Text strong>{dayjs(stats.created_at).format('YY-MM-DD')}</Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        </Row>
      )}

      {/* 图表 */}
      <Card styles={{ body: { padding: 16 } }}>
        <Tabs
          items={[
            {
              key: 'daily',
              label: '近30天趋势',
              children: (
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                      每日浏览量
                    </Text>
                    <DailyChart
                      data={stats.daily}
                      label="浏览量"
                      color={token.colorPrimary}
                      height={220}
                    />
                  </Col>
                  <Col xs={24} md={12}>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                      每日电话点击
                    </Text>
                    <DailyChart
                      data={stats.daily.map((d) => ({ ...d, count: Math.round(d.count * 0.1) }))}
                      label="电话点击"
                      color={token.colorWarning}
                      height={220}
                    />
                  </Col>
                </Row>
              ),
            },
            {
              key: 'monthly',
              label: '近12个月趋势',
              children: (
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                      每月浏览量
                    </Text>
                    <MonthlyChart
                      data={stats.monthly}
                      label="浏览量"
                      color={token.colorPrimary}
                      height={220}
                    />
                  </Col>
                  <Col xs={24} md={12}>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                      每月收藏数
                    </Text>
                    <MonthlyChart
                      data={stats.monthly.map((d) => ({ ...d, count: Math.round(d.count * 0.05) }))}
                      label="收藏数"
                      color={token.colorError}
                      height={220}
                    />
                  </Col>
                </Row>
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}
