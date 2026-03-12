import type { Dispatch, SetStateAction } from 'react';
import type { ChatMessage } from '../../types/types';

interface TaskLifecycleActions {
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
}

/**
 * Handles agent/sub-task lifecycle events:
 * task_started, task_progress, task_notification.
 */
export function handleTaskLifecycle(
  data: Record<string, any>,
  subType: string,
  actions: TaskLifecycleActions,
): void {
  const taskId = data?.task_id;
  if (!taskId) return;

  const { setChatMessages } = actions;

  switch (subType) {
    case 'task_started': {
      const description = data.description || data.prompt || '';
      const modelName = data.model || data.modelName || '';

      // Find an existing SubagentContainer that doesn't yet have a taskId
      // and assign this taskId to it, or create a new notification
      setChatMessages((prev) => {
        const updated = [...prev];
        // Try to find unbound subagent container
        const idx = updated.findIndex(
          (msg) => msg.isSubagentContainer && msg.subagentState && !msg.subagentState.taskId,
        );
        if (idx >= 0) {
          const existing = updated[idx].subagentState!;
          updated[idx] = {
            ...updated[idx],
            subagentState: {
              ...existing,
              taskId,
              description: description || existing.description,
              modelName: modelName || undefined,
              elapsedMs: 0,
              toolCount: 0,
            },
          };
          return updated;
        }
        // No unbound container — just log it
        console.debug('[task_started] No matching container for', taskId);
        return prev;
      });
      break;
    }

    case 'task_progress': {
      const progressContent = typeof data.content === 'string' ? data.content : '';
      if (!progressContent) return;

      setChatMessages((prev) =>
        prev.map((msg): ChatMessage => {
          const state = msg.subagentState;
          if (msg.isSubagentContainer && state && state.taskId === taskId) {
            const existing = state.progressLog || [];
            return {
              ...msg,
              subagentState: {
                ...state,
                progressLog: [...existing, progressContent],
              },
            };
          }
          return msg;
        }),
      );
      break;
    }

    case 'task_notification': {
      const status = data.status || 'completed';
      const isComplete = status === 'completed' || status === 'done';

      setChatMessages((prev) =>
        prev.map((msg): ChatMessage => {
          const state = msg.subagentState;
          if (msg.isSubagentContainer && state && state.taskId === taskId) {
            return {
              ...msg,
              subagentState: {
                ...state,
                isComplete,
                toolCount: state.childTools.length,
              },
            };
          }
          return msg;
        }),
      );
      break;
    }
  }
}
