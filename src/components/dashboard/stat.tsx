import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function Stat({
  label, value, hint, icon, trend, className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  trend?: { value: number; label?: string };
  className?: string;
}) {
  return (
    <Card className={cn("lift hairline p-5", className)}>
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        {icon}
      </div>
      <div className="mt-2 font-display text-3xl font-semibold tabular-nums">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
      {trend ? (
        <div className={cn("mt-1 text-xs", trend.value >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
          {trend.value >= 0 ? "+" : ""}{trend.value}% {trend.label ?? "vs last period"}
        </div>
      ) : null}
    </Card>
  );
}
