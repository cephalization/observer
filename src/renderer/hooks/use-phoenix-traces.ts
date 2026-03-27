import { useQuery } from "@tanstack/react-query";

import type { Project, TraceFilters } from "../../shared/types";
import { getTraceSpansForTrace, listPhoenixProjects, listTraces } from "../lib/phoenix";

export const usePhoenixTraces = (
  project: Project | null,
  proxyBaseUrl: string | null | undefined,
  filters: Pick<TraceFilters, "projectName" | "sort" | "order">,
) =>
  useQuery({
    queryKey: [
      "phoenix-traces",
      project?.id,
      proxyBaseUrl,
      filters.projectName,
      filters.sort,
      filters.order,
    ],
    enabled: Boolean(project && proxyBaseUrl),
    queryFn: () =>
      listTraces(
        proxyBaseUrl as string,
        filters.projectName === "__all__" ? undefined : filters.projectName,
        filters,
      ),
    placeholderData: (previousData: Awaited<ReturnType<typeof listTraces>> | undefined) =>
      previousData,
    refetchInterval: project?.tracePollingInterval ?? 5000,
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
  project: Project | null,
  proxyBaseUrl: string | null | undefined,
  traceId: string | null,
) =>
  useQuery({
    queryKey: ["trace-spans", project?.id, traceId, proxyBaseUrl],
    enabled: Boolean(project && proxyBaseUrl && traceId),
    queryFn: () =>
      getTraceSpansForTrace(proxyBaseUrl as string, project?.name as string, traceId as string),
  });
