import { useEffect, useMemo, useState } from "react";

import { Braces, Clock3, GitBranch, Logs, TriangleAlert } from "lucide-react";

import type { SpanRecord, TraceRecord } from "../../../shared/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const formatDuration = (value?: number) => (value ? `${Math.round(value)} ms` : "n/a");

const formatJson = (value: unknown) => JSON.stringify(value, null, 2);

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

const AttributeList = ({ attributes }: { attributes?: Record<string, unknown> }) => {
  const entries = Object.entries(attributes ?? {});

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No attributes on the selected span.</p>;
  }

  return (
    <div className="space-y-3">
      {entries.map(([key, value]) => (
        <div className="rounded-lg border bg-background/30 p-3" key={key}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {key}
          </p>
          <pre className="overflow-auto whitespace-pre-wrap break-all text-xs text-foreground/90">
            {typeof value === "string" ? value : formatJson(value)}
          </pre>
        </div>
      ))}
    </div>
  );
};

const EventList = ({ events }: { events?: Array<Record<string, unknown>> }) => {
  if (!events || events.length === 0) {
    return <p className="text-sm text-muted-foreground">No events on the selected span.</p>;
  }

  return (
    <div className="space-y-3">
      {events.map((event, index) => (
        <div className="rounded-lg border bg-background/30 p-3" key={`${event.name ?? "event"}-${index}`}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {String(event.name ?? `Event ${index + 1}`)}
          </p>
          <pre className="overflow-auto whitespace-pre-wrap break-all text-xs text-foreground/90">
            {formatJson(event)}
          </pre>
        </div>
      ))}
    </div>
  );
};

const TraceSummary = ({
  spanCount,
  trace,
}: {
  spanCount: number;
  trace: TraceRecord;
}) => (
  <div className="rounded-2xl border border-white/8 bg-background/40 p-4">
    <div className="flex min-w-0 items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-[1.05rem] font-semibold">{trace.rootSpanName ?? trace.traceId}</p>
        <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{trace.traceId}</p>
      </div>
      <Badge variant={trace.statusCode === "ERROR" ? "destructive" : "outline"}>
        {trace.statusCode ?? "UNSET"}
      </Badge>
    </div>
    <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
      <p className="flex items-center gap-2">
        <Clock3 className="size-3.5" />
        {formatDuration(trace.latencyMs)}
      </p>
      <p className="flex items-center gap-2">
        <GitBranch className="size-3.5" />
        <span className="font-mono">{trace.id ?? trace.traceId.slice(0, 12)}</span>
      </p>
      <p className="flex items-center gap-2">
        <Logs className="size-3.5" />
        {spanCount} spans
      </p>
    </div>
  </div>
);

const SelectedSpanSummary = ({ span }: { span: SpanRecord }) => (
  <div className="rounded-2xl border border-white/8 bg-background/30 p-4">
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <p className="truncate font-medium">Selected span: {span.name}</p>
      <Badge variant="secondary">{span.spanKind ?? "SPAN"}</Badge>
      <Badge variant={span.statusCode === "ERROR" ? "destructive" : "outline"}>
        {span.statusCode ?? "UNSET"}
      </Badge>
    </div>
    <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{span.spanId}</p>
  </div>
);

const SpanTreeItem = ({
  active,
  depth,
  span,
  onSelect,
}: {
  active: boolean;
  depth: number;
  span: SpanRecord;
  onSelect: (span: SpanRecord) => void;
}) => (
  <button
    className={`w-full rounded-lg border p-3 text-left ${active ? "border-primary bg-primary/8" : "bg-background/40 hover:bg-accent/40"}`}
    onClick={() => onSelect(span)}
    style={{ marginLeft: `${depth * 16}px` }}
    type="button"
  >
    <div className="flex flex-wrap items-center gap-2">
      <p className="font-medium">{span.name}</p>
      <Badge variant="secondary">{span.spanKind ?? "SPAN"}</Badge>
      <Badge variant={span.statusCode === "ERROR" ? "destructive" : "outline"}>
        {span.statusCode ?? "UNSET"}
      </Badge>
    </div>
    <div className="mt-2 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
      <p className="flex items-center gap-2">
        <Clock3 className="size-3.5" />
        {formatDuration(span.durationMs)}
      </p>
      <p className="flex items-center gap-2">
        <GitBranch className="size-3.5" />
        {span.spanId}
      </p>
      <p className="flex items-center gap-2">
        <Braces className="size-3.5" />
        {Object.keys(span.attributes ?? {}).length} attrs
      </p>
    </div>
    {span.statusMessage ? (
      <p className="mt-2 flex items-center gap-2 text-xs text-red-400">
        <TriangleAlert className="size-3.5" />
        {span.statusMessage}
      </p>
    ) : null}
  </button>
);

export const TraceDetail = ({
  trace,
  spans,
  isLoading,
}: {
  trace: TraceRecord | null;
  spans: SpanRecord[];
  isLoading: boolean;
}) => {
  const spanTree = useMemo(() => buildSpanTree(spans), [spans]);
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedSpanId(spanTree[0]?.span.spanId ?? null);
  }, [spanTree, trace?.traceId]);

  const selectedSpan = useMemo(
    () => spans.find((span) => span.spanId === selectedSpanId) ?? spanTree[0]?.span ?? null,
    [selectedSpanId, spanTree, spans],
  );

  return (
    <Card className="flex h-full min-h-[20rem] min-h-0 flex-col overflow-hidden py-4">
      <CardHeader className="border-b border-white/8 pb-4">
        <CardTitle>Trace detail</CardTitle>
        <CardDescription>
          Inspect the selected trace&apos;s spans, attributes, and events before sending it to chat.
        </CardDescription>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-auto p-5 pt-4">
        <div className="space-y-4 pr-1">
        {trace ? (
          <TraceSummary spanCount={spans.length} trace={trace} />
        ) : (
          <div className="rounded-2xl border border-dashed border-white/8 p-6 text-sm text-muted-foreground">
            Pick a trace row to inspect its spans, attributes, and events.
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : null}

        {!isLoading && trace && selectedSpan ? (
          <Tabs className="min-h-0" defaultValue="tree">
            <TabsList>
              <TabsTrigger value="tree">Span tree</TabsTrigger>
              <TabsTrigger value="attributes">Attributes</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
            </TabsList>

            <SelectedSpanSummary span={selectedSpan} />

            <TabsContent value="tree">
              <div className="space-y-3">
                {spanTree.map(({ span, depth }) => (
                  <SpanTreeItem
                    active={span.spanId === selectedSpan.spanId}
                    depth={depth}
                    key={span.spanId}
                    onSelect={(nextSpan) => setSelectedSpanId(nextSpan.spanId)}
                    span={span}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="attributes">
              <AttributeList attributes={selectedSpan.attributes} />
            </TabsContent>

            <TabsContent value="events">
              <EventList events={selectedSpan.events} />
            </TabsContent>
          </Tabs>
        ) : null}
        </div>
      </CardContent>
    </Card>
  );
};
