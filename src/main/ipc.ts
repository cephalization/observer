import { ipcMain } from "electron";

import { getProxyStatus, refreshProxyHealth, startProxy, stopProxy } from "./proxy.js";
import {
  createProject,
  getPreferences,
  getProject,
  listProjects,
  removeProject,
  setActiveProjectId,
  setTheme,
  updateProject,
} from "./store.js";
import type { ProjectInput, ProjectUpdate } from "../shared/types.js";

export const registerIpcHandlers = () => {
  ipcMain.handle("projects:list", () => listProjects());
  ipcMain.handle("projects:create", (_event, input: ProjectInput) => createProject(input));
  ipcMain.handle("projects:update", (_event, input: ProjectUpdate) => updateProject(input));
  ipcMain.handle("projects:remove", async (_event, projectId: string) => {
    const preferences = getPreferences();
    if (preferences.activeProjectId === projectId) {
      await stopProxy();
    }

    removeProject(projectId);
  });
  ipcMain.handle("projects:activate", (_event, projectId: string | null) => {
    if (!projectId) {
      setActiveProjectId(null);
      return stopProxy();
    }

    const project = getProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    return startProxy(project).then((status) => {
      if (status.state === "ready" || status.state === "error") {
        setActiveProjectId(projectId);
      }

      return status;
    });
  });
  ipcMain.handle("preferences:get", () => getPreferences());
  ipcMain.handle("preferences:set-theme", (_event, theme) => setTheme(theme));
  ipcMain.handle("proxy:get-status", async () => {
    if (getProxyStatus().state === "ready") {
      return refreshProxyHealth();
    }

    return getProxyStatus();
  });
};
