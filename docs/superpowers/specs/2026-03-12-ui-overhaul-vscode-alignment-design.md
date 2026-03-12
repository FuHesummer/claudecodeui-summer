# UI Overhaul — Align with Claude Code for VS Code

**Date**: 2026-03-12
**Status**: Draft
**Scope**: Comprehensive web chat UI redesign to match Claude Code for VS Code extension quality

---

## 1. Overview

The web chat UI currently functions but falls short of the polish and feature parity offered by the Claude Code for VS Code extension. This spec covers a full UI overhaul across seven areas: auto-bypass permissions (YOLO mode), complete message visibility, subagent bubble progress, message rendering quality, composer experience, context window indicator with token limit control, and layout/visual system unification.

**Provider scope**: All changes target the Claude provider primarily. Codex/Cursor/Gemini benefit from shared UI improvements (layout, design tokens) but provider-specific features (SDK message types, permission modes) apply only where the provider supports them.

---

## 2. YOLO Mode — Auto-Bypass Permissions

### Goal

Equivalent to `--dangerously-skip-permissions`. All tool calls auto-approved without user interaction.

### Current State

- `permissionMode = 'bypassPermissions'` already exists and auto-allows all non-`AskUserQuestion` tools in `canUseTool()` (server/claude-sdk.js:554–625)
- Settings UI has a `skipPermissions` checkbox
- `mapCliOptionsToSDK()` sets `process.env.IS_SANDBOX = '1'` when `skipPermissions` is true
- Permission mode cycles through: `default → acceptEdits → bypassPermissions → plan`

### Changes

#### 2.1 Default Permission Mode

New sessions default to `permissionMode = 'bypassPermissions'` instead of `'default'`.

**File**: `src/components/chat/hooks/useChatProviderState.ts`
- Change initial state: `useState<PermissionMode>('bypassPermissions')`
- When no saved mode exists in localStorage, default to `'bypassPermissions'`

#### 2.2 Global Default in Settings

**File**: Settings page (agents-settings)
- New setting: `defaultPermissionMode` dropdown with options: Default, Accept Edits, Bypass Permissions (YOLO), Plan
- Stored in localStorage key `defaultPermissionMode`
- `useChatProviderState` reads this as fallback when no per-session mode is saved

#### 2.3 YOLO Visual Indicator

**File**: `src/components/chat/view/subcomponents/ChatInputControls.tsx`
- When `permissionMode === 'bypassPermissions'`, display a small red/orange label above or beside the composer: `⚡ YOLO`
- Tooltip on hover: "All tool permissions auto-approved. Equivalent to --dangerously-skip-permissions"
- Clicking the label opens the permission mode cycle (same as current button)

#### 2.4 `/yolo` Slash Command

New slash command that toggles `bypassPermissions` mode on/off:
- If current mode is `bypassPermissions` → switch to `default`
- Otherwise → switch to `bypassPermissions`
- Displays confirmation in chat: "⚡ YOLO mode enabled — all permissions auto-approved"

#### 2.5 Backend Guarantee

**File**: `server/claude-sdk.js`
- `IS_SANDBOX=1` must be set whenever `permissionMode === 'bypassPermissions'`, not only when `skipPermissions` settings checkbox is true
- Move the `IS_SANDBOX` assignment into the `permissionMode` check block (line ~170):
  ```js
  if (permissionMode === 'bypassPermissions') {
    process.env.IS_SANDBOX = '1';
    sdkOptions.permissionMode = 'bypassPermissions';
  }
  ```

#### 2.6 AskUserQuestion Preserved

`AskUserQuestion` is NOT a permission request — it's the agent asking the user a question. It continues to be shown and requires user interaction regardless of YOLO mode. No change needed; current `TOOLS_REQUIRING_INTERACTION` set already handles this.

---

## 3. Complete Message Visibility — CLI Parity

### Goal

Every message type visible in Claude Code CLI must also appear in the web UI.

