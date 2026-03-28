import { Plus, Settings2 } from "lucide-react";

import type { Project } from "../../../shared/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const ProjectSelector = ({
  projects,
  activeProjectId,
  onSelect,
  onCreateProject,
  onEditProject,
}: {
  projects: Project[];
  activeProjectId: string | null | undefined;
  onSelect: (projectId: string | null) => void;
  onCreateProject: () => void;
  onEditProject: () => void;
}) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        Projects
      </p>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={onEditProject}>
          <Settings2 className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={onCreateProject}>
          <Plus className="mr-2 h-4 w-4" />
          New
        </Button>
      </div>
    </div>
    <div>
      <Select
        value={activeProjectId ?? "__none__"}
        onValueChange={(value: string) => onSelect(value === "__none__" ? null : value)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a project" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">Select a project</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>
);
