import { readdirSync, readFileSync, existsSync } from 'fs'
import { join, basename, extname } from 'path'
import type { ReportSummary, ReportDetail } from './types'

export function listReports(automationDir: string): ReportSummary[] {
  const reportsDir = join(automationDir, 'reports')
  if (!existsSync(reportsDir)) return []

  const files = readdirSync(reportsDir)
    .filter(f => f.endsWith('.md'))
    .sort()
    .reverse()

  return files.map(file => {
    const filePath = join(reportsDir, file)
    const content = readFileSync(filePath, 'utf-8')
    const date = basename(file, extname(file))

    const taskCountMatch = content.match(/共\s*(\d+)\s*个任务/)
    const successMatch = content.match(/成功[：:]\s*(\d+)/)
    const failMatch = content.match(/失败[：:]\s*(\d+)/)

    return {
      date,
      filePath,
      taskCount: taskCountMatch ? parseInt(taskCountMatch[1]) : 0,
      successCount: successMatch ? parseInt(successMatch[1]) : 0,
      failCount: failMatch ? parseInt(failMatch[1]) : 0
    }
  })
}

export function getReport(automationDir: string, date: string): ReportDetail {
  const filePath = join(automationDir, 'reports', `${date}.md`)
  if (!existsSync(filePath)) {
    throw new Error(`Report for ${date} not found`)
  }

  const content = readFileSync(filePath, 'utf-8')
  const summary = listReports(automationDir).find(r => r.date === date)

  return {
    date,
    filePath,
    content,
    taskCount: summary?.taskCount ?? 0,
    successCount: summary?.successCount ?? 0,
    failCount: summary?.failCount ?? 0
  }
}
