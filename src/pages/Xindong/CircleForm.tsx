import { useEffect, useState } from 'react'
import { Form, Input, Switch, Button, Card, Upload, Typography, Space, Alert, message } from 'antd'
import { UploadOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import type { UploadFile } from 'antd/es/upload/interface'
import { adminApi } from '../../api/admin'
import type { XindongCircleInput } from '../../types'

const { Title } = Typography

export function CircleFormPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(!!id)
  const [error, setError] = useState<string | null>(null)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [coverUrl, setCoverUrl] = useState('')
  const isEdit = !!id

  useEffect(() => {
    if (!id) return
    adminApi.getXindongCircle(Number(id)).then(r => {
      const c = r.data
      form.setFieldsValue({
        name: c.name, description: c.description,
        is_default: c.is_default, is_active: c.is_active,
      })
      setCoverUrl(c.cover_image)
      if (c.cover_image) setFileList([{ uid: '-1', name: 'cover.jpg', status: 'done', url: c.cover_image }])
    }).finally(() => setInitLoading(false))
  }, [id, form])

  async function onFileChange({ fileList: fl }: { fileList: UploadFile[] }) {
    const file = fl[0]?.originFileObj
    if (file) {
      setFileList([{ uid: fl[0].uid, name: fl[0].name, status: 'uploading' }])
      setUploading(true)
      try {
        const res = await adminApi.uploadXindongCircleCover(file)
        setCoverUrl(res.data.url)
        setFileList([{ uid: fl[0].uid, name: fl[0].name, status: 'done', url: res.data.url }])
      } catch {
        message.error('图片上传失败')
        setFileList([])
        setCoverUrl('')
      } finally {
        setUploading(false)
      }
    } else if (fl.length === 0) {
      setCoverUrl('')
      setFileList([])
    }
  }

  const onFinish = async (values: Record<string, unknown>) => {
    setLoading(true); setError(null)
    try {
      const payload: XindongCircleInput = { ...(values as XindongCircleInput), cover_image: coverUrl }
      if (isEdit && id) {
        await adminApi.updateXindongCircle(Number(id), payload)
        message.success('圈子已更新')
      } else {
        await adminApi.createXindongCircle(payload)
        message.success('圈子已创建')
      }
      navigate('/xindong/circles')
    } catch {
      setError('保存失败，请检查所有字段。')
    } finally {
      setLoading(false)
    }
  }

  if (initLoading) return null

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/xindong/circles')} style={{ marginBottom: 16 }}>
        返回圈子列表
      </Button>
      <Title level={4}>{isEdit ? '编辑圈子' : '新建圈子'}</Title>
      {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} showIcon />}

      <Card style={{ maxWidth: 640 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ is_default: false, is_active: true }}
        >
          <Form.Item label="封面图片">
            <Upload
              listType="picture-card"
              fileList={fileList}
              beforeUpload={() => false}
              onChange={onFileChange}
              maxCount={1}
              accept="image/*"
              disabled={uploading}
            >
              {fileList.length === 0 && <div><UploadOutlined /><div style={{ marginTop: 8 }}>{uploading ? '上传中…' : '上传'}</div></div>}
            </Upload>
          </Form.Item>

          <Form.Item name="name" label="圈子名称" rules={[{ required: true, message: '请填写圈子名称' }]}>
            <Input placeholder="如：旅行搭子" maxLength={40} />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="简单介绍一下这个圈子" maxLength={200} rows={3} />
          </Form.Item>

          <Form.Item name="is_default" label="默认圈子" valuePropName="checked" extra="默认圈子会在首页优先展示">
            <Switch />
          </Form.Item>

          <Form.Item name="is_active" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Space>
            <Button type="primary" htmlType="submit" loading={loading} disabled={uploading}>
              {isEdit ? '更新圈子' : '创建圈子'}
            </Button>
            <Button onClick={() => navigate('/xindong/circles')}>取消</Button>
          </Space>
        </Form>
      </Card>
    </div>
  )
}
