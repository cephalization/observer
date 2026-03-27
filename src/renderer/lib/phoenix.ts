import type { SpanRecord, TraceFilters, TraceRecord } from "../../shared/types";

export interface PhoenixProjectSummary {
  id?: string;
  name: string;
}

const fetchJson = async <T>(url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Phoenix request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
};

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
    (startTime && endTime ? new Date(endTime).valueOf() - new Date(startTime).valueOf() : undefined);

  return {
    id: item.id as string | undefined,
    traceId,
    projectName:
      (item.projectName as string | undefined) ??
      (item.project_name as string | undefined) ??
      undefined,
    statusCode:
      (item.statusCode as string | undefined) ?? (item.status_code as string | undefined),
    startTime,
    endTime,
    latencyMs,
    rootSpanName,
    raw: item,
  };
};

const toSpanRecord = (item: Record<string, unknown>): SpanRecord => {
  const context = (item.context as Record<string, unknown> | undefined) ?? {};
  const traceId = (context.trace_id as string | undefined) ?? crypto.randomUUID();
  const spanId =
    (context.span_id as string | undefined) ??
    (item.span_id as string | undefined) ??
    crypto.randomUUID();
  const parentSpanId =
    (item.parent_id as string | undefined | null) ??
    (item.parentId as string | undefined | null) ??
    null;
  const startTime =
    (item.start_time as string | undefined) ?? (item.startTime as string | undefined);
  const endTime = (item.end_time as string | undefined) ?? (item.endTime as string | undefined);

  return {
    id: item.id as string | undefined,
    traceId,
    spanId,
    parentSpanId,
    name: (item.name as string | undefined) ?? "Unnamed span",
    spanKind: (item.span_kind as string | undefined) ?? (item.spanKind as string | undefined),
    statusCode:
      (item.status_code as string | undefined) ?? (item.statusCode as string | undefined),
    statusMessage:
      (item.status_message as string | undefined) ?? (item.statusMessage as string | undefined),
    startTime,
    endTime,
    durationMs:
      startTime && endTime ? new Date(endTime).valueOf() - new Date(startTime).valueOf() : undefined,
    attributes: (item.attributes as Record<string, unknown> | undefined) ?? undefined,
    events: (item.events as Array<Record<string, unknown>> | undefined) ?? undefined,
    raw: item,
  };
};

const sortTraceRecords = (
  traces: TraceRecord[],
  filters?: Pick<TraceFilters, "sort" | "order">,
) => {
  const sortField = filters?.sort ?? "start_time";
  const order = filters?.order ?? "desc";
  const direction = order === "asc" ? 1 : -1;

  return [...traces].sort((left, right) => {
    const leftValue =
      sortField === "latency_ms" ? left.latencyMs ?? 0 : new Date(left.startTime ?? 0).valueOf();
    const rightValue =
      sortField === "latency_ms"
        ? right.latencyMs ?? 0
        : new Date(right.startTime ?? 0).valueOf();

    return (leftValue - rightValue) * direction;
  });
};

export const listPhoenixProjects = async (
  proxyBaseUrl: string,
): Promise<PhoenixProjectSummary[]> => {
  const payload = await fetchJson<{
    data?: Array<{ id?: string; name?: string }>;
  }>(
    `${proxyBaseUrl}/v1/projects?limit=100&include_experiment_projects=true&include_dataset_evaluator_projects=true`,
  );

  return (payload.data ?? []).filter((project) => Boolean(project?.name)).map((project) => ({
    id: project.id,
    name: project.name as string,
  }));
};

export const listTraces = async (
  proxyBaseUrl: string,
  selectedProjectName?: string,
  filters?: Pick<TraceFilters, "sort" | "order">,
) => {
  const projects = await listPhoenixProjects(proxyBaseUrl);
  const selectedProjects =
    selectedProjectName && projects.some((project) => project.name === selectedProjectName)
      ? projects.filter((project) => project.name === selectedProjectName)
      : projects;

  const responses = await Promise.all(
    selectedProjects.map(async (project) => {
      const params = new URLSearchParams({
        limit: projects.length === 1 ? "50" : "20",
        sort: filters?.sort ?? "start_time",
        order: filters?.order ?? "desc",
      });
      const payload = await fetchJson<{ data?: Array<Record<string, unknown>> }>(
        `${proxyBaseUrl}/v1/projects/${encodeURIComponent(project.name)}/traces?${params.toString()}`,
      );

      return (payload.data ?? []).map((trace) => {
        const record = toTraceRecord(trace);
        return {
          ...record,
          projectName: record.projectName ?? project.name,
        };
      });
    }),
  );

  const flattened = responses.reduce<TraceRecord[]>((all, traceGroup) => {
    all.push(...traceGroup);
    return all;
  }, []);

  return sortTraceRecords(flattened, filters).slice(0, 100);
};

export const getTraceSpansForTrace = async (
  proxyBaseUrl: string,
  projectName: string,
  traceId: string,
) => {
  const params = new URLSearchParams({
    trace_ids: traceId,
    limit: "200",
  });
  const payload = await fetchJson<{ data?: Array<Record<string, unknown>> }>(
    `${proxyBaseUrl}/v1/projects/${encodeURIComponent(projectName)}/spans?${params.toString()}`,
  );

  return (payload.data ?? []).map((span) => toSpanRecord(span));
};
