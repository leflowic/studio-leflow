interface EmptyStateProps {
  icon: React.ElementType;
  text: string;
  sub?: string;
  action?: React.ReactNode;
  compact?: boolean;
}

export function EmptyState({ icon: Icon, text, sub, action, compact }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? "py-6" : "py-10"}`}>
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
        <Icon className="w-7 h-7 text-muted-foreground/50" />
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
      {sub && <p className="text-xs text-muted-foreground/70 mt-1">{sub}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
