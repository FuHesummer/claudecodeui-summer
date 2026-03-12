import type { Dispatch, SetStateAction } from 'react';
import type { ChatMessage } from '../../types/types';

interface CompactBoundaryActions {
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
}

/**
 * Handles compact_boundary SDK messages.
 * Inserts a visual divider into the chat indicating context compaction.
 */
export function handleCompactBoundary(
  _data: Record<string, any>,
  actions: CompactBoundaryActions,
): void {
  actions.setChatMessages((prev) => [
    ...prev,
    {
      type: 'assistant',
      isCompactBoundary: true,
      content: 'Context window compacted',
      timestamp: new Date(),
    },
  ]);
}
