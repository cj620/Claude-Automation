import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { v4 as uuidv4 } from 'uuid'
import type { ProjectsConfig, Project, RunnerConfig } from './types'

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
  ]
}

export function loadProjectsConfig(): ProjectsConfig {
  if (!existsSync(CONFIG_FILE)) {
    return { activeProject: '', projects: [] }
  }
  const raw = readFileSync(CONFIG_FILE, 'utf-8')
  return JSON.parse(raw) as ProjectsConfig
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
  const project: Project = {
    id: uuidv4(),
    name,
    projectRoot,
    automationDir: join(projectRoot, 'ai-automation'),
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
