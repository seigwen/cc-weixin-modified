# 绕过权限检查 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `lib/claude.mjs` 的 `askClaude()` 中为 Claude Agent SDK 启用 `bypassPermissions` 模式，消除微信桥接下无法批准的权限提示。

**Architecture:** 在现有 `options` 对象中新增两个属性和一条 debug 日志。零新文件、零新依赖。

**Tech Stack:** Node.js ESM，`@anthropic-ai/claude-agent-sdk`，`debug` 日志库。

**Design Spec:** `docs/superpowers/specs/2026-06-30-bypass-permissions-design.md`

## Global Constraints

- 修改仅限 `lib/claude.mjs`
- `permissionMode: "bypassPermissions"` 必须配合 `allowDangerouslySkipPermissions: true`
- 需要一条 debug 日志记录权限模式

---

### Task 1: 添加 bypassPermissions 配置

**Files:**
- Modify: `lib/claude.mjs:68-75`

**Interfaces:**
- Consumes: `query()` 的 `Options` 类型（来自 `@anthropic-ai/claude-agent-sdk`）
- Produces: 无新增接口

- [ ] **Step 1: 修改 options 对象，添加权限模式和 debug 日志**

将 `lib/claude.mjs` 第 68-75 行的 `options` 对象：

```js
  const options = {
    model: "sonnet",
    baseTools: [{ preset: "default" }],
    deniedTools: ["AskUserQuestion"],
    cwd: process.cwd(),
    env: process.env,
    abortController: new AbortController(),
  };
```

改为：

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
  debug("permission mode: bypassPermissions — all tools auto-approved, no prompts");
```

- [ ] **Step 2: 验证语法正确**

```bash
node --check lib/claude.mjs
```

Expected: 无输出（无语法错误）。

- [ ] **Step 3: 提交**

```bash
git add lib/claude.mjs
git commit -m "feat: bypass SDK permissions for WeChat bridge

Add permissionMode: bypassPermissions with
allowDangerouslySkipPermissions: true so file writes
and other tool operations don't prompt for approval
that can't be seen from the WeChat interface.

Co-Authored-By: Claude <noreply@anthropic.com>"
```
