import { query, listSessions } from "@anthropic-ai/claude-agent-sdk";
import Debug from "debug";

const debug = Debug("cc-weixin:claude");

/** 当前会话 ID，进程级别，重启丢失 */
let currentSessionId = null;
/** 是否等待用户选择历史会话 */
let awaitingResume = false;
/** /resume 列出的会话列表，供数字选择时查找 */
let cachedSessionList = [];

/** 调用 Claude Code agent，返回最终文本回复 */
export async function askClaude(userText) {
  const text = userText.trim();

  // ── /resume 命令：列出历史会话 ──
  if (text === "/resume") {
    const sessions = await listSessions({ dir: process.cwd() });
    if (sessions.length === 0) {
      return "当前目录下没有历史会话";
    }
    const recent = sessions.slice(0, 10);
    cachedSessionList = recent;
    awaitingResume = true;

    const lines = ["📋 历史会话："];
    recent.forEach((s, i) => {
      const title = s.title || s.summary || "（无标题）";
      const date = s.mtime
        ? new Date(s.mtime).toLocaleString("zh-CN", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";
      lines.push(`${i + 1}. ${title}  ${date ? "— " + date : ""}`);
    });
    lines.push("");
    lines.push("回复数字选择，或直接发新消息开始新会话");
    return lines.join("\n");
  }

  // ── /new 命令：清除当前会话 ──
  if (text === "/new") {
    currentSessionId = null;
    awaitingResume = false;
    return "已开始新会话，下一条消息将创建新会话";
  }

  // ── 数字选择：恢复历史会话 ──
  if (awaitingResume && /^\d+$/.test(text)) {
    const index = parseInt(text, 10) - 1;
    if (index >= 0 && index < cachedSessionList.length) {
      currentSessionId = cachedSessionList[index].sessionId;
      awaitingResume = false;
      return "✅";
    }
    return "无效的编号，请重新选择";
  }

  // ── 普通消息：取消等待选择状态 ──
  awaitingResume = false;

  debug("askClaude called: hasSession=%s, sessionId=%s", !!currentSessionId, currentSessionId);

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

  if (currentSessionId) {
    options.resume = currentSessionId;
    debug("resuming session: %s", currentSessionId);
  }

  // resume 时 prompt 直接传字符串即可；新会话用 generator
  const prompt = currentSessionId
    ? userText
    : (async function* () {
        yield {
          type: "user",
          session_id: "",
          parent_tool_use_id: null,
          message: { role: "user", content: userText },
        };
      })();

  let result = "";
  for await (const msg of query({ prompt, options })) {
    debug("msg type=%s subtype=%s session_id=%s", msg.type, msg.subtype, msg.session_id);
    if (msg.type === "result") {
      result = msg.result ?? "";
      if (msg.session_id) {
        currentSessionId = msg.session_id;
        debug("stored session: sessionId=%s", msg.session_id);
      }
    }
  }
  debug("result length=%d", result.length);
  return result || "（Claude 无回复）";
}
