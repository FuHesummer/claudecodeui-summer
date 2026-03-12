# Real-time Message Rendering — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Achieve Claude Code for VS Code-level message visibility by handling all 18+ SDK message types that are currently silently dropped.

**Architecture:** Backend adds a ~30-line pure `classifySDKMessage()` function and attaches a `subType` tag to every `claude-response` WebSocket message. Frontend refactors the 1188-line `useChatRealtimeHandlers.ts` monolith into a routing entry + 9 modular handler files. Four new UI components render thinking streams, tool progress, rate limits, and cost info.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Express/Node.js (plain JS), i18next (5 languages)

---

## File Structure

### Backend (1 file modified)

| File | Responsibility |
|---|---|
| `server/claude-sdk.js` | Add `classifySDKMessage()` pure function; add `subType` field to WebSocket send |

### Frontend — Types (1 file modified)

| File | Responsibility |
|---|---|
| `src/components/chat/types/types.ts` | Add new optional fields to `ChatMessage`; add `CostInfo`, `RateLimitState`, `AgentStatusState` types |

### Frontend — Handlers (10 files: 1 modified, 9 new)

| File | Responsibility |
|---|---|
| `src/components/chat/hooks/useChatRealtimeHandlers.ts` | Slimmed routing entry (~300 lines); new state hooks for cost/rateLimit/agentStatus |
| `src/components/chat/hooks/handlers/index.ts` | Barrel export |
| `src/components/chat/hooks/handlers/handleStreamEvent.ts` | Process `content_block_start/delta/stop`, `message_start/delta/stop` |
| `src/components/chat/hooks/handlers/handleAssistantMessage.ts` | Process assistant role messages with content arrays |
| `src/components/chat/hooks/handlers/handleToolResult.ts` | Process user role messages with tool_result parts |
| `src/components/chat/hooks/handlers/handleToolProgress.ts` | NEW: Process tool execution progress |
| `src/components/chat/hooks/handlers/handleTaskLifecycle.ts` | NEW: Process agent/sub-task lifecycle events |
| `src/components/chat/hooks/handlers/handleStatusMessage.ts` | NEW: Process SDK status messages |
| `src/components/chat/hooks/handlers/handleRateLimit.ts` | NEW: Process rate limit events |
| `src/components/chat/hooks/handlers/handleResult.ts` | Process result messages with cost/usage extraction |
| `src/components/chat/hooks/handlers/handleLegacyMessage.ts` | Fallback handler for backward compatibility |

### Frontend — UI Components (4 new, 5 modified)

| File | Responsibility |
|---|---|
| `src/components/chat/view/subcomponents/ThinkingStreamBlock.tsx` | NEW: Streaming thinking block with purple border |
| `src/components/chat/tools/components/ToolProgressDisplay.tsx` | NEW: Terminal-style tool output display |
| `src/components/chat/view/subcomponents/RateLimitBanner.tsx` | NEW: Amber countdown banner |
| `src/components/chat/view/subcomponents/CostInfoBar.tsx` | NEW: Cost/duration/model display |
| `src/components/chat/view/subcomponents/MessageComponent.tsx` | Use `ThinkingStreamBlock` for streaming thinking |
| `src/components/chat/tools/ToolRenderer.tsx` | Embed `ToolProgressDisplay` |
| `src/components/chat/tools/components/SubagentContainer.tsx` | Add `taskId` matching, `progressLog` rendering |
| `src/components/chat/view/subcomponents/ChatInputControls.tsx` | Embed `CostInfoBar` |
| `src/components/chat/view/subcomponents/ChatComposer.tsx` | Pass `costInfo` prop through to `ChatInputControls` |

### i18n (5 files modified)

| File | Responsibility |
|---|---|
| `src/i18n/locales/en/chat.json` | Add 12 new English translation keys |
| `src/i18n/locales/ko/chat.json` | Add 12 new Korean translation keys |
| `src/i18n/locales/zh-CN/chat.json` | Add 12 new Chinese translation keys |
| `src/i18n/locales/ja/chat.json` | Add 12 new Japanese translation keys |
| `src/i18n/locales/ru/chat.json` | Add 12 new Russian translation keys |

---

## Chunk 1: Backend + Types Foundation

### Task 1: Add `classifySDKMessage()` to backend

**Files:**
- Modify: `server/claude-sdk.js:270-279` (after `transformMessage`)

- [ ] **Step 1: Add `classifySDKMessage()` function after `transformMessage()` (line 279)**

Add this function after line 279 in `server/claude-sdk.js`:

```javascript
/**
 * Classifies an SDK message into a subType for frontend routing.
 * Pure function — no side effects.
 * @param {Object} message - Raw SDK message
 * @returns {string} Classification tag
 */
function classifySDKMessage(message) {
  if (!message || typeof message !== 'object') return 'unknown';

  // Stream events (content_block_start, content_block_delta, etc.)
  if (message.type === 'content_block_start' ||
      message.type === 'content_block_delta' ||
      message.type === 'content_block_stop' ||
      message.type === 'message_start' ||
      message.type === 'message_delta' ||
      message.type === 'message_stop') {
    return 'stream_event';
  }

  // Result messages (completion with usage/cost)
  if (message.type === 'result') return 'result';

  // System init messages
  if (message.type === 'system') return 'system';

  // Assistant messages with content arrays
  if (message.role === 'assistant' && message.content) return 'assistant';

  // User messages (tool results)
  if (message.role === 'user' && message.content) return 'user';

  // Tool progress (has tool_use_id + progress content)
  if (message.tool_use_id && (message.content || message.output)) return 'tool_progress';

  // Task lifecycle events
  if (message.task_id) {
    if (message.type === 'task_started' || (message.started !== undefined)) return 'task_started';
    if (message.type === 'task_notification' || message.notification) return 'task_notification';
    return 'task_progress';
  }

  // Rate limit events
  if (message.type === 'rate_limit' || message.retry_after_ms !== undefined) return 'rate_limit';

  // Status messages
  if (message.type === 'status' || (message.status && typeof message.status === 'string' && !message.role)) return 'status';

  // Hook lifecycle events
  if (message.type === 'hook_started' || message.type === 'hook_progress') return message.type;

  // Compact boundary
  if (message.type === 'compact_boundary') return 'compact_boundary';

  return 'unknown';
}
```

- [ ] **Step 2: Add `subType` to the WebSocket send in the for-await loop**

In `server/claude-sdk.js`, find the send block at lines 621-626:

```javascript
// BEFORE (lines 620-626):
      // Transform and send message to WebSocket
      const transformedMessage = transformMessage(message);
      ws.send({
        type: 'claude-response',
        data: transformedMessage,
        sessionId: capturedSessionId || sessionId || null
      });
```

Change to:

```javascript
      // Transform and send message to WebSocket
      const transformedMessage = transformMessage(message);
      const subType = classifySDKMessage(message);
      ws.send({
        type: 'claude-response',
        subType,
        data: transformedMessage,
        sessionId: capturedSessionId || sessionId || null
      });
```

- [ ] **Step 3: Verify the server starts without errors**

Run: `cd /home/claude-workspace/claudecodeui-summer/claudecodeui-summer && node -e "import('./server/claude-sdk.js').then(() => console.log('OK')).catch(e => console.error(e))"`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add server/claude-sdk.js
git commit -m "feat(sdk): add classifySDKMessage() and subType tag to claude-response messages"
```

---

### Task 2: Extend TypeScript types

**Files:**
- Modify: `src/components/chat/types/types.ts`

- [ ] **Step 1: Add new optional fields to `ChatMessage` interface**

In `src/components/chat/types/types.ts`, find the `ChatMessage` interface (lines 28-50). Add the new fields before the index signature (`[key: string]: unknown;`) at line 49:

```typescript
  // Real-time rendering fields
  toolProgress?: string[];         // Tool execution intermediate output
  isToolStarted?: boolean;         // content_block_start received, awaiting params/result
  thinkingDurationMs?: number;     // How long thinking took
