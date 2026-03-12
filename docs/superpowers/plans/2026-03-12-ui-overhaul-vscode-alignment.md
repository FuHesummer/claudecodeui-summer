# Implementation Plan: UI Overhaul — Align with Claude Code for VS Code

**Date**: 2026-03-12
**Spec**: `docs/superpowers/specs/2026-03-12-ui-overhaul-vscode-alignment-design.md`
**Estimated effort**: 13–17 dev-days across 4 phases, 6 chunks

---

## Phase 1 — Foundation + Permissions

### Step 1.1: Add Chat Design Tokens to CSS

**File**: `src/index.css`

Insert new design tokens after the existing nav tokens in `:root` (after line 57) and `.dark` (after line 118).

```css
/* --- Add inside :root, after --nav-input-focus-ring line (~line 57) --- */

    /* Chat spacing */
    --chat-gap-messages: 8px;
    --chat-padding-message: 12px;
    --chat-indent-subagent: 16px;

    /* Chat radii */
    --chat-radius-message: 8px;
    --chat-radius-tool: 6px;
    --chat-radius-code: 6px;

    /* Chat transitions */
    --chat-transition-expand: 200ms ease-out;
    --chat-transition-fade: 150ms ease-in;

    /* Tool status colors */
    --tool-success: 142 71% 45%;
    --tool-pending: 48 96% 53%;
    --tool-error: 0 84.2% 60.2%;
    --tool-running: 221.2 83.2% 53.3%;

    /* Subagent */
    --subagent-border: 270 60% 60%;
    --subagent-bg: 270 60% 98%;

    /* Context indicator */
    --context-green: 142 71% 45%;
    --context-yellow: 48 96% 53%;
    --context-orange: 25 95% 53%;
    --context-red: 0 84% 60%;
```

```css
/* --- Add inside .dark, after --nav-input-focus-ring line (~line 118) --- */

    /* Chat dark overrides */
    --tool-success: 142 71% 40%;
    --tool-pending: 48 80% 50%;
    --tool-error: 0 62.8% 30.6%;
    --tool-running: 217.2 91.2% 59.8%;

    --subagent-border: 270 50% 55%;
    --subagent-bg: 270 30% 12%;

    --context-green: 142 60% 40%;
    --context-yellow: 48 80% 48%;
    --context-orange: 25 80% 48%;
    --context-red: 0 70% 50%;
```

**Verification**: Run `npm run build` — no CSS syntax errors.

**Commit point**: `feat(css): add chat design tokens for messages, tools, subagents, context`

---

### Step 1.2: Extend ChatMessage Type with New Fields

**File**: `src/components/chat/types/types.ts`

Add the following optional fields to the `ChatMessage` interface (after `thinkingDurationMs`, before the index signature):

```typescript
  // --- UI Overhaul additions ---
  isHookEvent?: boolean;
  hookName?: string;
  isCompactBoundary?: boolean;
  isStatusInline?: boolean;
  isStale?: boolean;
  modelName?: string;
```

Add new fields to `subagentState` (after `progressLog`):

```typescript
    elapsedMs?: number;       // tracked via setInterval while !isComplete
    modelName?: string;       // from task_started data
    toolCount?: number;       // total tools completed
```

**Current code** (lines 44–51):
```typescript
  subagentState?: {
    childTools: SubagentChildTool[];
    currentToolIndex: number;
    isComplete: boolean;
    taskId?: string;
    description?: string;
    progressLog?: string[];
  };
```

**New code**:
```typescript
  subagentState?: {
    childTools: SubagentChildTool[];
    currentToolIndex: number;
    isComplete: boolean;
    taskId?: string;
    description?: string;
    progressLog?: string[];
    elapsedMs?: number;
    modelName?: string;
    toolCount?: number;
  };
```

**Verification**: `npm run typecheck` passes.

**Commit point**: `feat(types): extend ChatMessage with hook, status, model, subagent fields`

---

### Step 1.3: YOLO Mode — Default Permission Mode

**File**: `src/components/chat/hooks/useChatProviderState.ts`

**Change 1** — Default initial state (line 12):

Current:
```typescript
const [permissionMode, setPermissionMode] = useState<PermissionMode>('default');
```

New:
```typescript
const defaultMode = (localStorage.getItem('defaultPermissionMode') as PermissionMode) || 'bypassPermissions';
const [permissionMode, setPermissionMode] = useState<PermissionMode>(defaultMode);
```

**Change 2** — Fallback when loading per-session mode (line 38):

Current:
```typescript
setPermissionMode((savedMode as PermissionMode) || 'default');
```

New:
```typescript
const globalDefault = (localStorage.getItem('defaultPermissionMode') as PermissionMode) || 'bypassPermissions';
setPermissionMode((savedMode as PermissionMode) || globalDefault);
```

**Verification**: Open the app → new session → permission mode button shows "Bypass Permissions" (orange). Cycle through modes → reload → verifies per-session persistence.

---

### Step 1.4: YOLO Visual Indicator

**File**: `src/components/chat/view/subcomponents/ChatInputControls.tsx`

Add a YOLO indicator label when `permissionMode === 'bypassPermissions'`. Insert before the permission mode button (before line 45):

```tsx
{permissionMode === 'bypassPermissions' && (
  <button
    type="button"
    onClick={onModeSwitch}
    className="flex items-center gap-1 rounded-md bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700 transition-colors hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:hover:bg-orange-900/50"
    title={t('input.yoloTooltip', { defaultValue: 'All tool permissions auto-approved. Equivalent to --dangerously-skip-permissions' })}
  >
    <span>⚡</span>
    <span>YOLO</span>
  </button>
)}
```

**i18n**: Add `input.yoloTooltip` key to `src/i18n/locales/en/chat.json` and other locale files.

**Verification**: Visual check — orange "⚡ YOLO" pill appears next to mode button. Clicking it cycles the mode.

---

### Step 1.5: `/yolo` Slash Command

**File**: `src/components/chat/hooks/useSlashCommands.ts`

This file fetches slash commands from the backend via `/api/slash-commands`. The `/yolo` command needs to be a client-side built-in that toggles permission mode.

**Approach**: Add to the built-in commands array. Search for where built-in commands are defined (there is a pattern of local commands being mixed in). Add:

```typescript
// Built-in client-side commands (not from backend)
const builtInCommands: SlashCommand[] = [
  {
    name: 'yolo',
    description: 'Toggle YOLO mode (bypass all permissions)',
    type: 'builtin',
  },
];
```

The `onExecuteCommand` callback in the parent component (`ChatComposer.tsx`) must handle `yolo`:

```typescript
if (command.name === 'yolo') {
  const nextMode = permissionMode === 'bypassPermissions' ? 'default' : 'bypassPermissions';
  setPermissionMode(nextMode);
  if (selectedSession?.id) {
    localStorage.setItem(`permissionMode-${selectedSession.id}`, nextMode);
  }
  // Add confirmation message to chat
  setChatMessages((prev) => [
    ...prev,
    {
      type: 'assistant',
      content: nextMode === 'bypassPermissions'
        ? '⚡ YOLO mode enabled — all permissions auto-approved'
        : '🛡 YOLO mode disabled — permissions will be prompted',
      timestamp: new Date(),
    },
  ]);
  return;
}
```

**Verification**: Type `/yolo` in chat → confirmation message appears → mode toggles.

---

### Step 1.6: Backend IS_SANDBOX Fix

**File**: `server/claude-sdk.js`

**Current code** (lines 170–176):
```javascript
if (settings.skipPermissions && permissionMode !== 'plan') {
  process.env.IS_SANDBOX = '1';
  sdkOptions.permissionMode = 'bypassPermissions';
}
```

**New code** — also set IS_SANDBOX when permissionMode is explicitly `bypassPermissions`:
```javascript
// Set bypassPermissions when skipPermissions is checked (legacy settings path)
if (settings.skipPermissions && permissionMode !== 'plan') {
  process.env.IS_SANDBOX = '1';
  sdkOptions.permissionMode = 'bypassPermissions';
}

// Also set IS_SANDBOX when frontend explicitly sends bypassPermissions mode
if (permissionMode === 'bypassPermissions') {
  process.env.IS_SANDBOX = '1';
  sdkOptions.permissionMode = 'bypassPermissions';
}
```

**Verification**: Start a YOLO session → agent can use all tools without prompting → no sandbox errors in server logs.

**Commit point**: `feat(yolo): default bypassPermissions mode, visual indicator, /yolo command, backend IS_SANDBOX fix`

---

