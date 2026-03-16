import { HashRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './ai/theme'
import './ai/theme/global.css'
import { AppShell } from './ai/layouts'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import TaskEditor from './pages/TaskEditor'
import Execution from './pages/Execution'
import Reports from './pages/Reports'

export default function App(): React.ReactElement {
  return (
    <ThemeProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/tasks/new" element={<TaskEditor />} />
            <Route path="/tasks/:id/edit" element={<TaskEditor />} />
            <Route path="/execution" element={<Execution />} />
            <Route path="/reports" element={<Reports />} />
          </Route>
        </Routes>
      </HashRouter>
    </ThemeProvider>
  )
}
