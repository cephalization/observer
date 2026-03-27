# Observer: Electron + Phoenix Trace Observer

## Overview

Observer is an Electron application for monitoring and analyzing Arize Phoenix traces. It connects to Phoenix instances, polls traces via REST API, provides an AI-powered chat interface for trace analysis, and traces its own chat completions back to Phoenix using OpenTelemetry from the browser (renderer process).

## Progress Update

Status as of 2026-03-27:

- Completed phases 1 through 7 in working form and finished a substantial portion of phase 8 polish
- Verified repeated checkpoints with `pnpm typecheck`, `pnpm check`, and `pnpm start`
- Fixed the Electron Forge entrypoint collision by renaming the built main/preload entries to `main.ts` and `preload.ts`
- Added persisted desktop panel layouts so the resizable workspace restores across app restarts

Implemented now:

- React 19 renderer bootstrap with `src/renderer/main.tsx` and `src/renderer/App.tsx`
- TypeScript 6 project split with `tsconfig.app.json` and `tsconfig.node.json`
- oxlint + oxfmt tooling, Vite React renderer config, Tailwind 4 styling, and `components.json`
- Official shadcn CLI-generated UI primitives for the active component set, plus `components.json`
- Electron main/preload split with typed `window.observer` bridge
- `electron-store` persistence for projects and theme preference
- Hono-based localhost proxy for Phoenix REST + OTEL export, including `/health` and `/arize_phoenix_version`
- Direct Phoenix REST querying via the proxy for project discovery, traces, and spans
- Browser OTEL initialization with `WebTracerProvider`, OTLP HTTP exporter, and OpenInference span processing
- Direct renderer-side AI SDK chat with telemetry enabled and selected-trace context injection
- Zustand-backed selection/settings UI and a functional single-page shell
- Phoenix project discovery filter so local Phoenix instances can be explored without matching the app project name
- Silent background polling refreshes that keep the trace list stable while new traces stream in
- Trace detail inspector with span tree, selected span state, and richer detail views
- Nested desktop resizable layout for sidebar, traces, detail, and chat panels with restored layout state
- Ongoing layout polish toward a Spotify-like sectioned workspace with gap-based resize seams
- Overflow cleanup so the trace list, trace detail, and chat panels each have clearer primary scroll regions

Still remaining / follow-up:

- Split `src/renderer/App.tsx` into smaller desktop/mobile shell components
- Continue deepening the trace inspector with additional event/attribute ergonomics and richer summaries
- Continue polishing overflow, density, and scrollbar ergonomics across the desktop workspace
- Add pagination or time-range controls for very large Phoenix projects
- Harden chat state handling and proxy lifecycle further as we add real usage paths
- Resolve remaining non-blocking oxlint warnings around function size and a few style preferences

## Design Decisions (Finalized)

| Decision               | Choice                                                     | Rationale                                       |
| ---------------------- | ---------------------------------------------------------- | ----------------------------------------------- |
| Framework              | Electron Forge + Vite                                      | Already scaffolded                              |
| UI                     | React 19 + shadcn + Tailwind CSS 4                         | Modern, composable, fast                        |
| TypeScript             | 6.0.x                                                      | Latest stable, modern defaults                  |
| Linting                | oxlint                                                     | Fast, replaces ESLint                           |
| Formatting             | oxfmt 0.42.x                                               | Bleeding edge, fast                             |
| State management       | Zustand 5                                                  | Lightweight, simple                             |
| Server state           | TanStack Query 5                                           | Polling, caching, refetching                    |
| Persistence            | electron-store 11 (ESM)                                    | Encrypted storage for API keys, project configs |
| Phoenix client         | @arizeai/phoenix-client (browser-compatible)               | Wraps openapi-fetch, uses standard fetch        |
| AI SDK                 | Vercel AI SDK (ai, @ai-sdk/openai, @ai-sdk/anthropic)      | Multi-provider, streaming, telemetry            |
| OTEL tracing           | Browser OTEL SDK (sdk-trace-web)                           | Core learning objective                         |
| OpenInference          | @arizeai/openinference-vercel                              | AI SDK span processing for Phoenix              |
| Proxy server           | Hono (in main process)                                     | Lightweight, TypeScript-native                  |
| Vite version           | Highest compatible with @electron-forge/plugin-vite (^5.x) | Forge plugin tested against Vite 5              |
| Theme                  | System/dark/light with persistence in electron-store       | shadcn theming                                  |
| Layout                 | Single-page with nested resizable panels                   | No router needed                                |
| Trace context for chat | Checkbox selection + "Analyze" button                      | User picks traces, injected as system context   |
| Polling interval       | Configurable in UI                                         | User sets refresh rate                          |

