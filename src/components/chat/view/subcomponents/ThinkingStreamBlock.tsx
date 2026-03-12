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