```

- [ ] **Step 2: Add `taskId`, `description`, `progressLog` to the inline `subagentState` type**

In `src/components/chat/types/types.ts`, modify the `subagentState` inline type (lines 44-48) to add new optional fields:

```typescript
  subagentState?: {
    childTools: SubagentChildTool[];
    currentToolIndex: number;
    isComplete: boolean;
    taskId?: string;                 // SDK task_id for matching progress messages
    description?: string;            // Agent task description
    progressLog?: string[];          // Agent real-time progress text
  };
```

- [ ] **Step 3: Add new independent state types after `ChatMessage`**

After the `ChatMessage` interface closing brace (after line 50), add:

```typescript
export interface CostInfo {
  totalCostUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  model?: string;
}

export interface RateLimitState {
  isLimited: boolean;
  retryAfterMs?: number;
  message?: string;
  startedAt?: number;
}

export interface AgentStatusState {
  text: string;
  isActive: boolean;
  timestamp: number;
}
```

- [ ] **Step 4: Run typecheck**

Run: `cd /home/claude-workspace/claudecodeui-summer/claudecodeui-summer && npx tsc --noEmit`
Expected: No new errors (existing errors may be present)

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/types/types.ts
git commit -m "feat(types): add ChatMessage fields and CostInfo/RateLimitState/AgentStatusState types"
```

---

## Chunk 2: Handler Module Extraction (Extract existing code)

### Task 3: Create `handleStreamEvent.ts`

**Files:**
- Create: `src/components/chat/hooks/handlers/handleStreamEvent.ts`

- [ ] **Step 1: Create the handler file**

Create `src/components/chat/hooks/handlers/handleStreamEvent.ts`:

```typescript
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ChatMessage } from '../../types/types';
import { decodeHtmlEntities } from '../../utils/chatFormatting';

/** Flush interval for streaming text — ~2 frames at 60fps. */
export const STREAM_FLUSH_INTERVAL_MS = 33;

interface StreamState {
  streamBufferRef: MutableRefObject<string>;
  streamTimerRef: MutableRefObject<number | null>;
}

interface StreamActions {
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  appendStreamingChunk: (chunk: string, newline?: boolean) => void;
  finalizeStreamingMessage: () => void;
}

/**
 * Handles all stream events: content_block_start, content_block_delta,
 * content_block_stop, message_start, message_delta, message_stop.
 */
export function handleStreamEvent(
  data: Record<string, any>,
  streamState: StreamState,
  actions: StreamActions,
): void {
  const messageData = data?.message || data;
  if (!messageData || typeof messageData !== 'object') return;

  const { streamBufferRef, streamTimerRef } = streamState;
  const { setChatMessages, appendStreamingChunk, finalizeStreamingMessage } = actions;

  switch (messageData.type) {
    // --- Text streaming ---
    case 'content_block_delta': {
      // Text delta
      if (messageData.delta?.text) {
        const decodedText = decodeHtmlEntities(messageData.delta.text);
        streamBufferRef.current += decodedText;
        if (!streamTimerRef.current) {
          streamTimerRef.current = window.setTimeout(() => {
            const chunk = streamBufferRef.current;
            streamBufferRef.current = '';
            streamTimerRef.current = null;
            appendStreamingChunk(chunk, false);
          }, STREAM_FLUSH_INTERVAL_MS);
        }
        return;
      }

      // Thinking delta
      if (messageData.delta?.thinking) {
        const thinkingText = messageData.delta.thinking;
        setChatMessages((prev) => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          const last = updated[lastIndex];
          if (last && last.isThinking && last.isStreaming) {
            updated[lastIndex] = {
              ...last,
              content: (last.content || '') + thinkingText,
            };
          }
          return updated;
        });
        return;
      }

      // Tool input JSON delta
      if (messageData.delta?.partial_json !== undefined) {
        const partialJson = messageData.delta.partial_json;
        setChatMessages((prev) => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          const last = updated[lastIndex];
          if (last && last.isToolUse && last.isToolStarted) {
            const accumulated = (last.toolInput as string || '') + partialJson;
            updated[lastIndex] = { ...last, toolInput: accumulated };
          }
          return updated;
        });
        return;
      }
      break;
    }

    case 'content_block_start': {
      const contentBlock = messageData.content_block;
      if (!contentBlock) break;

      // Thinking block start
      if (contentBlock.type === 'thinking') {
        setChatMessages((prev) => [
          ...prev,
          {
            type: 'assistant',
            content: '',
            timestamp: new Date(),
            isThinking: true,
            isStreaming: true,
          },
        ]);
        return;
      }

      // Tool use block start
      if (contentBlock.type === 'tool_use') {
        setChatMessages((prev) => [
          ...prev,
          {
            type: 'assistant',
            content: '',
            timestamp: new Date(),
            isToolUse: true,
            isToolStarted: true,
            toolName: contentBlock.name,
            toolId: contentBlock.id,
            toolInput: '',
            toolResult: null,
            isSubagentContainer: contentBlock.name === 'Task',
            subagentState: contentBlock.name === 'Task'
              ? { childTools: [], currentToolIndex: -1, isComplete: false }
              : undefined,
          },
        ]);
        return;
      }

      // Text block start — no action needed, text comes via deltas
      break;
    }

    case 'content_block_stop': {
      // Flush any buffered streaming text
      if (streamTimerRef.current) {
        clearTimeout(streamTimerRef.current);
        streamTimerRef.current = null;
      }
      const chunk = streamBufferRef.current;
      streamBufferRef.current = '';
      appendStreamingChunk(chunk, false);
      finalizeStreamingMessage();

      // Finalize tool input: parse accumulated JSON
      setChatMessages((prev) => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        const last = updated[lastIndex];
        if (last && last.isToolUse && last.isToolStarted) {
          let parsedInput = last.toolInput;
          if (typeof parsedInput === 'string' && parsedInput.trim()) {
            try {
              parsedInput = JSON.stringify(JSON.parse(parsedInput), null, 2);
            } catch {
              // Keep as string if not valid JSON
            }
          }
          updated[lastIndex] = { ...last, isToolStarted: false, toolInput: parsedInput };
        }
        // Finalize thinking block
        if (last && last.isThinking && last.isStreaming) {
          updated[lastIndex] = { ...last, isStreaming: false };
        }
        return updated;
      });
      return;
    }

    case 'message_start': {
      // Extract model info if available — store as debug metadata
      console.debug('[message_start]', messageData.message?.model);
      break;
    }

    case 'message_delta': {
      // Extract stop_reason, usage stats
      console.debug('[message_delta]', messageData.delta?.stop_reason, messageData.usage);
      break;
    }

    case 'message_stop': {
      // Mark message sequence complete
      console.debug('[message_stop]');
      break;
    }
  }
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd /home/claude-workspace/claudecodeui-summer/claudecodeui-summer && npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/hooks/handlers/handleStreamEvent.ts
git commit -m "feat(handlers): add handleStreamEvent with thinking/tool streaming support"
```

---

### Task 4: Create `handleAssistantMessage.ts`

**Files:**
- Create: `src/components/chat/hooks/handlers/handleAssistantMessage.ts`

- [ ] **Step 1: Create the handler file**

Extract the assistant message handling logic from `useChatRealtimeHandlers.ts` lines 381-463. This handles messages with `role === 'assistant'` and content arrays containing `tool_use` and `text` parts.

