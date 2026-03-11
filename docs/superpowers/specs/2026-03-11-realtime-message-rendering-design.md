# Real-time Message Rendering — Design Spec

**Date**: 2026-03-11
**Goal**: Achieve Claude Code for VS Code-level message visibility in the web UI by handling all 18+ SDK message types that are currently silently dropped.

## Problem Statement

The web UI forwards all SDK messages from backend to frontend, but the frontend only processes 4-5 message structures. The remaining 13+ types (thinking, tool progress, agent lifecycle, status, rate limits) are silently ignored. Users cannot see what the backend is doing, whether agents are running, or what tools are executing.

## Approach

**Frontend-driven (Approach A)**: Backend stays as a transparent pipe. One small backend change adds a `subType` classification tag. All rendering intelligence lives in the frontend via modular handler files.

## 1. Backend Change

### 1.1 `classifySDKMessage()` function

A pure function added to `server/claude-sdk.js` (~30 lines) that inspects `message.type` and `message.subtype` and returns a string tag:

| SDK `message.type` | Returned `subType` |
|---|---|
| Has `event` field (stream events) | `'stream_event'` |
| `'assistant'` | `'assistant'` |
| `'user'` | `'user'` |
| `'result'` | `'result'` |
| `'system'` | `'system'` |
| Has `tool_use_id` + progress-like content | `'tool_progress'` |
| Has `task_id` + started indicator | `'task_started'` |
| Has `task_id` + progress indicator | `'task_progress'` |
| Has `task_id` + notification indicator | `'task_notification'` |
| Status message pattern | `'status'` |
| Rate limit pattern | `'rate_limit'` |
| Hook started pattern | `'hook_started'` |
| Hook progress pattern | `'hook_progress'` |
| Compact boundary pattern | `'compact_boundary'` |
| Everything else | `'unknown'` |

### 1.2 for-await loop modification

Two lines added to the existing loop:

```javascript
for await (const message of conversation) {
  const transformed = transformMessage(message);
  const subType = classifySDKMessage(message); // NEW

  writer.send({
    type: 'claude-response',
    subType,            // NEW
    data: transformed,
    sessionId
  });
}
```

No other backend changes.

## 2. Frontend Handler Architecture

### 2.1 Refactor `useChatRealtimeHandlers.ts`

The current 1189-line monolith is split into a routing entry point (~300 lines) plus modular handlers:

```
src/components/chat/hooks/
├── useChatRealtimeHandlers.ts           ← Slimmed routing entry
├── handlers/
│   ├── index.ts                         ← Barrel export
│   ├── handleStreamEvent.ts             ← All stream_event sub-types
│   ├── handleAssistantMessage.ts        ← Extracted from existing code
│   ├── handleToolResult.ts              ← Extracted from existing code
│   ├── handleToolProgress.ts            ← NEW
│   ├── handleTaskLifecycle.ts           ← NEW
│   ├── handleStatusMessage.ts           ← NEW
│   ├── handleRateLimit.ts              ← NEW
│   ├── handleResult.ts                 ← Extracted + extended
│   └── handleLegacyMessage.ts           ← Fallback for backward compat
```

### 2.2 Routing logic

```typescript
case 'claude-response': {
  const { subType, data } = latestMessage;

  switch (subType) {
    case 'stream_event':
      handleStreamEvent(data, streamState, chatActions);
      break;
    case 'assistant':
      handleAssistantMessage(data, chatActions);
      break;
    case 'user':
      handleToolResult(data, chatActions);
      break;
    case 'tool_progress':
      handleToolProgress(data, chatActions);
      break;
    case 'task_started':
    case 'task_progress':
    case 'task_notification':
      handleTaskLifecycle(data, subType, chatActions);
      break;
    case 'status':
      handleStatusMessage(data, statusActions);
      break;
    case 'rate_limit':
      handleRateLimit(data, chatActions);
      break;
    case 'result':
      handleResult(data, chatActions, tokenActions);
      break;
    default:
      handleLegacyMessage(data, ...);
  }
}
```

### 2.3 `handleStreamEvent.ts` — Stream event processing

Handles all `content_block_start`, `content_block_delta`, `content_block_stop`, `message_start`, `message_delta`, `message_stop` events.

**Streaming buffer**: Reduced from 100ms to 33ms (~2 frames).

**New capabilities**:

