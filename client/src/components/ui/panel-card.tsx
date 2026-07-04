interface PanelCardProps {
  title: string;
  desc?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function PanelCard({ title, desc, icon: Icon, iconBg, iconColor, action, children, className = "", bodyClassName = "" }: PanelCardProps) {
  return (
    <div className={`rounded-2xl border border-border/60 bg-card overflow-hidden ${className}`}>
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-muted/20">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate">{title}</h2>
          {desc && <p className="text-xs text-muted-foreground truncate">{desc}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      <div className={`p-6 ${bodyClassName}`}>{children}</div>
    </div>
  );
}