### Step 1.7: Default Permission Mode in Settings

**File**: `src/components/settings/view/tabs/agents-settings/sections/AgentCategoryContentSection.tsx` (or the permissions sub-section within it)

Add a new setting within the Claude agent settings under the permissions category:

```tsx
<div className="space-y-2">
  <label className="text-sm font-medium text-foreground">
    {t('settings:agents.defaultPermissionMode', { defaultValue: 'Default Permission Mode' })}
  </label>
  <select
    value={localStorage.getItem('defaultPermissionMode') || 'bypassPermissions'}
    onChange={(e) => {
      localStorage.setItem('defaultPermissionMode', e.target.value);
    }}
    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
  >
    <option value="default">Default (Prompt for permissions)</option>
    <option value="acceptEdits">Accept Edits</option>
    <option value="bypassPermissions">Bypass Permissions (YOLO)</option>
    <option value="plan">Plan Mode</option>
  </select>
  <p className="text-xs text-muted-foreground">
    {t('settings:agents.defaultPermissionModeDesc', { defaultValue: 'Permission mode used for new sessions. Can be overridden per session.' })}
  </p>
</div>
```

**Verification**: Change setting → start new session → new session uses selected default.

**Commit point**: `feat(settings): add default permission mode selector`

---

## Phase 2 — Message Visibility (CLI Parity)

### Step 2.1: Hook Event Handler + Component

**New file**: `src/components/chat/hooks/handlers/handleHookEvent.ts`

```typescript
import type { Dispatch, SetStateAction } from 'react';
import type { ChatMessage } from '../../types/types';

interface HookEventActions {
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
}

/**
 * Handles hook_started and hook_progress SDK messages.
 * Creates inline hook event messages in the chat.
 */
export function handleHookEvent(
  data: Record<string, any>,
  subType: string,
  actions: HookEventActions,
): void {
  const hookName = data?.hook_name || data?.hookName || 'hook';
  const content = data?.message || data?.output || '';

  actions.setChatMessages((prev) => [
    ...prev,
    {
      type: 'assistant',
      isHookEvent: true,
      hookName: String(hookName),
      content: String(content),
      timestamp: new Date(),
    },
  ]);
}
```

**New file**: `src/components/chat/view/subcomponents/HookEventCard.tsx`

```tsx
import { useState } from 'react';
import type { ChatMessage } from '../../types/types';

interface HookEventCardProps {
  message: ChatMessage;
}

export default function HookEventCard({ message }: HookEventCardProps) {
  const [expanded, setExpanded] = useState(false);
  const lines = (message.content || '').split('\n');
  const isLong = lines.length > 3;
  const displayContent = expanded ? message.content : lines.slice(0, 3).join('\n');

  return (
    <div
      className="my-1 rounded border-l-2 border-muted-foreground/30 bg-muted/30 px-3 py-1.5 font-mono text-xs text-muted-foreground"
      style={{ borderRadius: 'var(--chat-radius-tool)' }}
    >
      <div className="flex items-center gap-1.5">
        <span className="font-semibold">🪝 {message.hookName}</span>
      </div>
      {displayContent && (
        <pre className="mt-1 whitespace-pre-wrap text-xs opacity-80">{displayContent}</pre>
      )}
      {isLong && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-1 text-xs text-primary hover:underline"
        >
          Show {lines.length - 3} more lines
        </button>
      )}
    </div>
  );
}
```

**Update**: `src/components/chat/hooks/handlers/index.ts` — add export:
```typescript
export { handleHookEvent } from './handleHookEvent';
```

**Router update**: `src/components/chat/hooks/useChatRealtimeHandlers.ts` — replace lines 392–394:

Current:
```typescript
case 'hook_started':
case 'hook_progress':
  console.debug(`[hook] ${subType}`, latestMessage.data);
  break;
```

New:
```typescript
case 'hook_started':
case 'hook_progress':
  handleHookEvent(latestMessage.data, subType, { setChatMessages });
  break;
```

Import `handleHookEvent` at the top of the file.

**Verification**: Trigger a hook (e.g., pre-commit hook) → hook event card appears in chat.

**Commit point**: `feat(chat): display hook events in chat (CLI parity)`

---

### Step 2.2: Compact Boundary Handler + Component

**New file**: `src/components/chat/hooks/handlers/handleCompactBoundary.ts`

```typescript
import type { Dispatch, SetStateAction } from 'react';
import type { ChatMessage } from '../../types/types';

interface CompactBoundaryActions {
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
}

/**
 * Handles compact_boundary SDK messages.
 * Inserts a visual divider into the chat indicating context compaction.
 */
export function handleCompactBoundary(
  _data: Record<string, any>,
  actions: CompactBoundaryActions,
): void {
  actions.setChatMessages((prev) => [
    ...prev,
    {
      type: 'assistant',
      isCompactBoundary: true,
      content: 'Context window compacted',
      timestamp: new Date(),
    },
  ]);
}
```

**New file**: `src/components/chat/view/subcomponents/CompactBoundaryDivider.tsx`

```tsx
export default function CompactBoundaryDivider() {
  return (
    <div className="my-3 flex items-center gap-3" role="separator" aria-label="Context compacted">
      <div className="h-px flex-1 bg-border/60" />
      <span className="whitespace-nowrap text-xs text-muted-foreground">
        🗜 Context Compacted
      </span>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  );
}
```

**Update**: `src/components/chat/hooks/handlers/index.ts` — add export:
```typescript
export { handleCompactBoundary } from './handleCompactBoundary';
```

**Router update**: `useChatRealtimeHandlers.ts` — replace lines 397–398:

Current:
```typescript
case 'compact_boundary':
  console.debug('[compact_boundary]', latestMessage.data);
  break;
```

New:
```typescript
case 'compact_boundary':
  handleCompactBoundary(latestMessage.data, { setChatMessages });
  break;
```

**Verification**: Trigger context compaction → divider line appears in chat.

**Commit point**: `feat(chat): display compact boundary divider in chat (CLI parity)`

---

### Step 2.3: Model Name Extraction from message_start

**File**: `src/components/chat/hooks/useChatRealtimeHandlers.ts`

Add a ref to store the current model name (inside the `useChatRealtimeHandlers` function body, near line 132):

```typescript
const currentModelRef = useRef<string | null>(null);
```

**File**: `src/components/chat/hooks/handlers/handleStreamEvent.ts`

Extend `StreamState` and `StreamActions`:

```typescript
interface StreamState {
  streamBufferRef: MutableRefObject<string>;
  streamTimerRef: MutableRefObject<number | null>;
  currentModelRef?: MutableRefObject<string | null>;  // NEW
}
```

Update `message_start` case (lines 171–174):

Current:
```typescript
case 'message_start': {
  console.debug('[message_start]', messageData.message?.model);
  break;
}
```

New:
```typescript
case 'message_start': {
  const model = messageData.message?.model || messageData.model;
  if (model && streamState.currentModelRef) {
    streamState.currentModelRef.current = String(model);
  }
  console.debug('[message_start] model:', model);
  break;
}
```

Update `content_block_start` for thinking and tool_use to carry model name (add to the ChatMessage objects being created):

In thinking block start (line 96–103), add `modelName`:
```typescript
setChatMessages((prev) => [
  ...prev,
  {
    type: 'assistant',
    content: '',
    timestamp: new Date(),
    isThinking: true,
    isStreaming: true,
    modelName: streamState.currentModelRef?.current || undefined,
  },
]);
```

In tool_use block start (line 109–126), add `modelName`:
```typescript
modelName: streamState.currentModelRef?.current || undefined,
```

And in the `appendStreamingChunk` function (in `useChatRealtimeHandlers.ts`, around line 67), when creating a new assistant message, also carry model name. The `appendStreamingChunk` closure needs access to `currentModelRef`:

```typescript
const appendStreamingChunk = (
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>,
  chunk: string,
  newline = false,
  modelName?: string | null,
) => {
  // ... existing logic ...
  // In the else branch where a new message is pushed:
  updated.push({
    type: 'assistant',
    content: chunk,
    timestamp: new Date(),
    isStreaming: true,
    modelName: modelName || undefined,
  });
```

Update the call sites to pass `currentModelRef.current`.

**StreamActions interface update** (in `handleStreamEvent.ts`, line 15): The `appendStreamingChunk` callback in `StreamActions` must also accept the optional `modelName` parameter so `handleStreamEvent` can forward it:

```typescript
interface StreamActions {
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  appendStreamingChunk: (chunk: string, newline?: boolean, modelName?: string | null) => void;
  finalizeStreamingMessage: () => void;
}
```

