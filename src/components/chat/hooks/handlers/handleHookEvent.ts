import type { Dispatch, SetStateAction } from 'react';
import type { ChatMessage } from '../../types/types';

interface HookEventActions {
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
}

/**
 * Handles hook_started and hook_progress SDK messages.
 * Creates inline hook event messages in the chat.
 */
export function handleHookEvent(
  data: Record<string, any>,
  subType: string,
  actions: HookEventActions,
): void {
  const hookName = data?.hook_name || data?.hookName || 'hook';
  const content = data?.message || data?.output || '';

  actions.setChatMessages((prev) => [
    ...prev,
    {
      type: 'assistant',
      isHookEvent: true,
      hookName: String(hookName),
      content: String(content),
      timestamp: new Date(),
    },
  ]);
}
