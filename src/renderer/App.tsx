import { useEffect, useMemo } from "react";

import { MoonStar, SunMedium, WandSparkles } from "lucide-react";
import { useTheme } from "next-themes";

import type { ProjectInput } from "../shared/types";
import { ChatInterface } from "@/components/chat/chat-interface";
import { ProjectSelector } from "@/components/projects/project-selector";
import { ConnectionSettings } from "@/components/projects/connection-settings";
import { ConnectionStatus } from "@/components/status/connection-status";
import { TraceList } from "@/components/traces/trace-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useChat } from "@/hooks/use-chat";
import { usePhoenixTraces } from "@/hooks/use-phoenix-traces";
import { useProjects } from "@/hooks/use-projects";
import { initializeTracing, shutdownTracing } from "@/lib/otel";
import { useAppStore } from "@/stores/app-store";

const themeOrder: Array<"system" | "dark" | "light"> = ["system", "dark", "light"];

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
  const { selectedTraceIds, toggleTrace, clearSelection, settingsOpen, setSettingsOpen } =
    useAppStore();

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

  const tracesQuery = usePhoenixTraces(activeProject, proxyStatus?.baseUrl);
  const selectedTraces = useMemo(
    () => (tracesQuery.data ?? []).filter((trace) => selectedTraceIds.includes(trace.traceId)),
    [selectedTraceIds, tracesQuery.data],
  );
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
  };

  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top,_rgba(58,180,132,0.16),_transparent_42%),linear-gradient(180deg,_rgba(8,10,14,1),_rgba(4,6,10,1))] text-[color:var(--foreground)]">
      <aside className="flex w-[320px] flex-col border-r border-white/10 bg-black/20 p-6 backdrop-blur-xl">
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
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <Separator className="my-6" />

        <div className="space-y-4">
          <ConnectionStatus phoenixUrl={activeProject?.phoenixUrl} proxyStatus={proxyStatus} />
          <Card className="bg-white/3">
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

      <main className="min-w-0 flex-1 p-6">
        <div className="grid h-full min-h-[calc(100vh-3rem)] gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <TraceList
            traces={tracesQuery.data ?? []}
            selectedTraceIds={selectedTraceIds}
            isLoading={isLoading || tracesQuery.isLoading}
            onToggleTrace={toggleTrace}
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
      </main>

      <ConnectionSettings
        open={settingsOpen}
        project={activeProject}
        onOpenChange={setSettingsOpen}
        onSave={saveProject}
      />
    </div>
  );
}
