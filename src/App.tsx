import { HashRouter, Routes, Route } from 'react-router-dom'
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import AppLayout from './components/AppLayout'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import TaskEditor from './pages/TaskEditor'
import Execution from './pages/Execution'
import Reports from './pages/Reports'

export default function App(): React.ReactElement {
  return (
    <ConfigProvider locale={zhCN} theme={{ algorithm: theme.defaultAlgorithm }}>
      <HashRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/tasks/new" element={<TaskEditor />} />
            <Route path="/tasks/:id/edit" element={<TaskEditor />} />
            <Route path="/execution" element={<Execution />} />
            <Route path="/reports" element={<Reports />} />
          </Route>
        </Routes>
      </HashRouter>
    </ConfigProvider>
  )
}