## Architecture

```
+------------------------------------------------------------------+
|                     Electron App                                  |
+------------------------------------------------------------------+
|  Main Process (Node.js)                                          |
|  +-- Window management                                           |
|  +-- electron-store (projects, API keys, theme preference)       |
|  +-- IPC handlers (CRUD projects, get/set keys, proxy lifecycle) |
|  +-- Hono Proxy Server (127.0.0.1:<random-port>)                |
|      +-- POST /v1/traces -> Phoenix OTLP endpoint + auth        |
|      +-- GET/POST /v1/* -> Phoenix REST API + auth               |
|      +-- GET /health -> proxy status + Phoenix reachability      |
+------------------------------------------------------------------+
|  Preload (contextBridge)                                         |
|  +-- window.api.projects.* (CRUD)                                |
|  +-- window.api.proxy.* (start, stop, getPort, getStatus)       |
|  +-- window.api.keys.* (getLLMKey, setLLMKey)                    |
|  +-- window.api.preferences.* (getTheme, setTheme)              |
+------------------------------------------------------------------+
|  Renderer Process (Chromium - React 19)                          |
|  +-- shadcn UI components                                        |
|  +-- Browser OTEL SDK -> http://127.0.0.1:<proxy-port>/v1/traces|
|  +-- Phoenix client (via proxy) -> trace polling with TanStack Q |
|  +-- AI SDK (direct to LLM APIs, keys from electron-store)      |
|  +-- Zustand store (active project, UI state)                    |
+------------------------------------------------------------------+
         |                              |
         | OTLP HTTP + REST (proxied)   | LLM API calls (direct)
         v                              v
+------------------+          +-------------------+
| Arize Phoenix    |          | OpenAI / Anthropic|
| (any URL + auth) |          | APIs              |
+------------------+          +-------------------+
```

### Proxy Design

- All Phoenix communication (OTEL exports + REST API) goes through the main process proxy
- LLM API calls go directly from renderer (AI SDK) -- keeps browser tracing authentic
- Proxy restarts on project switch (clean state, new port, fresh connection)
- Proxy binds to 127.0.0.1 only (no external access)
- Proxy injects Bearer auth headers from electron-store
- Renderer only knows `http://127.0.0.1:<port>` -- never sees actual Phoenix URL or credentials

### Security Model

- LLM API keys: stored in electron-store, passed to renderer via IPC on demand, held in memory during session (acceptable for local desktop app)
- Phoenix API keys: stored in electron-store, never leave main process (proxy injects them)
- Proxy listens on localhost only
- contextBridge exposes minimal typed API surface

### OTEL Tracing (Core Learning Objective)

The renderer uses the browser OTEL SDK to trace AI SDK chat completions:

1. `WebTracerProvider` from `@opentelemetry/sdk-trace-web`
2. `OTLPTraceExporter` from `@opentelemetry/exporter-trace-otlp-http` (uses fetch)
3. `OpenInferenceSimpleSpanProcessor` from `@arizeai/openinference-vercel`
4. Resource attributes include `SEMRESATTRS_PROJECT_NAME` set to the active project name
5. AI SDK calls use `experimental_telemetry: { isEnabled: true }`
6. Exporter points to `http://127.0.0.1:<proxy-port>/v1/traces`
7. Provider is re-initialized when switching projects (new port, new project name)

### Phoenix Data Access

Research confirmed `@arizeai/phoenix-client` works in browser contexts, but the implementation has since shifted toward direct REST access through the local proxy because it is simpler to debug against local Phoenix instances:

- Project discovery uses `/v1/projects`
- Trace discovery uses `/v1/projects/:projectName/traces`
- Span detail uses `/v1/projects/:projectName/spans?trace_ids=...`
- TanStack Query still handles polling/caching around these calls

### Data Flow: Chat with Trace Context

1. User views trace list (polled via direct Phoenix REST calls + TanStack Query)
2. User selects traces via checkboxes
3. User clicks "Analyze" button
4. Selected trace data serialized into system message context
5. AI SDK `streamText` called with context + user messages
6. `experimental_telemetry: { isEnabled: true }` causes OTEL spans
7. Browser OTEL SDK exports spans through proxy to Phoenix
8. User can see their own chat analysis traces in Phoenix

