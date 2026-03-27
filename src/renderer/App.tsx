import { useEffect, useMemo, useState } from "react";

import { MoonStar, SunMedium, WandSparkles } from "lucide-react";
import { useTheme } from "next-themes";
import { useDefaultLayout } from "react-resizable-panels";
import { toast } from "sonner";

import type { Project, ProjectInput, TraceFilters, TraceRecord } from "../shared/types";
import { ChatInterface } from "@/components/chat/chat-interface";
import { ProjectSelector } from "@/components/projects/project-selector";
import { ConnectionSettings } from "@/components/projects/connection-settings";
import { TraceDetail } from "@/components/traces/trace-detail";
import { ConnectionStatus } from "@/components/status/connection-status";
import { TraceList } from "@/components/traces/trace-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Separator } from "@/components/ui/separator";
import { useChat } from "@/hooks/use-chat";
import { usePhoenixProjectNames, usePhoenixTraces, useTraceSpans } from "@/hooks/use-phoenix-traces";
import { useProjects } from "@/hooks/use-projects";
import { initializeTracing, shutdownTracing } from "@/lib/otel";
import { useAppStore } from "@/stores/app-store";

const themeOrder: Array<"system" | "dark" | "light"> = ["system", "dark", "light"];
const defaultFilters: TraceFilters = {
  projectName: "__all__",
  search: "",
  status: "all",
  sort: "start_time",
  order: "desc",
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
  const rootLayout = useDefaultLayout({
    id: "observer-root-layout",
    panelIds: ["observer-sidebar-panel", "observer-workspace-panel"],
  });
  const mainLayout = useDefaultLayout({
    id: "observer-main-layout",
    panelIds: ["observer-traces-panel", "observer-inspector-panel"],
  });
  const rightLayout = useDefaultLayout({
    id: "observer-right-layout",
    panelIds: ["observer-detail-panel", "observer-chat-panel"],
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

    void initializeTracing(proxyStatus.baseUrl, activeProject.name);

    return () => {
      void shutdownTracing();
    };
  }, [activeProject, proxyStatus?.baseUrl]);

  const phoenixProjectNamesQuery = usePhoenixProjectNames(proxyStatus?.baseUrl);
  const tracesQuery = usePhoenixTraces(activeProject, proxyStatus?.baseUrl, traceFilters);
  const filteredTraces = useMemo(
    () => (tracesQuery.data ?? []).filter((trace) => matchesTraceFilters(trace, traceFilters)),
    [traceFilters, tracesQuery.data],
  );
  const selectedTraces = useMemo(
    () => filteredTraces.filter((trace) => selectedTraceIds.includes(trace.traceId)),
    [filteredTraces, selectedTraceIds],
  );
  const activeTrace = useMemo(
    () => filteredTraces.find((trace) => trace.traceId === activeTraceId) ?? null,
    [activeTraceId, filteredTraces],
  );
  const traceSpansQuery = useTraceSpans(activeProject, proxyStatus?.baseUrl, activeTrace?.traceId ?? null);
  const chat = useChat(activeProject, selectedTraces);

  const cycleTheme = async () => {
    const current = preferences?.theme ?? "system";
    const next = themeOrder[(themeOrder.indexOf(current) + 1) % themeOrder.length];
    await setTheme(next);
  };

  const themeIcon =
    preferences?.theme === "light"
      ? SunMedium
      : preferences?.theme === "dark"
        ? MoonStar
        : WandSparkles;
  const ThemeIcon = themeIcon;

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
    <aside className="flex h-full min-h-0 flex-col border-r border-white/10 bg-black/20 p-6 backdrop-blur-xl xl:border-r-0">
      <div className="mb-8 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300/80">
          Observer
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Phoenix trace workbench</h1>
        <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">
          Poll traces, stream analysis chats, and trace the UI&apos;s own AI completions back into
          Phoenix.
        </p>
      </div>

      <ProjectSelector
        projects={projects}
        activeProjectId={preferences?.activeProjectId}
        onSelect={(projectId) => void activateProject(projectId)}
        onCreateProject={() => {
          setSettingsProject(null);
          setSettingsOpen(true);
        }}
        onEditProject={() => {
          setSettingsProject(activeProject);
          setSettingsOpen(true);
        }}
      />

      <Separator className="my-6" />

      <div className="space-y-4">
        <ConnectionStatus phoenixUrl={activeProject?.phoenixUrl} proxyStatus={proxyStatus} />
        <Card className="bg-white/3 py-0">
          <CardContent className="space-y-3 p-4 text-sm text-[color:var(--muted-foreground)]">
            <p>
              Polling interval:{" "}
              <span className="font-semibold text-[color:var(--foreground)]">
                {activeProject?.tracePollingInterval ?? 5000} ms
              </span>
            </p>
            <p>
              Proxy base URL:{" "}
              <span className="font-mono text-xs text-[color:var(--foreground)]">
                {proxyStatus?.baseUrl ?? "inactive"}
              </span>
            </p>
            <p>
              Theme:{" "}
              <span className="font-semibold text-[color:var(--foreground)]">
                {preferences?.theme ?? "system"}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-auto flex items-center justify-between pt-6">
        <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
          renderer telemetry active
        </div>
        <Button size="sm" variant="outline" onClick={() => void cycleTheme()}>
          <ThemeIcon className="mr-2 h-4 w-4" />
          {preferences?.theme ?? "system"}
        </Button>
      </div>
    </aside>
  );

  const tracePanel = (
    <div className="h-full min-h-0 overflow-hidden p-4 md:p-6 xl:p-0">
      <TraceList
        traces={filteredTraces}
        selectedTraceIds={selectedTraceIds}
        activeTraceId={activeTraceId}
        isInitialLoading={isLoading || (tracesQuery.isPending && !tracesQuery.data)}
        isRefreshing={tracesQuery.isFetching && Boolean(tracesQuery.data)}
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
        onRefresh={() => void tracesQuery.refetch()}
      />
    </div>
  );

  const detailPanel = (
    <div className="h-full min-h-[18rem] xl:min-h-0">
      <TraceDetail
        trace={activeTrace}
        spans={traceSpansQuery.data ?? []}
        isLoading={traceSpansQuery.isLoading}
      />
    </div>
  );

  const chatPanel = (
    <div className="h-full min-h-[24rem] xl:min-h-0">
      <ChatInterface
        project={activeProject}
        messages={chat.messages}
        selectedTraceCount={selectedTraces.length}
        isStreaming={chat.isStreaming}
        error={chat.error}
        onSend={chat.sendMessage}
        onClear={() => {
          chat.clear();
          clearSelection();
        }}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(58,180,132,0.16),_transparent_42%),linear-gradient(180deg,_rgba(8,10,14,1),_rgba(4,6,10,1))] text-[color:var(--foreground)]">
      <div className="flex min-h-screen flex-col xl:hidden">
        <div className="border-b border-white/10">{sidebar}</div>
        <div className="grid gap-4 md:gap-6">
          {tracePanel}
          <div className="grid gap-4 px-4 pb-4 md:gap-6 md:px-6 md:pb-6">
            {detailPanel}
            {chatPanel}
          </div>
        </div>
      </div>

      <div className="hidden h-screen xl:block">
        <ResizablePanelGroup
          className="min-h-screen"
          defaultLayout={
            rootLayout.defaultLayout ?? {
              "observer-sidebar-panel": 320,
              "observer-workspace-panel": 1,
            }
          }
          id="observer-root-layout"
          onLayoutChanged={rootLayout.onLayoutChanged}
          orientation="horizontal"
        >
          <ResizablePanel
            defaultSize="320px"
            groupResizeBehavior="preserve-pixel-size"
            id="observer-sidebar-panel"
            maxSize="420px"
            minSize="280px"
          >
            {sidebar}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={1} id="observer-workspace-panel" minSize="720px">
            <ResizablePanelGroup
              className="min-h-screen"
              defaultLayout={
                mainLayout.defaultLayout ?? {
                  "observer-traces-panel": 56,
                  "observer-inspector-panel": 44,
                }
              }
              id="observer-main-layout"
              onLayoutChanged={mainLayout.onLayoutChanged}
              orientation="horizontal"
            >
              <ResizablePanel defaultSize={56} id="observer-traces-panel" minSize={30}>
                {tracePanel}
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={44} id="observer-inspector-panel" minSize={26}>
                <ResizablePanelGroup
                  className="min-h-screen"
                  defaultLayout={
                    rightLayout.defaultLayout ?? {
                      "observer-detail-panel": 46,
                      "observer-chat-panel": 54,
                    }
                  }
                  id="observer-right-layout"
                  onLayoutChanged={rightLayout.onLayoutChanged}
                  orientation="vertical"
                >
                  <ResizablePanel defaultSize={46} id="observer-detail-panel" minSize={24}>
                    <div className="h-full min-h-0 p-6 pb-3">{detailPanel}</div>
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={54} id="observer-chat-panel" minSize={28}>
                    <div className="h-full min-h-0 p-6 pt-3">{chatPanel}</div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

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