### Currently Missing Messages

| SDK subType | CLI shows | Web currently |
|---|---|---|
| `hook_started` / `hook_progress` | Hook execution | `console.debug` only |
| `compact_boundary` | "Context compacted" | `console.debug` only |
| `message_start` | Model name | `console.debug` only |
| `message_delta` | Usage stats, stop_reason | `console.debug` only |
| `message_stop` | Sequence complete | `console.debug` only |
| `status` | Inline "Reading file..." | Status bar only, no chat message |

### Changes

#### 3.1 Hook Events

**New handler**: `handleHookEvent.ts` in `src/components/chat/hooks/handlers/`

Receives `hook_started` and `hook_progress` subTypes. Creates a `ChatMessage` with:
```typescript
{
  type: 'assistant',
  isHookEvent: true,
  hookName: data.hook_name || data.hookName || 'hook',
  content: data.message || data.output || '',
  timestamp: Date.now(),
}
```

**New component**: `HookEventCard.tsx`
- Small gray card with monospace font
- Shows hook name as header, progress text as body
- Collapsible if output exceeds 3 lines
- Gray left border, muted background

**Router change**: `useChatRealtimeHandlers.ts` — replace `console.debug` for `hook_started`/`hook_progress` with `handleHookEvent()` call.

#### 3.2 Context Compaction Boundary

**New handler**: `handleCompactBoundary.ts`

Creates a `ChatMessage` with:
```typescript
{
  type: 'assistant',
  isCompactBoundary: true,
  content: 'Context window compacted',
  timestamp: Date.now(),
}
```

**New component**: `CompactBoundaryDivider.tsx`
- Horizontal divider line spanning full width
- Centered text: "🗜 Context Compacted"
- Muted color, small font size
- Visually separates pre/post compaction messages

**Router change**: Replace `console.debug` for `compact_boundary` with handler call.

#### 3.3 Model Name on Messages

**File**: `handleStreamEvent.ts`

On `message_start` event:
- Extract `data.message?.model` or `data.model`
- Store in a ref/variable (e.g., `currentModelRef.current = modelName`)
- When the first `content_block_delta` with text arrives, attach `modelName` to the ChatMessage being created

**ChatMessage extension**: Add optional `modelName?: string` field.

**MessageComponent rendering**: Show model name as a small muted label in the message header: `◉ Claude · sonnet-4 · 12:34 PM`

#### 3.4 Message Usage Stats

**File**: `handleStreamEvent.ts`

On `message_delta` event:
- Extract `data.usage` (input_tokens, output_tokens)
- Store in ref, merge into CostInfo when `result` arrives
- Extract `data.delta?.stop_reason` — log but don't display (internal detail)

On `message_stop` event:
- No visible action needed; serves as sequence boundary marker

#### 3.5 Inline Status Messages

**File**: `handleStatusMessage.ts`

Currently only updates `agentStatusState` (status bar). Add: insert a lightweight ChatMessage for inline display:

```typescript
{
  type: 'assistant',
  isStatusInline: true,
  content: data.status || data.message || '',
  timestamp: Date.now(),
}
```

**Deduplication**: Don't insert if the last message is also `isStatusInline` with identical content.

**Auto-cleanup**: When the next non-status message arrives, mark the last `isStatusInline` message as `isStale: true`. Stale inline status messages render as fully transparent (fade out) or are removed.

**New component**: `InlineStatusText.tsx`
- Gray italic text, small font
- Spinner animation while `isStale !== true`
- Example: `⠋ Reading src/auth/handler.ts...`

### ChatMessage Type Extensions

```typescript
interface ChatMessage {
  // ...existing fields...
  isHookEvent?: boolean;
  hookName?: string;
  isCompactBoundary?: boolean;
  isStatusInline?: boolean;
  isStale?: boolean;
  modelName?: string;
}
```

---

## 4. Subagent Bubble with Real-Time Progress

