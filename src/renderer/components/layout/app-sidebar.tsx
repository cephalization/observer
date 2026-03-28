import type { ReactNode } from "react";

import type { Project, ProxyStatus, ThemePreference } from "../../../shared/types";
import { ProjectSelector } from "@/components/projects/project-selector";
import { ConnectionStatus } from "@/components/status/connection-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const AppSidebar = ({
  activeProject,
  activeProjectId,
  onCreateProject,
  onCycleTheme,
  onEditProject,
  onSelectProject,
  preferencesTheme,
  projects,
  proxyStatus,
  telemetryExportUrl,
  telemetryProjectName,
  themeIcon,
}: {
  activeProject: Project | null;
  activeProjectId: string | null | undefined;
  onCreateProject: () => void;
  onCycleTheme: () => void;
  onEditProject: () => void;
  onSelectProject: (projectId: string | null) => void;
  preferencesTheme: ThemePreference | undefined;
  projects: Project[];
  proxyStatus: ProxyStatus | undefined;
  telemetryExportUrl: string | null;
  telemetryProjectName: string | null;
  themeIcon: ReactNode;
}) => (
  <aside className="flex h-full min-h-0 flex-col rounded-[24px] bg-black/35 p-6 pt-16 backdrop-blur-xl xl:pt-18">
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
      activeProjectId={activeProjectId}
      onSelect={onSelectProject}
      onCreateProject={onCreateProject}
      onEditProject={onEditProject}
    />

    <Separator className="my-6" />

    <div className="space-y-4">
      <ConnectionStatus phoenixUrl={activeProject?.phoenixUrl} proxyStatus={proxyStatus} />
      <Card className="bg-white/3 py-0 shadow-none">
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
              {preferencesTheme ?? "system"}
            </span>
          </p>
          <p>
            OTEL project:{" "}
            <span className="font-semibold text-[color:var(--foreground)]">
              {telemetryProjectName ?? "inactive"}
            </span>
          </p>
          <p>
            OTLP export:{" "}
            <span className="font-mono text-xs text-[color:var(--foreground)]">
              {telemetryExportUrl ?? "inactive"}
            </span>
          </p>
        </CardContent>
      </Card>
    </div>

    <div className="mt-auto flex items-center justify-between pt-6">
      <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
        renderer telemetry active
      </div>
      <Button size="sm" variant="outline" onClick={onCycleTheme}>
        {themeIcon}
        {preferencesTheme ?? "system"}
      </Button>
    </div>
  </aside>
);
