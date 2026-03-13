import React, { memo, useMemo, useCallback, useState } from 'react';
import type { Project } from '../../../types/app';
import type { SubagentChildTool } from '../types/types';
import { getToolConfig } from './configs/toolConfigs';
import { OneLineDisplay, CollapsibleDisplay, ToolDiffViewer, MarkdownContent, FileListContent, TodoListContent, TaskListContent, TextContent, QuestionAnswerContent, SubagentContainer } from './components';
import ToolProgressDisplay from './components/ToolProgressDisplay';

type DiffLine = {
  type: string;
  content: string;
  lineNum: number;
};

interface ToolRendererProps {
  toolName: string;
  toolInput: any;
  toolResult?: any;
  toolId?: string;
  mode: 'input' | 'result';
  onFileOpen?: (filePath: string, diffInfo?: any) => void;
  createDiff?: (oldStr: string, newStr: string) => DiffLine[];
  selectedProject?: Project | null;
  autoExpandTools?: boolean;
  showRawParameters?: boolean;
  rawToolInput?: string;
  toolProgress?: string[];
  isSubagentContainer?: boolean;
  subagentState?: {
    childTools: SubagentChildTool[];
    currentToolIndex: number;
    isComplete: boolean;
  };
}

function getToolCategory(toolName: string): string {
  if (['Edit', 'Write', 'ApplyPatch'].includes(toolName)) return 'edit';
  if (['Grep', 'Glob'].includes(toolName)) return 'search';
  if (toolName === 'Bash') return 'bash';
  if (['TodoWrite', 'TodoRead'].includes(toolName)) return 'todo';
  if (['TaskCreate', 'TaskUpdate', 'TaskList', 'TaskGet'].includes(toolName)) return 'task';
  if (toolName === 'Task') return 'agent';  // Subagent task
  if (toolName === 'exit_plan_mode' || toolName === 'ExitPlanMode') return 'plan';
  if (toolName === 'AskUserQuestion') return 'question';
  return 'default';
}

/** Truncate a string to maxLen characters, adding ellipsis if needed */
function truncate(str: string, maxLen: number): string {
  if (!str) return '';
  const oneLine = str.replace(/\n/g, ' ').trim();
  return oneLine.length > maxLen ? oneLine.slice(0, maxLen) + '…' : oneLine;
}

/** Try to parse a JSON string; returns null on failure */
function tryParse(str: string): Record<string, any> | null {
  try { return JSON.parse(str); } catch { return null; }
}

/** Extract the most important parameter from a tool's input for compact display */
function getToolKeyParam(toolName: string, input: unknown): string {
  const obj = typeof input === 'string' ? tryParse(input) : input;
  if (!obj || typeof obj !== 'object') return '';
  const o = obj as Record<string, any>;

  switch (toolName) {
    case 'Bash': return truncate(o.command || '', 60);
    case 'Read': return o.file_path || o.filePath || '';
    case 'Edit':
    case 'Write':
    case 'ApplyPatch': return o.file_path || o.filePath || '';
    case 'Grep': return `"${truncate(o.pattern || '', 20)}" in ${o.path || '.'}`;
    case 'Glob': return o.pattern || '';
    case 'Task': return truncate(o.description || o.prompt || '', 50);
    case 'TodoWrite': return 'updating list';
    case 'TodoRead': return 'reading list';
    case 'TaskCreate': return truncate(o.subject || '', 40);
    case 'TaskUpdate': return o.taskId ? `#${o.taskId} → ${o.status || 'update'}` : 'update';
    case 'TaskList': return 'listing';
    case 'TaskGet': return o.taskId ? `#${o.taskId}` : 'fetch';
    case 'AskUserQuestion': return truncate(o.questions?.[0]?.question || '', 50);
    case 'ExitPlanMode':
    case 'exit_plan_mode': return 'plan ready';
    default: return '';
  }
}

/** Return a status icon based on tool result state */
function getStatusIcon(result?: any, isInProgress?: boolean): string {
  if (isInProgress) return '⏳';
  if (!result) return '⏳';
  if (result.isError) return '❌';
  return '✓';
}