**Router wrapper update** (in `useChatRealtimeHandlers.ts`, around line 344): Update the inline wrapper that bridges the two signatures to pass through `modelName`:

```typescript
  appendStreamingChunk: (chunk: string, newline?: boolean, modelName?: string | null) =>
    appendStreamingChunk(setChatMessages, chunk, newline, modelName || currentModelRef.current),
```

**Router update**: Pass `currentModelRef` into `handleStreamEvent`:
```typescript
case 'stream_event':
  handleStreamEvent(
    latestMessage.data,
    { streamBufferRef, streamTimerRef, currentModelRef },
    { setChatMessages, appendStreamingChunk: ..., finalizeStreamingMessage: ... },
  );
  break;
```

**Verification**: Open a chat → send a message → model name appears on assistant messages.

---

### Step 2.4: Message Usage Stats from message_delta

**File**: `src/components/chat/hooks/handlers/handleStreamEvent.ts`

Update `message_delta` case (lines 177–180):

Current:
```typescript
case 'message_delta': {
  console.debug('[message_delta]', messageData.delta?.stop_reason, messageData.usage);
  break;
}
```

New:
```typescript
case 'message_delta': {
  const usage = messageData.usage;
  if (usage && streamState.usageRef) {
    streamState.usageRef.current = {
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
    };
  }
  console.debug('[message_delta]', messageData.delta?.stop_reason, usage);
  break;
}
```

Add `usageRef` to `StreamState`:
```typescript
interface StreamState {
  streamBufferRef: MutableRefObject<string>;
  streamTimerRef: MutableRefObject<number | null>;
  currentModelRef?: MutableRefObject<string | null>;
  usageRef?: MutableRefObject<{ inputTokens?: number; outputTokens?: number } | null>;
}
```

In `useChatRealtimeHandlers.ts`, add the ref:
```typescript
const usageRef = useRef<{ inputTokens?: number; outputTokens?: number } | null>(null);
```

Pass it to `handleStreamEvent` in the `streamState` object. In `handleResult`, merge `usageRef.current` into `CostInfo` before clearing:

```typescript
case 'result':
  // Merge any usage from message_delta into result data
  if (usageRef.current) {
    latestMessage.data = {
      ...latestMessage.data,
      _streamUsage: usageRef.current,
    };
    usageRef.current = null;
  }
  handleResult(latestMessage.data, { setTokenBudget, setCostInfo });
  break;
```

**Verification**: After an agent response completes → CostInfoBar shows token counts.

**Commit point**: `feat(chat): extract model name and usage stats from stream events`

---

### Step 2.5: Inline Status Messages

**File**: `src/components/chat/hooks/handlers/handleStatusMessage.ts`

Full rewrite:

```typescript
import type { Dispatch, SetStateAction } from 'react';
import type { AgentStatusState, ChatMessage } from '../../types/types';

interface StatusActions {
  setAgentStatusState: (state: AgentStatusState | null) => void;
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
}

/**
 * Handles SDK-level status messages.
 * Updates agentStatusState AND inserts inline status messages into chat.
 * Deduplicates consecutive identical status messages.
 */
export function handleStatusMessage(
  data: Record<string, any>,
  actions: StatusActions,
): void {
  const text = data?.message || data?.status || '';
  if (!text) return;

  const statusText = String(text);

  // Update status bar state
  actions.setAgentStatusState({
    text: statusText,
    isActive: true,
    timestamp: Date.now(),
  });

  // Insert inline status message (with deduplication)
  actions.setChatMessages((prev) => {
    // Check for duplicate BEFORE marking stale — the last inline status
    // message is still active at this point so we can compare against it.
    const lastInline = [...prev].reverse().find((m) => m.isStatusInline && !m.isStale);
    if (lastInline && lastInline.content === statusText) {
      return prev; // Duplicate — no change needed
    }

    // Mark previous inline status messages as stale
    const updated = prev.map((msg) =>
      msg.isStatusInline && !msg.isStale ? { ...msg, isStale: true } : msg,
    );

    // Remove stale inline status messages older than 5 seconds
    const now = Date.now();
    const cleaned = updated.filter(
      (msg) => !(msg.isStatusInline && msg.isStale && now - new Date(msg.timestamp).getTime() > 5000),
    );

    return [
      ...cleaned,
      {
        type: 'assistant',
        isStatusInline: true,
        content: statusText,
        timestamp: new Date(),
      },
    ];
  });
}
```

**Router update**: `useChatRealtimeHandlers.ts` — update the `status` case to pass `setChatMessages`:

Current:
```typescript
case 'status':
  handleStatusMessage(latestMessage.data, { setAgentStatusState });
  break;
```

New:
```typescript
case 'status':
  handleStatusMessage(latestMessage.data, { setAgentStatusState, setChatMessages });
  break;
```

**New file**: `src/components/chat/view/subcomponents/InlineStatusText.tsx`

```tsx
import type { ChatMessage } from '../../types/types';

interface InlineStatusTextProps {
  message: ChatMessage;
}

export default function InlineStatusText({ message }: InlineStatusTextProps) {
  if (message.isStale) return null;

  return (
    <div
      className="flex items-center gap-1.5 py-0.5 text-xs italic text-muted-foreground/70"
      role="status"
      aria-live="polite"
    >
      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground/70" />
      <span>{message.content}</span>
    </div>
  );
}
```

**Verification**: Agent reads/greps files → inline status text appears and fades.

**Commit point**: `feat(chat): inline status messages with dedup and auto-cleanup (CLI parity)`

---

## Phase 3 — Message Rendering + Tool Cards

### Step 3.1: Message Header with Model Name + Timestamp

**File**: `src/components/chat/view/subcomponents/MessageComponent.tsx`

Add a header line to assistant messages. In the assistant message rendering section, add before the markdown body:

```tsx
{message.type === 'assistant' && !message.isToolUse && !message.isThinking && !message.isHookEvent && !message.isCompactBoundary && !message.isStatusInline && (
  <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
    <span className="inline-block h-2 w-2 rounded-full bg-primary/60" />
    <span className="font-medium">Claude</span>
    {message.modelName && (
      <>
        <span className="opacity-50">·</span>
        <span className="opacity-70">{message.modelName}</span>
      </>
    )}
    <span className="opacity-50">·</span>
    <span className="opacity-70">
      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </span>
  </div>
)}
```

**Routing new message types in MessageComponent**: Add conditional branches for the new message types within the existing render logic:

```tsx
// Hook event
if (message.isHookEvent) {
  return <HookEventCard message={message} />;
}

// Compact boundary
if (message.isCompactBoundary) {
  return <CompactBoundaryDivider />;
}

// Inline status
if (message.isStatusInline) {
  return <InlineStatusText message={message} />;
}
```

Import `HookEventCard`, `CompactBoundaryDivider`, `InlineStatusText` at the top.

**Verification**: Messages show `◉ Claude · claude-sonnet-4-20250514 · 12:34 PM` header.