```typescript
import type { Dispatch, SetStateAction } from 'react';
import type { ChatMessage } from '../../types/types';
import { decodeHtmlEntities, formatUsageLimitText } from '../../utils/chatFormatting';

interface AssistantActions {
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
}

/**
 * Handles assistant role messages with content arrays (tool_use + text parts).
 * Extracted from the existing claude-response handler.
 */
export function handleAssistantMessage(
  data: Record<string, any>,
  rawData: Record<string, any> | null,
  actions: AssistantActions,
): void {
  const messageData = data?.message || data;
  const structuredMessageData =
    messageData && typeof messageData === 'object' ? messageData : null;
  const { setChatMessages } = actions;

  if (!structuredMessageData) return;

  if (Array.isArray(structuredMessageData.content)) {
    const parentToolUseId = rawData?.parentToolUseId;

    structuredMessageData.content.forEach((part: any) => {
      if (part.type === 'tool_use') {
        const toolInput = part.input ? JSON.stringify(part.input, null, 2) : '';

        // Check if this is a child tool from a subagent
        if (parentToolUseId) {
          setChatMessages((previous) =>
            previous.map((message) => {
              if (message.toolId === parentToolUseId && message.isSubagentContainer) {
                const childTool = {
                  toolId: part.id,
                  toolName: part.name,
                  toolInput: part.input,
                  toolResult: null,
                  timestamp: new Date(),
                };
                const existingChildren = message.subagentState?.childTools || [];
                return {
                  ...message,
                  subagentState: {
                    childTools: [...existingChildren, childTool],
                    currentToolIndex: existingChildren.length,
                    isComplete: false,
                  },
                };
              }
              return message;
            }),
          );
          return;
        }

        // Check if this is a Task tool (subagent container)
        const isSubagentContainer = part.name === 'Task';

        setChatMessages((previous) => [
          ...previous,
          {
            type: 'assistant',
            content: '',
            timestamp: new Date(),
            isToolUse: true,
            toolName: part.name,
            toolInput,
            toolId: part.id,
            toolResult: null,
            isSubagentContainer,
            subagentState: isSubagentContainer
              ? { childTools: [], currentToolIndex: -1, isComplete: false }
              : undefined,
          },
        ]);
        return;
      }

      if (part.type === 'text' && part.text?.trim()) {
        let content = decodeHtmlEntities(part.text);
        content = formatUsageLimitText(content);
        setChatMessages((previous) => [
          ...previous,
          {
            type: 'assistant',
            content,
            timestamp: new Date(),
          },
        ]);
      }
    });
  } else if (
    structuredMessageData &&
    typeof structuredMessageData.content === 'string' &&
    structuredMessageData.content.trim()
  ) {
    let content = decodeHtmlEntities(structuredMessageData.content);
    content = formatUsageLimitText(content);
    setChatMessages((previous) => [
      ...previous,
      {
        type: 'assistant',
        content,
        timestamp: new Date(),
      },
    ]);
  }
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd /home/claude-workspace/claudecodeui-summer/claudecodeui-summer && npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/hooks/handlers/handleAssistantMessage.ts
git commit -m "feat(handlers): extract handleAssistantMessage from monolith"
```

---

### Task 5: Create `handleToolResult.ts`

**Files:**
- Create: `src/components/chat/hooks/handlers/handleToolResult.ts`

- [ ] **Step 1: Create the handler file**

Extract tool result handling from `useChatRealtimeHandlers.ts` lines 465-521:

```typescript
import type { Dispatch, SetStateAction } from 'react';
import type { ChatMessage } from '../../types/types';

interface ToolResultActions {
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
}

/**
 * Handles user role messages containing tool_result parts.
 * Routes results to normal tool cards or subagent child tools.
 */
export function handleToolResult(
  data: Record<string, any>,
  rawData: Record<string, any> | null,
  actions: ToolResultActions,
): void {
  const messageData = data?.message || data;
  const structuredMessageData =
    messageData && typeof messageData === 'object' ? messageData : null;
  const { setChatMessages } = actions;

  if (!structuredMessageData) return;
  if (structuredMessageData.role !== 'user' || !Array.isArray(structuredMessageData.content)) return;

  const parentToolUseId = rawData?.parentToolUseId;

  structuredMessageData.content.forEach((part: any) => {
    if (part.type !== 'tool_result') return;

    setChatMessages((previous) =>
      previous.map((message) => {
        // Handle child tool results (route to parent's subagentState)
        if (parentToolUseId && message.toolId === parentToolUseId && message.isSubagentContainer) {
          return {
            ...message,
            subagentState: {
              ...message.subagentState!,
              childTools: message.subagentState!.childTools.map((child) => {
                if (child.toolId === part.tool_use_id) {
                  return {
                    ...child,
                    toolResult: {
                      content: part.content,
                      isError: part.is_error,
                      timestamp: new Date(),
                    },
                  };
                }
                return child;
              }),
            },
          };
        }

        // Handle normal tool results (including parent Task tool completion)
        if (message.isToolUse && message.toolId === part.tool_use_id) {
          const result = {
            ...message,
            toolResult: {
              content: part.content,
              isError: part.is_error,
              timestamp: new Date(),
            },
          };
          // Mark subagent as complete when parent Task receives its result
          if (message.isSubagentContainer && message.subagentState) {
            result.subagentState = {
              ...message.subagentState,
              isComplete: true,
            };
          }
          return result;
        }
        return message;
      }),
    );
  });
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd /home/claude-workspace/claudecodeui-summer/claudecodeui-summer && npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/hooks/handlers/handleToolResult.ts
git commit -m "feat(handlers): extract handleToolResult from monolith"
```

---

### Task 6: Create new handler modules (4 files)

**Files:**
- Create: `src/components/chat/hooks/handlers/handleToolProgress.ts`
- Create: `src/components/chat/hooks/handlers/handleTaskLifecycle.ts`
- Create: `src/components/chat/hooks/handlers/handleStatusMessage.ts`
- Create: `src/components/chat/hooks/handlers/handleRateLimit.ts`

- [ ] **Step 1: Create `handleToolProgress.ts`**

```typescript
import type { Dispatch, SetStateAction } from 'react';
import type { ChatMessage } from '../../types/types';

interface ToolProgressActions {
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
}

/**
 * Handles tool execution progress messages.
 * Appends intermediate output to the matching tool card.
 */
export function handleToolProgress(
  data: Record<string, any>,
  actions: ToolProgressActions,
): void {
  const toolUseId = data?.tool_use_id;
  const content = typeof data?.content === 'string'
    ? data.content
    : typeof data?.output === 'string'
      ? data.output
      : null;

  if (!toolUseId || !content) return;

  const { setChatMessages } = actions;

  setChatMessages((prev) =>
    prev.map((msg) => {
      if (msg.isToolUse && msg.toolId === toolUseId) {
        const existing = msg.toolProgress || [];
        return {
          ...msg,
          toolProgress: [...existing, content],
        };
      }
      return msg;
    }),
  );
}
```

- [ ] **Step 2: Create `handleTaskLifecycle.ts`**

```typescript
import type { Dispatch, SetStateAction } from 'react';
import type { ChatMessage } from '../../types/types';

interface TaskLifecycleActions {
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
}

/**
 * Handles agent/sub-task lifecycle events:
 * task_started, task_progress, task_notification.
 */
export function handleTaskLifecycle(
  data: Record<string, any>,
  subType: string,
  actions: TaskLifecycleActions,
): void {
  const taskId = data?.task_id;
  if (!taskId) return;

  const { setChatMessages } = actions;

  switch (subType) {
    case 'task_started': {
      const description = data.description || data.prompt || '';
      const subagentType = data.subagent_type || 'Agent';

      // Find an existing SubagentContainer that doesn't yet have a taskId
      // and assign this taskId to it, or create a new notification
      setChatMessages((prev) => {
        const updated = [...prev];
        // Try to find unbound subagent container
        const idx = updated.findIndex(
          (msg) => msg.isSubagentContainer && msg.subagentState && !msg.subagentState.taskId,
        );
        if (idx >= 0) {
          updated[idx] = {
            ...updated[idx],
            subagentState: {
              ...updated[idx].subagentState!,
              taskId,
              description: description || updated[idx].subagentState!.description,
            },
          };
          return updated;
        }
        // No unbound container — just log it
        console.debug('[task_started] No matching container for', taskId, subagentType);
        return prev;
      });
      break;
    }

    case 'task_progress': {
      const progressContent = typeof data.content === 'string' ? data.content : '';
      if (!progressContent) return;

      setChatMessages((prev) =>
        prev.map((msg) => {
          if (msg.isSubagentContainer && msg.subagentState?.taskId === taskId) {
            const existing = msg.subagentState.progressLog || [];
            return {
              ...msg,
              subagentState: {
                ...msg.subagentState,
                progressLog: [...existing, progressContent],
              },
            };
          }
          return msg;
        }),
      );
      break;
    }

    case 'task_notification': {
      const status = data.status || 'completed';
      const isComplete = status === 'completed' || status === 'done';

      setChatMessages((prev) =>
        prev.map((msg) => {
          if (msg.isSubagentContainer && msg.subagentState?.taskId === taskId) {
            return {
              ...msg,
              subagentState: {
                ...msg.subagentState,
                isComplete,
              },
            };
          }
          return msg;
        }),
      );
      break;
    }
  }
}
```

