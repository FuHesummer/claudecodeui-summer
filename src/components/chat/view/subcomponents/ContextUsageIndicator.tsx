import { useState } from 'react';
import ContextUsagePopover from './ContextUsagePopover';

interface ContextUsageIndicatorProps {
  used: number;
  total: number;
}

function getColor(pct: number): string {
  if (pct >= 90) return 'hsl(var(--context-red))';
  if (pct >= 75) return 'hsl(var(--context-orange))';
  if (pct >= 50) return 'hsl(var(--context-yellow))';
  return 'hsl(var(--context-green))';
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function ContextUsageIndicator({ used, total }: ContextUsageIndicatorProps) {
  const [showPopover, setShowPopover] = useState(false);
  const maxTokens = parseInt(localStorage.getItem('contextWindowSize') || '') || total;
  const effectiveMax = Math.min(maxTokens, total);
  const pct = effectiveMax > 0 ? Math.round((used / effectiveMax) * 100) : 0;
  const color = getColor(pct);

  return (
    <div className="relative">
      <button
        onClick={() => setShowPopover(!showPopover)}
        className="flex items-center gap-1.5 rounded-md border border-border/40 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/50"
        title="Context window usage"
      >
        <span style={{ color }}>{pct}%</span>
        <div className="flex h-1.5 w-10 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
          />
        </div>
        <span className="hidden sm:inline">
          {formatTokens(used)} / {formatTokens(effectiveMax)}
        </span>
      </button>

      {showPopover && (
        <ContextUsagePopover
          used={used}
          total={total}
          maxTokens={maxTokens}
          onClose={() => setShowPopover(false)}
          onMaxChange={(newMax) => {
            localStorage.setItem('contextWindowSize', String(newMax));
          }}
        />
      )}
    </div>
  );
}
