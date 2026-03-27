import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/cn";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = ({ className, ...props }: TooltipPrimitive.TooltipContentProps) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      className={cn(
        "z-50 max-w-xs rounded-md border border-white/10 bg-[color:var(--popover)] px-3 py-2 text-xs text-[color:var(--popover-foreground)] shadow-lg",
        className,
      )}
      sideOffset={8}
      {...props}
    />
  </TooltipPrimitive.Portal>
);
