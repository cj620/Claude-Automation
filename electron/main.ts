import { app, BrowserWindow, shell, dialog } from "electron";
import { join } from "path";
import { execSync } from "child_process";
import { is } from "@electron-toolkit/utils";
import { registerProjectsIpc } from "./ipc/projects";
import { registerTasksIpc } from "./ipc/tasks";
import { registerRunnerIpc } from "./ipc/runner";
import { registerReportsIpc } from "./ipc/reports";
import { getRunnerStatus, stopRunner } from "./core/runner";

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Claude Automation",
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("close", (e) => {
    const { isRunning } = getRunnerStatus();
    if (isRunning) {
      const choice = dialog.showMessageBoxSync(mainWindow!, {
        type: "warning",
        buttons: ["取消", "强制关闭"],
        defaultId: 0,
        title: "确认关闭",
        message: "有任务正在执行，关闭将中止执行。确定要关闭吗？",
      });
      if (choice === 0) {
        e.preventDefault();
      } else {
        stopRunner();
      }
    }
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  // Check Claude CLI
  try {
    execSync("claude --version", { encoding: "utf-8" });
  } catch {
    dialog.showErrorBox(
      "Claude CLI 未安装",
      "请先安装 Claude Code CLI:\nnpm install -g @anthropic-ai/claude-code",
    );
  }

  registerProjectsIpc();
  registerTasksIpc();
  registerReportsIpc();
  createWindow();
  registerRunnerIpc(() => mainWindow);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

export { mainWindow };
