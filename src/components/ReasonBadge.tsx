interface ReasonBadgeProps {
  reason: string;
}

export function ReasonBadge({ reason }: ReasonBadgeProps) {
  const formatReason = (reason: string) => {
    return reason
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-md">
      {formatReason(reason)}
    </span>
  );
}