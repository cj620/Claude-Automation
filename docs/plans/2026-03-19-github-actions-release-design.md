# GitHub Actions 自动发布设计

## 背景

每次发布版本需要手动运行 `npm run build:win` / `npm run build:mac`，再手动上传产物。通过 GitHub Actions 实现推送 tag 后自动构建并发布到 GitHub Releases。

## 需求

- **平台**: Windows (NSIS .exe) + macOS (DMG)
- **触发**: 推送 `v*.*.*` 格式的 Git Tag
- **发布**: 上传到 GitHub Releases (Draft 模式)
- **签名**: macOS 暂不签名

## 方案：单 Workflow + Matrix 策略

### 架构

```
推送 v*.*.* tag
    ↓
GitHub Actions → release.yml
    ↓
┌──────────────────┬──────────────────┐
│  windows-latest  │  macos-latest    │  ← matrix 并行
│  electron-vite   │  electron-vite   │
│  electron-builder│  electron-builder│
│  --win --publish │  --mac --publish │
└────────┬─────────┴────────┬─────────┘
         └────────┬─────────┘
                  ↓
         GitHub Release (Draft)
         ├── Claude Automation Setup x.x.x.exe
         ├── Claude Automation-x.x.x.dmg
         ├── latest.yml
         └── latest-mac.yml
```

### 关键设计决策

1. **Draft Release**: 构建完成后创建草稿，需手动确认发布，防止发布有问题的版本
2. **electron-builder `--publish always`**: 利用 electron-builder 内置的 GitHub publish 能力，无需额外 action
3. **`GITHUB_TOKEN`**: GitHub 自动提供，无需配置 secrets
4. **Node 20 + npm cache**: 加速依赖安装

### 需修改的文件

1. **新建** `.github/workflows/release.yml`
2. **修改** `package.json` — build 配置中添加 `publish` 字段

### 发布操作流程

```bash
# 更新 package.json version
git add package.json
git commit -m "release: v0.2.0"
git tag v0.2.0
git push origin v0.2.0
# → Actions 自动构建 → GitHub Releases 出现草稿 → 手动确认发布
```
