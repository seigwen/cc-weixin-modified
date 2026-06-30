# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**cc-weixin** — 在微信里使用 Claude Code Agent 的桥接器。通过腾讯官方 iLink Bot API 接收微信消息，转发给 Claude Agent（带完整工具能力：Bash、文件读写、Web 搜索等），再将回复发回微信。

核心代码约 200 行，纯 Node.js ESM（`.mjs`），无 TypeScript，不依赖 OpenClaw 框架。

## 常用命令

```bash
npm start                  # TUI 界面（默认，推荐）
npm start -- --no-tui      # 纯 CLI 模式
npm start -- --login       # 强制重新扫码登录
npm run login              # 同上（alias）
npx cc-weixin              # 从 npm 直接运行
```

配置通过 `.env` 文件（`dotenv` 加载）：

```env
ANTHROPIC_AUTH_TOKEN=sk-your-api-key
# 可选：ANTHROPIC_BASE_URL=https://api.anthropic.com
```

调试日志：`DEBUG=cc-weixin:* npm start`

## 架构

```
微信用户  ←→  iLink Bot API (ilinkai.weixin.qq.com)  ←→  cc-weixin  ←→  Claude Code Agent
              HTTP 长轮询 + Bearer 鉴权                   桥接器          @anthropic-ai/claude-agent-sdk
```

### 模块分层

| 模块 | 文件 | 职责 |
|------|------|------|
| 入口 | `cc-weixin.mjs` | 解析 CLI 参数，分发到 CLI 或 TUI 模式 |
| HTTP 客户端 | `lib/api.mjs` | iLink API 底层封装（GET/POST、鉴权头、`X-WECHAT-UIN` 防重放） |
| 鉴权 | `lib/auth.mjs` | QR 码登录流程 + token 持久化到 `~/.cc-weixin/token.json` |
| 消息收发 | `lib/messaging.mjs` | 长轮询 `getUpdates`（cursor 游标）、`sendMessage`、消息文本提取 |
| Claude 桥接 | `lib/claude.mjs` | `@anthropic-ai/claude-agent-sdk` 封装，**每个微信用户独立 session** 支持多轮对话 |
| 配置 | `lib/config.mjs` | 常量：iLink 域名、Bot 类型、工作路径 |
| QR 渲染 | `lib/qr.mjs` | 终端 Unicode 二维码渲染（`qrcode` 库） |
| TUI 界面 | `lib/tui/` | 基于 Ink (React for terminal) 的 TUI：`App` → `Header` + `LogView` + `Menu` |

### 关键设计细节

- **单会话上下文 + 斜杠命令**：

  `lib/claude.mjs` 维护进程级别的 `currentSessionId`，重启后丢失。核心流程：

  1. **首条消息（新会话）**：`currentSessionId` 为 null → `options` 不设 `resume`，`prompt` 使用 async generator 创建新会话
  2. **后续消息（自动续接）**：`currentSessionId` 存在 → `options.resume = currentSessionId`，`prompt` 直接传字符串，SDK 自动恢复上下文实现多轮对话
  3. **`/resume` 命令**：调用 SDK 的 `listSessions({ dir: process.cwd() })` 列出当前目录最近 10 个历史会话，用户回复数字选择要恢复的会话
  4. **`/new` 命令**：清空 `currentSessionId`，下一条消息开始全新会话

  通过 `awaitingResume` 标志 + `cachedSessionList` 数组实现选择状态，用户发数字即匹配会话，发非数字则取消选择、按普通消息处理。
- **工作区跟随当前目录**：Agent 的 `cwd` 使用 `process.cwd()`，即运行 `cc-weixin` 时的目录，不同项目目录下运行互不干扰
- **长轮询游标**：`get_updates_buf` 是类似数据库 cursor 的字段，每次 `getUpdates` 返回新游标，必须带上才能正确推进
- **`context_token` 必须原样回传**：回复消息时必须带上 inbound 消息中的 `context_token`，否则消息不关联到正确对话窗口
- **iLink 鉴权**：`AuthorizationType: ilink_bot_token` + `Bearer ${bot_token}` + 随机 `X-WECHAT-UIN`（uint32 → 十进制 → base64）
- **TUI 快捷键**：`L` 登出、`R` 重连（exit code 100）、`Q` 退出

### `packages/openclaw-weixin/`

腾讯官方的 iLink 协议 TypeScript 实现包（`@tencent-weixin/openclaw-weixin@1.0.2`），作为协议参考保留在仓库中。包含完整的 auth、API、CDN 加解密、消息处理等实现。本项目 `lib/` 下的 JS 代码是它的简化重写版。

## 运行环境

- Node.js >= 22
- 需要能访问 `ilinkai.weixin.qq.com` 和 Anthropic API
- 微信扫码授权，登录信息保存到 `~/.cc-weixin/token.json`（权限 600）
