import { RefreshCw } from "lucide-react";

import type { TraceRecord } from "../../../shared/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";

const formatLatency = (value?: number) => {
  if (!value) {
    return "n/a";
  }

  return `${Math.round(value)} ms`;
};

export const TraceList = ({
  traces,
  selectedTraceIds,
  isLoading,
  onToggleTrace,
  onAnalyze,
  onRefresh,
}: {
  traces: TraceRecord[];
  selectedTraceIds: string[];
  isLoading: boolean;
  onToggleTrace: (traceId: string) => void;
  onAnalyze: () => void;
  onRefresh: () => void;
}) => (
  <Card className="h-full overflow-hidden">
    <CardHeader className="border-b border-white/10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <CardTitle>Live Phoenix traces</CardTitle>
          <CardDescription>
            Poll Phoenix through the main-process proxy, then promote selected traces into chat
            context.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={onAnalyze} disabled={selectedTraceIds.length === 0}>
            Analyze {selectedTraceIds.length > 0 ? `(${selectedTraceIds.length})` : ""}
          </Button>
        </div>
      </div>
    </CardHeader>
    <CardContent className="p-0">
      <div className="max-h-[calc(100vh-20rem)] overflow-auto">
        <div className="grid grid-cols-[32px_1.4fr_0.8fr_0.8fr_0.6fr] gap-3 border-b border-white/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
          <span></span>
          <span>Trace</span>
          <span>Started</span>
          <span>Status</span>
          <span>Latency</span>
        </div>
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div
                className="grid grid-cols-[32px_1.4fr_0.8fr_0.8fr_0.6fr] gap-3 px-5 py-4"
                key={index}
              >
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))
          : traces.map((trace) => (
              <label
                className="grid cursor-pointer grid-cols-[32px_1.4fr_0.8fr_0.8fr_0.6fr] gap-3 border-b border-white/5 px-5 py-4 text-sm hover:bg-white/3"
                key={trace.traceId}
              >
                <Checkbox
                  checked={selectedTraceIds.includes(trace.traceId)}
                  onCheckedChange={() => onToggleTrace(trace.traceId)}
                />
                <div className="min-w-0">
                  <p className="truncate font-medium">{trace.rootSpanName ?? trace.traceId}</p>
                  <p className="truncate text-xs text-[color:var(--muted-foreground)]">
                    {trace.traceId}
                  </p>
                </div>
                <span className="text-[color:var(--muted-foreground)]">
                  {trace.startTime ? new Date(trace.startTime).toLocaleTimeString() : "n/a"}
                </span>
                <div>
                  <Badge>{trace.statusCode ?? "unknown"}</Badge>
                </div>
                <span className="text-[color:var(--muted-foreground)]">
                  {formatLatency(trace.latencyMs)}
                </span>
              </label>
            ))}
        {!isLoading && traces.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-[color:var(--muted-foreground)]">
            No traces yet. Make sure the active Phoenix project is reachable through the proxy.
          </div>
        ) : null}
      </div>
    </CardContent>
  </Card>
);
