import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { CostInfo } from '../../types/types';

interface CostInfoBarProps {
  costInfo: CostInfo | null;
}

/**
 * Compact cost/duration/model display next to token budget.
 * Format: 💰 $0.05 · 8.2s · sonnet-4
 */
const CostInfoBar = memo(({ costInfo }: CostInfoBarProps) => {
  const { t } = useTranslation('chat');

  if (!costInfo) return null;

  const parts: string[] = [];

  if (costInfo.totalCostUsd !== undefined) {
    parts.push(`$${costInfo.totalCostUsd.toFixed(2)}`);
  }

  if (costInfo.durationMs !== undefined) {
    const seconds = (costInfo.durationMs / 1000).toFixed(1);
    parts.push(`${seconds}s`);
  }

  if (costInfo.model) {
    // Extract short model name (e.g., "claude-sonnet-4-20250514" → "sonnet-4")
    const shortModel = costInfo.model.replace(/^claude-/, '').replace(/-\d{8}$/, '');
    parts.push(shortModel);
  }

  if (parts.length === 0) return null;

  return (
    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
      <span>{t('cost.label', { defaultValue: '💰' })}</span>
      <span>{parts.join(' · ')}</span>
    </div>
  );
});

CostInfoBar.displayName = 'CostInfoBar';
export default CostInfoBar;