> **Commit note**: Step 3.1 changes are bundled into the Step 3.2/3.3 commit point (#9).

---

### Step 3.2: Enhanced Code Blocks

**New file**: `src/components/chat/view/subcomponents/CodeBlockHeader.tsx`

```tsx
import { useState } from 'react';

interface CodeBlockHeaderProps {
  fileName?: string;
  language?: string;
  code: string;
  onApply?: (filePath: string, content: string) => void;
}

export default function CodeBlockHeader({ fileName, language, code, onApply }: CodeBlockHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (fileName && onApply) {
      onApply(fileName, code);
      setApplied(true);
      setTimeout(() => setApplied(false), 3000);
    }
  };

  return (
    <div
      className="flex items-center justify-between rounded-t-md border-b border-border/40 bg-muted/50 px-3 py-1.5 text-xs dark:bg-muted/20"
      style={{ borderRadius: 'var(--chat-radius-code) var(--chat-radius-code) 0 0' }}
    >
      <div className="flex items-center gap-2">
        {fileName && <span className="font-mono font-medium text-foreground/80">{fileName}</span>}
        {!fileName && language && <span className="text-muted-foreground">{language}</span>}
      </div>
      <div className="flex items-center gap-1">
        {fileName && onApply && (
          <button
            onClick={handleApply}
            className="rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {applied ? '✓ Applied' : 'Apply'}
          </button>
        )}
        <button
          onClick={handleCopy}
          className="rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
```

**File**: `src/components/chat/view/subcomponents/Markdown.tsx`

Update the code block renderer to use `CodeBlockHeader`. The markdown renderer uses `react-markdown` with custom components. The `code` component handler must be modified:

1. Extract file name from markdown fence meta: `` ```ts title="src/auth.ts" `` → parse `title` attribute
2. Wrap the code block with `CodeBlockHeader` above and the syntax-highlighted `<pre>` below
3. Add line numbers via CSS or inline rendering

**apply-code WebSocket handler** — this requires a backend addition. See Step 3.3.

---

### Step 3.3: apply-code Backend Handler

**File**: `server/claude-sdk.js` (or new file `server/apply-code.js`)

Add a WebSocket message handler for `apply-code` messages:

```javascript
// In the WebSocket message handler (where other message types are routed)
case 'apply-code': {
  const { filePath, content, sessionId } = messageData;

  // Validate file path — reject absolute paths and directory traversal
  if (!filePath || path.isAbsolute(filePath) || filePath.includes('..')) {
    ws.send(JSON.stringify({
      type: 'apply-code-result',
      success: false,
      filePath,
      error: 'Invalid file path: absolute paths and ".." are not allowed',
    }));
    break;
  }

  // Resolve relative to project workspace
  const projectPath = getProjectPath(sessionId); // existing function
  const resolvedPath = path.resolve(projectPath, filePath);

  // Ensure resolved path is still within project
  if (!resolvedPath.startsWith(projectPath)) {
    ws.send(JSON.stringify({
      type: 'apply-code-result',
      success: false,
      filePath,
      error: 'Path escapes project directory',
    }));
    break;
  }

  try {
    // Create parent directories if needed
    await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
    await fs.writeFile(resolvedPath, content, 'utf-8');

    ws.send(JSON.stringify({
      type: 'apply-code-result',
      success: true,
      filePath,
    }));
  } catch (err) {
    ws.send(JSON.stringify({
      type: 'apply-code-result',
      success: false,
      filePath,
      error: err.message,
    }));
  }
  break;
}
```

**Verification**: Click "Apply" on a code block → file is written → chokidar detects change.

**Commit point**: `feat(chat): enhanced code blocks with file name, Apply button, copy, line numbers`

---

### Step 3.4: Tool Card Compact Mode

**File**: `src/components/chat/tools/ToolRenderer.tsx`

Refactor default display to single-line compact mode. The key change is in how `getToolConfig()` results are rendered.

**New rendering pattern** for each tool card:

```tsx
<div className="group my-0.5">
  <button
    onClick={() => setExpanded(!expanded)}
    className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm transition-colors hover:bg-muted/50"
    style={{ borderRadius: 'var(--chat-radius-tool)' }}
  >
    <span className="text-xs">{expanded ? '▼' : '▶'}</span>
    <span className="font-mono font-semibold text-xs">{toolName}</span>
    <span className="flex-1 truncate text-xs text-muted-foreground">{keyParam}</span>
    {duration && <span className="text-xs text-muted-foreground">{duration}s</span>}
    <span className="text-xs">{statusIcon}</span>
  </button>
  {expanded && (
    <div className="ml-6 mt-1 border-l-2 border-border/40 pl-3">
      {/* Full input/output display using existing components */}
    </div>
  )}
</div>
```

**Key parameter extraction** — add a utility function `getToolKeyParam(toolName, toolInput)`:

```typescript
function getToolKeyParam(toolName: string, input: unknown): string {
  const obj = typeof input === 'string' ? tryParse(input) : input;
  if (!obj || typeof obj !== 'object') return '';
  const o = obj as Record<string, any>;

  switch (toolName.toLowerCase()) {
    case 'bash': return truncate(o.command || '', 60);
    case 'read': return o.file_path || o.filePath || '';
    case 'edit':
    case 'write': return o.file_path || o.filePath || '';
    case 'grep': return `"${truncate(o.pattern || '', 20)}" in ${o.path || '.'}`;
    case 'glob': return o.pattern || '';
    case 'task': return truncate(o.description || o.prompt || '', 50);
    default: return '';
  }
}
```

**Status icon mapping**:
```typescript
function getStatusIcon(result?: ToolResult | null, isStarted?: boolean): string {
  if (isStarted) return '⠋'; // animated spinner via CSS
  if (!result) return '⏳';
  if (result.isError) return '❌';
  return '✅';
}
```

**File**: `src/components/chat/tools/configs/toolConfigs.ts`

Update `defaultDisplay` to `'compact'` for most tools. Keep `'expanded'` for Task (subagent).

**Verification**: Tool calls display as single compact lines. Click to expand full details.

**Commit point**: `feat(chat): compact default tool cards with click-to-expand`

---

### Step 3.5: Thinking Blocks — Collapsed Default

**File**: `src/components/chat/view/subcomponents/ThinkingStreamBlock.tsx`

Rewrite to default to collapsed with toggle:

```tsx
import { useState } from 'react';
import type { ChatMessage } from '../../types/types';
import Markdown from './Markdown';

interface ThinkingStreamBlockProps {
  message: ChatMessage;
}

export default function ThinkingStreamBlock({ message }: ThinkingStreamBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAllLines, setShowAllLines] = useState(false);
  const isStreaming = message.isStreaming;
  const durationMs = message.thinkingDurationMs;
  const durationStr = durationMs ? `${(durationMs / 1000).toFixed(1)}s` : isStreaming ? '...' : '';

  const lines = (message.content || '').split('\n');
  const isLong = lines.length > 10;
  const truncatedContent = showAllLines || !isLong ? message.content : lines.slice(0, 10).join('\n');

  return (
    <div className="my-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <span className={isStreaming ? 'animate-pulse' : ''}>💭</span>
        <span className="font-medium">Thinking</span>
        {durationStr && (
          <>
            <span className="opacity-50">·</span>
            <span>{durationStr}</span>
          </>
        )}
        <span className="ml-1 text-[10px]">{expanded ? '▼' : '▶'}</span>
      </button>
      {expanded && (
        <div className="mt-1 border-l-2 border-muted-foreground/20 pl-3">
          <div className="text-sm italic text-muted-foreground">
            <Markdown content={truncatedContent || ''} />
          </div>
          {isLong && !showAllLines && (
            <button
              onClick={() => setShowAllLines(true)}
              className="mt-1 text-xs text-primary hover:underline"
            >
              Show {lines.length - 10} more lines
            </button>
          )}
          {isLong && showAllLines && (
            <button
              onClick={() => setShowAllLines(false)}
              className="mt-1 text-xs text-primary hover:underline"
            >
              Show less
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

**Verification**: Thinking blocks appear as collapsed `💭 Thinking · 3.2s ▶`. Click to expand.

**Commit point**: `feat(chat): thinking blocks default collapsed, streaming pulse, duration display`

---

### Step 3.6: User Message Styling (§5.5)

**File**: `src/components/chat/view/subcomponents/MessageComponent.tsx`

Add a left-border accent and subtle background to user messages, with collapsible long content:

```tsx
// In the user message rendering section, wrap with styled container:
{message.type === 'user' && (
  <div
    className="rounded-lg border-l-2 border-primary/40 bg-primary/5 px-3 py-2 dark:bg-primary/10"
    style={{ borderRadius: 'var(--chat-radius-message)' }}
  >
    <div className="mb-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="font-medium">You</span>
      <span className="opacity-50">·</span>
      <span className="opacity-70">
        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
    {/* Collapsible for long messages (>15 lines) */}
    <UserMessageContent content={message.content || ''} />
  </div>
)}
```

Add a simple `UserMessageContent` inline component or section within `MessageComponent.tsx`:

```tsx
function UserMessageContent({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const lines = content.split('\n');
  const isLong = lines.length > 15;
  const displayContent = expanded || !isLong ? content : lines.slice(0, 15).join('\n');

  return (
    <>
      <Markdown content={displayContent} />
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-xs text-primary hover:underline"
        >
          {expanded ? 'Show less' : `Show ${lines.length - 15} more lines`}
        </button>
      )}
    </>
  );
}
```

**Verification**: User messages have a subtle blue left border and "You · 12:34 PM" header. Long messages are collapsible.

> **Commit note**: Step 3.6 changes are bundled into the Step 3.5 commit point (#11).

---

## Phase 4 — Subagent Bubbles

### Step 4.1: SubagentToolItem Component

**New file**: `src/components/chat/view/subcomponents/SubagentToolItem.tsx`

> **Note**: This must be created before SubagentContainer (Step 4.2) since SubagentContainer imports SubagentToolItem.

```tsx
import { useState } from 'react';
import type { SubagentChildTool } from '../../types/types';

interface SubagentToolItemProps {
  tool: SubagentChildTool;
  isLast: boolean;
  isRunning: boolean;
}

const TOOL_ICONS: Record<string, string> = {
  Read: '📄', Grep: '🔍', Glob: '🔍', Bash: '💻',
  Edit: '✏️', Write: '✏️', Task: '🤖', WebFetch: '🌐',
  WebSearch: '🌐', LSP: '🔗',
};

function getToolIcon(name: string): string {
  return TOOL_ICONS[name] || '🔧';
}

function getKeyParam(tool: SubagentChildTool): string {
  const input = tool.toolInput;
  if (!input || typeof input !== 'object') return '';
  const o = input as Record<string, any>;

  switch (tool.toolName) {
    case 'Bash': return truncate(o.command || '', 40);
    case 'Read': return o.file_path || '';
    case 'Edit':
    case 'Write': return o.file_path || '';
    case 'Grep': return `"${truncate(o.pattern || '', 15)}" in ${o.path || '.'}`;
    case 'Glob': return o.pattern || '';
    default: return '';
  }
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '...' : s;
}

function getStatusIcon(tool: SubagentChildTool, isRunning: boolean): string {
  if (isRunning && !tool.toolResult) return '⠋';
  if (!tool.toolResult) return '⏳';
  if (tool.toolResult.isError) return '❌';
  return '✅';
}

export default function SubagentToolItem({ tool, isLast, isRunning }: SubagentToolItemProps) {
  const [expanded, setExpanded] = useState(false);
  const icon = getToolIcon(tool.toolName);
  const keyParam = getKeyParam(tool);
  const statusIcon = getStatusIcon(tool, isRunning);
  const connector = isLast ? '└─' : '├─';

  return (
    <div className="my-0.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-1.5 text-left text-xs hover:bg-muted/30 rounded px-1 py-0.5"
      >
        <span className="font-mono text-muted-foreground/50">{connector}</span>
        <span>{icon}</span>
        <span className="font-mono font-semibold">{tool.toolName}</span>
        <span className="flex-1 truncate text-muted-foreground">{keyParam}</span>
        <span className={isRunning && !tool.toolResult ? 'animate-spin' : ''}>{statusIcon}</span>
      </button>
      {expanded && tool.toolResult && (
        <div className="ml-8 mt-0.5 rounded bg-muted/20 p-2 text-xs">
          <pre className="whitespace-pre-wrap text-muted-foreground">
            {typeof tool.toolResult.content === 'string'
              ? tool.toolResult.content.slice(0, 500)
              : JSON.stringify(tool.toolResult.content, null, 2)?.slice(0, 500)}
          </pre>
        </div>
      )}
    </div>
  );
}
```

---

### Step 4.2: Rewrite SubagentContainer to Bubble Card

**File**: `src/components/chat/tools/components/SubagentContainer.tsx`

Replace the existing SubagentContainer with a bubble-card layout that uses SubagentToolItem from Step 4.1:

```tsx
import { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '../../types/types';
import SubagentToolItem from '../../view/subcomponents/SubagentToolItem';

interface SubagentContainerProps {
  message: ChatMessage;
}

export default function SubagentContainer({ message }: SubagentContainerProps) {
  const state = message.subagentState;
  if (!state) return null;

  const { childTools, isComplete, description, progressLog, modelName, elapsedMs } = state;
  const [showAll, setShowAll] = useState(false);

  // Elapsed time tracking
  const [displayedElapsed, setDisplayedElapsed] = useState(elapsedMs || 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    if (isComplete) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setDisplayedElapsed(Date.now() - startTimeRef.current);
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isComplete]);

  const elapsedSec = ((elapsedMs || displayedElapsed) / 1000).toFixed(0);
  const completedCount = childTools.filter((t) => t.toolResult).length;

  // Show last 3 tools by default, rest collapsed
  const visibleTools = showAll ? childTools : childTools.slice(-3);
  const hiddenCount = childTools.length - visibleTools.length;

  if (isComplete) {
    // Compact completed state
    return (
      <div
        className="my-1 rounded-lg border border-border/40 px-3 py-2"
        style={{
          marginLeft: 'var(--chat-indent-subagent)',
          borderLeft: '3px solid hsl(var(--subagent-border))',
          background: 'hsl(var(--subagent-bg))',
          borderRadius: 'var(--chat-radius-message)',
        }}
      >
        <div className="flex items-center gap-2 text-sm">
          <span>🤖</span>
          <span className="font-medium">{description || 'Agent task'}</span>
          <span className="text-xs text-muted-foreground">
            · {completedCount} tools · {elapsedSec}s
          </span>
          <span className="text-xs">✅</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="my-2 overflow-hidden rounded-lg border border-border/40"
      style={{
        marginLeft: 'var(--chat-indent-subagent)',
        borderLeft: '3px solid hsl(var(--subagent-border))',
        background: 'hsl(var(--subagent-bg))',
        borderRadius: 'var(--chat-radius-message)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border/20 px-3 py-2">
        <span>🤖</span>
        <span className="text-sm font-medium">
          Agent{description ? `: "${description}"` : ''}
        </span>
        {modelName && (
          <span className="text-xs text-muted-foreground">· {modelName}</span>
        )}
      </div>

      {/* Tool list */}
      <div className="px-3 py-2">
        {hiddenCount > 0 && (
          <button
            onClick={() => setShowAll(true)}
            className="mb-1 text-xs text-primary hover:underline"
          >
            Show {hiddenCount} more tools
          </button>
        )}
        {visibleTools.map((tool, i) => (
          <SubagentToolItem
            key={tool.toolId || i}
            tool={tool}
            isLast={i === visibleTools.length - 1}
            isRunning={i === visibleTools.length - 1 && !tool.toolResult}
          />
        ))}
      </div>

      {/* Progress footer */}
      <div className="border-t border-border/20 px-3 py-1.5 text-xs text-muted-foreground">
        Progress: {completedCount}/{childTools.length} tools · {elapsedSec}s elapsed
      </div>
    </div>
  );
}
```

**Verification**: Subagent tasks render as purple-bordered bubble cards with tool list.

---

### Step 4.3: Enhanced subagentState in handleTaskLifecycle

**File**: `src/components/chat/hooks/handlers/handleTaskLifecycle.ts`

Update `task_started` case to store model name:

```typescript
case 'task_started': {
  const description = data.description || data.prompt || '';
  const modelName = data.model || data.modelName || '';

  setChatMessages((prev) => {
    const updated = [...prev];
    const idx = updated.findIndex(
      (msg) => msg.isSubagentContainer && msg.subagentState && !msg.subagentState.taskId,
    );
    if (idx >= 0) {
      const existing = updated[idx].subagentState!;
      updated[idx] = {
        ...updated[idx],
        subagentState: {
          ...existing,
          taskId,
          description: description || existing.description,
          modelName: modelName || undefined,
          elapsedMs: 0,
          toolCount: 0,
        },
      };
      return updated;
    }
    console.debug('[task_started] No matching container for', taskId);
    return prev;
  });
  break;
}
```

Update `task_notification` (completion) case to set `toolCount`:

```typescript
case 'task_notification': {
  const status = data.status || 'completed';
  const isComplete = status === 'completed' || status === 'done';

  setChatMessages((prev) =>
    prev.map((msg): ChatMessage => {
      const state = msg.subagentState;
      if (msg.isSubagentContainer && state && state.taskId === taskId) {
        return {
          ...msg,
          subagentState: {
            ...state,
            isComplete,
            toolCount: state.childTools.length,
          },
        };
      }
      return msg;
    }),
  );
  break;
}
```

**Commit point**: `feat(chat): subagent bubble cards with tool items, elapsed time, model name`

---

## Phase 5 — Composer + Context Indicator

### Step 5.1: Context Usage Indicator

**New file**: `src/components/chat/view/subcomponents/ContextUsageIndicator.tsx`

```tsx
import { useState } from 'react';
import ContextUsagePopover from './ContextUsagePopover';

interface ContextUsageIndicatorProps {
  used: number;
  total: number;
}

function getColor(pct: number): string {
  if (pct >= 90) return 'hsl(var(--context-red))';
  if (pct >= 75) return 'hsl(var(--context-orange))';
  if (pct >= 50) return 'hsl(var(--context-yellow))';
  return 'hsl(var(--context-green))';
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function ContextUsageIndicator({ used, total }: ContextUsageIndicatorProps) {
  const [showPopover, setShowPopover] = useState(false);
  const maxTokens = parseInt(localStorage.getItem('contextWindowSize') || '') || total;
  const effectiveMax = Math.min(maxTokens, total);
  const pct = effectiveMax > 0 ? Math.round((used / effectiveMax) * 100) : 0;
  const color = getColor(pct);

  return (
    <div className="relative">
      <button
        onClick={() => setShowPopover(!showPopover)}
        className="flex items-center gap-1.5 rounded-md border border-border/40 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/50"
        title="Context window usage"
      >
        <span style={{ color }}>{pct}%</span>
        <div className="flex h-1.5 w-10 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
          />
        </div>
        <span className="hidden sm:inline">
          {formatTokens(used)} / {formatTokens(effectiveMax)}
        </span>
      </button>

      {showPopover && (
        <ContextUsagePopover
          used={used}
          total={total}
          maxTokens={maxTokens}
          onClose={() => setShowPopover(false)}
          onMaxChange={(newMax) => {
            localStorage.setItem('contextWindowSize', String(newMax));
          }}
        />
      )}
    </div>
  );
}
```

**New file**: `src/components/chat/view/subcomponents/ContextUsagePopover.tsx`

```tsx
import { useState } from 'react';

interface ContextUsagePopoverProps {
  used: number;
  total: number;
  maxTokens: number;
  onClose: () => void;
  onMaxChange: (newMax: number) => void;
}

const PRESETS = [128000, 160000, 200000];

export default function ContextUsagePopover({
  used, total, maxTokens, onClose, onMaxChange,
}: ContextUsagePopoverProps) {
  const [customValue, setCustomValue] = useState(String(maxTokens));
  const free = Math.max(0, maxTokens - used);
  const pct = maxTokens > 0 ? Math.round((used / maxTokens) * 100) : 0;
  const exceedsBackend = maxTokens > total;

  return (
    <div className="absolute bottom-full right-0 z-50 mb-2 w-72 rounded-lg border border-border bg-popover p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-medium">Context Window</h4>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
      </div>

      <div className="space-y-1.5 text-xs text-muted-foreground">
        <div className="flex justify-between"><span>Used:</span><span>{used.toLocaleString()} tokens</span></div>
        <div className="flex justify-between"><span>Max:</span><span>{maxTokens.toLocaleString()} tokens</span></div>
        <div className="flex justify-between"><span>Free:</span><span>{free.toLocaleString()} tokens</span></div>
      </div>

      <div className="my-3 flex h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(pct, 100)}%`,
            backgroundColor: pct >= 90 ? 'hsl(var(--context-red))' : pct >= 50 ? 'hsl(var(--context-yellow))' : 'hsl(var(--context-green))',
          }}
        />
      </div>
      <div className="text-center text-xs text-muted-foreground">{pct}%</div>

      {exceedsBackend && (
        <div className="mt-2 rounded bg-orange-50 p-2 text-xs text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">
          ⚠ Setting ({maxTokens.toLocaleString()}) exceeds backend limit ({total.toLocaleString()})
        </div>
      )}

      <div className="mt-3">
        <label className="text-xs font-medium text-foreground">Max tokens</label>
        <div className="mt-1 flex gap-1">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => { onMaxChange(p); setCustomValue(String(p)); }}
              className={`rounded px-2 py-1 text-xs ${maxTokens === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
            >
              {(p / 1000)}K
            </button>
          ))}
        </div>
        <input
          type="number"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          onBlur={() => {
            const v = parseInt(customValue);
            if (v > 0) onMaxChange(v);
          }}
          className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-xs"
          placeholder="Custom value"
        />
      </div>
    </div>
  );
}
```

**Integration**: Replace `<TokenUsagePie>` in `ChatInputControls.tsx` with `<ContextUsageIndicator>`:

Current (line 84):
```tsx
<TokenUsagePie used={tokenBudget?.used || 0} total={tokenBudget?.total || parseInt(import.meta.env.VITE_CONTEXT_WINDOW) || 160000} />
```

New:
```tsx
<ContextUsageIndicator
  used={tokenBudget?.used || 0}
  total={tokenBudget?.total || parseInt(import.meta.env.VITE_CONTEXT_WINDOW) || 160000}
/>
```

**Verification**: Context usage shows as colored percentage bar. Click opens popover with presets.

**Commit point**: `feat(chat): context window usage indicator with configurable max tokens`

---

### Step 5.2: Pass maxTokens to Backend SDK

**File**: `server/claude-sdk.js` — in `mapCliOptionsToSDK()`

After the model mapping (around line 201), add:

```javascript
// Map max tokens (context window override from frontend)
if (options.maxTokens && typeof options.maxTokens === 'number') {
  sdkOptions.maxTurns = undefined; // not the same, but document the intent
  // The SDK uses CONTEXT_WINDOW env var; override if frontend sends explicit value
  const backendMax = parseInt(process.env.CONTEXT_WINDOW) || 160000;
  if (options.maxTokens <= backendMax) {
    sdkOptions.contextWindow = options.maxTokens;
  }
}
```

**Frontend**: In the WebSocket send-message payload construction, include the user's `contextWindowSize` from localStorage:

```typescript
const maxTokens = parseInt(localStorage.getItem('contextWindowSize') || '') || undefined;
// Include in the message payload sent via WebSocket
sendMessage({ type: 'chat', ..., maxTokens });
```

**Verification**: Set custom 128K limit → token indicator shows /128K → SDK respects limit.

---

### Step 5.3: `/compact` Slash Command

Add to the built-in commands alongside `/yolo`:

```typescript
{
  name: 'compact',
  description: 'Trigger context window compaction',
  type: 'builtin',
},
```

Handler in `ChatComposer.tsx`:
```typescript
if (command.name === 'compact') {
  sendMessage({ type: 'compact-context', sessionId: selectedSession?.id });
  setChatMessages((prev) => [
    ...prev,
    { type: 'assistant', content: '🗜 Context compaction requested...', timestamp: new Date() },
  ]);
  return;
}
```

**Commit point**: `feat(chat): /compact slash command and maxTokens backend passthrough`

**Backend handler**: The frontend sends `{ type: 'compact-context', sessionId }` over WebSocket, but no backend handler exists yet. Add a handler in `server/websocket.js` (or the appropriate WebSocket message dispatcher):

```javascript
case 'compact-context': {
  const { sessionId } = message;
  if (!sessionId) {
    ws.send(JSON.stringify({ type: 'error', message: 'No sessionId for compact' }));
    break;
  }
  // For Claude SDK sessions, the SDK handles compaction internally.
  // This message is a no-op acknowledgment — the SDK auto-compacts when
  // the context window exceeds the configured limit.
  // For CLI-based providers, forward as a stdin command.
  console.log(`[compact-context] Requested for session ${sessionId}`);
  ws.send(JSON.stringify({
    type: 'compact-context-ack',
    sessionId,
    message: 'Context compaction initiated',
  }));
  break;
}
```

> **Note**: Full compaction implementation depends on the provider. For Claude SDK, the agent handles compaction automatically when `maxTurns` or token limits are reached. This handler provides the WebSocket acknowledgment path so the frontend doesn't error on an unhandled message type.

---

## Phase 6 — Layout + Navigation

### Step 6.1: Move Tabs to Sidebar Bottom

**File**: `src/components/sidebar/view/Sidebar.tsx`

Add a tab navigation section at the bottom of the sidebar. The sidebar structure needs a bottom-pinned section.

**Props addition**: `Sidebar` needs `activeTab`, `setActiveTab`, `shouldShowTasksTab` props. These are currently passed to `MainContentHeader` → `MainContentTabSwitcher`. They need to also flow to `Sidebar`.

**File**: `src/components/sidebar/types/types.ts`

Add the new props to `SidebarProps`:

```typescript
import type { AppTab, LoadingProgress, Project, ProjectSession, SessionProvider } from '../../../types/app';

export type SidebarProps = {
  // ... existing props ...
  projects: Project[];
  selectedProject: Project | null;
  selectedSession: ProjectSession | null;
  onProjectSelect: (project: Project) => void;
  onSessionSelect: (session: ProjectSession) => void;
  onNewSession: (project: Project) => void;
  onSessionDelete?: (sessionId: string) => void;
  onProjectDelete?: (projectName: string) => void;
  isLoading: boolean;
  loadingProgress: LoadingProgress | null;
  onRefresh: () => Promise<void> | void;
  onShowSettings: () => void;
  showSettings: boolean;
  settingsInitialTab: string;
  onCloseSettings: () => void;
  isMobile: boolean;
  // NEW: Tab navigation props (moved from MainContentHeader)
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  shouldShowTasksTab: boolean;
};
```

**File**: `src/components/sidebar/view/Sidebar.tsx`

Destructure the new props and pass them to the tab navigation section:

```tsx
export default function Sidebar({
  // ... existing props ...
  activeTab,
  setActiveTab,
  shouldShowTasksTab,
}: SidebarProps) {
```

**Parent component prop threading**: In the component that renders `<Sidebar>` (likely `App.tsx` or a layout component), add `activeTab`, `setActiveTab`, `shouldShowTasksTab` to the `<Sidebar>` JSX.

**New component within Sidebar** — add before the closing `</div>` of the sidebar content:

```tsx
{/* Tab Navigation — pinned to bottom */}
<div className="mt-auto border-t border-border/40 p-2">
  <nav className="flex flex-col gap-0.5" aria-label="Content tabs">
    {tabs.map((tab) => {
      const isActive = tab.id === activeTab;
      return (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
            isActive
              ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground border-l-2 border-transparent'
          }`}
        >
          <tab.icon className="h-4 w-4" />
          <span>{tab.label}</span>
        </button>
      );
    })}
  </nav>