| Event | Current Behavior | New Behavior |
|---|---|---|
| `content_block_start` (type: `thinking`) | Ignored | Create `ChatMessage` with `isThinking: true, isStreaming: true` |
| `content_block_delta` (`thinking_delta`) | Ignored | Buffer and flush thinking text to thinking message |
| `content_block_start` (type: `tool_use`) | Ignored | Create `ChatMessage` with `isToolUse: true, isToolStarted: true, toolName` |
| `content_block_delta` (`input_json_delta`) | Ignored | Accumulate `partial_json` into tool input buffer |
| `content_block_stop` (for tool) | Only flushes text | Also parse accumulated JSON → set `toolInput`, clear `isToolStarted` |
| `content_block_delta` (`text_delta`) | 100ms buffer | 33ms buffer (unchanged logic, faster flush) |
| `message_start` | Ignored | Extract model info, store metadata |
| `message_delta` | Ignored | Extract stop_reason, usage stats |
| `message_stop` | Ignored | Mark message sequence complete |

### 2.4 `handleToolProgress.ts` — Tool execution progress

```
SDKToolProgressMessage { tool_use_id, content }
  → Find ChatMessage with matching toolId
  → Append content to toolProgress[] array
  → UI shows real-time output inside tool card
```

### 2.5 `handleTaskLifecycle.ts` — Agent/sub-task lifecycle

```
SDKTaskStartedMessage { task_id, description, subagent_type }
  → Find or create SubagentContainer ChatMessage
  → Set subagentState.taskId, description
  → UI shows "Agent started: [description]" with pulse animation

SDKTaskProgressMessage { task_id, content }
  → Find SubagentContainer by taskId
  → Append to subagentState.progressLog[]
  → UI shows real-time progress text

SDKTaskNotificationMessage { task_id, status, result }
  → Find SubagentContainer by taskId
  → Set subagentState.isComplete, result
  → UI shows completion status
```

### 2.6 `handleStatusMessage.ts` — Global status

```
SDKStatusMessage { status, message }
  → Update agentStatusState (independent state, not chatMessages)
  → UI: status text above ChatInput
```

### 2.7 `handleRateLimit.ts` — Rate limit handling

```
SDKRateLimitEvent { retry_after_ms, message }
  → Set rateLimitState { isLimited, retryAfterMs, message, startedAt }
  → UI: amber banner with countdown timer
  → Auto-clears when countdown reaches zero
```

### 2.8 `handleResult.ts` — Cost and usage tracking

```
SDKResultMessage { total_cost_usd, usage, duration_ms, modelUsage }
  → Extract token budget (existing)
  → NEW: Set costInfo state { totalCostUsd, inputTokens, outputTokens, durationMs, model }
  → UI: displayed next to token budget bar above ChatInput
```

## 3. Type Extensions

### 3.1 `ChatMessage` additions

```typescript
interface ChatMessage {
  // ... existing fields unchanged ...

  // NEW fields
  toolProgress?: string[];         // Tool execution intermediate output
  isToolStarted?: boolean;         // content_block_start received, awaiting params/result
  thinkingDurationMs?: number;     // How long thinking took
}
```

### 3.2 `SubagentState` additions

```typescript
interface SubagentState {
  // ... existing fields unchanged ...

  // NEW fields
  taskId?: string;                 // SDK task_id for matching progress messages
  description?: string;            // Agent task description
  progressLog?: string[];          // Agent real-time progress text
}
```

### 3.3 New independent state types

```typescript
interface CostInfo {
  totalCostUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  model?: string;
}

interface RateLimitState {
  isLimited: boolean;
  retryAfterMs?: number;
  message?: string;
  startedAt?: number;
}

interface AgentStatusState {
  text: string;
  isActive: boolean;
  timestamp: number;
}
```

These live outside `chatMessages[]` as independent React state in the chat context or hook.

## 4. New UI Components

### 4.1 `ThinkingStreamBlock.tsx` (~80 lines)

Replaces the existing static `<details>` block for thinking. Supports real-time streaming.

- Purple left border, pulse animation while `isStreaming`
- Monospace font, real-time text append
- Cursor blink effect during streaming
- Auto-collapses when complete, title changes to "Thought for Xs"
- Respects existing `showThinking` setting

### 4.2 `ToolProgressDisplay.tsx` (~60 lines)

Embedded inside existing tool cards (via `ToolRenderer`).

- Terminal-style dark background, monospace font
- Shows last 20 lines of output, auto-scrolls to bottom
- Visible while tool is executing (toolProgress has content, no toolResult yet)
- Collapses/hides when toolResult arrives

### 4.3 `RateLimitBanner.tsx` (~50 lines)

Floating banner at top of chat area.

- Amber background with countdown timer
- Auto-disappears when countdown reaches zero
- Non-intrusive, does not push content down

### 4.4 `CostInfoBar.tsx` (~40 lines)

Embedded in the input area's status bar, next to existing token budget display.

