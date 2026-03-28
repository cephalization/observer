import { RefreshCw } from "lucide-react";

import type { TraceFilters, TraceRecord } from "../../../shared/types";
import { TraceFiltersBar } from "@/components/traces/trace-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";

const formatLatency = (value?: number) => (value ? `${Math.round(value)} ms` : "n/a");

const loadingRows = Array.from({ length: 6 });

export const TraceList = ({
  traces,
  selectedTraceIds,
  activeTraceId,
  isInitialLoading,
  isRefreshing,
  hasMore,
  isFetchingNextPage,
  error,
  filters,
  phoenixProjectNames,
  onChangeFilters,
  onToggleTrace,
  onOpenTrace,
  onAnalyze,
  onLoadMore,
  onRefresh,
}: {
  traces: TraceRecord[];
  selectedTraceIds: string[];
  activeTraceId: string | null;
  isInitialLoading: boolean;
  isRefreshing: boolean;
  hasMore: boolean;
  isFetchingNextPage: boolean;
  error?: string | null;
  filters: TraceFilters;
  phoenixProjectNames: string[];
  onChangeFilters: (filters: TraceFilters) => void;
  onToggleTrace: (traceId: string) => void;
  onOpenTrace: (traceId: string) => void;
  onAnalyze: () => void;
  onLoadMore: () => void;
  onRefresh: () => void;
}) => (
  <Card className="flex h-full min-h-0 flex-col overflow-hidden py-4">
    <CardHeader className="border-b border-white/8 pb-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <CardTitle>Live Phoenix traces</CardTitle>
          <CardDescription>
            Poll Phoenix through the main-process proxy, inspect span trees, then promote selected traces into chat context.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button size="sm" onClick={onAnalyze} disabled={selectedTraceIds.length === 0}>
            Analyze {selectedTraceIds.length > 0 ? `(${selectedTraceIds.length})` : ""}
          </Button>
        </div>
      </div>
    </CardHeader>
    <TraceFiltersBar
      filters={filters}
      phoenixProjectNames={phoenixProjectNames}
      onChange={onChangeFilters}
    />
    <CardContent className="flex min-h-0 flex-1 flex-col p-0">
      {error ? (
        <div className="border-b border-white/8 bg-red-500/10 px-6 py-3 text-sm text-red-300">{error}</div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="grid grid-cols-[32px_1.4fr_0.8fr_0.8fr_0.6fr] gap-3 border-b border-white/8 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <span></span>
          <span>Trace</span>
          <span>Started</span>
          <span>Status</span>
          <span>Latency</span>
        </div>
        {isInitialLoading
          ? loadingRows.map((_, index) => (
              <div className="grid grid-cols-[32px_1.4fr_0.8fr_0.8fr_0.6fr] gap-3 px-6 py-4" key={index}>
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))
          : traces.map((trace) => (
              <div
                className={`grid grid-cols-[32px_1.4fr_0.8fr_0.8fr_0.6fr] gap-3 border-b border-white/6 px-6 py-4 text-sm ${activeTraceId === trace.traceId ? "bg-accent/35" : "hover:bg-accent/15"}`}
                key={trace.traceId}
              >
                <Checkbox
                  checked={selectedTraceIds.includes(trace.traceId)}
                  onCheckedChange={() => onToggleTrace(trace.traceId)}
                />
                <button className="min-w-0 text-left" onClick={() => onOpenTrace(trace.traceId)} type="button">
                  <p className="truncate font-medium">{trace.rootSpanName ?? trace.traceId}</p>
                  <p className="truncate text-xs text-muted-foreground">{trace.traceId}</p>
                </button>
                <span className="text-muted-foreground">
                  {trace.startTime ? new Date(trace.startTime).toLocaleTimeString() : "n/a"}
                </span>
                <div>
                  <Badge variant={trace.statusCode === "ERROR" ? "destructive" : "outline"}>
                    {trace.statusCode ?? "unknown"}
                  </Badge>
                </div>
                <span className="text-muted-foreground">{formatLatency(trace.latencyMs)}</span>
              </div>
            ))}
        {!isInitialLoading && traces.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            No traces match the current filters. Try changing the sort, status, or search query.
          </div>
        ) : null}
        {hasMore ? (
          <div className="flex justify-center border-t border-white/6 px-6 py-4">
            <Button size="sm" variant="outline" onClick={onLoadMore}>
              {isFetchingNextPage ? "Loading more..." : "Load more traces"}
            </Button>
          </div>
        ) : null}
      </div>
    </CardContent>
  </Card>
);