</div>
```

Where `tabs` is imported from the same tab definition used in `MainContentTabSwitcher.tsx`.

**File**: `src/components/main-content/view/subcomponents/MainContentHeader.tsx`

Remove the `MainContentTabSwitcher` from the header. The header simplifies to:

```tsx
export default function MainContentHeader({
  selectedProject,
  selectedSession,
  isMobile,
  onMenuClick,
}: MainContentHeaderProps) {
  return (
    <div className="pwa-header-safe flex-shrink-0 border-b border-border/60 bg-background px-3 py-1.5 sm:px-4 sm:py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {isMobile && <MobileMenuButton onMenuClick={onMenuClick} />}
          <MainContentTitle
            selectedProject={selectedProject}
            selectedSession={selectedSession}
          />
        </div>
      </div>
    </div>
  );
}
```

Remove `activeTab`, `setActiveTab`, `shouldShowTasksTab` from `MainContentHeaderProps` (they're no longer needed here on desktop — mobile still uses `MobileNav`).

**File**: `src/components/main-content/view/subcomponents/MainContentTitle.tsx`

`MainContentTitle` currently receives `activeTab` and `shouldShowTasksTab` to render tab-specific titles. Since the header is simplified and tabs move to the sidebar, `MainContentTitle` should be simplified to always show just the session/project name:

```tsx
type MainContentTitleProps = {
  selectedProject: Project;
  selectedSession: ProjectSession | null;
};

