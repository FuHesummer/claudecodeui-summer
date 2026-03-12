import type { Dispatch, SetStateAction } from 'react';
import type { AgentStatusState, ChatMessage } from '../../types/types';

interface StatusActions {
  setAgentStatusState: (state: AgentStatusState | null) => void;
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
}

/**
 * Handles SDK-level status messages.
 * Updates agentStatusState AND inserts inline status messages into chat.
 * Deduplicates consecutive identical status messages.
 */
export function handleStatusMessage(
  data: Record<string, any>,
  actions: StatusActions,
): void {
  const text = data?.message || data?.status || '';
  if (!text) return;

  const statusText = String(text);

  // Update status bar state
  actions.setAgentStatusState({
    text: statusText,
    isActive: true,
    timestamp: Date.now(),
  });

  // Insert inline status message (with deduplication)
  actions.setChatMessages((prev) => {
    // Check for duplicate BEFORE marking stale — the last inline status
    // message is still active at this point so we can compare against it.
    const lastInline = [...prev].reverse().find((m) => m.isStatusInline && !m.isStale);
    if (lastInline && lastInline.content === statusText) {
      return prev; // Duplicate — no change needed
    }

    // Mark previous inline status messages as stale
    const updated = prev.map((msg) =>
      msg.isStatusInline && !msg.isStale ? { ...msg, isStale: true } : msg,
    );

    // Remove stale inline status messages older than 5 seconds
    const now = Date.now();
    const cleaned = updated.filter(
      (msg) => !(msg.isStatusInline && msg.isStale && now - new Date(msg.timestamp).getTime() > 5000),
    );

    return [
      ...cleaned,
      {
        type: 'assistant',
        isStatusInline: true,
        content: statusText,
        timestamp: new Date(),
      },
    ];
  });
}
