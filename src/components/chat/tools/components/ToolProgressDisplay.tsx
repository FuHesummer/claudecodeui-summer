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