- [ ] **Step 3: Create `handleStatusMessage.ts`**

```typescript
import type { AgentStatusState } from '../../types/types';

interface StatusActions {
  setAgentStatusState: (state: AgentStatusState | null) => void;
}

/**
 * Handles SDK-level status messages (distinct from claude-status WS type).
 * Updates independent agentStatusState — does NOT modify chatMessages.
 */
export function handleStatusMessage(
  data: Record<string, any>,
  actions: StatusActions,
): void {
  const text = data?.message || data?.status || '';
  if (!text) return;

  actions.setAgentStatusState({
    text: String(text),
    isActive: true,
    timestamp: Date.now(),
  });
}
```

- [ ] **Step 4: Create `handleRateLimit.ts`**

```typescript
import type { RateLimitState } from '../../types/types';

interface RateLimitActions {
  setRateLimitState: (state: RateLimitState | null) => void;
}

/**
 * Handles rate limit events.
 * Sets rate limit state with countdown timer info.
 */
export function handleRateLimit(
  data: Record<string, any>,
  actions: RateLimitActions,
): void {
  const retryAfterMs = data?.retry_after_ms;
  const message = data?.message || 'Rate limited';

  actions.setRateLimitState({
    isLimited: true,
    retryAfterMs: typeof retryAfterMs === 'number' ? retryAfterMs : 30000,
    message: String(message),
    startedAt: Date.now(),
  });
}
```

- [ ] **Step 5: Run typecheck**

Run: `cd /home/claude-workspace/claudecodeui-summer/claudecodeui-summer && npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 6: Commit**

```bash
git add src/components/chat/hooks/handlers/handleToolProgress.ts \
        src/components/chat/hooks/handlers/handleTaskLifecycle.ts \
        src/components/chat/hooks/handlers/handleStatusMessage.ts \
        src/components/chat/hooks/handlers/handleRateLimit.ts
git commit -m "feat(handlers): add handleToolProgress, handleTaskLifecycle, handleStatusMessage, handleRateLimit"
```

---

### Task 7: Create `handleResult.ts` and `handleLegacyMessage.ts`

**Files:**
- Create: `src/components/chat/hooks/handlers/handleResult.ts`
- Create: `src/components/chat/hooks/handlers/handleLegacyMessage.ts`

- [ ] **Step 1: Create `handleResult.ts`**

```typescript
import type { CostInfo } from '../../types/types';

interface ResultActions {
  setTokenBudget: (budget: Record<string, unknown> | null) => void;
  setCostInfo: (info: CostInfo | null) => void;
}

/**
 * Handles result messages with cost/usage extraction.
 * Updates token budget (existing) and cost info (new).
 */
export function handleResult(
  data: Record<string, any>,
  actions: ResultActions,
): void {
  if (!data || data.type !== 'result') return;

  const { setTokenBudget, setCostInfo } = actions;

  // Extract cost info from result
  const totalCostUsd = data.total_cost_usd ?? data.costUsd;
  const durationMs = data.duration_ms ?? data.durationMs;
  const modelUsage = data.modelUsage;

  if (modelUsage) {
    const modelKey = Object.keys(modelUsage)[0];
    const modelData = modelUsage[modelKey];

    if (modelData) {
      const inputTokens = modelData.cumulativeInputTokens || modelData.inputTokens || 0;
      const outputTokens = modelData.cumulativeOutputTokens || modelData.outputTokens || 0;

      setCostInfo({
        totalCostUsd: typeof totalCostUsd === 'number' ? totalCostUsd : undefined,
        inputTokens,
        outputTokens,
        durationMs: typeof durationMs === 'number' ? durationMs : undefined,
        model: modelKey,
      });
    }
  }

  // NOTE: token budget extraction is still handled in the main for-await loop
  // in claude-sdk.js (server-side), which sends a separate 'token-budget' message.
  // This handler is for client-side cost info display only.
}
```

- [ ] **Step 2: Create `handleLegacyMessage.ts`**

```typescript
import type { Dispatch, SetStateAction } from 'react';
import type { ChatMessage } from '../../types/types';
import { decodeHtmlEntities, formatUsageLimitText } from '../../utils/chatFormatting';

interface LegacyActions {
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
}

/**
 * Fallback handler for messages without a recognized subType.
 * Preserves backward compatibility during rolling updates.
 */
export function handleLegacyMessage(
  data: Record<string, any>,
  rawData: Record<string, any> | null,
  actions: LegacyActions,
): void {
  const messageData = data?.message || data;
  const structuredMessageData =
    messageData && typeof messageData === 'object' ? messageData : null;

  if (!structuredMessageData) return;

  // Try to detect assistant messages by structure
  if (structuredMessageData.role === 'assistant' || Array.isArray(structuredMessageData.content)) {
    // Delegate to assistant message handling path
    const { setChatMessages } = actions;

    if (Array.isArray(structuredMessageData.content)) {
      structuredMessageData.content.forEach((part: any) => {
        if (part.type === 'text' && part.text?.trim()) {
          let content = decodeHtmlEntities(part.text);
          content = formatUsageLimitText(content);
          setChatMessages((prev) => [
            ...prev,
            { type: 'assistant', content, timestamp: new Date() },
          ]);
        }
      });
    } else if (typeof structuredMessageData.content === 'string' && structuredMessageData.content.trim()) {
      let content = decodeHtmlEntities(structuredMessageData.content);
      content = formatUsageLimitText(content);
      actions.setChatMessages((prev) => [
        ...prev,
        { type: 'assistant', content, timestamp: new Date() },
      ]);
    }
    return;
  }

  // Log unrecognized messages for debugging
  console.debug('[legacy] Unhandled message:', structuredMessageData.type, structuredMessageData);
}
```

- [ ] **Step 3: Run typecheck**

Run: `cd /home/claude-workspace/claudecodeui-summer/claudecodeui-summer && npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add src/components/chat/hooks/handlers/handleResult.ts \
        src/components/chat/hooks/handlers/handleLegacyMessage.ts
