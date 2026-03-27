import * as React from "react";

import { cn } from "@/lib/cn";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    className={cn(
      "flex h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-[color:var(--foreground)] outline-none focus:border-[color:var(--ring)]",
      className,
    )}
    ref={ref}
    {...props}
  />
));

Select.displayName = "Select";
