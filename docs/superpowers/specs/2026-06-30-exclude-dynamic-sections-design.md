# 排除系统提示词动态部分以提升缓存命中率

**日期**: 2026-06-30
**状态**: 已批准

## 问题

cc-weixin 每条微信消息触发一次独立的 `query()` 调用。SDK 默认系统提示词包含动态内容（cwd、git status、memory），每次调用重新生成。如果两次消息间这些动态内容发生变化，系统提示词与上次不同，导致 prompt 缓存前缀不匹配，缓存全部 miss。

## 方案

启用 SDK 的 `excludeDynamicSections` 选项，将动态内容从系统提示词剥离，使其变为完全静态。

### 改动

**文件**: `lib/claude.mjs`
**位置**: `askClaude()` 函数内的 `options` 对象（第 68-77 行）

在 `options` 中新增：

```js
systemPrompt: {
  type: "preset",
  preset: "claude_code",
  excludeDynamicSections: true,
},
```

完整 options：

```js
const options = {
  model: "sonnet",
  baseTools: [{ preset: "default" }],
  deniedTools: ["AskUserQuestion"],
  permissionMode: "bypassPermissions",
  allowDangerouslySkipPermissions: true,
  systemPrompt: {
    type: "preset",
    preset: "claude_code",
    excludeDynamicSections: true,
  },
  cwd: process.cwd(),
  env: process.env,
  abortController: new AbortController(),
};
```

### 行为变化

| 之前 | 之后 |
|------|------|
| 系统提示词每调用重新生成，含动态 cwd/git status | 系统提示词静态固定，跨调用完全一致 |
| 动态内容变化→前缀不匹配→缓存 miss | 前缀不变→缓存持续命中 |
| 工作目录/git 状态在 system prompt 中 | 工作目录/git 状态在第一条 user message 中 |

### 权衡

- 模型从 user message 而非 system prompt 获取工作目录和 git 状态，权威性略低，但影响可忽略
- 首条用户消息略大（多了一段动态内容），但后续消息用 `resume` 不受影响
