import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ChatMessage } from '../../types/types';
import { decodeHtmlEntities } from '../../utils/chatFormatting';

/** Flush interval for streaming text — ~2 frames at 60fps. */
export const STREAM_FLUSH_INTERVAL_MS = 33;

interface StreamState {
  streamBufferRef: MutableRefObject<string>;
  streamTimerRef: MutableRefObject<number | null>;
}

interface StreamActions {
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  appendStreamingChunk: (chunk: string, newline?: boolean) => void;
  finalizeStreamingMessage: () => void;
}

/**
 * Handles all stream events: content_block_start, content_block_delta,
 * content_block_stop, message_start, message_delta, message_stop.
 */
export function handleStreamEvent(
  data: Record<string, any>,
  streamState: StreamState,
  actions: StreamActions,
): void {
  const messageData = data?.message || data;
  if (!messageData || typeof messageData !== 'object') return;

  const { streamBufferRef, streamTimerRef } = streamState;
  const { setChatMessages, appendStreamingChunk, finalizeStreamingMessage } = actions;

  switch (messageData.type) {
    // --- Text streaming ---
    case 'content_block_delta': {
      // Text delta
      if (messageData.delta?.text) {
        const decodedText = decodeHtmlEntities(messageData.delta.text);
        streamBufferRef.current += decodedText;
        if (!streamTimerRef.current) {
          streamTimerRef.current = window.setTimeout(() => {
            const chunk = streamBufferRef.current;
            streamBufferRef.current = '';
            streamTimerRef.current = null;
            appendStreamingChunk(chunk, false);
          }, STREAM_FLUSH_INTERVAL_MS);
        }
        return;
      }

      // Thinking delta
      if (messageData.delta?.thinking) {
        const thinkingText = messageData.delta.thinking;
        setChatMessages((prev) => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          const last = updated[lastIndex];
          if (last && last.isThinking && last.isStreaming) {
            updated[lastIndex] = {
              ...last,
              content: (last.content || '') + thinkingText,
            };
          }
          return updated;
        });
        return;
      }

      // Tool input JSON delta
      if (messageData.delta?.partial_json !== undefined) {
        const partialJson = messageData.delta.partial_json;
        setChatMessages((prev) => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          const last = updated[lastIndex];
          if (last && last.isToolUse && last.isToolStarted) {
            const accumulated = (last.toolInput as string || '') + partialJson;
            updated[lastIndex] = { ...last, toolInput: accumulated };
          }
          return updated;
        });
        return;
      }
      break;
    }

    case 'content_block_start': {
      const contentBlock = messageData.content_block;
      if (!contentBlock) break;

      // Thinking block start
      if (contentBlock.type === 'thinking') {
        setChatMessages((prev) => [
          ...prev,
          {
            type: 'assistant',
            content: '',
            timestamp: new Date(),
            isThinking: true,
            isStreaming: true,
          },
        ]);
        return;
      }

      // Tool use block start
      if (contentBlock.type === 'tool_use') {
        setChatMessages((prev) => [
          ...prev,
          {
            type: 'assistant',
            content: '',
            timestamp: new Date(),
            isToolUse: true,
            isToolStarted: true,
            toolName: contentBlock.name,
            toolId: contentBlock.id,
            toolInput: '',
            toolResult: null,
            isSubagentContainer: contentBlock.name === 'Task',
            subagentState: contentBlock.name === 'Task'
              ? { childTools: [], currentToolIndex: -1, isComplete: false }
              : undefined,
          },
        ]);
        return;
      }

      // Text block start — no action needed, text comes via deltas
      break;
    }

    case 'content_block_stop': {
      // Flush any buffered streaming text
      if (streamTimerRef.current) {
        clearTimeout(streamTimerRef.current);
        streamTimerRef.current = null;
      }
      const chunk = streamBufferRef.current;
      streamBufferRef.current = '';
      appendStreamingChunk(chunk, false);
      finalizeStreamingMessage();

      // Finalize tool input: parse accumulated JSON
      setChatMessages((prev) => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        const last = updated[lastIndex];
        if (last && last.isToolUse && last.isToolStarted) {
          let parsedInput = last.toolInput;
          if (typeof parsedInput === 'string' && parsedInput.trim()) {
            try {
              parsedInput = JSON.stringify(JSON.parse(parsedInput), null, 2);
            } catch {
              // Keep as string if not valid JSON
            }
          }
          updated[lastIndex] = { ...last, isToolStarted: false, toolInput: parsedInput };
        }
        // Finalize thinking block
        if (last && last.isThinking && last.isStreaming) {
          const durationMs = last.timestamp ? Date.now() - new Date(last.timestamp).getTime() : undefined;
          updated[lastIndex] = { ...last, isStreaming: false, thinkingDurationMs: durationMs };
        }
        return updated;
      });
      return;
    }

    case 'message_start': {
      // Extract model info if available — store as debug metadata
      console.debug('[message_start]', messageData.message?.model);
      break;
    }

    case 'message_delta': {
      // Extract stop_reason, usage stats
      console.debug('[message_delta]', messageData.delta?.stop_reason, messageData.usage);
      break;
    }

    case 'message_stop': {
      // Mark message sequence complete
      console.debug('[message_stop]');
      break;
    }
  }
}
