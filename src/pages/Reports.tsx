import { useEffect, useState } from 'react'
import { Card, List, Empty, Tag, Space, Spin } from 'antd'
import { FileTextOutlined } from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'

interface ReportSummary {
  date: string
  taskCount: number
  successCount: number
  failCount: number
}

export default function Reports(): React.ReactElement {
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    window.api.reports.list().then((data) => {
      const list = data as ReportSummary[]
      setReports(list)
      if (list.length > 0) setSelectedDate(list[0].date)
    })
  }, [])

  useEffect(() => {
    if (!selectedDate) return
    setLoading(true)
    window.api.reports.get(selectedDate).then((detail) => {
      const d = detail as { content: string }
      setContent(d.content)
      setLoading(false)
    })
  }, [selectedDate])

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <Card title="报告列表" style={{ width: 260, flexShrink: 0 }}>
        {reports.length === 0 ? (
          <Empty description="暂无报告" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            size="small"
            dataSource={reports}
            renderItem={r => (
              <List.Item
                onClick={() => setSelectedDate(r.date)}
                style={{
                  cursor: 'pointer',
                  background: selectedDate === r.date ? '#e6f7ff' : undefined
                }}
              >
                <List.Item.Meta
                  avatar={<FileTextOutlined />}
                  title={r.date}
                  description={
                    <Space size={4}>
                      <Tag color="green">{r.successCount} 成功</Tag>
                      <Tag color="red">{r.failCount} 失败</Tag>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      <Card
        title={selectedDate ? `报告: ${selectedDate}` : '选择报告'}
        style={{ flex: 1 }}
        styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflow: 'auto' } }}
      >
        {loading ? (
          <Spin />
        ) : content ? (
          <ReactMarkdown>{content}</ReactMarkdown>
        ) : (
          <Empty description="选择左侧报告查看" />
        )}
      </Card>
    </div>
  )
}
