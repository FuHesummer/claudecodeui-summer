import type { CostInfo } from '../../types/types';

interface ResultActions {
  setTokenBudget: (budget: Record<string, unknown> | null) => void;
  setCostInfo: (info: CostInfo | null) => void;
}

/**
 * Handles result messages with cost/usage extraction.
 * Updates token budget (existing) and cost info (new).
 */
export function handleResult(
  data: Record<string, any>,
  actions: ResultActions,
): void {
  // Unwrap the message wrapper if present (transformMessage may nest it)
  const resultData = data?.message || data;
  if (!resultData) return;

  const { setCostInfo } = actions;

  // Extract cost info from result
  const totalCostUsd = resultData.total_cost_usd ?? resultData.costUsd;
  const durationMs = resultData.duration_ms ?? resultData.durationMs;
  const modelUsage = resultData.modelUsage;

  if (modelUsage) {
    const modelKey = Object.keys(modelUsage)[0];
    const modelData = modelUsage[modelKey];

    if (modelData) {
      const inputTokens = modelData.cumulativeInputTokens || modelData.inputTokens || 0;
      const outputTokens = modelData.cumulativeOutputTokens || modelData.outputTokens || 0;

      setCostInfo({
        totalCostUsd: typeof totalCostUsd === 'number' ? totalCostUsd : undefined,
        inputTokens,
        outputTokens,
        durationMs: typeof durationMs === 'number' ? durationMs : undefined,
        model: modelKey,
      });
    }
  } else if (resultData._streamUsage) {
    // Fallback: use usage stats captured from message_delta stream events
    const streamUsage = resultData._streamUsage;
    setCostInfo({
      totalCostUsd: typeof totalCostUsd === 'number' ? totalCostUsd : undefined,
      inputTokens: streamUsage.inputTokens || 0,
      outputTokens: streamUsage.outputTokens || 0,
      durationMs: typeof durationMs === 'number' ? durationMs : undefined,
      model: undefined,
    });
  }

  // NOTE: token budget extraction is still handled in the main for-await loop
  // in claude-sdk.js (server-side), which sends a separate 'token-budget' message.
  // This handler is for client-side cost info display only.
}
