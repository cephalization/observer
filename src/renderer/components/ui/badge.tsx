import * as React from "react";

import { cn } from "@/lib/cn";

export const Badge = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-[color:var(--muted-foreground)]",
      className,
    )}
    {...props}
  />
);
