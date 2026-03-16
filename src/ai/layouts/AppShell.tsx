import { Layout, Menu } from 'antd'
import {
  DashboardOutlined,
  UnorderedListOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useProjectStore } from '../../stores/project-store'
import { ThemeToggle } from '../components'
import ProjectSwitcher from '../patterns/ProjectSwitcher'
import { useTheme } from '../theme'

const { Header, Sider, Content, Footer } = Layout

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '概览' },
  { key: '/tasks', icon: <UnorderedListOutlined />, label: '任务' },
  { key: '/execution', icon: <PlayCircleOutlined />, label: '执行' },
  { key: '/reports', icon: <FileTextOutlined />, label: '报告' },
]

export default function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const { activeProject, fetchProjects, fetchActiveProject } = useProjectStore()
  const { isDark } = useTheme()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    fetchProjects()
    fetchActiveProject()
  }, [])

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          height: 48,
          lineHeight: '48px',
          borderBottom: `1px solid ${isDark ? '#2D333B' : '#e8e8e8'}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span
            onClick={() => setCollapsed(!collapsed)}
            style={{ cursor: 'pointer', fontSize: 16, color: isDark ? '#7D8590' : 'rgba(0,0,0,0.45)', display: 'flex' }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </span>
          <span style={{
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: '-0.02em',
            color: isDark ? '#E6EDF3' : 'rgba(0,0,0,0.88)',
          }}>
            <span style={{ color: '#00E5CC' }}>AI</span> Automation
          </span>
          <ProjectSwitcher />
        </div>
        <ThemeToggle />
      </Header>

      <Layout>
        <Sider
          width={180}
          collapsedWidth={60}
          collapsed={collapsed}
          theme={isDark ? 'dark' : 'light'}
          style={{
            borderRight: `1px solid ${isDark ? '#2D333B' : '#e8e8e8'}`,
            overflow: 'auto',
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{
              height: '100%',
              borderRight: 'none',
              paddingTop: 8,
            }}
          />
        </Sider>

        <Content style={{ padding: 24, overflow: 'auto' }}>
          <Outlet />
        </Content>
      </Layout>

      <Footer
        style={{
          textAlign: 'center',
          padding: '6px 24px',
          fontSize: 11,
          borderTop: `1px solid ${isDark ? '#21262D' : '#e8e8e8'}`,
        }}
      >
        {activeProject?.projectRoot ?? '未选择项目'}
      </Footer>
    </Layout>
  )
}
