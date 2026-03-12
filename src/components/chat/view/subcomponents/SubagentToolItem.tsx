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

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '...' : s;
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
        className="flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-xs hover:bg-muted/30"
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