git commit -m "feat(handlers): add handleResult with cost info and handleLegacyMessage fallback"
```

---

### Task 8: Create barrel export `handlers/index.ts`

**Files:**
- Create: `src/components/chat/hooks/handlers/index.ts`

- [ ] **Step 1: Create the barrel export**

```typescript
export { handleStreamEvent, STREAM_FLUSH_INTERVAL_MS } from './handleStreamEvent';
export { handleAssistantMessage } from './handleAssistantMessage';
export { handleToolResult } from './handleToolResult';
export { handleToolProgress } from './handleToolProgress';
export { handleTaskLifecycle } from './handleTaskLifecycle';
export { handleStatusMessage } from './handleStatusMessage';
export { handleRateLimit } from './handleRateLimit';
export { handleResult } from './handleResult';
export { handleLegacyMessage } from './handleLegacyMessage';
```

- [ ] **Step 2: Run typecheck**

Run: `cd /home/claude-workspace/claudecodeui-summer/claudecodeui-summer && npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/hooks/handlers/index.ts
git commit -m "feat(handlers): add barrel export for all handler modules"
```

---

## Chunk 3: Refactor the Monolith + Wire Up Routing

### Task 9: Refactor `useChatRealtimeHandlers.ts` to routing entry

**Files:**
- Modify: `src/components/chat/hooks/useChatRealtimeHandlers.ts`

This is the most critical task. The existing `case 'claude-response'` block (lines 316-523) is replaced with subType-based routing. All other cases (cursor, codex, gemini, etc.) remain untouched.

- [ ] **Step 1: Add new imports and state hooks**

At the top of the file, add the handler imports after existing imports (after line 6):

```typescript
import type { CostInfo, RateLimitState, AgentStatusState } from '../types/types';
import {
  handleStreamEvent,
  STREAM_FLUSH_INTERVAL_MS,
  handleAssistantMessage,
  handleToolResult,
  handleToolProgress,
  handleTaskLifecycle,
  handleStatusMessage,
  handleRateLimit,
  handleResult,
  handleLegacyMessage,
} from './handlers';
```

- [ ] **Step 2: Add new state hooks inside the hook function**

After line 119 (`const lastProcessedMessageRef = useRef<LatestChatMessage | null>(null);`), add:

```typescript
  const [costInfo, setCostInfo] = useState<CostInfo | null>(null);
  const [rateLimitState, setRateLimitState] = useState<RateLimitState | null>(null);
  const [agentStatusState, setAgentStatusState] = useState<AgentStatusState | null>(null);
```

Also add `useState` to the React import on line 1:

```typescript
import { useEffect, useRef, useState } from 'react';
```

- [ ] **Step 3: Replace the `case 'claude-response'` block**

Replace lines 316-523 (the entire `case 'claude-response': { ... break; }` block) with the new routing logic:

```typescript
      case 'claude-response': {
        const subType = latestMessage.subType;

        // --- subType-based routing (when backend provides classification) ---
        if (subType) {
          switch (subType) {
            case 'stream_event':
              handleStreamEvent(
                latestMessage.data,
                { streamBufferRef, streamTimerRef },
                {
                  setChatMessages,
                  appendStreamingChunk: (chunk: string, newline?: boolean) =>
                    appendStreamingChunk(setChatMessages, chunk, newline),
                  finalizeStreamingMessage: () => finalizeStreamingMessage(setChatMessages),
                },
              );
              break;

            case 'assistant':
              handleAssistantMessage(latestMessage.data, rawStructuredData, { setChatMessages });
              break;

            case 'user':
              handleToolResult(latestMessage.data, rawStructuredData, { setChatMessages });
              break;

            case 'tool_progress':
              handleToolProgress(latestMessage.data, { setChatMessages });
              break;

            case 'task_started':
            case 'task_progress':
            case 'task_notification':
              handleTaskLifecycle(latestMessage.data, subType, { setChatMessages });
              break;

            case 'status':
              handleStatusMessage(latestMessage.data, { setAgentStatusState });
              break;

            case 'rate_limit':
              handleRateLimit(latestMessage.data, { setRateLimitState });
              break;

            case 'result':
              handleResult(latestMessage.data, { setTokenBudget, setCostInfo });
              break;

            case 'hook_started':
            case 'hook_progress':
              console.debug(`[hook] ${subType}`, latestMessage.data);
              break;

            case 'compact_boundary':
              console.debug('[compact_boundary]', latestMessage.data);
              break;

            case 'system': {
              // System init handling — preserve existing logic
              if (
                structuredMessageData?.type === 'system' &&
                structuredMessageData.subtype === 'init' &&
                structuredMessageData.session_id
              ) {
                if (currentSessionId && structuredMessageData.session_id !== currentSessionId && isSystemInitForView) {
                  setIsSystemSessionChange(true);
                  onNavigateToSession?.(structuredMessageData.session_id);
                  return;
                }
                if (!currentSessionId && isSystemInitForView) {
                  setIsSystemSessionChange(true);
                  onNavigateToSession?.(structuredMessageData.session_id);
                  return;
                }
                if (currentSessionId && structuredMessageData.session_id === currentSessionId && isSystemInitForView) {
                  return;
                }
              }
              break;
            }

            case 'unknown':
            default:
              handleLegacyMessage(latestMessage.data, rawStructuredData, { setChatMessages });
              break;
          }
          break;
        }

        // --- Fallback: legacy structural detection (no subType from backend) ---

        if (messageData && typeof messageData === 'object' && messageData.type) {
          if (messageData.type === 'content_block_delta' && messageData.delta?.text) {
            const decodedText = decodeHtmlEntities(messageData.delta.text);
            streamBufferRef.current += decodedText;
            if (!streamTimerRef.current) {
              streamTimerRef.current = window.setTimeout(() => {
                const chunk = streamBufferRef.current;
                streamBufferRef.current = '';
                streamTimerRef.current = null;
                appendStreamingChunk(setChatMessages, chunk, false);
              }, STREAM_FLUSH_INTERVAL_MS);
            }
            return;
          }

          if (messageData.type === 'content_block_stop') {
            if (streamTimerRef.current) {
              clearTimeout(streamTimerRef.current);
              streamTimerRef.current = null;
            }
            const chunk = streamBufferRef.current;
            streamBufferRef.current = '';
            appendStreamingChunk(setChatMessages, chunk, false);
            finalizeStreamingMessage(setChatMessages);
            return;
          }
        }

        // System init (legacy)
        if (
          structuredMessageData?.type === 'system' &&
          structuredMessageData.subtype === 'init' &&
          structuredMessageData.session_id &&
          currentSessionId &&
          structuredMessageData.session_id !== currentSessionId &&
          isSystemInitForView
        ) {
          setIsSystemSessionChange(true);
          onNavigateToSession?.(structuredMessageData.session_id);
          return;
        }
        if (
          structuredMessageData?.type === 'system' &&
          structuredMessageData.subtype === 'init' &&
          structuredMessageData.session_id &&
          !currentSessionId &&
          isSystemInitForView
        ) {
          setIsSystemSessionChange(true);
          onNavigateToSession?.(structuredMessageData.session_id);
          return;
        }
        if (
          structuredMessageData?.type === 'system' &&
          structuredMessageData.subtype === 'init' &&
          structuredMessageData.session_id &&
          currentSessionId &&
          structuredMessageData.session_id === currentSessionId &&
          isSystemInitForView
        ) {
          return;
        }

        // Assistant content (legacy)
        handleAssistantMessage(latestMessage.data, rawStructuredData, { setChatMessages });

        // Tool results (legacy)
        handleToolResult(latestMessage.data, rawStructuredData, { setChatMessages });

        break;
      }
```

- [ ] **Step 4: Update the `claude-output` case to use the new buffer interval**

In the `case 'claude-output'` block (around line 525), change the `100` in `setTimeout` to `STREAM_FLUSH_INTERVAL_MS`:

```typescript
            streamTimerRef.current = window.setTimeout(() => {
              // ...
            }, STREAM_FLUSH_INTERVAL_MS);
```

- [ ] **Step 5: Add return value for new state**

The hook currently returns void. Add a return statement at the end of the hook function, before the closing brace:

```typescript
  return { costInfo, rateLimitState, agentStatusState };
```

Also update the `LatestChatMessage` type (around line 13) to include `subType`:

```typescript
type LatestChatMessage = {
  type?: string;
  subType?: string;  // NEW: classification from backend
  data?: any;
  // ... rest unchanged
};
```

- [ ] **Step 6: Run typecheck**

Run: `cd /home/claude-workspace/claudecodeui-summer/claudecodeui-summer && npx tsc --noEmit`
Expected: No new errors from this file (there may be downstream errors from consumers that expect void return — those are addressed in Task 12)

- [ ] **Step 7: Commit**

```bash
git add src/components/chat/hooks/useChatRealtimeHandlers.ts
git commit -m "refactor(chat): replace claude-response monolith with subType-based routing"
```

---

## Chunk 4: New UI Components

### Task 10: Create `ThinkingStreamBlock.tsx`

**Files:**
- Create: `src/components/chat/view/subcomponents/ThinkingStreamBlock.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { memo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Markdown } from './Markdown';