- Format: `💰 $0.05 · 8.2s · sonnet-4`
- Compact gray text, appears after each conversation turn
- Stored in independent `costInfo` state (not in `chatMessages[]`)

### 4.5 Existing component modifications

| Component | Change |
|---|---|
| `MessageComponent.tsx` | Render `ThinkingStreamBlock` for `isThinking + isStreaming`; show loading state for `isToolStarted` |
| `ToolRenderer.tsx` | Embed `ToolProgressDisplay` when `toolProgress` has content |
| `SubagentContainer.tsx` | Match by `taskId`; render `progressLog` as real-time text; use SDK lifecycle events for start/complete states |
| ChatInput area component | Add `AgentStatusState` text display above input; embed `CostInfoBar` next to token budget |

## 5. i18n

All new UI text strings added to translation files for all 5 languages (`en`, `ko`, `zh-CN`, `ja`, `ru`).

New keys in `chat` namespace:

| Key | English |
|---|---|
| `thinking.streaming` | `Thinking...` |
| `thinking.duration` | `Thought for {{seconds}}s` |
| `tool.started` | `Starting {{toolName}}...` |
| `tool.running` | `Running` |
| `agent.started` | `Agent started: {{description}}` |
| `agent.progress` | `Agent in progress...` |
| `agent.completed` | `Agent completed` |
| `agent.failed` | `Agent failed` |
| `rateLimit.message` | `Rate limited, retrying in {{seconds}}s...` |
| `cost.label` | `${{cost}} · {{duration}}s · {{model}}` |
| `status.reading` | `Reading file...` |
| `status.searching` | `Searching codebase...` |
| `status.waiting` | `Waiting...` |

## 6. Files Changed Summary

| File | Operation | Est. Lines |
|---|---|---|
| `server/claude-sdk.js` | Modify | +30 |
| `src/components/chat/types/types.ts` | Modify | +25 |
| `src/components/chat/hooks/useChatRealtimeHandlers.ts` | Refactor | ~300 (from 1189) |
| `src/components/chat/hooks/handlers/handleStreamEvent.ts` | New | ~200 |
| `src/components/chat/hooks/handlers/handleAssistantMessage.ts` | New | ~150 |
| `src/components/chat/hooks/handlers/handleToolResult.ts` | New | ~100 |
| `src/components/chat/hooks/handlers/handleToolProgress.ts` | New | ~40 |
| `src/components/chat/hooks/handlers/handleTaskLifecycle.ts` | New | ~80 |
| `src/components/chat/hooks/handlers/handleStatusMessage.ts` | New | ~30 |
| `src/components/chat/hooks/handlers/handleRateLimit.ts` | New | ~40 |
| `src/components/chat/hooks/handlers/handleResult.ts` | New | ~60 |
| `src/components/chat/hooks/handlers/handleLegacyMessage.ts` | New | ~50 |
| `src/components/chat/hooks/handlers/index.ts` | New | ~15 |
| `src/components/chat/ThinkingStreamBlock.tsx` | New | ~80 |
| `src/components/chat/ToolProgressDisplay.tsx` | New | ~60 |
| `src/components/chat/RateLimitBanner.tsx` | New | ~50 |
| `src/components/chat/CostInfoBar.tsx` | New | ~40 |
| `src/components/chat/MessageComponent.tsx` | Modify | +30 |
| `src/components/chat/ToolRenderer.tsx` | Modify | +15 |
| `src/components/chat/SubagentContainer.tsx` | Modify | +40 |
| ChatInput area component | Modify | +20 |
| `src/i18n/locales/en/chat.json` | Modify | +15 |
| `src/i18n/locales/ko/chat.json` | Modify | +15 |
| `src/i18n/locales/zh-CN/chat.json` | Modify | +15 |
| `src/i18n/locales/ja/chat.json` | Modify | +15 |
| `src/i18n/locales/ru/chat.json` | Modify | +15 |

## 7. What Does NOT Change

- WebSocket connection/reconnection mechanism
- Tool permission request flow (`canUseTool` → `claude-permission-request` → frontend approval)
- Session management and multi-provider support (Claude, Cursor, Codex, Gemini)
- All other backend code
- Authentication (JWT / platform mode)
- Plugin system
- File/shell/git/tasks/preview tabs

## 8. Backward Compatibility

- `handleLegacyMessage.ts` preserves the existing structural detection logic as a fallback when `subType` is missing (e.g., during rolling updates where backend hasn't been restarted yet)
- All new `ChatMessage` fields are optional — existing messages continue to render correctly
- No breaking changes to WebSocket protocol — `subType` is additive
