import { useEffect, useMemo, useState } from "react";

import { MoonStar, SunMedium, WandSparkles } from "lucide-react";
import { useTheme } from "next-themes";
import { useDefaultLayout } from "react-resizable-panels";
import { toast } from "sonner";

import type { Project, ProjectInput, TraceFilters, TraceRecord } from "../shared/types";
import type { TracePage } from "@/lib/phoenix";
import { ChatInterface } from "@/components/chat/chat-interface";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { DesktopAppLayout } from "@/components/layout/desktop-app-layout";
import { MobileAppLayout } from "@/components/layout/mobile-app-layout";
import { ConnectionSettings } from "@/components/projects/connection-settings";
import { TraceDetail } from "@/components/traces/trace-detail";
import { TraceList } from "@/components/traces/trace-list";
import { useChat } from "@/hooks/use-chat";
import {
  usePhoenixProjectNames,
  usePhoenixTraces,
  useSelectedTraceSpans,
  useTraceSpans,
} from "@/hooks/use-phoenix-traces";
import { useProjects } from "@/hooks/use-projects";
import {
  getTelemetryExportUrl,
  getTelemetryProjectName,
  initializeTracing,
  shutdownTracing,
} from "@/lib/otel";
import { useAppStore } from "@/stores/app-store";

const themeOrder: Array<"system" | "dark" | "light"> = ["system", "dark", "light"];
const defaultFilters: TraceFilters = {
  projectName: "__all__",
  search: "",
  status: "all",
  sort: "start_time",
  order: "desc",
  timeRange: "24h",
};

const layoutIds = {
  pinned: "observer-workspace-layout-pinned-v1",
  root: "observer-root-layout-v2",
  unpinned: "observer-workspace-layout-unpinned-v1",
};

const matchesTraceFilters = (trace: TraceRecord, filters: TraceFilters) => {
  const haystack = `${trace.rootSpanName ?? ""} ${trace.traceId}`.toLowerCase();
  const matchesSearch = haystack.includes(filters.search.trim().toLowerCase());
  const normalizedStatus = (trace.statusCode ?? "UNSET").toLowerCase();
  const matchesStatus = filters.status === "all" ? true : normalizedStatus === filters.status;
  return matchesSearch && matchesStatus;
};

