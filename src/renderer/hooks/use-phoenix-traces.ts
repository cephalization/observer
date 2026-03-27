import { useQuery } from "@tanstack/react-query";

import type { Project } from "../../shared/types";
import { listTraces } from "../lib/phoenix";

export const usePhoenixTraces = (
  project: Project | null,
  proxyBaseUrl: string | null | undefined,
) =>
  useQuery({
    queryKey: ["phoenix-traces", project?.id, proxyBaseUrl],
    enabled: Boolean(project && proxyBaseUrl),
    queryFn: () => listTraces(proxyBaseUrl as string, project?.name as string),
    refetchInterval: project?.tracePollingInterval ?? 5000,
  });
