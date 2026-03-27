import { contextBridge, ipcRenderer } from "electron";

import type { ProjectInput, ProjectUpdate, RendererApi, ThemePreference } from "../shared/types.js";

const api: RendererApi = {
  projects: {
    list: () => ipcRenderer.invoke("projects:list"),
    create: (input: ProjectInput) => ipcRenderer.invoke("projects:create", input),
    update: (input: ProjectUpdate) => ipcRenderer.invoke("projects:update", input),
    remove: (projectId: string) => ipcRenderer.invoke("projects:remove", projectId),
    activate: (projectId: string | null) => ipcRenderer.invoke("projects:activate", projectId),
  },
  preferences: {
    get: () => ipcRenderer.invoke("preferences:get"),
    setTheme: (theme: ThemePreference) => ipcRenderer.invoke("preferences:set-theme", theme),
  },
  proxy: {
    getStatus: () => ipcRenderer.invoke("proxy:get-status"),
  },
};

contextBridge.exposeInMainWorld("observer", api);
