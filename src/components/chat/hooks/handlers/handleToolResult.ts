import type { Dispatch, SetStateAction } from 'react';
import type { ChatMessage } from '../../types/types';

interface ToolResultActions {
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
}

/**
 * Handles user role messages containing tool_result parts.
 * Routes results to normal tool cards or subagent child tools.
 */
export function handleToolResult(
  data: Record<string, any>,
  rawData: Record<string, any> | null,
  actions: ToolResultActions,
): void {
  const messageData = data?.message || data;
  const structuredMessageData =
    messageData && typeof messageData === 'object' ? messageData : null;
  const { setChatMessages } = actions;

  if (!structuredMessageData) return;
  if (structuredMessageData.role !== 'user' || !Array.isArray(structuredMessageData.content)) return;

  const parentToolUseId = rawData?.parentToolUseId;

  structuredMessageData.content.forEach((part: any) => {
    if (part.type !== 'tool_result') return;

    setChatMessages((previous) =>
      previous.map((message) => {
        // Handle child tool results (route to parent's subagentState)
        if (parentToolUseId && message.toolId === parentToolUseId && message.isSubagentContainer) {
          return {
            ...message,
            subagentState: {
              ...message.subagentState!,
              childTools: message.subagentState!.childTools.map((child) => {
                if (child.toolId === part.tool_use_id) {
                  return {
                    ...child,
                    toolResult: {
                      content: part.content,
                      isError: part.is_error,
                      timestamp: new Date(),
                    },
                  };
                }
                return child;
              }),
            },
          };
        }

        // Handle normal tool results (including parent Task tool completion)
        if (message.isToolUse && message.toolId === part.tool_use_id) {
          const result = {
            ...message,
            toolResult: {
              content: part.content,
              isError: part.is_error,
              timestamp: new Date(),
            },
          };
          // Mark subagent as complete when parent Task receives its result
          if (message.isSubagentContainer && message.subagentState) {
            result.subagentState = {
              ...message.subagentState,
              isComplete: true,
            };
          }
          return result;
        }
        return message;
      }),
    );
  });
}
