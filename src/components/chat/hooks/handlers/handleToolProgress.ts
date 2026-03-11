import type { Dispatch, SetStateAction } from 'react';
import type { ChatMessage } from '../../types/types';

interface ToolProgressActions {
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
}

/**
 * Handles tool execution progress messages.
 * Appends intermediate output to the matching tool card.
 */
export function handleToolProgress(
  data: Record<string, any>,
  actions: ToolProgressActions,
): void {
  const toolUseId = data?.tool_use_id;
  const content = typeof data?.content === 'string'
    ? data.content
    : typeof data?.output === 'string'
      ? data.output
      : null;

  if (!toolUseId || !content) return;

  const { setChatMessages } = actions;

  setChatMessages((prev) =>
    prev.map((msg) => {
      if (msg.isToolUse && msg.toolId === toolUseId) {
        const existing = msg.toolProgress || [];
        return {
          ...msg,
          toolProgress: [...existing, content],
        };
      }
      return msg;
    }),
  );
}
