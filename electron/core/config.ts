import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { v4 as uuidv4 } from 'uuid'
import type { ProjectsConfig, Project, RunnerConfig, Schedule } from './types'

const CONFIG_DIR = join(homedir(), '.ai-automation')
const CONFIG_FILE = join(CONFIG_DIR, 'projects.json')

export const DEFAULT_RUNNER_CONFIG: RunnerConfig = {
  maxTurns: 10,
  maxBudgetUsd: 5.0,
  taskTimeoutMs: 10 * 60 * 1000,
  sleepBetweenTasksMs: 5 * 1000,
  retryDelayMs: 30 * 60 * 1000,
  allowedTools: [
    'Read', 'Edit', 'Write', 'Glob', 'Grep',
    'Bash(git diff *)', 'Bash(git add *)', 'Bash(git status)',
    'Bash(npx tsc --noEmit *)'
  ],
  executionMode: 'branch'  // 默认使用分支模式
}

export function loadProjectsConfig(): ProjectsConfig {
  if (!existsSync(CONFIG_FILE)) {
    return { activeProject: '', projects: [], schedules: [] }
  }
  const raw = readFileSync(CONFIG_FILE, 'utf-8')
  const config = JSON.parse(raw) as ProjectsConfig

  // Migrate: add schedules array if missing (pre-scheduler configs)
  if (!config.schedules) {
    config.schedules = []
  }

  // Migrate any projects still pointing to old in-project paths
  let dirty = false
  for (const project of config.projects) {
    const expectedDir = join(CONFIG_DIR, 'data', project.id)
    if (project.automationDir !== expectedDir) {
      project.automationDir = expectedDir
      dirty = true
    }
  }
  if (dirty) {
    saveProjectsConfig(config)
  }

  return config
}

export function saveProjectsConfig(config: ProjectsConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true })
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
}

export function getActiveProject(): Project | null {
  const config = loadProjectsConfig()
  if (!config.activeProject || config.projects.length === 0) return null
  return config.projects.find(p => p.id === config.activeProject) ?? null
}

export function addProject(projectRoot: string, name: string): Project {
  const config = loadProjectsConfig()
  const id = uuidv4()
  const project: Project = {
    id,
    name,
    projectRoot,
    automationDir: join(CONFIG_DIR, 'data', id),
    config: { ...DEFAULT_RUNNER_CONFIG }
  }
  config.projects.push(project)
  if (!config.activeProject) {
    config.activeProject = project.id
  }
  saveProjectsConfig(config)
  return project
}

export function removeProject(id: string): void {
  const config = loadProjectsConfig()
  config.projects = config.projects.filter(p => p.id !== id)
  if (config.activeProject === id) {
    config.activeProject = config.projects[0]?.id ?? ''
  }
  saveProjectsConfig(config)
}

export function setActiveProject(id: string): void {
  const config = loadProjectsConfig()
  if (!config.projects.find(p => p.id === id)) {
    throw new Error(`Project ${id} not found`)
  }
  config.activeProject = id
  saveProjectsConfig(config)
}

export function updateProjectConfig(id: string, updates: Partial<RunnerConfig>): Project {
  const config = loadProjectsConfig()
  const project = config.projects.find(p => p.id === id)
  if (!project) {
    throw new Error(`Project ${id} not found`)
  }
  project.config = { ...project.config, ...updates }
  saveProjectsConfig(config)
  return project
}

export function loadSchedules(): Schedule[] {
  const config = loadProjectsConfig()
  return config.schedules
}

export function saveSchedules(schedules: Schedule[]): void {
  const config = loadProjectsConfig()
  config.schedules = schedules
  saveProjectsConfig(config)
}