### Goal

Subagent (Task tool) displays as a visually distinct bubble card showing real-time tool progress, not a collapsed container.

### Current State

- `SubagentContainer.tsx`: purple left border, tool history in `<details>`, progressLog as text list
- `subagentState` tracks: `childTools[]`, `currentToolIndex`, `isComplete`, `taskId`, `description`, `progressLog[]`
- `handleTaskLifecycle.ts` handles `task_started`, `task_progress`, `task_notification`

### Changes

#### 4.1 Rewrite `SubagentContainer.tsx`

New bubble card layout:

```
┌─ 🤖 Agent: "Search codebase for auth patterns" ──────────┐
│  ⚡ YOLO · sonnet-4                                        │
│                                                             │
│  ├─ 🔍 Grep "authenticate" in src/     ✅ 12 files found   │
│  ├─ 📄 Read src/auth/handler.ts        ✅                   │
│  ├─ 📄 Read src/middleware/jwt.ts       ✅                   │
│  └─ ⏳ Grep "session" in server/       ⠋ searching...      │
│                                                             │
│  Progress: 4/? tools · 12s elapsed                          │
└─────────────────────────────────────────────────────────────┘
```

**Design elements**:
- **Indentation**: 16px left margin + purple gradient left border (`var(--subagent-border)`)
- **Background**: Subtle purple tint (`var(--subagent-bg)`)
- **Header**: Agent icon + description text + permission mode label + model name
- **Tool list**: Each `childTool` renders as `SubagentToolItem` (see below)
- **Active tool highlight**: Last incomplete tool has pulse animation
- **Progress summary**: Bottom line showing completed/total tools + elapsed time
- **Default visibility**: Show last 3 tools expanded, older ones collapsed with "Show N more" toggle
- **Completion state**: Shrinks to compact mode (description + result summary + tool count + elapsed time)

#### 4.2 New Component: `SubagentToolItem.tsx`

Single-line compact rendering for each child tool:

```
🔍 Grep "authenticate" in src/     ✅ 12 files found
```

- Tool category icon (mapped from `getToolCategory()`)
- Tool name in bold
- Key parameter (first meaningful input field, truncated to ~40 chars)
- Status icon: ✅ success / ⏳ pending / ❌ error / ⠋ running (animated)
- Brief result summary (for Grep: file count; for Bash: exit code; for Read: hidden)
- Click to expand full input/output (uses existing tool display components)

#### 4.3 Subagent Text Output

Assistant text messages from subagents (those with `parentToolUseId`) render inside the bubble:
- Slightly smaller font (`text-sm`)
- Light background differentiation
- Visually contained within the parent bubble's border

#### 4.4 Nested Subagents

If a subagent calls another Task (nested subagent):
- Recursively use the same bubble component
- Additional 16px indent per nesting level
- Maximum 3 levels of visual nesting; beyond that, render flat with a nesting indicator label "↳ Level 4"

#### 4.5 Enhanced `subagentState`

```typescript
subagentState?: {
  childTools: SubagentChildTool[];
  currentToolIndex: number;
  isComplete: boolean;
  taskId?: string;
  description?: string;
  progressLog?: string[];
  elapsedMs?: number;       // NEW: tracked via setInterval while !isComplete
  modelName?: string;       // NEW: from task_started data
  toolCount?: number;       // NEW: total tools completed
};
```

---

## 5. Message Rendering System — Visual Quality Upgrade

### Goal

Match VS Code extension's rendering quality for assistant messages, tool cards, thinking blocks, and user messages.

### 5.1 Assistant Message Layout

**File**: Rewrite `MessageComponent.tsx`

New structure:
```
┌─────────────────────────────────────────────────┐
│ ◉ Claude · sonnet-4                    12:34 PM │
│                                                   │
│ [Markdown body]                                   │
│                                                   │
│ [Enhanced code blocks with file name + actions]   │
└─────────────────────────────────────────────────┘
```

