import Store from "electron-store";

import type { AppPreferences, Project, ProjectInput, ProjectUpdate } from "../shared/types";

interface StoreShape {
  projects: Project[];
  preferences: AppPreferences;
}

const store = new Store<StoreShape>({
  name: "observer",
  defaults: {
    projects: [],
    preferences: {
      activeProjectId: null,
      theme: "system",
    },
  },
});

const now = () => new Date().toISOString();

const normalizeUrl = (value: string) => value.trim().replace(/\/+$/, "");

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `project_${Date.now()}`;
};

export const listProjects = () => store.get("projects");

export const getProject = (id: string) =>
  listProjects().find((project) => project.id === id) ?? null;

export const createProject = (input: ProjectInput) => {
  const project: Project = {
    id: createId(),
    name: input.name.trim(),
    phoenixUrl: normalizeUrl(input.phoenixUrl),
    phoenixApiKey: input.phoenixApiKey?.trim() || undefined,
    llmProvider: input.llmProvider,
    llmApiKey: input.llmApiKey.trim(),
    llmModel: input.llmModel.trim(),
    tracePollingInterval: input.tracePollingInterval,
    createdAt: now(),
    updatedAt: now(),
  };

  store.set("projects", [...listProjects(), project]);
  return project;
};

export const updateProject = (input: ProjectUpdate) => {
  const projects = listProjects();
  const index = projects.findIndex((project) => project.id === input.id);

  if (index === -1) {
    throw new Error(`Project not found: ${input.id}`);
  }

  const previous = projects[index];
  const next: Project = {
    ...previous,
    ...input,
    name: input.name?.trim() ?? previous.name,
    phoenixUrl: input.phoenixUrl ? normalizeUrl(input.phoenixUrl) : previous.phoenixUrl,
    phoenixApiKey:
      input.phoenixApiKey === undefined
        ? previous.phoenixApiKey
        : input.phoenixApiKey.trim() || undefined,
    llmApiKey: input.llmApiKey?.trim() ?? previous.llmApiKey,
    llmModel: input.llmModel?.trim() ?? previous.llmModel,
    updatedAt: now(),
  };

  const updated = [...projects];
  updated[index] = next;
  store.set("projects", updated);
  return next;
};

export const removeProject = (id: string) => {
  store.set(
    "projects",
    listProjects().filter((project) => project.id !== id),
  );

  const preferences = getPreferences();
  if (preferences.activeProjectId === id) {
    store.set("preferences", {
      ...preferences,
      activeProjectId: null,
    });
  }
};

export const getPreferences = () => store.get("preferences");

export const setTheme = (theme: AppPreferences["theme"]) => {
  const next = {
    ...getPreferences(),
    theme,
  };

  store.set("preferences", next);
  return next;
};

export const setActiveProjectId = (projectId: string | null) => {
  const next = {
    ...getPreferences(),
    activeProjectId: projectId,
  };

  store.set("preferences", next);
  return next;
};