/** Category-based compact line accent colors */
const compactAccentMap: Record<string, string> = {
  edit: 'text-amber-600 dark:text-amber-400',
  search: 'text-gray-600 dark:text-gray-400',
  bash: 'text-green-600 dark:text-green-400',
  todo: 'text-violet-600 dark:text-violet-400',
  task: 'text-violet-600 dark:text-violet-400',
  agent: 'text-purple-600 dark:text-purple-400',
  plan: 'text-indigo-600 dark:text-indigo-400',
  question: 'text-blue-600 dark:text-blue-400',
  default: 'text-gray-600 dark:text-gray-400',
};

/** Tools that should always render expanded (never compact) */
const ALWAYS_EXPANDED_TOOLS = new Set(['Task', 'AskUserQuestion', 'ExitPlanMode', 'exit_plan_mode']);

/**
 * Main tool renderer router
 * Routes to compact single-line display (default) or expanded OneLineDisplay/CollapsibleDisplay
 */
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
  toolProgress,
  isSubagentContainer,
  subagentState
}) => {
  const [compactExpanded, setCompactExpanded] = useState(false);
  const config = getToolConfig(toolName);
  const displayConfig: any = mode === 'input' ? config.input : config.result;

  const parsedData = useMemo(() => {
    try {
      const rawData = mode === 'input' ? toolInput : toolResult;
      return typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    } catch {
      return mode === 'input' ? toolInput : toolResult;
    }
  }, [mode, toolInput, toolResult]);

  const handleAction = useCallback(() => {
    if (displayConfig?.action === 'open-file' && onFileOpen) {
      const value = displayConfig.getValue?.(parsedData) || '';
      onFileOpen(value);
    }
  }, [displayConfig, parsedData, onFileOpen]);

  // Route subagent containers to dedicated component (after hooks to keep call order stable)
  if (isSubagentContainer && subagentState) {
    if (mode === 'result') {
      return null;
    }
    return (
      <SubagentContainer
        toolInput={toolInput}
        toolResult={toolResult}
        subagentState={subagentState}
      />
    );
  }

  if (!displayConfig) return null;

  // Tool progress indicator (shown during execution, before result arrives)
  const progressDisplay = toolProgress && toolProgress.length > 0 && !toolResult && mode === 'input'
    ? <ToolProgressDisplay progress={toolProgress} />
    : null;

  // Determine if this tool should use compact mode
  const useCompact = mode === 'input' && !ALWAYS_EXPANDED_TOOLS.has(toolName) && !autoExpandTools;
  const category = getToolCategory(toolName);
  const accentColor = compactAccentMap[category] || compactAccentMap.default;

  // Render the full (expanded) content for a tool — used both standalone and inside compact expand
  const renderFullContent = () => {
    if (displayConfig.type === 'one-line') {
      const value = displayConfig.getValue?.(parsedData) || '';
      const secondary = displayConfig.getSecondary?.(parsedData);

      return (
        <OneLineDisplay
          toolName={toolName}
          toolResult={toolResult}
          toolId={toolId}
          icon={displayConfig.icon}
          label={displayConfig.label}
          value={value}
          secondary={secondary}
          action={displayConfig.action}
          onAction={handleAction}
          style={displayConfig.style}
          wrapText={displayConfig.wrapText}
          colorScheme={displayConfig.colorScheme}
          resultId={mode === 'input' ? `tool-result-${toolId}` : undefined}
        />
      );
    }

    if (displayConfig.type === 'collapsible') {
      const title = typeof displayConfig.title === 'function'
        ? displayConfig.title(parsedData)
        : displayConfig.title || 'Details';

      const defaultOpen = displayConfig.defaultOpen !== undefined
        ? displayConfig.defaultOpen
        : autoExpandTools;

      const contentProps = displayConfig.getContentProps?.(parsedData, {
        selectedProject,
        createDiff,
        onFileOpen
      }) || {};

      let contentComponent: React.ReactNode = null;

      switch (displayConfig.contentType) {
        case 'diff':
          if (createDiff) {
            contentComponent = (
              <ToolDiffViewer
                {...contentProps}
                createDiff={createDiff}
                onFileClick={() => onFileOpen?.(contentProps.filePath)}
              />
            );
          }
          break;
        case 'markdown':
          contentComponent = <MarkdownContent content={contentProps.content || ''} />;
          break;
        case 'file-list':
          contentComponent = (
            <FileListContent
              files={contentProps.files || []}
              onFileClick={onFileOpen}
              title={contentProps.title}
            />
          );
          break;
        case 'todo-list':
          if (contentProps.todos?.length > 0) {
            contentComponent = (
              <TodoListContent
                todos={contentProps.todos}
                isResult={contentProps.isResult}
              />
            );
          }
          break;
        case 'task':
          contentComponent = <TaskListContent content={contentProps.content || ''} />;
          break;
        case 'question-answer':
          contentComponent = (
            <QuestionAnswerContent
              questions={contentProps.questions || []}
              answers={contentProps.answers || {}}
            />
          );
          break;
        case 'text':
          contentComponent = (
            <TextContent
              content={contentProps.content || ''}
              format={contentProps.format || 'plain'}
            />
          );
          break;
        case 'success-message': {
          const msg = displayConfig.getMessage?.(parsedData) || 'Success';
          contentComponent = (
            <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {msg}
            </div>
          );
          break;
        }
      }

      const handleTitleClick = (toolName === 'Edit' || toolName === 'Write' || toolName === 'ApplyPatch') && contentProps.filePath && onFileOpen
        ? () => onFileOpen(contentProps.filePath, {
            old_string: contentProps.oldContent,
            new_string: contentProps.newContent
          })
        : undefined;

      return (
        <CollapsibleDisplay
          toolName={toolName}
          toolId={toolId}
          title={title}
          defaultOpen={defaultOpen}
          onTitleClick={handleTitleClick}
          showRawParameters={mode === 'input' && showRawParameters}
          rawContent={rawToolInput}
          toolCategory={category}
        >
          {contentComponent}
        </CollapsibleDisplay>
      );
    }

    return null;
  };

  // Compact mode: single-line clickable row with expand/collapse
  if (useCompact) {
    const keyParam = getToolKeyParam(toolName, parsedData);
    const isInProgress = !toolResult && !!toolProgress && toolProgress.length > 0;
    const statusIcon = getStatusIcon(toolResult, isInProgress);
    const statusClass = toolResult?.isError
      ? 'text-red-500 dark:text-red-400'
      : toolResult
        ? 'text-green-600 dark:text-green-400'
        : 'text-muted-foreground';

    return (
      <div className="group my-0.5">
        <button
          onClick={() => setCompactExpanded(!compactExpanded)}
          className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm transition-colors hover:bg-muted/50"
          style={{ borderRadius: 'var(--chat-radius-tool, 0.375rem)' }}
          aria-expanded={compactExpanded}
          aria-label={`Tool: ${toolName}`}
        >
          <span className="text-xs text-muted-foreground">{compactExpanded ? '▼' : '▶'}</span>
          <span className={`font-mono text-xs font-semibold ${accentColor}`}>{toolName}</span>
          <span className="flex-1 truncate font-mono text-xs text-muted-foreground">{keyParam}</span>
          {!toolResult && !isInProgress && (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
          )}
          <span className={`text-xs ${statusClass}`}>{statusIcon}</span>
        </button>
        {compactExpanded && (
          <div className="ml-6 mt-1 border-l-2 border-border/40 pl-3">
            {renderFullContent()}
          </div>
        )}
        {progressDisplay}
      </div>
    );
  }

  // Non-compact mode: render full content directly
  if (displayConfig.type === 'one-line') {
    return (
      <>
        {renderFullContent()}
        {progressDisplay}
      </>
    );
  }

  if (displayConfig.type === 'collapsible') {
    return (
      <>
        {renderFullContent()}
        {progressDisplay}
      </>
    );
  }

  return null;
});

ToolRenderer.displayName = 'ToolRenderer';