- **Message header**: Model name label (from `modelName` field) + timestamp, muted color
- **No bubble border** for assistant messages — clean, full-width layout like VS Code
- **Compact spacing**: `var(--chat-gap-messages)` between messages (8px default)

### 5.2 Enhanced Code Blocks

**File**: Rewrite `Markdown.tsx` code block rendering

```
┌─ src/auth/handler.ts ──────────── Apply │ Copy ─┐
│  1 │ export function authenticate() {            │
│  2 │   const token = getToken();                 │
│  3 │   return verify(token);                     │
│  ...│                                            │
└──────────────────────────────────────────────────┘
```

**New component**: `CodeBlockHeader.tsx`
- File name extracted from markdown fence meta: `` ```ts title="src/auth.ts" ``
- Also inferred from surrounding context text (heuristic: if previous line contains a file path)
- "Apply" button: sends code to backend as a Write operation (new WebSocket message type `apply-code`)
- "Copy" button: copies to clipboard (existing functionality)
- Line numbers: enabled by default
- Syntax theme: VS Code dark+ inspired colors for dark mode, light+ for light mode

**New component**: `InlineDiffActions.tsx`
- For Edit/Write tool results that show diffs
- "Accept" / "Reject" buttons on the diff viewer
- Accept sends approval via WebSocket; Reject reverts (if checkpoint available) or dismisses

### 5.3 Tool Call Cards — Compact Default

**File**: Refactor `ToolRenderer.tsx` + update `toolConfigs.ts`

Default to single-line compact mode:
```
▶ bash  npm run build                    2.3s ✅
▶ read  src/components/App.tsx                ✅
▶ edit  server/index.js  +12 -3 lines        ✅
▼ grep  "authenticate" in src/          12 files
  └─ src/auth/handler.ts
  └─ src/middleware/jwt.ts
  └─ ... (10 more)