interface ThinkingStreamBlockProps {
  content: string;
  isStreaming: boolean;
  durationMs?: number;
}

/**
 * Renders a thinking block with real-time streaming support.
 * Purple left border, pulse animation while streaming, auto-collapse when done.
 */
const ThinkingStreamBlock = memo(({ content, isStreaming, durationMs }: ThinkingStreamBlockProps) => {
  const { t } = useTranslation('chat');
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom during streaming
  useEffect(() => {
    if (isStreaming && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, isStreaming]);

  const durationSeconds = durationMs ? Math.round(durationMs / 1000) : null;
  const title = isStreaming
    ? t('thinking.streamingTitle', { defaultValue: 'Thinking...' })
    : durationSeconds
      ? t('thinking.duration', { seconds: durationSeconds, defaultValue: `Thought for ${durationSeconds}s` })
      : t('thinking.emoji');

  return (
    <div className="my-1 text-sm text-gray-700 dark:text-gray-300">
      <details className="group" open={isStreaming}>
        <summary className="flex cursor-pointer items-center gap-2 font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          {isStreaming && (
            <span className="h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-purple-500 dark:bg-purple-400" />
          )}
          <svg
            className="h-3 w-3 transition-transform group-open:rotate-90"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span>{title}</span>
        </summary>
        <div
          ref={contentRef}
          className={`mt-2 max-h-64 overflow-y-auto border-l-2 pl-4 font-mono text-sm ${
            isStreaming
              ? 'border-purple-400 text-gray-600 dark:border-purple-500 dark:text-gray-400'
              : 'border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400'
          }`}
        >
          <Markdown className="prose prose-sm prose-gray max-w-none dark:prose-invert">
            {content || ''}
          </Markdown>
          {isStreaming && (
            <span className="inline-block h-4 w-0.5 animate-pulse bg-purple-500 dark:bg-purple-400" />
          )}
        </div>
      </details>
    </div>
  );
});

ThinkingStreamBlock.displayName = 'ThinkingStreamBlock';
export default ThinkingStreamBlock;
```

- [ ] **Step 2: Run typecheck**

Run: `cd /home/claude-workspace/claudecodeui-summer/claudecodeui-summer && npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/view/subcomponents/ThinkingStreamBlock.tsx
git commit -m "feat(ui): add ThinkingStreamBlock component with streaming support"
```

---

### Task 11: Create `ToolProgressDisplay.tsx`, `RateLimitBanner.tsx`, `CostInfoBar.tsx`

**Files:**
- Create: `src/components/chat/tools/components/ToolProgressDisplay.tsx`
- Create: `src/components/chat/view/subcomponents/RateLimitBanner.tsx`
- Create: `src/components/chat/view/subcomponents/CostInfoBar.tsx`

- [ ] **Step 1: Create `ToolProgressDisplay.tsx`**

```tsx
import { memo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface ToolProgressDisplayProps {
  progress: string[];
  maxLines?: number;
}

/**
 * Terminal-style display for tool execution progress.
 * Shows last N lines of output, auto-scrolls to bottom.
 */
const ToolProgressDisplay = memo(({ progress, maxLines = 20 }: ToolProgressDisplayProps) => {
  const { t } = useTranslation('chat');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [progress.length]);

  if (!progress || progress.length === 0) return null;

  const displayLines = progress.slice(-maxLines);

  return (
    <div className="mt-1 overflow-hidden rounded border border-gray-700/30 bg-gray-900 dark:border-gray-600/30 dark:bg-gray-950">
      <div className="flex items-center gap-1.5 border-b border-gray-700/30 px-2 py-1 dark:border-gray-600/30">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
        <span className="text-[10px] font-medium text-gray-400">
          {t('tool.running', { defaultValue: 'Running' })}
        </span>
      </div>
      <div
        ref={containerRef}
        className="max-h-32 overflow-y-auto p-2"
      >
        {displayLines.map((line, idx) => (
          <div key={idx} className="whitespace-pre-wrap break-all font-mono text-[11px] leading-4 text-gray-300">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
});

ToolProgressDisplay.displayName = 'ToolProgressDisplay';
export default ToolProgressDisplay;
```

- [ ] **Step 2: Create `RateLimitBanner.tsx`**

```tsx
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RateLimitState } from '../../types/types';

interface RateLimitBannerProps {
  rateLimitState: RateLimitState | null;
  onExpired?: () => void;
}

/**
 * Amber floating banner with countdown timer for rate limits.
 * Auto-disappears when countdown reaches zero.
 */
const RateLimitBanner = memo(({ rateLimitState, onExpired }: RateLimitBannerProps) => {
  const { t } = useTranslation('chat');
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!rateLimitState?.isLimited || !rateLimitState.startedAt || !rateLimitState.retryAfterMs) {
      setRemainingMs(0);
      return;
    }

    const updateRemaining = () => {
      const elapsed = Date.now() - rateLimitState.startedAt!;
      const remaining = Math.max(0, rateLimitState.retryAfterMs! - elapsed);
      setRemainingMs(remaining);
      if (remaining <= 0) {
        onExpired?.();
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [rateLimitState, onExpired]);

  if (!rateLimitState?.isLimited || remainingMs <= 0) return null;

  const secondsRemaining = Math.ceil(remainingMs / 1000);

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-4 z-50 flex justify-center">
      <div className="pointer-events-auto rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-2 shadow-lg dark:border-amber-600/40 dark:bg-amber-900/80">
        <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
          <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            {t('rateLimit.message', {
              seconds: secondsRemaining,
              defaultValue: `Rate limited, retrying in ${secondsRemaining}s...`,
            })}
          </span>
        </div>
      </div>
    </div>
  );
});

RateLimitBanner.displayName = 'RateLimitBanner';
export default RateLimitBanner;
```

- [ ] **Step 3: Create `CostInfoBar.tsx`**

```tsx
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { CostInfo } from '../../types/types';

interface CostInfoBarProps {
  costInfo: CostInfo | null;
}

/**
 * Compact cost/duration/model display next to token budget.
 * Format: 💰 $0.05 · 8.2s · sonnet-4
 */
const CostInfoBar = memo(({ costInfo }: CostInfoBarProps) => {
  const { t } = useTranslation('chat');

  if (!costInfo) return null;

  const parts: string[] = [];

  if (costInfo.totalCostUsd !== undefined) {
    parts.push(`$${costInfo.totalCostUsd.toFixed(2)}`);
  }

  if (costInfo.durationMs !== undefined) {
    const seconds = (costInfo.durationMs / 1000).toFixed(1);
    parts.push(`${seconds}s`);
  }

  if (costInfo.model) {
    // Show short model name (last segment)
    const shortModel = costInfo.model.split('/').pop() || costInfo.model;
    parts.push(shortModel);
  }

  if (parts.length === 0) return null;

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground" title={t('cost.label', {
      cost: costInfo.totalCostUsd?.toFixed(2) ?? '?',
      duration: costInfo.durationMs ? (costInfo.durationMs / 1000).toFixed(1) : '?',
      model: costInfo.model ?? '?',
      defaultValue: parts.join(' · '),
    })}>
      <span>💰</span>
      <span>{parts.join(' · ')}</span>
    </div>
  );
});

CostInfoBar.displayName = 'CostInfoBar';
export default CostInfoBar;
```

- [ ] **Step 4: Run typecheck**

Run: `cd /home/claude-workspace/claudecodeui-summer/claudecodeui-summer && npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/tools/components/ToolProgressDisplay.tsx \
        src/components/chat/view/subcomponents/RateLimitBanner.tsx \
        src/components/chat/view/subcomponents/CostInfoBar.tsx
