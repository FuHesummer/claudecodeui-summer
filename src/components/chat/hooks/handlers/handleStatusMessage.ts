import type { AgentStatusState } from '../../types/types';

interface StatusActions {
  setAgentStatusState: (state: AgentStatusState | null) => void;
}

/**
 * Handles SDK-level status messages (distinct from claude-status WS type).
 * Updates independent agentStatusState — does NOT modify chatMessages.
 */
export function handleStatusMessage(
  data: Record<string, any>,
  actions: StatusActions,
): void {
  const text = data?.message || data?.status || '';
  if (!text) return;

  actions.setAgentStatusState({
    text: String(text),
    isActive: true,
    timestamp: Date.now(),
  });
}
