import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import type { Project, SpanRecord, TraceFilters, TraceRecord } from "../../shared/types";
import type { TracePage } from "../lib/phoenix";
import { getTraceSpansForTrace, listPhoenixProjects, listTracesPage } from "../lib/phoenix";

export const usePhoenixTraces = (
  project: Project | null,
  proxyBaseUrl: string | null | undefined,
  filters: Pick<TraceFilters, "projectName" | "sort" | "order" | "timeRange">,
) =>
  useInfiniteQuery({
    queryKey: [
      "phoenix-traces",
      project?.id,
      proxyBaseUrl,
      filters.projectName,
      filters.sort,
      filters.order,
      filters.timeRange,
    ],
    enabled: Boolean(project && proxyBaseUrl),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }: { pageParam: string | null }) =>
      listTracesPage(
        proxyBaseUrl as string,
        filters.projectName === "__all__" ? undefined : filters.projectName,
        filters,
        pageParam ?? undefined,
      ),
    getNextPageParam: (lastPage: TracePage) => lastPage.nextCursor ?? undefined,
    staleTime: 5_000,
  });

export const usePhoenixProjectNames = (proxyBaseUrl: string | null | undefined) =>
  useQuery({
    queryKey: ["phoenix-projects", proxyBaseUrl],
    enabled: Boolean(proxyBaseUrl),
    queryFn: async () => {
      const projects = await listPhoenixProjects(proxyBaseUrl as string);
      return projects.map((project) => project.name);
    },
    staleTime: 15_000,
  });

export const useTraceSpans = (
  proxyBaseUrl: string | null | undefined,
  projectName: string | null,
  traceId: string | null,
) =>
  useQuery({
    queryKey: ["trace-spans", projectName, traceId, proxyBaseUrl],
    enabled: Boolean(projectName && proxyBaseUrl && traceId),
    queryFn: () =>
      getTraceSpansForTrace(proxyBaseUrl as string, projectName as string, traceId as string),
  });

export const useSelectedTraceSpans = (
  proxyBaseUrl: string | null | undefined,
  traces: TraceRecord[],
) =>
  useQuery({
    queryKey: [
      "selected-trace-spans",
      proxyBaseUrl,
      traces.map((trace) => `${trace.projectName ?? "unknown"}:${trace.traceId}`).sort(),
    ],
    enabled: Boolean(proxyBaseUrl && traces.length > 0),
    queryFn: async () => {
      const entries = await Promise.all(
        traces
          .filter((trace) => Boolean(trace.projectName))
          .map(async (trace) => {
            const spans = await getTraceSpansForTrace(
              proxyBaseUrl as string,
              trace.projectName as string,
              trace.traceId,
            );

            return [trace.traceId, spans] as const;
          }),
      );

      return entries.reduce<Record<string, SpanRecord[]>>((accumulator, [traceId, spans]) => {
        accumulator[traceId] = spans;
        return accumulator;
      }, {});
    },
  });