git commit -m "feat(ui): add ToolProgressDisplay, RateLimitBanner, CostInfoBar components"
```

---

## Chunk 5: Wire UI Components + Existing Component Modifications

### Task 12: Modify `MessageComponent.tsx` — use ThinkingStreamBlock

**Files:**
- Modify: `src/components/chat/view/subcomponents/MessageComponent.tsx`

- [ ] **Step 1: Add import for ThinkingStreamBlock**

After line 14 (`import MessageCopyControl from './MessageCopyControl';`), add:

```typescript
import ThinkingStreamBlock from './ThinkingStreamBlock';
```

- [ ] **Step 2: Replace the static thinking block with ThinkingStreamBlock**

Find the thinking block section (lines 380-396):

```tsx
            ) : message.isThinking ? (
              /* Thinking messages - collapsible by default */
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <details className="group">
                  <summary className="flex cursor-pointer items-center gap-2 font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    <svg className="h-3 w-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span>{t('thinking.emoji')}</span>
                  </summary>
                  <div className="mt-2 border-l-2 border-gray-300 pl-4 text-sm text-gray-600 dark:border-gray-600 dark:text-gray-400">
                    <Markdown className="prose prose-sm prose-gray max-w-none dark:prose-invert">
                      {message.content}
                    </Markdown>
                  </div>
                </details>
              </div>
```

Replace with:

```tsx
            ) : message.isThinking ? (
              /* Thinking messages - streaming or static */
              <ThinkingStreamBlock
                content={message.content || ''}
                isStreaming={!!message.isStreaming}
                durationMs={message.thinkingDurationMs}
              />
```

- [ ] **Step 3: Add tool started loading indicator**

In the tool use section (around line 194, after `{message.toolInput && (`), add a loading indicator for `isToolStarted`:

Before the `{message.toolInput && (` block (line 194), add:

```tsx
                {message.isToolStarted && !message.toolResult && (
                  <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                    <span>{t('tool.started', { toolName: message.toolName || 'Tool', defaultValue: `Starting ${message.toolName || 'Tool'}...` })}</span>
                  </div>
                )}
```

- [ ] **Step 4: Run typecheck**

Run: `cd /home/claude-workspace/claudecodeui-summer/claudecodeui-summer && npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/view/subcomponents/MessageComponent.tsx
git commit -m "feat(ui): integrate ThinkingStreamBlock and tool started indicator"
```

---

### Task 13: Modify `ToolRenderer.tsx` — embed ToolProgressDisplay

**Files:**
- Modify: `src/components/chat/tools/ToolRenderer.tsx`

- [ ] **Step 1: Add import for ToolProgressDisplay**

After line 5 (`import { OneLineDisplay, CollapsibleDisplay, ... } from './components';`), add:

```typescript
import ToolProgressDisplay from './components/ToolProgressDisplay';
```

- [ ] **Step 2: Add `toolProgress` to `ToolRendererProps` interface**

In the `ToolRendererProps` interface (lines 13-31), add after line 24 (`rawToolInput?: string;`):

```typescript
  toolProgress?: string[];
```

- [ ] **Step 3: Add `toolProgress` to the component destructuring**

In the component function (line 49), add `toolProgress` to the destructured props:

```typescript
export const ToolRenderer: React.FC<ToolRendererProps> = memo(({
  toolName,
  toolInput,
  toolResult,
  toolId,
  mode,
  onFileOpen,
  createDiff,
  selectedProject,
  autoExpandTools = false,
  showRawParameters = false,
  rawToolInput,
  toolProgress,        // NEW
  isSubagentContainer,
  subagentState
}) => {
```

- [ ] **Step 4: Render ToolProgressDisplay inside the component**

After the `SubagentContainer` section (after line 95, before `if (!displayConfig) return null;`), add:

```typescript
  // Show tool progress output while tool is executing
  const showProgress = toolProgress && toolProgress.length > 0 && !toolResult && mode === 'input';
```

Then, just before the final `return null;` at line 238, or better: inside the `OneLineDisplay` and `CollapsibleDisplay` returns, wrap them to include progress. The simplest approach: add progress display after the main component returns.

Actually, the cleaner approach is to render `ToolProgressDisplay` alongside the main display. After the last return inside the component (before the final `return null;` at line 238), this won't work well. Instead, modify the return blocks.

A simpler approach — wrap each display return to append progress:

Find line 97 (`if (!displayConfig) return null;`) and add before it:

```typescript
  // Tool progress indicator (shown during execution, before result arrives)
  const progressDisplay = toolProgress && toolProgress.length > 0 && !toolResult && mode === 'input'
    ? <ToolProgressDisplay progress={toolProgress} />
    : null;
```

Then after the `OneLineDisplay` return (line 119), wrap it:

Change the `OneLineDisplay` return block to:

```tsx
    return (
      <>
        <OneLineDisplay ... />
        {progressDisplay}
      </>
    );
```

And similarly wrap the `CollapsibleDisplay` return block:

```tsx
    return (
      <>
        <CollapsibleDisplay ...>
          {contentComponent}
        </CollapsibleDisplay>
        {progressDisplay}
      </>
    );
```

- [ ] **Step 5: Pass `toolProgress` from `MessageComponent.tsx`**

In `src/components/chat/view/subcomponents/MessageComponent.tsx`, find the `<ToolRenderer` usage for input mode (around line 195-209). Add `toolProgress` prop:

```tsx
                  <ToolRenderer
                    toolName={message.toolName || 'UnknownTool'}
                    toolInput={message.toolInput}
                    toolResult={message.toolResult}
                    toolId={message.toolId}
                    mode="input"
                    onFileOpen={onFileOpen}
                    createDiff={createDiff}
                    selectedProject={selectedProject}
                    autoExpandTools={autoExpandTools}
                    showRawParameters={showRawParameters}
                    rawToolInput={typeof message.toolInput === 'string' ? message.toolInput : undefined}
                    toolProgress={message.toolProgress}
                    isSubagentContainer={message.isSubagentContainer}
                    subagentState={message.subagentState}
                  />
```

- [ ] **Step 6: Run typecheck**

Run: `cd /home/claude-workspace/claudecodeui-summer/claudecodeui-summer && npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 7: Commit**

```bash
git add src/components/chat/tools/ToolRenderer.tsx \
        src/components/chat/view/subcomponents/MessageComponent.tsx
git commit -m "feat(ui): embed ToolProgressDisplay in ToolRenderer with live output"
```

---

### Task 14: Modify `SubagentContainer.tsx` — add taskId matching and progressLog

**Files:**
- Modify: `src/components/chat/tools/components/SubagentContainer.tsx`

- [ ] **Step 1: Update `SubagentContainerProps` interface**

Extend the `subagentState` type in the props interface (lines 5-13) to include new fields:

```typescript
interface SubagentContainerProps {
  toolInput: unknown;
  toolResult?: { content?: unknown; isError?: boolean } | null;
  subagentState: {
    childTools: SubagentChildTool[];
    currentToolIndex: number;
    isComplete: boolean;
    taskId?: string;
    description?: string;
    progressLog?: string[];
  };
}
```

- [ ] **Step 2: Add progressLog rendering**

After the `/* Current tool indicator */` section (after line 88, before `{/* Completion status */}`), add the progress log display:

```tsx
        {/* Agent progress log */}
        {subagentState.progressLog && subagentState.progressLog.length > 0 && !isComplete && (
          <div className="mt-1 max-h-24 overflow-y-auto border-l border-purple-300/50 pl-2 dark:border-purple-600/50">
            {subagentState.progressLog.slice(-10).map((line, idx) => (
              <div key={idx} className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                {line}
              </div>
            ))}
          </div>
        )}
```

- [ ] **Step 3: Run typecheck**

Run: `cd /home/claude-workspace/claudecodeui-summer/claudecodeui-summer && npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add src/components/chat/tools/components/SubagentContainer.tsx
git commit -m "feat(ui): add taskId matching and progressLog to SubagentContainer"
```

---

### Task 15: Wire CostInfoBar into ChatInputControls and ChatComposer

**Files:**
- Modify: `src/components/chat/view/subcomponents/ChatInputControls.tsx`
- Modify: `src/components/chat/view/subcomponents/ChatComposer.tsx`

- [ ] **Step 1: Add CostInfoBar to ChatInputControls**

In `ChatInputControls.tsx`, add the import after line 5:

```typescript
import CostInfoBar from './CostInfoBar';
import type { CostInfo } from '../../types/types';
```

Add `costInfo` to the `ChatInputControlsProps` interface (after line 14, `tokenBudget`):

```typescript
  costInfo?: CostInfo | null;
```

Add `costInfo` to the destructured props (after `tokenBudget`):

```typescript
  costInfo,
```

Add `<CostInfoBar />` after `<TokenUsagePie />` (after line 81):

```tsx
      {costInfo && <CostInfoBar costInfo={costInfo} />}
```

- [ ] **Step 2: Pass costInfo through ChatComposer**

In `ChatComposer.tsx`, add `costInfo` to the `ChatComposerProps` interface (after `tokenBudget` on line 52):

```typescript
  costInfo?: CostInfo | null;
```

Add the import for CostInfo type at the top (after line 15):

```typescript
import type { CostInfo } from '../../types/types';
```

Add `costInfo` to the destructured props (after `tokenBudget` on line 109):

```typescript
  costInfo,
```

Pass `costInfo` to `<ChatInputControls>` (after `tokenBudget` prop around line 197):

```tsx
          costInfo={costInfo}
```

- [ ] **Step 3: Run typecheck**

Run: `cd /home/claude-workspace/claudecodeui-summer/claudecodeui-summer && npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add src/components/chat/view/subcomponents/ChatInputControls.tsx \
        src/components/chat/view/subcomponents/ChatComposer.tsx
git commit -m "feat(ui): wire CostInfoBar into ChatInputControls via ChatComposer"
```

---

## Chunk 6: i18n + Build Verification

### Task 16: Add i18n keys for all 5 languages

**Files:**
- Modify: `src/i18n/locales/en/chat.json`
- Modify: `src/i18n/locales/ko/chat.json`
- Modify: `src/i18n/locales/zh-CN/chat.json`
- Modify: `src/i18n/locales/ja/chat.json`
- Modify: `src/i18n/locales/ru/chat.json`

- [ ] **Step 1: Add English keys**

In `src/i18n/locales/en/chat.json`, add the following keys. Insert into the `"thinking"` section (after line 64, before closing brace of thinking):

```json
    "streamingTitle": "Thinking...",
    "duration": "Thought for {{seconds}}s"
```

Add a new `"tool"` section after the `"tools"` section (after line 37):

Note: The keys go into existing sections where possible. For new top-level sections:

Add to the existing `"thinking"` object (lines 62-65) — insert `streamingTitle` and `duration`:

The `"thinking"` section currently has:
```json
  "thinking": {
    "title": "Thinking...",
    "emoji": "💭 Thinking..."
  },
```

Change to:
```json
  "thinking": {
    "title": "Thinking...",
    "emoji": "💭 Thinking...",
    "streamingTitle": "Thinking...",
    "duration": "Thought for {{seconds}}s"
  },
```

Add new top-level sections before the closing `}`:

```json
  "tool": {
    "started": "Starting {{toolName}}...",
    "running": "Running"
  },
  "agent": {
    "started": "Agent started: {{description}}",
    "progress": "Agent in progress...",
    "completed": "Agent completed",
    "failed": "Agent failed"
  },
  "rateLimit": {
    "message": "Rate limited, retrying in {{seconds}}s..."
  },
  "cost": {
    "label": "${{cost}} · {{duration}}s · {{model}}"
  },
  "status": {
    "reading": "Reading file...",
    "searching": "Searching codebase...",
    "waiting": "Waiting..."
  }
```

- [ ] **Step 2: Add Korean keys**

In `src/i18n/locales/ko/chat.json`, add the corresponding Korean translations. Add `streamingTitle` and `duration` to the `thinking` section, then add the new top-level sections:

```json
  "tool": {
    "started": "{{toolName}} 시작 중...",
    "running": "실행 중"
  },
  "agent": {
    "started": "에이전트 시작: {{description}}",
    "progress": "에이전트 진행 중...",
    "completed": "에이전트 완료",
    "failed": "에이전트 실패"
  },
  "rateLimit": {
    "message": "요청 제한, {{seconds}}초 후 재시도..."
  },
  "cost": {
    "label": "${{cost}} · {{duration}}초 · {{model}}"
  },
  "status": {
    "reading": "파일 읽는 중...",
    "searching": "코드베이스 검색 중...",
    "waiting": "대기 중..."
  }
```

- [ ] **Step 3: Add Chinese keys**

In `src/i18n/locales/zh-CN/chat.json`:

```json
  "tool": {
    "started": "正在启动 {{toolName}}...",
    "running": "运行中"
  },
  "agent": {
    "started": "代理已启动：{{description}}",
    "progress": "代理进行中...",
    "completed": "代理已完成",
    "failed": "代理失败"
  },
  "rateLimit": {
    "message": "请求受限，{{seconds}}秒后重试..."
  },
  "cost": {
    "label": "${{cost}} · {{duration}}秒 · {{model}}"
  },
  "status": {
    "reading": "正在读取文件...",
    "searching": "正在搜索代码库...",
    "waiting": "等待中..."
  }
```

- [ ] **Step 4: Add Japanese keys**

In `src/i18n/locales/ja/chat.json`:

```json
  "tool": {
    "started": "{{toolName}} を開始中...",
    "running": "実行中"
  },
  "agent": {
    "started": "エージェント開始：{{description}}",
    "progress": "エージェント処理中...",
    "completed": "エージェント完了",
    "failed": "エージェント失敗"
  },
  "rateLimit": {
    "message": "レート制限中、{{seconds}}秒後に再試行..."
  },
  "cost": {
    "label": "${{cost}} · {{duration}}秒 · {{model}}"
  },
  "status": {
    "reading": "ファイル読み込み中...",
    "searching": "コードベース検索中...",
    "waiting": "待機中..."
  }
```

- [ ] **Step 5: Add Russian keys**

In `src/i18n/locales/ru/chat.json`:

```json
  "tool": {
    "started": "Запуск {{toolName}}...",
    "running": "Выполняется"
  },
  "agent": {
    "started": "Агент запущен: {{description}}",
    "progress": "Агент выполняется...",
    "completed": "Агент завершён",
    "failed": "Агент не выполнен"
  },
  "rateLimit": {
    "message": "Ограничение запросов, повтор через {{seconds}}с..."
  },
  "cost": {
    "label": "${{cost}} · {{duration}}с · {{model}}"
  },
  "status": {
    "reading": "Чтение файла...",
    "searching": "Поиск по коду...",
    "waiting": "Ожидание..."
  }
```

- [ ] **Step 6: Commit**

```bash
git add src/i18n/locales/en/chat.json \
        src/i18n/locales/ko/chat.json \
        src/i18n/locales/zh-CN/chat.json \
        src/i18n/locales/ja/chat.json \
        src/i18n/locales/ru/chat.json
git commit -m "feat(i18n): add translation keys for real-time rendering in all 5 languages"
```

---

### Task 17: Build verification and lint

**Files:**
- None (verification only)

- [ ] **Step 1: Run typecheck**

Run: `cd /home/claude-workspace/claudecodeui-summer/claudecodeui-summer && npx tsc --noEmit`
Expected: PASS (no new type errors)

- [ ] **Step 2: Run lint**

Run: `cd /home/claude-workspace/claudecodeui-summer/claudecodeui-summer && npm run lint`
Expected: PASS (warnings OK, no errors)

- [ ] **Step 3: Run build**

Run: `cd /home/claude-workspace/claudecodeui-summer/claudecodeui-summer && npm run build`
Expected: Build succeeds, output in `dist/`

- [ ] **Step 4: Fix any lint or build errors found in steps 1-3**

Address each error individually, then re-run the failing check.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "fix: resolve lint and build issues from real-time rendering implementation"
```
