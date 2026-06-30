# 更新日志

## 0.3.0

- 删除多用户支持
- Claude Code工作区改为跟随当前目录（`process.cwd()`），不再硬编码到 `~/.cc-weixin/workspace/`
- 添加对/resume和/new的响应, 更方便会话管理：每次运行cc-weixn，默认新开会话，可通过微信发送/resume来恢复旧会话，在旧会话里通过微信发送/new新开会话
- 开放所有权限给Claude Code，彻底跳过所有权限检查
- 启用 `excludeDynamicSections` 使系统提示词完全静态，提升 DeepSeek prompt 缓存命中率

## 0.2.0

- 每个微信用户独立会话上下文，支持多轮对话记忆（基于 session resume）
- 专用工作区 `~/.cc-weixin/workspace/`，不再污染项目目录
- 新增调试日志支持（`DEBUG=cc-weixin:*`）
- 新增 `debug` 依赖

## 0.1.1

- 用截图替换 ASCII art 演示图

## 0.1.0

- TUI 界面（基于 Ink，默认模式）
- iTerm2 下二维码以图片形式渲染
- 重命名为 cc-weixin，发布到 npm
- 接入 Claude Agent SDK 实现自动回复
- iLink Bot API 长轮询收发消息
- 微信扫码登录