export default function App() {
  const {
    projects,
    preferences,
    proxyStatus,
    activeProject,
    isLoading,
    createProject,
    updateProject,
    activateProject,
    setTheme,
  } = useProjects();
  const { setTheme: setResolvedTheme } = useTheme();
  const {
    activeTraceId,
    selectedTraceIds,
    toggleTrace,
    clearSelection,
    settingsOpen,
    setActiveTraceId,
    setSettingsOpen,
  } = useAppStore();
  const [traceFilters, setTraceFilters] = useState<TraceFilters>(defaultFilters);
  const [settingsProject, setSettingsProject] = useState<Project | null>(null);
  const [chatPinned, setChatPinned] = useState(true);
  const telemetryProjectName = activeProject ? getTelemetryProjectName(activeProject.name) : null;
  const telemetryExportUrl = proxyStatus?.baseUrl ? getTelemetryExportUrl(proxyStatus.baseUrl) : null;
  const rootLayout = useDefaultLayout({
    id: layoutIds.root,
    panelIds: ["observer-sidebar-panel", "observer-workspace-panel"],
  });
  const pinnedLayout = useDefaultLayout({
    id: layoutIds.pinned,
    panelIds: ["observer-traces-panel", "observer-detail-panel"],
  });
  const unpinnedLayout = useDefaultLayout({
    id: layoutIds.unpinned,
    panelIds: ["observer-traces-panel", "observer-detail-panel", "observer-chat-panel"],
  });

  useEffect(() => {
    if (preferences?.theme) {
      setResolvedTheme(preferences.theme);
    }
  }, [preferences?.theme, setResolvedTheme]);

  useEffect(() => {
    if (!preferences?.activeProjectId || proxyStatus?.state === "ready") {
      return;
    }

    void activateProject(preferences.activeProjectId);
  }, [activateProject, preferences?.activeProjectId, proxyStatus?.state]);

  useEffect(() => {
    if (!proxyStatus?.baseUrl || !activeProject) {
      void shutdownTracing();
      return;
    }

    void initializeTracing(proxyStatus.baseUrl, telemetryProjectName as string);

    return () => {
      void shutdownTracing();
    };
  }, [activeProject, proxyStatus?.baseUrl, telemetryProjectName]);

  const phoenixProjectNamesQuery = usePhoenixProjectNames(proxyStatus?.baseUrl);
  const tracesQuery = usePhoenixTraces(activeProject, proxyStatus?.baseUrl, traceFilters);
  const tracePages = tracesQuery.data as { pages: TracePage[] } | undefined;
  const pagedTraces = useMemo(
    () =>
      tracePages?.pages.reduce<TraceRecord[]>((all, page) => {
        all.push(...page.traces);
        return all;
      }, []) ?? [],
    [tracePages?.pages],
  );
  const filteredTraces = useMemo(
    () => pagedTraces.filter((trace) => matchesTraceFilters(trace, traceFilters)),
    [pagedTraces, traceFilters],
  );
  const selectedTraces = useMemo(
    () => filteredTraces.filter((trace) => selectedTraceIds.includes(trace.traceId)),
    [filteredTraces, selectedTraceIds],
  );
  const activeTrace = useMemo(
    () => filteredTraces.find((trace) => trace.traceId === activeTraceId) ?? null,
    [activeTraceId, filteredTraces],
  );
  const traceSpansQuery = useTraceSpans(
    proxyStatus?.baseUrl,
    activeTrace?.projectName ?? null,
    activeTrace?.traceId ?? null,
  );
  const selectedTraceSpansQuery = useSelectedTraceSpans(proxyStatus?.baseUrl, selectedTraces);
  const selectedChildSpansByTraceId = useMemo(() => {
    const spanGroups = selectedTraceSpansQuery.data ?? {};

    return Object.keys(spanGroups).reduce<Record<string, typeof spanGroups[string]>>(
      (accumulator, traceId) => {
        accumulator[traceId] = (spanGroups[traceId] ?? []).filter(
          (span: (typeof spanGroups)[string][number]) => Boolean(span.parentSpanId),
        );
        return accumulator;
      },
      {},
    );
  }, [selectedTraceSpansQuery.data]);
  const selectedSpanCount = (() => {
    return Object.keys(selectedChildSpansByTraceId).reduce(
      (count, traceId) => count + (selectedChildSpansByTraceId[traceId]?.length ?? 0),
      0,
    );
  })();
  const chat = useChat(
    activeProject,
    selectedTraces,
    selectedChildSpansByTraceId,
  );

  const cycleTheme = async () => {
    const current = preferences?.theme ?? "system";
    const next = themeOrder[(themeOrder.indexOf(current) + 1) % themeOrder.length];
    await setTheme(next);
  };

  const ThemeIcon =
    preferences?.theme === "light"
      ? SunMedium
      : preferences?.theme === "dark"
        ? MoonStar
        : WandSparkles;

  const saveProject = async (input: ProjectInput, projectId?: string) => {
    try {
      if (projectId) {
        await updateProject({ id: projectId, ...input });
        if (activeProject?.id === projectId) {
          await activateProject(projectId);
        }
      } else {
        const project = await createProject(input);
        await activateProject(project.id);
      }

      setSettingsOpen(false);
      setSettingsProject(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save project";
      toast.error(message);
      throw error;
    }
  };

  const sidebar = (
    <AppSidebar
      activeProject={activeProject}
      activeProjectId={preferences?.activeProjectId}
      onCreateProject={() => {
        setSettingsProject(null);
        setSettingsOpen(true);
      }}
      onCycleTheme={() => void cycleTheme()}
      onEditProject={() => {
        setSettingsProject(activeProject);
        setSettingsOpen(true);
      }}
      onSelectProject={(projectId) => void activateProject(projectId)}
      preferencesTheme={preferences?.theme}
      projects={projects}
      proxyStatus={proxyStatus}
      telemetryExportUrl={telemetryExportUrl}
      telemetryProjectName={telemetryProjectName}
      themeIcon={<ThemeIcon className="mr-2 h-4 w-4" />}
    />
  );

  const tracePanel = (
    <div className="h-full min-h-0 overflow-hidden">
      <TraceList
        traces={filteredTraces}
        selectedTraceIds={selectedTraceIds}
        activeTraceId={activeTraceId}
        isInitialLoading={isLoading || (tracesQuery.isPending && !tracePages?.pages.length)}
        isRefreshing={tracesQuery.isRefetching && Boolean(tracePages?.pages.length)}
        hasMore={Boolean(tracesQuery.hasNextPage && traceFilters.projectName !== "__all__")}
        isFetchingNextPage={tracesQuery.isFetchingNextPage}
        error={tracesQuery.error instanceof Error ? tracesQuery.error.message : null}
        filters={traceFilters}
        phoenixProjectNames={phoenixProjectNamesQuery.data ?? []}
        onChangeFilters={setTraceFilters}
        onToggleTrace={toggleTrace}
        onOpenTrace={setActiveTraceId}
        onAnalyze={() => {
          if (selectedTraceIds.length === 0) {
            return;
          }

          void chat.sendMessage(
            "Analyze the selected traces. Highlight the most important failures, latency patterns, and likely next debugging steps.",
          );
        }}
        onLoadMore={() => void tracesQuery.fetchNextPage()}
        onRefresh={() => void tracesQuery.refetch()}
      />
    </div>
  );

  const detailPanel = (
    <div className="h-full min-h-[18rem] min-w-0 xl:min-h-0">
      <TraceDetail
        trace={activeTrace}
        spans={traceSpansQuery.data ?? []}
        isLoading={traceSpansQuery.isLoading}
      />
    </div>
  );

  const chatPanel = (
    <div className="h-full min-h-[24rem] min-w-0 xl:min-h-0">
      <ChatInterface
        project={activeProject}
        messages={chat.messages}
        selectedTraceCount={selectedTraces.length}
        selectedSpanCount={selectedSpanCount}
        isContextLoading={selectedTraceSpansQuery.isFetching && selectedTraces.length > 0}
        isPinned={chatPinned}
        isStreaming={chat.isStreaming}
        error={chat.error}
        onSend={chat.sendMessage}
        onClear={() => {
          chat.clear();
          clearSelection();
        }}
        onTogglePinned={() => setChatPinned((value) => !value)}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(46,160,120,0.14),_transparent_34%),linear-gradient(180deg,_rgba(6,7,10,1),_rgba(3,4,6,1))] text-[color:var(--foreground)]">
      <MobileAppLayout
        sidebar={sidebar}
        tracePanel={tracePanel}
        detailPanel={detailPanel}
        chatPanel={chatPanel}
      />

      <DesktopAppLayout
        sidebar={sidebar}
        tracePanel={tracePanel}
        detailPanel={detailPanel}
        isChatPinned={chatPinned}
        chatPanel={chatPanel}
        layoutIds={layoutIds}
        pinnedLayout={pinnedLayout}
        rootLayout={rootLayout}
        unpinnedLayout={unpinnedLayout}
      />

      <ConnectionSettings
        open={settingsOpen}
        project={settingsProject}
        onOpenChange={(open) => {
          setSettingsOpen(open);
          if (!open) {
            setSettingsProject(null);
          }
        }}
        onSave={saveProject}
      />
    </div>
  );
}
