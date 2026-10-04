import { cn } from "@/lib/utils";
import * as React from "react";

export function Empty({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-10 text-center", className)}>
      {icon ? <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">{icon}</div> : null}
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