## Project Data Model

```typescript
interface Project {
  id: string;
  name: string;
  phoenixUrl: string; // e.g., "http://localhost:6006"
  phoenixApiKey?: string; // Optional bearer token for Phoenix
  llmProvider: "openai" | "anthropic";
  llmApiKey: string; // LLM provider API key
  llmModel: string; // e.g., "gpt-4o", "claude-sonnet-4-20250514"
  tracePollingInterval: number; // milliseconds, configurable
  createdAt: string;
  updatedAt: string;
}

interface AppPreferences {
  theme: "system" | "dark" | "light";
  activeProjectId: string | null;
}
```

## File Structure

```
observer/
+-- .opencode/plans/          # This file
+-- forge.config.ts
+-- vite.main.config.ts
+-- vite.preload.config.ts
+-- vite.renderer.config.ts
+-- tsconfig.json
+-- tsconfig.app.json         # Renderer TypeScript config
+-- tsconfig.node.json        # Main/preload TypeScript config
+-- .oxlintrc.json
+-- components.json            # shadcn config
+-- package.json
+-- index.html
+-- src/
    +-- main/
    |   +-- main.ts            # Electron main process entry
    |   +-- proxy.ts           # Hono proxy server
    |   +-- store.ts           # electron-store setup
    |   +-- ipc.ts             # IPC handler registration
    +-- preload/
    |   +-- preload.ts         # contextBridge API
    +-- renderer/
    |   +-- main.tsx           # React entry point
    |   +-- App.tsx            # Root with providers (QueryClient, Zustand, Theme)
    |   +-- index.css          # Tailwind imports
    |   +-- lib/
    |   |   +-- otel.ts        # Browser OTEL init/reinit
    |   |   +-- phoenix.ts     # Phoenix REST wrappers via proxy URL
    |   |   +-- ai.ts          # AI SDK provider factory (openai/anthropic)
    |   |   +-- utils.ts       # Shared utilities
    |   +-- hooks/
    |   |   +-- use-phoenix-traces.ts   # TanStack Query: trace polling
    |   |   +-- use-chat.ts             # AI SDK chat with streaming + trace context
    |   +-- stores/
    |   |   +-- app-store.ts   # Zustand: active project, UI state, selected traces
    |   +-- components/
    |   |   +-- ui/            # shadcn components (batch installed)
    |   |   +-- layout/
    |   |   |   +-- app-layout.tsx
    |   |   |   +-- sidebar.tsx
    |   |   |   +-- main-content.tsx
    |   |   +-- projects/
    |   |   |   +-- project-selector.tsx
    |   |   |   +-- connection-settings.tsx
    |   |   +-- traces/
    |   |   |   +-- trace-list.tsx
    |   |   |   +-- trace-detail.tsx    # Span tree + attributes/events tabs
    |   |   |   +-- trace-filters.tsx   # Search, Phoenix project, status, sort, order
    |   |   +-- chat/
    |   |   |   +-- chat-interface.tsx
    |   |   |   +-- message-list.tsx
    |   |   |   +-- chat-input.tsx
    |   |   +-- status/
    |   |       +-- connection-status.tsx  # Shows proxy status, "traces proxied" indicator
    |   |       +-- polling-config.tsx     # Polling interval control
    +-- types/
        +-- electron.d.ts      # window.api type declarations
        +-- env.d.ts           # Vite env type declarations
```

## Dependencies

### Production Dependencies

```
react@^19.0.0
react-dom@^19.0.0
zustand@^5.0.0
@tanstack/react-query@^5.0.0
electron-store@^11.0.0
hono@^4.0.0
ai@^4.0.0
@ai-sdk/openai@^1.0.0
@ai-sdk/anthropic@^1.0.0
@arizeai/phoenix-client@^2.0.0
@opentelemetry/api@^1.9.0
@opentelemetry/sdk-trace-web@^2.0.0
@opentelemetry/exporter-trace-otlp-http@^0.200.0
@opentelemetry/resources@^2.0.0
@opentelemetry/semantic-conventions@^1.28.0
@arizeai/openinference-semantic-conventions@^1.0.0
@arizeai/openinference-vercel@^2.0.0
```

### Dev Dependencies

```
typescript@^6.0.0
@vitejs/plugin-react@^4.0.0
tailwindcss@^4.0.0
@tailwindcss/vite@^4.0.0
oxlint@latest
oxfmt@latest
@types/node@^22.0.0
@types/react@^19.0.0
@types/react-dom@^19.0.0
```

