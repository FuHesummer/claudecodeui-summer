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
