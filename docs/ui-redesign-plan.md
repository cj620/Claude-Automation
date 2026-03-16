# UI/UX Redesign - Claude Automation

## Overview

Claude Automation 桌面应用的设计系统文档，定义了视觉规范、组件架构和交互模式。

**Version:** 1.0
**Last Updated:** 2026-03-16
**Default Theme:** Dark

---

## 1. Design Tokens

### 1.1 Ant Design Tokens

| Token                | Dark                       | Light              |
| -------------------- | -------------------------- | ------------------ |
| `colorPrimary`       | `#00E5CC`                  | `#00B8A3`          |
| `colorSuccess`       | `#00E676`                  | `#52c41a`          |
| `colorError`         | `#FF5252`                  | `#ff4d4f`          |
| `colorWarning`       | `#F5A623`                  | `#faad14`          |
| `colorInfo`          | `#00E5CC`                  | `#00B8A3`          |
| `colorBgContainer`   | `#1A1D23`                  | `#ffffff`          |
| `colorBgLayout`      | `#12151A`                  | `#F4F6F8`          |
| `colorBgElevated`    | `#222730`                  | `#ffffff`          |
| `colorBorder`        | `#2D333B`                  | `#d9d9d9`          |
| `colorText`          | `#E6EDF3`                  | `rgba(0,0,0,0.88)` |
| `colorTextSecondary` | `#7D8590`                  | `rgba(0,0,0,0.45)` |
| `fontFamily`         | Geist Sans / Inter         | same               |
| `fontFamilyCode`     | JetBrains Mono / Fira Code | same               |
| `borderRadius`       | 6                          | 6                  |

### 1.2 Semantic CSS Variables

| Variable                    | Dark                   | Light                  |
| --------------------------- | ---------------------- | ---------------------- |
| `--ai-color-status-pending` | `#7D8590`              | `rgba(0,0,0,0.25)`     |
| `--ai-color-status-running` | `#00E5CC`              | `#00B8A3`              |
| `--ai-color-status-done`    | `#00E676`              | `#52c41a`              |
| `--ai-color-status-failed`  | `#FF5252`              | `#ff4d4f`              |
| `--ai-color-glow`           | `rgba(0,229,204,0.12)` | `rgba(0,184,163,0.08)` |
| `--ai-color-terminal-bg`    | `#0D1117`              | `#1e1e1e`              |
| `--ai-color-terminal-text`  | `#C9D1D9`              | `#d4d4d4`              |
| `--ai-color-terminal-dim`   | `#484F58`              | `#666666`              |
| `--ai-color-sidebar-active` | `#00E5CC`              | `#00B8A3`              |
| `--ai-color-header-bg`      | `#161B22`              | `#ffffff`              |

---

## 2. Component Architecture

### 2.1 File Structure

```
src/ai/
├── theme/                    # Theme system
│   ├── tokens.ts            # Design tokens
│   ├── theme-store.ts       # Zustand store
│   ├── theme-provider.tsx   # ConfigProvider wrapper
│   ├── global.css           # Global styles
│   └── index.ts
├── components/              # Foundation components
│   ├── StatusBadge.tsx      # Status indicator
│   ├── StatCard.tsx         # Statistics card
│   ├── LogViewer.tsx        # Terminal-style log display
│   ├── TaskCard.tsx         # Task item card
│   ├── PageHeader.tsx       # Page header
│   ├── EmptyState.tsx       # Empty state
│   ├── MarkdownRenderer.tsx # Markdown display
│   ├── ThemeToggle.tsx      # Theme switcher
│   └── index.ts
├── layouts/                  # Layout components
│   ├── AppShell.tsx         # Main app shell
│   ├── MasterDetail.tsx     # Master-detail layout
│   ├── SplitPane.tsx        # Side-by-side layout
│   └── index.ts
├── patterns/                # Reusable patterns
│   ├── KanbanBoard.tsx      # Task kanban
│   ├── ActionBar.tsx        # Action button group
│   ├── ProjectSwitcher.tsx  # Project selector
│   └── index.ts
└── constants/               # Shared constants
    ├── status.ts            # Task status config
    └── index.ts
```

### 2.2 Component Usage

**PageHeader**

```tsx
<PageHeader
  title="任务"
  subtitle="管理你的 AI 任务"
  actions={<Button>新建</Button>}
/>
```

**StatCard**

```tsx
<StatCard
  title="已完成"
  value={12}
  icon={<CheckCircleOutlined />}
  status="done"
/>
```

**LogViewer**

```tsx
<LogViewer logs={logs} loading={isRunning} emptyText="等待执行..." />
```

**KanbanBoard**

```tsx
<KanbanBoard
  columns={columns}
  tasks={tasks}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onRetry={handleRetry}
/>
```

**MasterDetail**

```tsx
<MasterDetail
  sidebarTitle="任务列表"
  sidebar={listContent}
  content={detailContent}
/>
```

---

## 3. Page Layouts

### 3.1 Dashboard

- PageHeader with actions (New Task, Start Execution)
- 4x StatCard in CSS Grid (4 columns)
- Recent tasks list with TaskCard

### 3.2 Tasks

- PageHeader with New Task button
- KanbanBoard (4 columns: pending/running/done/failed)

### 3.3 TaskEditor

- PageHeader with Save/SaveAndRun/Cancel buttons
- SplitPane: Form (left) + Markdown Preview (right)

### 3.4 Execution

- PageHeader with Start/Stop/Clear buttons + Progress bar
- MasterDetail: Task list (left) + LogViewer (right)

### 3.5 Reports

- PageHeader
- MasterDetail: Report list (left) + MarkdownRenderer (right)

---

## 4. Migration Summary

| Phase                 | Status      |
| --------------------- | ----------- |
| Theme Foundation      | ✅ Complete |
| Foundation Components | ✅ Complete |
| Layouts & Patterns    | ✅ Complete |
| Page Migration        | ✅ Complete |
| Cleanup               | ✅ Complete |

**Files Created:** 20+
**Files Modified:** 6 (pages)
**Files Deleted:** 1 (old AppLayout.tsx)

---

## 5. Future Enhancements

- Syntax highlighting in MarkdownRenderer (rehype-highlight)
- Drag-and-drop in KanbanBoard
- Keyboard shortcuts
- Task search/filter
- Export/import functionality
