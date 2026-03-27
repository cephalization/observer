import { Braces, Clock3, GitBranch, Logs, TriangleAlert } from "lucide-react";

import type { SpanRecord, TraceRecord } from "../../../shared/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const formatDuration = (value?: number) => (value ? `${Math.round(value)} ms` : "n/a");

const SpanItem = ({ span, depth }: { span: SpanRecord; depth: number }) => (
  <div className="rounded-lg border bg-background/40 p-3" style={{ marginLeft: `${depth * 16}px` }}>
    <div className="flex flex-wrap items-center gap-2">
      <p className="font-medium">{span.name}</p>
      <Badge variant="secondary">{span.spanKind ?? "SPAN"}</Badge>
      <Badge variant={span.statusCode === "ERROR" ? "destructive" : "outline"}>
        {span.statusCode ?? "UNSET"}
      </Badge>
    </div>
    <div className="mt-2 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
      <p className="flex items-center gap-2"><Clock3 className="size-3.5" />{formatDuration(span.durationMs)}</p>
      <p className="flex items-center gap-2"><GitBranch className="size-3.5" />{span.spanId}</p>
      <p className="flex items-center gap-2"><Braces className="size-3.5" />{Object.keys(span.attributes ?? {}).length} attrs</p>
    </div>
    {span.statusMessage ? (
      <p className="mt-2 flex items-center gap-2 text-xs text-red-400"><TriangleAlert className="size-3.5" />{span.statusMessage}</p>
    ) : null}
  </div>
);

const buildSpanTree = (spans: SpanRecord[]) => {
  const byParent = new Map<string | null, SpanRecord[]>();

  for (const span of spans) {
    const key = span.parentSpanId ?? null;
    const bucket = byParent.get(key) ?? [];
    bucket.push(span);
    byParent.set(key, bucket);
  }

  const visit = (parentId: string | null, depth = 0): Array<{ span: SpanRecord; depth: number }> => {
    const children = byParent.get(parentId) ?? [];
    return children.flatMap((span) => [{ span, depth }, ...visit(span.spanId, depth + 1)]);
  };

  return visit(null);
};

export const TraceDetail = ({
  trace,
  spans,
  isLoading,
}: {
  trace: TraceRecord | null;
  spans: SpanRecord[];
  isLoading: boolean;
}) => {
  const spanTree = buildSpanTree(spans);

  return (
    <Card className="min-h-[20rem]">
      <CardHeader>
        <CardTitle>Trace detail</CardTitle>
        <CardDescription>
          Inspect the selected trace&apos;s spans, latency, and status before sending it to chat.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!trace ? (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            Pick a trace row to inspect its spans and attributes.
          </div>
        ) : null}
        {trace ? (
          <div className="rounded-lg border bg-background/40 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{trace.rootSpanName ?? trace.traceId}</p>
              <Badge variant={trace.statusCode === "ERROR" ? "destructive" : "outline"}>
                {trace.statusCode ?? "UNSET"}
              </Badge>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
              <p className="flex items-center gap-2"><Clock3 className="size-3.5" />{formatDuration(trace.latencyMs)}</p>
              <p className="flex items-center gap-2"><GitBranch className="size-3.5" />{trace.traceId}</p>
              <p className="flex items-center gap-2"><Logs className="size-3.5" />{spans.length} spans</p>
            </div>
          </div>
        ) : null}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : null}
        {!isLoading && spanTree.length > 0 ? (
          <div className="max-h-[24rem] space-y-3 overflow-auto pr-1">
            {spanTree.map(({ span, depth }) => (
              <SpanItem key={span.spanId} span={span} depth={depth} />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
