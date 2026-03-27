import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { Project, ProjectInput } from "../../../shared/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const emptyProject: ProjectInput = {
  name: "",
  phoenixUrl: "",
  phoenixApiKey: "",
  llmProvider: "openai",
  llmApiKey: "",
  llmModel: "gpt-4o",
  tracePollingInterval: 5000,
};

export const ConnectionSettings = ({
  open,
  project,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  project: Project | null;
  onOpenChange: (open: boolean) => void;
  onSave: (input: ProjectInput, projectId?: string) => Promise<void>;
}) => {
  const [form, setForm] = useState<ProjectInput>(emptyProject);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setIsSaving(false);
    }

    if (!project) {
      setForm(emptyProject);
      return;
    }

    setForm({
      name: project.name,
      phoenixUrl: project.phoenixUrl,
      phoenixApiKey: project.phoenixApiKey ?? "",
      llmProvider: project.llmProvider,
      llmApiKey: project.llmApiKey,
      llmModel: project.llmModel,
      tracePollingInterval: project.tracePollingInterval,
    });
  }, [open, project]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Project name is required");
      return;
    }

    if (!form.phoenixUrl.trim()) {
      toast.error("Phoenix URL is required");
      return;
    }

    if (!form.llmApiKey.trim()) {
      toast.error("LLM API key is required");
      return;
    }

    setIsSaving(true);

    try {
      await onSave(form, project?.id);
      toast.success(project ? "Project updated" : "Project created");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save project";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{project ? "Update project" : "Create project"}</DialogTitle>
          <DialogDescription>
            Configure Phoenix access, LLM credentials, and trace polling for a single experiment
            space.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 pt-4">
          <label className="grid gap-2 text-sm">
            <span>Name</span>
            <Input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Phoenix URL</span>
            <Input
              placeholder="https://app.phoenix.arize.com"
              value={form.phoenixUrl}
              onChange={(event) => setForm({ ...form, phoenixUrl: event.target.value })}
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Phoenix bearer token</span>
            <Input
              placeholder="Optional"
              type="password"
              value={form.phoenixApiKey ?? ""}
              onChange={(event) => setForm({ ...form, phoenixApiKey: event.target.value })}
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span>LLM provider</span>
              <Select
                value={form.llmProvider}
                onValueChange={(value) =>
                  setForm({
                    ...form,
                    llmProvider: value as Project["llmProvider"],
                    llmModel: value === "anthropic" ? "claude-sonnet-4-20250514" : "gpt-4o",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-2 text-sm">
              <span>Default model</span>
              <Input
                value={form.llmModel}
                onChange={(event) => setForm({ ...form, llmModel: event.target.value })}
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm">
            <span>LLM API key</span>
            <Input
              type="password"
              value={form.llmApiKey}
              onChange={(event) => setForm({ ...form, llmApiKey: event.target.value })}
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Trace polling interval (ms)</span>
            <Input
              min={1000}
              step={1000}
              type="number"
              value={form.tracePollingInterval}
              onChange={(event) =>
                setForm({ ...form, tracePollingInterval: Number(event.target.value || 5000) })
              }
            />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={isSaving} onClick={() => void handleSave()}>
              {isSaving ? "Saving..." : "Save project"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
