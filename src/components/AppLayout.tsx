import { Layout, Menu, Select, Button, Space, Typography } from 'antd'
import {
  DashboardOutlined,
  UnorderedListOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  PlusOutlined
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useProjectStore } from '../stores/project-store'

const { Header, Sider, Content, Footer } = Layout

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '概览' },
  { key: '/tasks', icon: <UnorderedListOutlined />, label: '任务' },
  { key: '/execution', icon: <PlayCircleOutlined />, label: '执行' },
  { key: '/reports', icon: <FileTextOutlined />, label: '报告' }
]

export default function AppLayout(): React.ReactElement {
  const navigate = useNavigate()
  const location = useLocation()
  const { projects, activeProject, fetchProjects, fetchActiveProject, addProject, setActive } = useProjectStore()

  useEffect(() => {
    fetchProjects()
    fetchActiveProject()
  }, [])

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <Space>
          <Typography.Text strong style={{ color: '#fff', fontSize: 16, marginRight: 16 }}>
            Claude Code Manager
          </Typography.Text>
          <Select
            value={activeProject?.id}
            onChange={(id) => setActive(id)}
            style={{ width: 200 }}
            placeholder="选择项目"
            options={projects.map(p => ({ label: p.name, value: p.id }))}
          />
          <Button icon={<PlusOutlined />} onClick={addProject} size="small">
            添加项目
          </Button>
        </Space>
      </Header>
      <Layout>
        <Sider width={160} theme="light">
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ height: '100%' }}
          />
        </Sider>
        <Content style={{ padding: 24, overflow: 'auto' }}>
          <Outlet />
        </Content>
      </Layout>
      <Footer style={{ textAlign: 'center', padding: '8px 24px', fontSize: 12, color: '#999' }}>
        {activeProject?.projectRoot ?? '未选择项目'} | AI Automation Desktop
      </Footer>
    </Layout>
  )
}
