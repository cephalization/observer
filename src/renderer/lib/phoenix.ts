import { createClient } from "@arizeai/phoenix-client";
import { getTraces } from "@arizeai/phoenix-client/traces";

import type { TraceRecord } from "../../shared/types";

const toTraceRecord = (item: Record<string, unknown>): TraceRecord => {
  const traceId =
    (item.traceId as string | undefined) ??
    (item.trace_id as string | undefined) ??
    (item.id as string | undefined) ??
    crypto.randomUUID();

  const startTime =
    (item.startTime as string | undefined) ?? (item.start_time as string | undefined);
  const endTime = (item.endTime as string | undefined) ?? (item.end_time as string | undefined);
  const rootSpanName =
    (item.rootSpanName as string | undefined) ??
    (item.root_span_name as string | undefined) ??
    (item.name as string | undefined);
  const latencyMs =
    (item.latencyMs as number | undefined) ??
    (item.latency_ms as number | undefined) ??
    (startTime && endTime
      ? new Date(endTime).valueOf() - new Date(startTime).valueOf()
      : undefined);

  return {
    traceId,
    projectName:
      (item.projectName as string | undefined) ?? (item.project_name as string | undefined),
    statusCode: (item.statusCode as string | undefined) ?? (item.status_code as string | undefined),
    startTime,
    endTime,
    latencyMs,
    rootSpanName,
    raw: item,
  };
};

const getTraceList = (payload: unknown): Record<string, unknown>[] => {
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === "object",
    );
  }

  if (payload && typeof payload === "object") {
    const value = payload as Record<string, unknown>;
    const nested = value.data ?? value.traces ?? value.items;
    if (Array.isArray(nested)) {
      return nested.filter(
        (item): item is Record<string, unknown> => !!item && typeof item === "object",
      );
    }
  }

  return [];
};

export const listTraces = async (proxyBaseUrl: string, projectName: string) => {
  const client = createClient({
    options: {
      baseUrl: proxyBaseUrl,
    },
  });

  const response = await getTraces({
    client,
    project: { projectName },
    limit: 50,
    order: "desc",
  });

  return getTraceList(response.traces).map(toTraceRecord);
};
