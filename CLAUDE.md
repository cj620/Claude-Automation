# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Automation is an Electron + React desktop application that manages Claude Code CLI tasks for automated code modifications. It provides a UI for creating tasks, executing them via Claude Code headless mode, and viewing execution reports.

**Tech Stack**: Electron 33, React 18, Ant Design 5, Zustand (state), React Router 6, TypeScript, electron-vite

## Common Commands

```bash
# Development
npm run dev              # Start dev server with hot reload

# Build
npm run build            # Production build
npm run preview          # Preview production build

# Type checking
npm run typecheck        # Run all TypeScript checks
npm run typecheck:web   # Check renderer process only
npm run typecheck:node  # Check main/preload only
```

## Architecture

### Project Structure

```
src/
├── main.tsx             # React entry point
├── App.tsx              # Root component with routing
├── pages/               # Page components (Dashboard, Tasks, TaskEditor, Execution, Reports)
├── stores/              # Zustand stores (project, task, runner)
└── ai/                  # Design system (theme, components, layouts, patterns)
    ├── theme/           # Dark/light theme tokens and provider
    ├── components/      # Reusable UI (StatusBadge, StatCard, LogViewer, etc.)
    ├── layouts/         # AppShell, MasterDetail, SplitPane
    ├── patterns/        # KanbanBoard, ActionBar, ProjectSwitcher
    └── constants/       # Status configurations

electron/                # Electron main process
├── main/index.ts        # Main process entry
├── preload/index.ts     # Preload script (exposes IPC APIs)
└── core/                # Core logic (runner, task-manager, config)
```

### State Management

Uses Zustand for state management:

- `src/stores/project-store.ts` - Project management
- `src/stores/task-store.ts` - Task CRUD operations
- `src/stores/runner-store.ts` - Execution state and log streaming

### IPC Communication

Renderer communicates with main process via `window.api` (exposed through preload):

- `window.api.projects.*` - Project operations
- `window.api.tasks.*` - Task operations
- `window.api.runner.*` - Execution control
- `window.api.reports.*` - Report generation

### Routing

Uses React Router v6 with HashRouter:

- `/` - Dashboard
- `/tasks` - Task board (kanban)
- `/tasks/new` - Create task
- `/tasks/:id/edit` - Edit task
- `/execution` - Execution monitoring with live logs
- `/reports` - View execution reports

### Design System

The project includes a comprehensive design system under `src/ai/`:

- **Theme**: Dark mode by default with light mode toggle. Primary accent: cyan `#00E5CC`
- **Components**: StatusBadge, StatCard, LogViewer, TaskCard, PageHeader, EmptyState, MarkdownRenderer, ThemeToggle
- **Layouts**: AppShell (main layout with collapsible sidebar), MasterDetail, SplitPane
- **Patterns**: KanbanBoard, ActionBar, ProjectSwitcher

## Key Files

- [src/App.tsx](src/App.tsx) - Root with ThemeProvider and routing
- [src/ai/theme/theme-provider.tsx](src/ai/theme/theme-provider.tsx) - Theme system
- [src/stores/runner-store.ts](src/stores/runner-store.ts) - Real-time log streaming via IPC
- [electron/preload/index.ts](electron/preload/index.ts) - IPC API definitions
- [docs/ui-redesign-plan.md](docs/ui-redesign-plan.md) - Design system documentation
- [TECHNICAL.md](TECHNICAL.md) - Technical architecture (Chinese)
- [USAGE.md](USAGE.md) - User manual (Chinese)