### shadcn Components (Batch Install)

```
button card input dialog dropdown-menu scroll-area badge
separator tooltip tabs textarea checkbox skeleton sonner
select popover command label switch
```

## Implementation Phases

### Phase 1: Tooling Modernization

Status: completed

1. Upgrade TypeScript to 6.0.x
   - Update tsconfig.json for TS6 defaults (strict is now true by default, module defaults to esnext, target defaults to es2025)
   - Remove deprecated options (baseUrl as lookup root, moduleResolution: node)
   - Split into tsconfig.json + tsconfig.app.json + tsconfig.node.json
   - Add path alias: `@/*` -> `./src/renderer/*`
2. Replace ESLint with oxlint
   - Remove: eslint, @typescript-eslint/\*, eslint-plugin-import, .eslintrc.json
   - Add: oxlint, create .oxlintrc.json
3. Add oxfmt
   - Add: oxfmt
   - Update package.json scripts: lint, format, check
4. Verify Vite compatibility
   - Test @electron-forge/plugin-vite with highest Vite 5.x
   - Update vite.renderer.config.ts with React plugin + Tailwind plugin + path aliases
5. Restructure src/ directory
   - Move main.ts -> src/main/index.ts
   - Move preload.ts -> src/preload/index.ts
   - Create src/renderer/ directory structure
   - Update forge.config.ts entry points

### Phase 2: React 19 + UI Foundation

Status: completed

1. Install React 19 + ReactDOM 19 + @vitejs/plugin-react
2. Install Tailwind CSS 4 + @tailwindcss/vite
3. Configure vite.renderer.config.ts (React plugin, Tailwind plugin, path aliases)
4. Update index.html (add root div, update script entry)
5. Create src/renderer/main.tsx (React entry)
6. Create src/renderer/index.css (Tailwind import)
7. Initialize shadcn (pnpm dlx shadcn@latest init)
8. Batch install shadcn components
9. Create basic app shell (AppLayout, Sidebar, MainContent)
10. Verify app renders with `pnpm start`

### Phase 3: Electron IPC, Preload, Proxy, Store

Status: completed

1. Install electron-store, hono
2. Create src/main/store.ts (electron-store schema for projects + preferences)
3. Create src/main/proxy.ts (Hono server)
   - POST /v1/traces -> forward to Phoenix OTLP endpoint
   - GET/POST /v1/\* -> forward to Phoenix REST API
   - GET /health -> return proxy status + Phoenix ping
   - Inject Authorization header from store
   - Bind to 127.0.0.1, random port
   - Start/stop lifecycle functions
4. Create src/main/ipc.ts (register all IPC handlers)
   - projects:list, projects:create, projects:update, projects:delete
   - proxy:start, proxy:stop, proxy:status, proxy:port
   - keys:getLLM, keys:setLLM
   - preferences:get, preferences:set
5. Create src/preload/index.ts (contextBridge.exposeInMainWorld)
6. Create src/types/electron.d.ts (window.api types)
7. Update src/main/index.ts to register IPC handlers on app ready
8. Test IPC round-trip from renderer

### Phase 4: Phoenix Client + Trace Polling

Status: completed with direct REST access through the proxy

1. Install @arizeai/phoenix-client, @tanstack/react-query
2. Create src/renderer/lib/phoenix.ts
   - Factory function: createPhoenixClient(proxyPort)
   - Returns typed client pointing to http://127.0.0.1:<port>
3. Create src/renderer/hooks/use-proxy.ts
   - Polls proxy status/port via IPC
   - Exposes proxyPort, proxyStatus
4. Create src/renderer/hooks/use-phoenix-traces.ts
   - useQuery with configurable refetchInterval
   - Depends on proxyPort being available
5. Build trace list UI
   - TraceList: table with checkbox selection, timestamp, name, status, duration
   - TraceDetail: panel showing span tree, selected span details, attributes, and events
   - TraceFilters: Phoenix project, status, sort, order, search
6. Add polling interval control to UI

### Phase 5: Browser OTEL Setup

Status: completed for renderer-side export through the main-process proxy

