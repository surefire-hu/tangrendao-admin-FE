import { useEffect, useState } from 'react'
import {
  Card, Typography, Button, Input, Switch, Space, message, Spin, Upload,
  Image, Row, Col, Form, Select, Alert,
} from 'antd'
import { ArrowLeftOutlined, UploadOutlined, SaveOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import { useNavigate, useParams } from 'react-router-dom'
import { adminApi } from '../../api/admin'
import type { AdminNewsArticle, AdminNewsArticleInput } from '../../types'

const { Title, Text } = Typography
const { TextArea } = Input

export function NewsEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [article, setArticle] = useState<AdminNewsArticle | null>(null)
  const [form] = Form.useForm<AdminNewsArticleInput & { is_original: boolean; is_published: boolean }>()
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!isEdit || !id) return
    setLoading(true)
    adminApi.getNewsArticle(id)
      .then(r => {
        setArticle(r.data)
        form.setFieldsValue({
          title:        r.data.title,
          summary:      r.data.summary,
          content_html: r.data.content_html,
          country:      r.data.country,
          source:       r.data.source,
          is_original:  r.data.is_original,
          is_published: r.data.is_published,
        })
        setCoverPreview(r.data.cover_image || null)
      })
      .catch(() => message.error('加载失败'))
      .finally(() => setLoading(false))
  }, [id, isEdit, form])

  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    if (!file.type.startsWith('image/')) {
      message.error('仅支持图片')
      return Upload.LIST_IGNORE
    }
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
    return false
  }

  async function save() {
    let values: AdminNewsArticleInput
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    setSaving(true)
    try {
      const payload: AdminNewsArticleInput = { ...values }
      if (coverFile) payload.cover_image = coverFile

      if (isEdit && id) {
        await adminApi.updateNewsArticle(id, payload)
        message.success('已保存')
      } else {
        await adminApi.createNewsArticle(payload)
        message.success('已创建')
      }
      navigate('/news')
    } catch {
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} type="text"
              onClick={() => navigate('/news')} style={{ marginBottom: 16 }}>
        返回列表
      </Button>

      <Title level={4}>{isEdit ? '编辑新闻' : '新建新闻'}</Title>

      <Form
        layout="vertical"
        form={form}
        initialValues={{ is_original: true, is_published: false, country: '' }}
      >
        <Row gutter={24}>
          <Col xs={24} lg={16}>
            <Card>
              <Form.Item label="标题" name="title"
                         rules={[{ required: true, message: '请输入标题' }]}>
                <Input maxLength={300} placeholder="新闻标题" />
              </Form.Item>

              <Form.Item label="摘要 (列表与通知中显示)" name="summary">
                <TextArea rows={2} maxLength={500} showCount placeholder="简短摘要" />
              </Form.Item>

              <Form.Item label="正文 (HTML)" name="content_html"
                         rules={[{ required: true, message: '请输入正文' }]}>
                <TextArea
                  rows={18}
                  placeholder="支持 HTML 标签 — 段落用 <p>...</p>, 换行 <br/>, 图片 <img src=...>"
                  style={{ fontFamily: 'monospace', fontSize: 13 }}
                />
              </Form.Item>
              <Alert
                type="info"
                showIcon
                message="正文以原始 HTML 渲染。请保证标签合法,不要插入脚本。"
              />
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card title="发布设置" size="small">
              <Form.Item label="封面图">
                {coverPreview && (
                  <Image src={coverPreview} width="100%" style={{ borderRadius: 6, marginBottom: 8 }}
                         preview={false} />
                )}
                <Upload beforeUpload={beforeUpload} showUploadList={false} accept="image/*">
                  <Button icon={<UploadOutlined />}>{coverPreview ? '更换' : '上传'}封面</Button>
                </Upload>
              </Form.Item>

              <Form.Item label="国家 (留空 = 全部)" name="country">
                <Select
                  allowClear
                  placeholder="全部"
                  options={[
                    { value: '',   label: '全部' },
                    { value: 'IT', label: '意大利' },
                    { value: 'DE', label: '德国' },
                    { value: 'FR', label: '法国' },
                    { value: 'ES', label: '西班牙' },
                    { value: 'GB', label: '英国' },
                    { value: 'PT', label: '葡萄牙' },
                    { value: 'NL', label: '荷兰' },
                    { value: 'BE', label: '比利时' },
                    { value: 'CH', label: '瑞士' },
                    { value: 'AT', label: '奥地利' },
                  ]}
                />
              </Form.Item>

              <Form.Item label="原创" name="is_original" valuePropName="checked">
                <Switch checkedChildren="原创" unCheckedChildren="转载" />
              </Form.Item>

              <Form.Item shouldUpdate={(p, c) => p.is_original !== c.is_original} noStyle>
                {({ getFieldValue }) => getFieldValue('is_original') ? null : (
                  <Form.Item label="来源说明" name="source"
                             rules={[{ required: true, message: '转载需填写来源' }]}>
                    <Input maxLength={500} placeholder="原文出处或链接" />
                  </Form.Item>
                )}
              </Form.Item>

              <Form.Item label="立即发布" name="is_published" valuePropName="checked"
                         tooltip="发布后会向所有用户推送通知">
                <Switch />
              </Form.Item>

              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={save}
                block
              >
                保存
              </Button>
              {article?.published_at && (
                <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                  首次发布: {article.published_at.replace('T', ' ').slice(0, 16)}
                </Text>
              )}
            </Card>
          </Col>
        </Row>
      </Form>
    </div>
  )
}
