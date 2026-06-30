# 微信桥接 Agent 绕过权限检查

**日期**: 2026-06-30
**状态**: 已批准

## 问题

cc-weixin 通过微信桥接运行 Claude Agent 时，Agent 执行文件写入（Write/Edit）会触发 SDK 权限提示"权限需要批准才能写入文件"。由于用户在微信端无法看到或批准终端中的权限提示，写入操作失败。

## 方案

在 `lib/claude.mjs` 的 `askClaude()` 函数中，为 `query()` 的 `options` 启用 `bypassPermissions` 模式。

### 改动

**文件**: `lib/claude.mjs`
**位置**: `askClaude()` 函数内的 `options` 对象（约第 68-75 行）

新增两行：

```js
permissionMode: "bypassPermissions",
allowDangerouslySkipPermissions: true,
```

完整 options：

```js
const options = {
  model: "sonnet",
  baseTools: [{ preset: "default" }],
  deniedTools: ["AskUserQuestion"],
  permissionMode: "bypassPermissions",
  allowDangerouslySkipPermissions: true,
  cwd: process.cwd(),
  env: process.env,
  abortController: new AbortController(),
};
```

### 行为变化

| 之前 | 之后 |
|------|------|
| Write/Edit/Bash/WebFetch 等触发权限提示 | 所有工具直接执行，不提示 |
| 微信端无法批准 → 操作失败 | 正常执行 |

### 风险

- 微信 Bot 为私有部署，仅用户本人可发消息，无外部攻击面
- 如需恢复部分检查，将 `bypassPermissions` 改为 `acceptEdits` 即可
