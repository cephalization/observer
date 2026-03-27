import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

import { cn } from "@/lib/cn";

export const Checkbox = ({ className, ...props }: CheckboxPrimitive.CheckboxProps) => (
  <CheckboxPrimitive.Root
    className={cn(
      "peer h-4 w-4 shrink-0 rounded border border-white/20 bg-black/20 data-[state=checked]:border-[color:var(--primary)] data-[state=checked]:bg-[color:var(--primary)]",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-[color:var(--primary-foreground)]">
      <Check className="h-3 w-3" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
);
