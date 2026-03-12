import React, { useState, useEffect, useRef } from 'react';
import type { SubagentChildTool } from '../../types/types';
import SubagentToolItem from '../../view/subcomponents/SubagentToolItem';

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
    elapsedMs?: number;
    modelName?: string;
    toolCount?: number;
  };
}

export const SubagentContainer: React.FC<SubagentContainerProps> = ({
  toolInput,
  toolResult: _toolResult,
  subagentState,
}) => {
  const parsedInput = typeof toolInput === 'string' ? (() => {
    try { return JSON.parse(toolInput); } catch { return {}; }
  })() : (toolInput || {});

  const description = parsedInput?.description || subagentState.description || 'Running task';
  const { childTools, isComplete, modelName, elapsedMs } = subagentState;

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
};
