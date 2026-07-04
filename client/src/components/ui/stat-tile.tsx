import { Skeleton } from "@/components/ui/skeleton";

interface StatTileProps {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | number;
  sub?: string;
  loading?: boolean;
  "data-testid"?: string;
}

export function StatTile({ icon: Icon, iconBg, iconColor, label, value, sub, loading, ...rest }: StatTileProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 hover-elevate transition-all duration-300" {...rest}>
      <div
        className={`absolute -top-6 -right-6 w-20 h-20 rounded-full ${iconBg} opacity-0 group-hover:opacity-60 blur-2xl transition-opacity duration-500`}
        aria-hidden="true"
      />
      <div className="relative">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {loading ? (
          <>
            <Skeleton className="h-8 w-12 mb-1" />
            <Skeleton className="h-3 w-24" />
          </>
        ) : (
          <>
            <div className="text-3xl font-bold tracking-tight">{value}</div>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </>
        )}
        <p className="text-xs font-medium text-muted-foreground/70 mt-3 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}