```

- Tool category icon (from `getToolCategory()`)
- Tool name in bold monospace
- Key parameter — tool-specific extraction:
  - Bash: command text (truncated)
  - Read: file path
  - Edit/Write: file path + `+N -M lines`
  - Grep/Glob: pattern + path
- Duration (if available from tool result timing)
- Status icon: ✅/❌/⠋
- Click to expand full input/output (toggle `▶`/`▼`)
- Failed tools: red left border + error summary visible in compact mode

### 5.4 Thinking Blocks

**File**: Optimize `ThinkingStreamBlock.tsx`

```
💭 Thinking · 3.2s                          [▼]
┊ I need to consider the auth flow...
┊ The current implementation uses JWT but...
```

- Default: **collapsed**, showing only `💭 Thinking · {durationMs}ms`
- Expanded: gray vertical line left border + italic text
- Streaming: pulse animation on the `💭` icon, duration counts up live
- Long content: auto-truncate at 10 lines + "Show more" when collapsed-then-expanded
- Markdown rendering preserved inside thinking blocks

### 5.5 User Messages

- Keep blue accent but simplify to left-border style (no full bubble wrap)
- Image attachments show as small thumbnails (existing, verify)
- @-mention file names render as blue pills: `[src/auth/handler.ts]`
- Long messages (>5 lines) default collapsed with "Show full message" toggle

---

## 6. Composer Experience Upgrade

### Goal

Transform the input from a basic text box into a smart editor with enhanced @-mentions, slash commands, context awareness, and keyboard shortcuts.

### 6.1 @-Mentions Enhancement

**File**: Refactor mention system in `ChatComposer.tsx`

Features:
- **Fuzzy search**: Match file names AND path segments (e.g., typing "hand" matches `src/auth/handler.ts`)
- **Directory mentions**: `@src/auth/` includes entire directory as context
- **Line range**: `@src/auth/handler.ts:10-25` specifies line range
- **Popup panel**: Shows file icon + path + file size + last modified time
- **Keyboard navigation**: ↑↓ to select, Enter to confirm, Esc to dismiss
- **Pill rendering**: After selection, displays as blue pill in input: `[src/auth/handler.ts]`

**New component**: `MentionPill.tsx`
- Blue rounded pill with file icon
- `×` button to remove
- Click to open file in editor sidebar

### 6.2 Context Window Usage Indicator

**New component**: `ContextUsageIndicator.tsx`

Position: Right side of composer toolbar area

**Compact display**: `37% ▓▓▓░░ 62.4K / 160K`
- Percentage + mini progress bar + shortened token counts
- Color grades: green (<50%) → yellow (50-75%) → orange (75-90%) → red (>90%)
- Red state: pulse animation + "Context nearly full"

**Hover popover** (`ContextUsagePopover.tsx`):
```
┌─ Context Window ───────────────────┐
│  Used:    62,400 tokens              │
│  Max:    160,000 tokens              │
│  Free:    97,600 tokens              │
│                                      │
│  ▓▓▓▓▓▓▓░░░░░░░░░░░░  39%          │
│                                      │
│  ⚙ Max tokens: [160,000  ▼]         │
│    Presets: 128K · 160K · 200K       │
└──────────────────────────────────────┘
```

**Max token limit control**:
- Dropdown/input in hover popover with presets: 128,000 / 160,000 / 200,000
- Custom input for arbitrary values
- Stored in localStorage key `contextWindowSize`
- Default from `VITE_CONTEXT_WINDOW` env var (currently 160000)
- Priority: user setting > env var default
- Also configurable in Settings page under a new "Context Window" section

**Data source**: `token-budget` WebSocket message from backend `extractTokenBudget()`. Frontend calculates:
```
usedTokens = totalTokens - remainingTokens
percentage = (usedTokens / maxTokens) * 100
```
Where `maxTokens` comes from user-configured limit.

### 6.3 Slash Command Panel Upgrade

**File**: Refactor slash command popup

Features:
- **Categorized display**: Groups with headers (Session, Mode, Tools, etc.)
- **Search filter**: Type to filter commands
- **Descriptions**: Each command shows a brief description
- **New commands**:
  - `/yolo` — Toggle bypassPermissions mode
  - `/compact` — Trigger context window compaction
- **Keyboard**: `Ctrl+/` opens panel, ↑↓ navigate, Enter selects

### 6.4 Input Box Improvements

- **Auto-resize**: Height grows with content, max 12 lines, then scroll
- **Keyboard shortcuts**:
  - `Ctrl+Enter` (or `Cmd+Enter`): Send message (configurable in Settings to use `Enter`)
  - `Esc`: Clear input
  - `Ctrl+/`: Open slash command panel
- **Paste images**: Auto-convert to attachments (verify existing behavior)

---

## 7. Layout, Navigation & Visual System

### 7.1 Tab Navigation — Move to Sidebar Bottom

**Current**: PillBar of tab pills in top-right header (`MainContentTabSwitcher.tsx`)
**New**: Vertical tab list at the bottom of the sidebar

```
┌──────────┬─────────────────────────────────────────────────────┐
│ Projects │  Session Name                              ⚙       │
│ Sessions │                                                      │
│ ├─ Today │  [Main Content — full width]                         │
│ │ └─ ... │                                                      │
│          │                                                      │
│──────────│                                                      │
│ 💬 Chat  │                                                      │
│ 🖥 Shell │                                                      │
│ 📁 Files │                                                      │
│ 🔀 Git   │                                                      │
└──────────┴─────────────────────────────────────────────────────┘
```

**Changes**:
- **`Sidebar.tsx`**: Add tab list section at bottom, separated by divider from sessions list
- **`MainContentHeader.tsx`**: Remove `MainContentTabSwitcher` from header; header now shows only session name + settings
- **Tab items**: Icon + label text, vertical stack, active state with primary color highlight + left accent bar
- **`MainContentTabSwitcher.tsx`**: Repurpose or remove; logic moves to sidebar
- **Mobile**: No change — keep existing `MobileNav` bottom bar with horizontal tab pills
- **Plugin tabs**: Append below built-in tabs with plugin icon

### 7.2 Session List Enhancements

**File**: Sidebar session list component

- **Time-based grouping**: Today / Yesterday / This Week / Older
- **Search box**: Filter sessions by name, above the session list
- **Session name**: Editable inline (click to rename)

### 7.3 Design Tokens System

**File**: `src/index.css` (or `globals.css`)

```css
:root {
  /* Chat spacing */
  --chat-gap-messages: 8px;
  --chat-padding-message: 12px;
  --chat-indent-subagent: 16px;

  /* Radii */
  --chat-radius-message: 8px;
  --chat-radius-tool: 6px;
  --chat-radius-code: 6px;

  /* Transitions */
  --chat-transition-expand: 200ms ease-out;
  --chat-transition-fade: 150ms ease-in;

  /* Tool status colors */
  --tool-success: hsl(var(--chart-2));
  --tool-pending: hsl(var(--chart-4));
  --tool-error: hsl(var(--destructive));
  --tool-running: hsl(var(--primary));

  /* Subagent */
  --subagent-border: hsl(270 60% 60%);
  --subagent-bg: hsl(270 60% 98%);

  /* Context indicator */
  --context-green: hsl(142 71% 45%);
  --context-yellow: hsl(48 96% 53%);
  --context-orange: hsl(25 95% 53%);
  --context-red: hsl(0 84% 60%);
}

