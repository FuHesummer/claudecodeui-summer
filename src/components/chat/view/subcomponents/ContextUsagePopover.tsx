import { useState } from 'react';

interface ContextUsagePopoverProps {
  used: number;
  total: number;
  maxTokens: number;
  onClose: () => void;
  onMaxChange: (newMax: number) => void;
}

const PRESETS = [128000, 160000, 200000];

export default function ContextUsagePopover({
  used, total, maxTokens, onClose, onMaxChange,
}: ContextUsagePopoverProps) {
  const [customValue, setCustomValue] = useState(String(maxTokens));
  const free = Math.max(0, maxTokens - used);
  const pct = maxTokens > 0 ? Math.round((used / maxTokens) * 100) : 0;
  const exceedsBackend = maxTokens > total;

  return (
    <div className="absolute bottom-full right-0 z-50 mb-2 w-72 rounded-lg border border-border bg-popover p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-medium">Context Window</h4>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
      </div>

      <div className="space-y-1.5 text-xs text-muted-foreground">
        <div className="flex justify-between"><span>Used:</span><span>{used.toLocaleString()} tokens</span></div>
        <div className="flex justify-between"><span>Max:</span><span>{maxTokens.toLocaleString()} tokens</span></div>
        <div className="flex justify-between"><span>Free:</span><span>{free.toLocaleString()} tokens</span></div>
      </div>

      <div className="my-3 flex h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(pct, 100)}%`,
            backgroundColor: pct >= 90 ? 'hsl(var(--context-red))' : pct >= 50 ? 'hsl(var(--context-yellow))' : 'hsl(var(--context-green))',
          }}
        />
      </div>
      <div className="text-center text-xs text-muted-foreground">{pct}%</div>

      {exceedsBackend && (
        <div className="mt-2 rounded bg-orange-50 p-2 text-xs text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">
          Setting ({maxTokens.toLocaleString()}) exceeds backend limit ({total.toLocaleString()})
        </div>
      )}

      <div className="mt-3">
        <label className="text-xs font-medium text-foreground">Max tokens</label>
        <div className="mt-1 flex gap-1">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => { onMaxChange(p); setCustomValue(String(p)); }}
              className={`rounded px-2 py-1 text-xs ${maxTokens === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
            >
              {(p / 1000)}K
            </button>
          ))}
        </div>
        <input
          type="number"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          onBlur={() => {
            const v = parseInt(customValue);
            if (v > 0) onMaxChange(v);
          }}
          className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-xs"
          placeholder="Custom value"
        />
      </div>
    </div>
  );
}
