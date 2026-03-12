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