.dark {
  --subagent-bg: hsl(270 30% 12%);
  /* ...dark mode overrides for all tokens... */
}
```

All new and refactored components MUST reference these tokens. No hardcoded color/spacing values.

### 7.4 Scrolling & Performance

- **Virtual scrolling**: Integrate `react-virtuoso` for message list when message count > 100
- **Auto-scroll**: Scroll to bottom on new message; pause when user scrolls up; show "↓ New messages" floating button
- **Stream merge**: Keep existing 33ms buffer flush for text deltas

**File**: `ChatMessagesPane.tsx` — wrap message list in `<Virtuoso>` with `followOutput` mode.

### 7.5 Dark Mode Consistency

All new components must support dark mode via:
- CSS variables from design tokens
- `.dark` class selectors where token-based approach insufficient
- Verified contrast ratios for text on all background combinations

### 7.6 Accessibility Baseline

- All interactive elements: `aria-label`
- Collapsible sections: `aria-expanded`
- Tab navigation: keyboard `Tab` reaches all action buttons
- Status changes: `aria-live="polite"` regions for streaming updates, rate limits

---

## 8. Implementation Phases

### Phase 1: Foundation + Permissions (Estimated: 2-3 days)
1. Design tokens system in CSS
2. YOLO mode default + visual indicator + `/yolo` command
3. Backend `IS_SANDBOX` fix
4. ChatMessage type extensions

### Phase 2: Message Visibility + Rendering (Estimated: 4-5 days)
1. Hook event handler + component
2. Compact boundary handler + component
3. Model name extraction + display
4. Inline status messages
5. Message header redesign (model + timestamp)
6. Code block enhancement (file name, Apply, line numbers)
7. Tool card compact mode

### Phase 3: Subagent + Composer (Estimated: 4-5 days)
1. SubagentContainer rewrite (bubble card)
2. SubagentToolItem component
3. Nested subagent rendering
4. Thinking block optimization
5. @-mention fuzzy search + directory + line range
6. Slash command panel upgrade
7. Input box auto-resize + keyboard shortcuts

### Phase 4: Layout + Polish (Estimated: 3-4 days)
1. Tab navigation move to sidebar bottom
2. Session list time grouping + search
3. Context window usage indicator + token limit control
4. Virtual scrolling integration
5. Dark mode verification pass
6. Accessibility audit

**Total estimated**: 13-17 days of implementation work, suitable for parallel subagent execution.

---

## 9. Files Changed Summary

### New Files
| File | Purpose |
|------|---------|
| `src/components/chat/hooks/handlers/handleHookEvent.ts` | Hook event handler |
| `src/components/chat/hooks/handlers/handleCompactBoundary.ts` | Compact boundary handler |
| `src/components/chat/view/subcomponents/HookEventCard.tsx` | Hook event display |
| `src/components/chat/view/subcomponents/CompactBoundaryDivider.tsx` | Compaction separator |
| `src/components/chat/view/subcomponents/InlineStatusText.tsx` | Inline status display |
| `src/components/chat/view/subcomponents/CodeBlockHeader.tsx` | Code block file name + actions |
| `src/components/chat/view/subcomponents/InlineDiffActions.tsx` | Diff accept/reject |
| `src/components/chat/view/subcomponents/SubagentToolItem.tsx` | Compact child tool row |
| `src/components/chat/view/subcomponents/ContextUsageIndicator.tsx` | Token usage display |
| `src/components/chat/view/subcomponents/ContextUsagePopover.tsx` | Token usage detail popover |
| `src/components/chat/view/subcomponents/MentionPill.tsx` | @-mention pill in input |

### Modified Files
| File | Changes |
|------|---------|
| `src/components/chat/types/types.ts` | Extended ChatMessage, subagentState |
| `src/components/chat/hooks/useChatRealtimeHandlers.ts` | Route new subTypes to handlers |
| `src/components/chat/hooks/useChatProviderState.ts` | Default permissionMode |
| `src/components/chat/hooks/handlers/handleStreamEvent.ts` | Model name extraction |
| `src/components/chat/hooks/handlers/handleStatusMessage.ts` | Inline status messages |
| `src/components/chat/hooks/handlers/handleTaskLifecycle.ts` | Enhanced subagentState |
| `src/components/chat/view/subcomponents/MessageComponent.tsx` | New layout with header |
| `src/components/chat/view/subcomponents/Markdown.tsx` | Code block enhancements |
| `src/components/chat/view/subcomponents/ChatComposer.tsx` | Context indicator, auto-resize |
| `src/components/chat/view/subcomponents/ChatInputControls.tsx` | YOLO label |
| `src/components/chat/view/subcomponents/ChatMessagesPane.tsx` | Virtual scrolling |
| `src/components/chat/view/subcomponents/SubagentContainer.tsx` | Full rewrite to bubble card |
| `src/components/chat/tools/ToolRenderer.tsx` | Compact default mode |
| `src/components/chat/tools/configs/toolConfigs.ts` | Updated display configs |
| `src/components/chat/view/subcomponents/ThinkingStreamBlock.tsx` | Collapsed default, gray line |
| `src/components/main-content/view/subcomponents/MainContentHeader.tsx` | Remove tab switcher |
| `src/components/main-content/view/subcomponents/MainContentTabSwitcher.tsx` | Move to sidebar |
| `src/components/app/Sidebar.tsx` (or equivalent) | Add tab navigation section |
| `src/index.css` | Design tokens |
| `server/claude-sdk.js` | IS_SANDBOX fix in permissionMode check |
| Settings page components | Default permission mode, context window size |

### Dependencies
| Package | Purpose |
|---------|---------|
| `react-virtuoso` | Virtual scrolling for message list |

---

## 10. Non-Goals

- **Checkpoint/rewind system**: Requires backend git snapshot infrastructure — deferred to future iteration
- **Multiple concurrent conversations**: Requires parallel SDK session management — deferred
- **Full VS Code Activity Bar layout**: Three-column layout rejected in favor of sidebar-bottom tabs (simpler, better for narrow screens)
- **Provider-specific UI branches**: All visual changes are provider-agnostic where possible; SDK-specific message types only apply to Claude
