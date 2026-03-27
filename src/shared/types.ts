export type ThemePreference = "system" | "dark" | "light";

export type LlmProvider = "openai" | "anthropic";

export interface Project {
  id: string;
  name: string;
  phoenixUrl: string;
  phoenixApiKey?: string;
  llmProvider: LlmProvider;
  llmApiKey: string;
  llmModel: string;
  tracePollingInterval: number;
  createdAt: string;
  updatedAt: string;
}

export interface AppPreferences {
  activeProjectId: string | null;
  theme: ThemePreference;
}

export interface ProxyStatus {
  state: "stopped" | "starting" | "ready" | "error";
  baseUrl: string | null;
  port: number | null;
  projectId: string | null;
  projectName: string | null;
  reachable: boolean;
  error: string | null;
}

export interface ProjectInput {
  name: string;
  phoenixUrl: string;
  phoenixApiKey?: string;
  llmProvider: LlmProvider;
  llmApiKey: string;
  llmModel: string;
  tracePollingInterval: number;
}

export interface ProjectUpdate extends Partial<ProjectInput> {
  id: string;
}

export interface TraceRecord {
  traceId: string;
  projectName?: string;
  statusCode?: string;
  startTime?: string;
  endTime?: string;
  latencyMs?: number;
  rootSpanName?: string;
  raw: unknown;
}

export interface ChatMessage {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
}

export interface RendererApi {
  projects: {
    list: () => Promise<Project[]>;
    create: (input: ProjectInput) => Promise<Project>;
    update: (input: ProjectUpdate) => Promise<Project>;
    remove: (projectId: string) => Promise<void>;
    activate: (projectId: string | null) => Promise<ProxyStatus>;
  };
  preferences: {
    get: () => Promise<AppPreferences>;
    setTheme: (theme: ThemePreference) => Promise<AppPreferences>;
  };
  proxy: {
    getStatus: () => Promise<ProxyStatus>;
  };
}