export default function MainContentTitle({
  selectedProject,
  selectedSession,
}: MainContentTitleProps) {
  const { t } = useTranslation();

  const sessionName = getSessionName(selectedSession, t);
  const projectName = selectedProject?.name;

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <h1 className="truncate text-sm font-semibold">{sessionName}</h1>
      {projectName && (
        <>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="truncate text-xs text-muted-foreground">{projectName}</span>
        </>
      )}
    </div>
  );
}
```

Remove the `activeTab`-based switch logic and tab title rendering (plugins tab, tasks tab, etc.) — the active tab title is now shown by the sidebar's tab section instead.

**Prop threading**: In the parent component that renders both `Sidebar` and `MainContentHeader`, pass `activeTab` and `setActiveTab` to `Sidebar` instead of the header.

**File**: `src/components/main-content/view/subcomponents/MainContentTabSwitcher.tsx`

Keep this file but it's now only used by the sidebar's tab section. Alternatively, inline the tab definitions into the sidebar.

**Mobile**: No changes — `MobileNav.tsx` continues to render horizontal tab pills at the bottom of the screen on mobile.

**Verification**: Desktop — tabs appear vertically at sidebar bottom. Header shows only session name. Mobile — unchanged.

---

### Step 6.2: Session List Time-Based Grouping

**File**: Sidebar session list component (within `src/components/sidebar/view/subcomponents/`)

Add grouping logic to the session list:

```typescript
function groupSessionsByTime(sessions: ProjectSession[]): Record<string, ProjectSession[]> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const thisWeek = new Date(today.getTime() - 7 * 86400000);

  const groups: Record<string, ProjectSession[]> = {
    'Today': [],
    'Yesterday': [],
    'This Week': [],
    'Older': [],
  };

  for (const session of sessions) {
    const date = new Date(session.updatedAt || session.createdAt || 0);
    if (date >= today) groups['Today'].push(session);
    else if (date >= yesterday) groups['Yesterday'].push(session);
    else if (date >= thisWeek) groups['This Week'].push(session);
    else groups['Older'].push(session);
  }

  // Remove empty groups
  return Object.fromEntries(Object.entries(groups).filter(([, v]) => v.length > 0));
}
```

Render with group headers:
```tsx
{Object.entries(groupedSessions).map(([label, sessions]) => (
  <div key={label}>
    <h4 className="px-3 py-1 text-xs font-medium uppercase text-muted-foreground/60">{label}</h4>
    {sessions.map((session) => (
      <SessionItem key={session.id} session={session} ... />
    ))}
  </div>
))}
```

**Verification**: Sessions grouped under Today/Yesterday/This Week/Older headers.

**Commit point**: `feat(layout): move tabs to sidebar bottom, add session time grouping`

---

### Step 6.3: Virtual Scrolling for Message List

**Install dependency**:
```bash
npm install react-virtuoso
```

**File**: `src/components/chat/view/subcomponents/ChatMessagesPane.tsx`

Wrap the message list with Virtuoso when message count exceeds 100:

```tsx
import { Virtuoso } from 'react-virtuoso';

