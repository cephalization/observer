import { ChevronDown, Plus, Settings2 } from "lucide-react";

import type { Project } from "../../../shared/types";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export const ProjectSelector = ({
  projects,
  activeProjectId,
  onSelect,
  onOpenSettings,
}: {
  projects: Project[];
  activeProjectId: string | null | undefined;
  onSelect: (projectId: string | null) => void;
  onOpenSettings: () => void;
}) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--muted-foreground)]">
        Projects
      </p>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={onOpenSettings}>
          <Settings2 className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={onOpenSettings}>
          <Plus className="mr-2 h-4 w-4" />
          New
        </Button>
      </div>
    </div>
    <div className="relative">
      <Select
        value={activeProjectId ?? ""}
        onChange={(event) => onSelect(event.target.value || null)}
      >
        <option value="">Select a project</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </Select>
      <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-[color:var(--muted-foreground)]" />
    </div>
  </div>
);
