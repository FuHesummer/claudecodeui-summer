import type { RateLimitState } from '../../types/types';

interface RateLimitActions {
  setRateLimitState: (state: RateLimitState | null) => void;
}

/**
 * Handles rate limit events.
 * Sets rate limit state with countdown timer info.
 */
export function handleRateLimit(
  data: Record<string, any>,
  actions: RateLimitActions,
): void {
  const retryAfterMs = data?.retry_after_ms;
  const message = data?.message || 'Rate limited';

  actions.setRateLimitState({
    isLimited: true,
    retryAfterMs: typeof retryAfterMs === 'number' ? retryAfterMs : 30000,
    message: String(message),
    startedAt: Date.now(),
  });
}
