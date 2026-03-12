import { memo, useState, useEffect, useRef } from 'react';
import { Markdown } from './Markdown';

interface ThinkingStreamBlockProps {
  content: string;
  isStreaming: boolean;
  durationMs?: number;
}

/**
 * Renders a thinking block — collapsed by default with toggle.
 * Shows 💭 Thinking · duration ▶ as a compact clickable header.
 * While streaming, auto-expands so the user can follow along.
 */
const ThinkingStreamBlock = memo(({ content, isStreaming, durationMs }: ThinkingStreamBlockProps) => {
  // Auto-expand while actively streaming, collapse once done
  const [expanded, setExpanded] = useState(isStreaming);
  const [showAllLines, setShowAllLines] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const wasStreamingRef = useRef(isStreaming);

  // When streaming starts, auto-expand; when streaming stops, auto-collapse
  useEffect(() => {
    if (isStreaming && !wasStreamingRef.current) {
      setExpanded(true);
    } else if (!isStreaming && wasStreamingRef.current) {
      setExpanded(false);
    }
    wasStreamingRef.current = isStreaming;
  }, [isStreaming]);

  // Auto-scroll to bottom during streaming
  useEffect(() => {
    if (isStreaming && expanded && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, isStreaming, expanded]);

  const durationStr = durationMs
    ? `${(durationMs / 1000).toFixed(1)}s`
    : isStreaming ? '...' : '';

  const lines = (content || '').split('\n');
  const isLong = lines.length > 10;
  const truncatedContent = showAllLines || !isLong ? content : lines.slice(0, 10).join('\n');

  return (
    <div className="my-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
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
        <div
          ref={contentRef}
          className={`mt-1 max-h-64 overflow-y-auto border-l-2 pl-3 ${
            isStreaming
              ? 'border-purple-400 dark:border-purple-500'
              : 'border-muted-foreground/20'
          }`}
        >
          <div className="text-sm italic text-muted-foreground">
            <Markdown className="prose prose-sm prose-gray max-w-none dark:prose-invert">
              {truncatedContent || ''}
            </Markdown>
            {isStreaming && (
              <span className="inline-block h-4 w-0.5 animate-pulse bg-purple-500 dark:bg-purple-400" />
            )}
          </div>
          {isLong && !showAllLines && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowAllLines(true); }}
              className="mt-1 text-xs text-primary hover:underline"
            >
              Show {lines.length - 10} more lines
            </button>
          )}
          {isLong && showAllLines && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowAllLines(false); }}
              className="mt-1 text-xs text-primary hover:underline"
            >
              Show less
            </button>
          )}
        </div>
      )}
    </div>
  );
});

ThinkingStreamBlock.displayName = 'ThinkingStreamBlock';
export default ThinkingStreamBlock;
