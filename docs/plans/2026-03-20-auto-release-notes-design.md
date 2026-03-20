# Auto Release Notes Design

## Date: 2026-03-20

## Problem

每次发布新版本后，GitHub Release 页面没有版本变更信息，用户不清楚改动了哪些部分。

## Approach: GitHub 内置 + Commit 解析

选择方案 A（GitHub 内置），零依赖，从 Conventional Commits 前缀自动生成分类 Release Notes。

### 设计

#### 1. 新增 `.github/release.yml`（Release Notes 分类配置）

GitHub 原生支持的 changelog 分类配置文件，定义 label 到分类的映射。

#### 2. 新增独立 job: `release-notes`

在现有 `release.yml` workflow 中新增一个独立 job（不依赖构建 matrix），负责：

1. 获取上一个 tag（`git describe --tags --abbrev=0 HEAD^`）
2. 读取两个 tag 之间的 commit log
3. 按 Conventional Commits 前缀分类：
   - `feat:` → 🚀 New Features
   - `fix:` → 🐛 Bug Fixes
   - `chore:/ci:/docs:/refactor:` → 🔧 Maintenance
   - 其他 → 📦 Other Changes
4. 拼接 markdown 作为 Release body
5. 通过 GitHub API 更新 Release 的 body

#### 3. 修改 release scripts

保持现有 `release:patch/minor/major` npm 脚本不变，发版流程不变。

### 最终效果

推送 tag 后，GitHub Release 页面自动显示：

```
## 🚀 New Features
- 添加任务批量执行功能

## 🐛 Bug Fixes
- 修复日志流中断问题

## 🔧 Maintenance
- 升级 Node 到 22
```

### 不做什么

- 不引入第三方 npm 工具（conventional-changelog, release-please 等）
- 不生成 CHANGELOG.md 文件
- 不自动决定版本号（仍由开发者通过 npm version 手动决定）
