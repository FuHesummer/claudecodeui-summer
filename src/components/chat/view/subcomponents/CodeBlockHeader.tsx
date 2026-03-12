import { useState } from 'react';
import { copyTextToClipboard } from '../../../../utils/clipboard';

interface CodeBlockHeaderProps {
  fileName?: string;
  language?: string;
  code: string;
  onApply?: (filePath: string, content: string) => void;
}

export default function CodeBlockHeader({ fileName, language, code, onApply }: CodeBlockHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleCopy = () => {
    copyTextToClipboard(code).then((success) => {
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    });
  };

  const handleApply = () => {
    if (fileName && onApply) {
      onApply(fileName, code);
      setApplied(true);
      setTimeout(() => setApplied(false), 3000);
    }
  };

  return (
    <div
      className="flex items-center justify-between rounded-t-md border-b border-border/40 bg-muted/50 px-3 py-1.5 text-xs dark:bg-muted/20"
      style={{ borderRadius: 'var(--chat-radius-code, 0.5rem) var(--chat-radius-code, 0.5rem) 0 0' }}
    >
      <div className="flex items-center gap-2">
        {fileName && <span className="font-mono font-medium text-foreground/80">{fileName}</span>}
        {!fileName && language && language !== 'text' && (
          <span className="text-muted-foreground">{language}</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {fileName && onApply && (
          <button
            type="button"
            onClick={handleApply}
            className="rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {applied ? (
              <span className="flex items-center gap-1">
                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Applied
              </span>
            ) : (
              'Apply'
            )}
          </button>
        )}
        <button
          type="button"
          onClick={handleCopy}
          className="rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {copied ? (
            <span className="flex items-center gap-1">
              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Copied
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <svg
                className="h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              Copy
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
