import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RateLimitState } from '../../types/types';

interface RateLimitBannerProps {
  rateLimitState: RateLimitState | null;
  onExpired?: () => void;
}

/**
 * Amber floating banner with countdown timer for rate limits.
 * Auto-disappears when countdown reaches zero.
 */
const RateLimitBanner = memo(({ rateLimitState, onExpired }: RateLimitBannerProps) => {
  const { t } = useTranslation('chat');
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!rateLimitState?.isLimited || !rateLimitState.startedAt || !rateLimitState.retryAfterMs) {
      setRemainingMs(0);
      return;
    }

    const updateRemaining = () => {
      const elapsed = Date.now() - rateLimitState.startedAt!;
      const remaining = Math.max(0, rateLimitState.retryAfterMs! - elapsed);
      setRemainingMs(remaining);
      if (remaining <= 0) {
        onExpired?.();
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [rateLimitState, onExpired]);

  if (!rateLimitState?.isLimited || remainingMs <= 0) return null;

  const secondsRemaining = Math.ceil(remainingMs / 1000);

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-4 z-50 flex justify-center">
      <div className="pointer-events-auto rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-2 shadow-lg dark:border-amber-600/40 dark:bg-amber-900/80">
        <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
          <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            {t('rateLimit.message', {
              seconds: secondsRemaining,
              defaultValue: `Rate limited, retrying in ${secondsRemaining}s...`,
            })}
          </span>
        </div>
      </div>
    </div>
  );
});

RateLimitBanner.displayName = 'RateLimitBanner';
export default RateLimitBanner;
