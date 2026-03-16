import { useEffect, useState } from 'react'
import { List, Tag, Space, Spin } from 'antd'
import { FileTextOutlined } from '@ant-design/icons'
import { PageHeader, MarkdownRenderer, EmptyState } from '../ai/components'
import { MasterDetail } from '../ai/layouts'

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
    <div>
      <PageHeader title="报告" />

      <MasterDetail
        sidebarTitle="报告列表"
        sidebarWidth={260}
        sidebar={
          reports.length === 0 ? (
            <EmptyState type="no-reports" />
          ) : (
            <List
              size="small"
              dataSource={reports}
              renderItem={(r) => (
                <List.Item
                  onClick={() => setSelectedDate(r.date)}
                  style={{
                    cursor: 'pointer',
                    background: selectedDate === r.date ? 'var(--ai-color-glow)' : undefined,
                    padding: '8px 12px',
                    borderRadius: 4,
                    transition: 'background 0.2s',
                  }}
                >
                  <List.Item.Meta
                    avatar={<FileTextOutlined style={{ color: 'var(--ai-color-status-running)' }} />}
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
          )
        }
        contentTitle={selectedDate ? `报告: ${selectedDate}` : '选择报告'}
        content={
          <div style={{ padding: 20 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 48 }}>
                <Spin />
              </div>
            ) : content ? (
              <MarkdownRenderer content={content} maxHeight="calc(100vh - 280px)" />
            ) : (
              <EmptyState type="no-reports" description="选择左侧报告查看" />
            )}
          </div>
        }
      />
    </div>
  )
}
