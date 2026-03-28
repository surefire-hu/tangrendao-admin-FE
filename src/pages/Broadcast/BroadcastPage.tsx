import { useState } from 'react'
import {
  Form, Input, Button, Select, Card, Typography, Alert, Statistic,
  Row, Col, Divider, Upload, Image,
} from 'antd'
import { SendOutlined, PictureOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload/interface'
import { adminApi } from '../../api/admin'
import type { BroadcastPayload } from '../../types'

const { Title, Text } = Typography
const { TextArea } = Input

const ROLE_OPTIONS = [
  { value: '', label: '所有用户' },
  { value: 'user', label: '普通用户' },
  { value: 'merchant', label: '商家' },
  { value: 'moderator', label: '版主' },
  { value: 'admin', label: '管理员' },
]

const COUNTRY_OPTIONS = [
  { value: '', label: '所有国家' },
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
]

export function BroadcastPage() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [preview, setPreview] = useState<string>('')

  const onFinish = async (values: { title: string; body: string; target_role: string; target_country: string }) => {
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const payload: BroadcastPayload = {
        title: values.title,
        body: values.body,
        target_role: values.target_role || undefined,
        target_country: values.target_country || undefined,
        image: fileList[0]?.originFileObj as File | undefined,
      }
      const res = await adminApi.sendBroadcast(payload)
      setResult(res.data.sent_to)
      form.resetFields(['title', 'body'])
      setFileList([])
      setPreview('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '发送失败，请重试。')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = ({ fileList: fl }: { fileList: UploadFile[] }) => {
    setFileList(fl.slice(-1))
    const file = fl[fl.length - 1]?.originFileObj
    if (file) {
      const url = URL.createObjectURL(file)
      setPreview(url)
    } else {
      setPreview('')
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <Title level={4} style={{ marginBottom: 24 }}>广播通知</Title>

      {result !== null && (
        <Alert
          type="success"
          style={{ marginBottom: 16 }}
          message={
            <Row gutter={16} align="middle">
              <Col>
                <Statistic value={result} suffix="位用户" valueStyle={{ fontSize: 20 }} />
              </Col>
              <Col>
                <Text>通知发送成功。</Text>
              </Col>
            </Row>
          }
          closable
          onClose={() => setResult(null)}
        />
      )}

      {error && (
        <Alert
          type="error"
          message={error}
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setError(null)}
        />
      )}

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ target_role: '', target_country: '' }}
        >
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="通知标题" maxLength={200} showCount />
          </Form.Item>

          <Form.Item
            name="body"
            label="内容"
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <TextArea
              placeholder="通知内容"
              rows={4}
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item label="图片（可选）">
            <Row gutter={12} align="middle">
              <Col>
                <Upload
                  listType="picture-card"
                  fileList={fileList}
                  beforeUpload={() => false}
                  onChange={handleFileChange}
                  maxCount={1}
                  accept="image/*"
                  showUploadList={false}
                >
                  {preview ? (
                    <img
                      src={preview}
                      alt="preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }}
                    />
                  ) : (
                    <div>
                      <PictureOutlined style={{ fontSize: 20 }} />
                      <div style={{ marginTop: 6, fontSize: 12 }}>上传图片</div>
                    </div>
                  )}
                </Upload>
              </Col>
              {preview && (
                <Col>
                  <Button
                    size="small"
                    danger
                    onClick={() => { setFileList([]); setPreview('') }}
                  >
                    移除
                  </Button>
                </Col>
              )}
            </Row>
            <Text type="secondary" style={{ fontSize: 12 }}>建议比例 2:1，最大 2MB</Text>
          </Form.Item>

          <Divider orientation="left" plain>目标用户</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="target_role" label="用户角色">
                <Select options={ROLE_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="target_country" label="国家">
                <Select options={COUNTRY_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SendOutlined />}
              loading={loading}
              danger
            >
              发送通知
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