// Inside the component:
const shouldVirtualize = chatMessages.length > 100;

if (shouldVirtualize) {
  return (
    <Virtuoso
      data={chatMessages}
      followOutput="auto"
      className="scrollbar-thin"
      itemContent={(index, message) => (
        <MessageComponent key={index} message={message} ... />
      )}
    />
  );
}

// Else: existing non-virtualized rendering
```

**Verification**: Load a long conversation (>100 messages) → smooth scrolling, no DOM overflow.

**Commit point**: `feat(chat): virtual scrolling for long conversations, react-virtuoso`

---

### Step 6.4: Slash Command Panel Upgrade (§6.3)

**Existing state**: `CommandMenu.tsx` already has namespace-based grouping (frequent, builtin, project, user, other), search filtering via fuse.js in `useSlashCommands.ts`, command descriptions, and `↑↓` / `Enter` / `Escape` keyboard navigation in `handleCommandMenuKeyDown`. The `/yolo` and `/compact` built-in commands are added in Steps 1.5 and 5.3 respectively.

**Remaining work** — add `Ctrl+/` keyboard shortcut to open the command panel:

**File**: `src/components/chat/hooks/useChatComposerState.ts`

In the `handleKeyDown` callback, add a `Ctrl+/` handler before the existing `Enter` key handler:

```typescript
// After the Tab handler, before the Enter handler:
if ((event.ctrlKey || event.metaKey) && event.key === '/') {
  event.preventDefault();
  toggleCommandMenu();
  return;
}
```

Where `toggleCommandMenu` is exposed from `useSlashCommands`:

**File**: `src/components/chat/hooks/useSlashCommands.ts`

Add a `toggleCommandMenu` function to the return value:

```typescript
const toggleCommandMenu = useCallback(() => {
  if (showCommandMenu) {
    resetCommandMenuState();
  } else {
    // Trigger command menu with empty filter (show all commands)
    setShowCommandMenu(true);
    setCommandInput('');
    setSelectedCommandIndex(0);
  }
}, [showCommandMenu, resetCommandMenuState]);

