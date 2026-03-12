export default function CompactBoundaryDivider() {
  return (
    <div className="my-3 flex items-center gap-3" role="separator" aria-label="Context compacted">
      <div className="h-px flex-1 bg-border/60" />
      <span className="whitespace-nowrap text-xs text-muted-foreground">
        🗜 Context Compacted
      </span>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  );
}
