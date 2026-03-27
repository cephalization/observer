import { AlertCircle, ArrowRightLeft, CheckCircle2, LoaderCircle } from "lucide-react";

import type { ProxyStatus } from "../../../shared/types";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const iconByState = {
  error: AlertCircle,
  ready: CheckCircle2,
  starting: LoaderCircle,
  stopped: ArrowRightLeft,
};

export const ConnectionStatus = ({
  phoenixUrl,
  proxyStatus,
}: {
  phoenixUrl?: string;
  proxyStatus?: ProxyStatus;
}) => {
  const state = proxyStatus?.state ?? "stopped";
  const Icon = iconByState[state];

  return (
    <div className="flex items-center gap-2 text-sm text-[color:var(--muted-foreground)]">
      <Icon className={`h-4 w-4 ${state === "starting" ? "animate-spin" : ""}`} />
      <span className="min-w-0 truncate">{phoenixUrl ?? "No Phoenix project selected"}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="cursor-default">proxied</Badge>
        </TooltipTrigger>
        <TooltipContent>
          All Phoenix REST calls and OTEL trace exports are proxied through the Electron main
          process.
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