// Add to return object:
return {
  // ... existing returns ...
  toggleCommandMenu,
};
```

**File**: `src/components/chat/hooks/useChatComposerState.ts`

Destructure `toggleCommandMenu` from `useSlashCommands()` alongside existing returns.

**Verification**: Press `Ctrl+/` (or `Cmd+/` on Mac) → command panel opens/closes. All existing category grouping, search, and keyboard nav still works.

---

### Step 6.5: Input Box Keyboard Shortcuts (§6.4)

**Existing state**: Auto-resize already works via `handleTextareaInput` (line 855). `Ctrl+Enter` / `Enter` send toggle already exists via `sendByCtrlEnter` prop. Image paste already handled by `react-dropzone`.

**Remaining work** — add `Esc` to clear input:

**File**: `src/components/chat/hooks/useChatComposerState.ts`

In the `handleKeyDown` callback, add an `Escape` handler. Place it after the command menu key handler (since command menu's Escape should take priority when it's open):

```typescript
// After the command menu and file mentions key down handlers:
if (event.key === 'Escape' && !showCommandMenu && !showFileDropdown) {
  event.preventDefault();
  if (input.trim()) {
    setInput('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }
  return;
}
```

> **Note**: The existing `CommandMenu` already handles `Escape` when open (closes the menu). This handler only fires when neither command menu nor file dropdown is active, so there's no conflict.

**Verification**: Type text → press `Esc` → input clears and textarea returns to default height. With command menu open → `Esc` closes menu (not input).

**Commit point**: `feat(composer): Ctrl+/ to toggle command panel, Esc to clear input`

---

### Step 6.6: Dark Mode Verification Pass

Review all new components for dark mode support:

- `HookEventCard` — uses `bg-muted/30`, `text-muted-foreground` → ✅ token-based
- `CompactBoundaryDivider` — uses `bg-border/60`, `text-muted-foreground` → ✅ token-based
- `InlineStatusText` — uses `text-muted-foreground/70` → ✅ token-based
- `CodeBlockHeader` — uses `bg-muted/50`, dark override `bg-muted/20` → ✅
- `SubagentContainer` — uses CSS variables `--subagent-border`, `--subagent-bg` → ✅ has dark overrides
- `SubagentToolItem` — uses `text-muted-foreground` → ✅ token-based
- `ContextUsageIndicator` — uses CSS variables `--context-*` → ✅ has dark overrides
- `ContextUsagePopover` — uses `bg-popover`, `border-border`, dark override for warning → ✅
- `ThinkingStreamBlock` — uses `text-muted-foreground`, `border-muted-foreground/20` → ✅

**Verification**: Toggle dark mode → visually verify all new components render correctly.

---

### Step 6.7: Accessibility Audit

Add `aria-*` attributes to all new interactive elements:

- All collapsible sections: `aria-expanded={expanded}`
- Tool cards: `aria-label="Tool: {toolName}"`
- Status messages: `aria-live="polite"` (already on `InlineStatusText`)
- Context indicator: `aria-label="Context usage: {pct}%"`
- Tab navigation: `role="tablist"`, `role="tab"`, `aria-selected`
- YOLO indicator: `aria-label="YOLO mode active — all permissions auto-approved"`

**Verification**: Tab through all new UI elements with keyboard → all reachable and operable.

**Commit point**: `chore(a11y): add aria attributes to all new components`

---

## Dependencies Summary

| Package | Version | Purpose |
|---------|---------|---------|
| `react-virtuoso` | ^4.x | Virtual scrolling for message list |

---

## File Change Summary

### New Files (14)
| File | Purpose |
|------|---------|
| `src/components/chat/hooks/handlers/handleHookEvent.ts` | Hook event handler |
| `src/components/chat/hooks/handlers/handleCompactBoundary.ts` | Compact boundary handler |
| `src/components/chat/view/subcomponents/HookEventCard.tsx` | Hook event display card |
| `src/components/chat/view/subcomponents/CompactBoundaryDivider.tsx` | Compaction visual separator |
| `src/components/chat/view/subcomponents/InlineStatusText.tsx` | Inline status display |
| `src/components/chat/view/subcomponents/CodeBlockHeader.tsx` | Code block file name + actions |
| `src/components/chat/view/subcomponents/SubagentToolItem.tsx` | Compact child tool row |
| `src/components/chat/view/subcomponents/ContextUsageIndicator.tsx` | Token usage bar |
| `src/components/chat/view/subcomponents/ContextUsagePopover.tsx` | Token usage detail popover |

### Modified Files (17)
| File | Changes |
|------|---------|
| `src/index.css` | Chat design tokens |
| `src/components/chat/types/types.ts` | Extended ChatMessage, subagentState |
| `src/components/chat/hooks/useChatProviderState.ts` | Default bypassPermissions |
| `src/components/chat/hooks/useChatRealtimeHandlers.ts` | Route new subTypes, model ref, usage ref |
| `src/components/chat/hooks/handlers/index.ts` | Export new handlers |
| `src/components/chat/hooks/handlers/handleStreamEvent.ts` | Model extraction, usage extraction |
| `src/components/chat/hooks/handlers/handleStatusMessage.ts` | Inline status + setChatMessages |
| `src/components/chat/hooks/handlers/handleTaskLifecycle.ts` | Enhanced subagentState fields |
| `src/components/chat/hooks/useSlashCommands.ts` | Add toggleCommandMenu |
| `src/components/chat/hooks/useChatComposerState.ts` | Ctrl+/ shortcut, Esc to clear input |
| `src/components/chat/view/subcomponents/ChatInputControls.tsx` | YOLO indicator, context indicator |
| `src/components/chat/view/subcomponents/MessageComponent.tsx` | Message header, new message type routing |
| `src/components/chat/view/subcomponents/ThinkingStreamBlock.tsx` | Collapsed default, duration |
| `src/components/chat/view/subcomponents/Markdown.tsx` | Code block enhancements |
| `src/components/chat/view/subcomponents/ChatMessagesPane.tsx` | Virtual scrolling |
| `src/components/chat/tools/components/SubagentContainer.tsx` | Full rewrite to bubble card |
| `src/components/chat/tools/ToolRenderer.tsx` | Compact default mode |
| `src/components/main-content/view/subcomponents/MainContentHeader.tsx` | Remove tab switcher |
| `src/components/sidebar/view/Sidebar.tsx` | Add tab navigation section |
| `server/claude-sdk.js` | IS_SANDBOX fix, maxTokens passthrough |

---

## Commit Points (Ordered)

1. `feat(css): add chat design tokens for messages, tools, subagents, context`
2. `feat(types): extend ChatMessage with hook, status, model, subagent fields`
3. `feat(yolo): default bypassPermissions mode, visual indicator, /yolo command, backend IS_SANDBOX fix`
4. `feat(settings): add default permission mode selector`
5. `feat(chat): display hook events in chat (CLI parity)`
6. `feat(chat): display compact boundary divider in chat (CLI parity)`
7. `feat(chat): extract model name and usage stats from stream events`
8. `feat(chat): inline status messages with dedup and auto-cleanup (CLI parity)`
9. `feat(chat): enhanced code blocks with file name, Apply button, copy, line numbers`
10. `feat(chat): compact default tool cards with click-to-expand`
11. `feat(chat): thinking blocks default collapsed, streaming pulse, duration display`
12. `feat(chat): subagent bubble cards with tool items, elapsed time, model name`
13. `feat(chat): context window usage indicator with configurable max tokens`
14. `feat(chat): /compact slash command and maxTokens backend passthrough`
15. `feat(layout): move tabs to sidebar bottom, add session time grouping`
16. `feat(chat): virtual scrolling for long conversations, react-virtuoso`
17. `feat(composer): Ctrl+/ to toggle command panel, Esc to clear input`
18. `chore(a11y): add aria attributes to all new components`

---

## Deferred Features (Phase 2 Scope)

The following spec sections are intentionally deferred from this plan. They are larger features that depend on Phase 1 infrastructure being complete and will be planned separately.

| Spec Section | Feature | Reason for Deferral |
|---|---|---|
| §6.1 | **@-Mentions with MentionPill.tsx** — fuzzy search, autocomplete popup, keyboard nav, `MentionPill.tsx` component | Substantial standalone feature requiring its own design cycle |
| §5.2 / §7.3 | **InlineDiffActions.tsx** — Accept/Reject buttons on inline diffs | Medium-complexity feature with diff rendering integration; depends on code block enhancements from Step 3.2 being stable |

---

## Execution Strategy

This plan is designed for **subagent-driven-development**:
- **Phase 1** (Steps 1.1–1.7): Sequential — foundation must be in place first
- **Phase 2** (Steps 2.1–2.5): Parallelizable — each handler is independent
- **Phase 3** (Steps 3.1–3.6): Partially parallel — 3.1 independent from 3.4/3.5/3.6
- **Phase 4** (Steps 4.1–4.3): Sequential — SubagentToolItem (4.1) must exist before SubagentContainer (4.2)
- **Phase 5** (Steps 5.1–5.3): Parallelizable — indicator and slash command are independent
- **Phase 6** (Steps 6.1–6.7): Partially parallel — layout change independent from virtual scrolling; 6.4/6.5 (composer) independent from 6.1/6.2 (layout)

After each commit point, run `npm run typecheck && npm run lint && npm run build` to verify.
