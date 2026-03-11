import type { Dispatch, SetStateAction } from 'react';
import type { ChatMessage } from '../../types/types';
import { decodeHtmlEntities, formatUsageLimitText } from '../../utils/chatFormatting';

interface AssistantActions {
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
}

/**
 * Handles assistant role messages with content arrays (tool_use + text parts).
 * Extracted from the existing claude-response handler.
 */
export function handleAssistantMessage(
  data: Record<string, any>,
  rawData: Record<string, any> | null,
  actions: AssistantActions,
): void {
  const messageData = data?.message || data;
  const structuredMessageData =
    messageData && typeof messageData === 'object' ? messageData : null;
  const { setChatMessages } = actions;

  if (!structuredMessageData) return;

  if (Array.isArray(structuredMessageData.content)) {
    const parentToolUseId = rawData?.parentToolUseId;

    structuredMessageData.content.forEach((part: any) => {
      if (part.type === 'tool_use') {
        const toolInput = part.input ? JSON.stringify(part.input, null, 2) : '';

        // Check if this is a child tool from a subagent
        if (parentToolUseId) {
          setChatMessages((previous) =>
            previous.map((message) => {
              if (message.toolId === parentToolUseId && message.isSubagentContainer) {
                const childTool = {
                  toolId: part.id,
                  toolName: part.name,
                  toolInput: part.input,
                  toolResult: null,
                  timestamp: new Date(),
                };
                const existingChildren = message.subagentState?.childTools || [];
                return {
                  ...message,
                  subagentState: {
                    childTools: [...existingChildren, childTool],
                    currentToolIndex: existingChildren.length,
                    isComplete: false,
                  },
                };
              }
              return message;
            }),
          );
          return;
        }

        // Check if this is a Task tool (subagent container)
        const isSubagentContainer = part.name === 'Task';

        setChatMessages((previous) => [
          ...previous,
          {
            type: 'assistant',
            content: '',
            timestamp: new Date(),
            isToolUse: true,
            toolName: part.name,
            toolInput,
            toolId: part.id,
            toolResult: null,
            isSubagentContainer,
            subagentState: isSubagentContainer
              ? { childTools: [], currentToolIndex: -1, isComplete: false }
              : undefined,
          },
        ]);
        return;
      }

      if (part.type === 'text' && part.text?.trim()) {
        let content = decodeHtmlEntities(part.text);
        content = formatUsageLimitText(content);
        setChatMessages((previous) => [
          ...previous,
          {
            type: 'assistant',
            content,
            timestamp: new Date(),
          },
        ]);
      }
    });
  } else if (
    structuredMessageData &&
    typeof structuredMessageData.content === 'string' &&
    structuredMessageData.content.trim()
  ) {
    let content = decodeHtmlEntities(structuredMessageData.content);
    content = formatUsageLimitText(content);
    setChatMessages((previous) => [
      ...previous,
      {
        type: 'assistant',
        content,
        timestamp: new Date(),
      },
    ]);
  }
}