1. Install @opentelemetry/api, @opentelemetry/sdk-trace-web, @opentelemetry/exporter-trace-otlp-http, @opentelemetry/resources, @opentelemetry/semantic-conventions
2. Install @arizeai/openinference-semantic-conventions, @arizeai/openinference-vercel
3. Create src/renderer/lib/otel.ts
   - initializeTracing(proxyPort, projectName): WebTracerProvider
   - shutdownTracing(): Promise<void>
   - Re-init on project switch (shutdown old, init new)
   - Resource attributes: SEMRESATTRS_PROJECT_NAME, service.name
4. Integrate with app lifecycle
   - Init tracing when proxy is ready + project is active
   - Shutdown on project switch or app close
5. Verify traces appear in Phoenix

### Phase 6: AI SDK Chat with Telemetry

Status: completed for direct renderer streaming and Phoenix telemetry export

1. Install ai, @ai-sdk/openai, @ai-sdk/anthropic
2. Create src/renderer/lib/ai.ts
   - createProvider(provider, apiKey, model): returns configured provider
   - Supports openai and anthropic
3. Create src/renderer/hooks/use-chat.ts
   - Wraps AI SDK streamText
   - Injects selected traces as system context
   - Enables experimental_telemetry: { isEnabled: true }
   - Manages message history
4. Build chat UI
   - ChatInterface: main container
   - MessageList: renders messages with markdown
   - ChatInput: textarea with send button
   - "Analyze selected traces" button in trace list
5. Verify chat traces appear in Phoenix (the key feedback loop!)

### Phase 7: Project/Connection Management

Status: completed for create/update/activate flows

1. Install zustand
2. Create src/renderer/stores/app-store.ts
   - activeProjectId, selectedTraceIds, chatMessages, sidebarOpen
3. Create project management UI
   - ProjectSelector: dropdown in sidebar showing projects, create button
   - ConnectionSettings: dialog for Phoenix URL, API key, LLM provider/key/model
4. Wire up project switching
   - Save to electron-store via IPC
   - Restart proxy with new Phoenix URL/auth
   - Re-initialize OTEL with new project name
   - Reset TanStack Query cache
   - Update Zustand store

### Phase 8: Polish & Status UI

Status: partially completed

Completed here:

- Responsive mobile stacked layout and desktop nested resizable layout
- Persisted panel sizes across restarts using `useDefaultLayout`
- Silent background polling so traces update without resetting the list UI
- Connection status/proxy indicator in the sidebar
- Initial Spotify-inspired panel polish and scroll-container cleanup

Remaining here:

- More trace-inspector polish and ergonomics
- Better narrow-width behavior for the trace list controls and columns
- Refactor the large `App.tsx` shell into smaller components
- Final scrollbar/overflow density pass after more real usage

1. Create ConnectionStatus component
   - Shows Phoenix URL (from project config, not proxy URL)
   - Connection indicator (green/yellow/red)
   - "Traces proxied via main process" tooltip
   - Polling interval display
2. Create PollingConfig component
   - Slider or input for polling interval
   - Persists to project config
3. Theme implementation
   - ThemeProvider using shadcn approach
   - System/dark/light toggle in sidebar footer
   - Persists to electron-store
4. Error handling
   - Connection errors with retry
   - LLM API errors with user feedback
   - Phoenix unreachable state in UI
5. Loading states
   - Skeleton loaders for trace list
   - Streaming indicator for chat
   - Proxy connecting state

## Key Learning Areas

1. **WebTracerProvider vs NodeTracerProvider** - Different APIs for browser context
2. **OTLP HTTP exporter** - Uses fetch, browser-native
3. **OpenInference span processing** - Transforms AI SDK spans to Phoenix-compatible format
4. **Dynamic tracer reconfiguration** - When user switches projects
5. **Context propagation in browser** - Zone.js-free context management
6. **Electron IPC patterns** - contextBridge, typed channels, preload security
7. **Hono in Electron main process** - Embedding an HTTP framework in a desktop app
8. **phoenix-client in browser** - Using a Node.js-oriented client in web context
9. **AI SDK telemetry** - experimental_telemetry integration with custom OTEL providers

## Open Considerations

- @arizeai/openinference-vercel uses OpenInferenceSimpleSpanProcessor -- in production, batch processing would be preferred, but simple is fine for this experimental app
- electron-store v11 is ESM-only; Vite in the main process handles this
- oxfmt is 0.x (pre-1.0); may have formatting quirks, but speed is the priority
- Phoenix REST API may evolve; phoenix-client abstracts this, but check compatibility with Phoenix server version (client ^2.0.0 requires server ^9.0.0)
