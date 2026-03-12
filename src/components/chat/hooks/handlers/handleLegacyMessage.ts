import type { Dispatch, SetStateAction } from 'react';
import type { ChatMessage } from '../../types/types';
import { decodeHtmlEntities, formatUsageLimitText } from '../../utils/chatFormatting';

interface LegacyActions {
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
}

/**
 * Fallback handler for messages without a recognized subType.
 * Preserves backward compatibility during rolling updates.
 */
export function handleLegacyMessage(
  data: Record<string, any>,
  _rawData: Record<string, any> | null,
  actions: LegacyActions,
): void {
  const messageData = data?.message || data;
  const structuredMessageData =
    messageData && typeof messageData === 'object' ? messageData : null;

  if (!structuredMessageData) return;

  // Try to detect assistant messages by structure
  if (structuredMessageData.role === 'assistant' || Array.isArray(structuredMessageData.content)) {
    // Guard: skip user role messages (tool results) — they should go through handleToolResult
    if (structuredMessageData.role === 'user') return;

    const { setChatMessages } = actions;

    if (Array.isArray(structuredMessageData.content)) {
      structuredMessageData.content.forEach((part: any) => {
        if (part.type === 'text' && part.text?.trim()) {
          let content = decodeHtmlEntities(part.text);
          content = formatUsageLimitText(content);
          setChatMessages((prev) => [
            ...prev,
            { type: 'assistant', content, timestamp: new Date() },
          ]);
        } else if (part.type === 'tool_use' && part.name) {
          // Handle tool_use parts that may arrive without subType classification
          setChatMessages((prev) => [
            ...prev,
            {
              type: 'assistant',
              content: '',
              timestamp: new Date(),
              isToolUse: true,
              toolName: part.name,
              toolInput: part.input ? JSON.stringify(part.input, null, 2) : '',
              toolId: part.id || `legacy-${Date.now()}`,
            },
          ]);
        }
      });
    } else if (typeof structuredMessageData.content === 'string' && structuredMessageData.content.trim()) {
      let content = decodeHtmlEntities(structuredMessageData.content);
      content = formatUsageLimitText(content);
      actions.setChatMessages((prev) => [
        ...prev,
        { type: 'assistant', content, timestamp: new Date() },
      ]);
    }
    return;
  }

  // Log unrecognized messages for debugging
  console.debug('[legacy] Unhandled message:', structuredMessageData.type, structuredMessageData);
}
