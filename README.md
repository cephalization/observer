# Observer

![Observer demo](assets/demo.gif)

Observer is an Electron app that demonstrates how to trace browser-context AI interactions into Arize Phoenix.

Use this repo as a practical reference for tracing an Electron renderer or browser-style web application with OpenTelemetry, sending those traces to Phoenix, and then reading them back into the UI.

## What you will learn

- how to create a browser OpenTelemetry tracer provider in an Electron renderer
- how to export OTLP traces from a frontend context
- how to route those traces into Phoenix
- how to enable Vercel AI SDK telemetry and turn chat completions into traces
- how to query Phoenix traces and spans back into the app

## The first architecture decision

If you want to send traces from a browser or Electron renderer to Phoenix, you have to choose one of two architectures.

### Option A: Send traces directly from the browser to Phoenix

Use this if you want the simplest topology.

Requirements:

- Phoenix must be reachable from the browser
- Phoenix must allow the renderer origin via CORS
- the browser must be allowed to send OTLP requests to `BASE_URL/v1/traces`

To make Phoenix reachable from the browser:

- Configure `PHOENIX_ALLOWED_ORIGINS` as a comma-separated list of allowed origins, for example:

```bash
# As a shell environment variable
# or, in your docker configuration for your Phoenix instance
export PHOENIX_ALLOWED_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
# Then launch Phoenix, you will see the allowed origins in the startup message
```

For Electron-style schemes, include the exact app origin you want Phoenix to allow.

This is the path:

```text
browser or renderer
  -> <PHOENIX_BASE_URL>/v1/traces
```

### Option B: Proxy browser traces to Phoenix

Use this if you do not want to configure CORS on the Phoenix server.

This app uses this approach.

Requirements:

- the browser exports OTLP traces to a local proxy
- the backend proxy forwards those requests to Phoenix
- the connected Phoenix instance receives them at `BASE_URL/v1/traces`

This is the path in Observer:

```text
renderer browser context
  -> http://127.0.0.1:<proxy-port>/v1/traces
  -> <PHOENIX_BASE_URL>/v1/traces
```

That is the main tradeoff to understand:

- direct browser tracing requires Phoenix CORS configuration
- proxied browser tracing avoids Phoenix CORS configuration but adds a local forwarding layer

## The minimum requirements to send traces to Phoenix

No matter which architecture you choose, these pieces need to be correct.

### 1. Use a browser tracer provider

In a renderer or web app, use the browser SDK:

- `@opentelemetry/sdk-trace-web`

In this repo, see [`src/renderer/lib/otel.ts`](src/renderer/lib/otel.ts).

### 2. Export to `BASE_URL/v1/traces`

Phoenix OTLP ingestion happens at:

```text
<PHOENIX_BASE_URL>/v1/traces
```

In Observer:

- the renderer exports to `${proxyBaseUrl}/v1/traces`
- the proxy forwards that request to `${phoenixUrl}/v1/traces`

Code references:

- [`src/renderer/lib/otel.ts`](src/renderer/lib/otel.ts)
- [`src/main/proxy.ts`](src/main/proxy.ts)

### 3. Use an OTLP exporter Phoenix accepts

This app uses:

- `@opentelemetry/exporter-trace-otlp-proto`

The current exporter is configured in [`src/renderer/lib/otel.ts`](src/renderer/lib/otel.ts).

### 4. Set the Phoenix project on the OTEL resource

Phoenix project routing for ingested OTLP traces comes from the resource attribute:

- `openinference.project.name`

In this app that is set with:

- `SEMRESATTRS_PROJECT_NAME`

Code reference:

- [`src/renderer/lib/otel.ts`](src/renderer/lib/otel.ts)

Important note:

- this is a resource attribute
- it is not enough to set a span attribute
- headers do not choose the Phoenix project

### 5. Recreate the provider when the active project changes

If your app lets users switch projects, rebuild the tracer provider with the new project resource.

Observer does this in [`src/renderer/App.tsx`](src/renderer/App.tsx) by:

- shutting down the old provider
- creating a new one
- registering it with the new project name

### 6. Enable AI SDK telemetry

Observer traces Vercel AI SDK chat completions by enabling telemetry on `streamText(...)`.

Code reference:

- [`src/renderer/hooks/use-chat.ts`](src/renderer/hooks/use-chat.ts)

That hook sets:

```ts
experimental_telemetry: {
  isEnabled: true,
  functionId: "observer-trace-analysis",
  tracer: getChatTracer(),
}
```

### 7. Use OpenInference span processing

This app uses:

- `@arizeai/openinference-vercel`

That processor helps convert AI SDK telemetry into OpenInference/Phoenix-friendly spans.

Code reference:

- [`src/renderer/lib/otel.ts`](src/renderer/lib/otel.ts)

## Tutorial: tracing from an Electron renderer into Phoenix

This section maps the important steps directly to the code in this repo.

### Step 1: configure the Phoenix connection in Electron main

Observer stores the connected Phoenix base URL and optional auth in the main process.

Code references:

- [`src/main/store.ts`](src/main/store.ts)
- [`src/main/ipc.ts`](src/main/ipc.ts)

The key point is that the connected Phoenix instance has a concrete base URL like:

```text
http://localhost:6006
```

or

```text
https://your-phoenix-host
```

### Step 2: start a local proxy in Electron main

Observer starts a local HTTP server in the Electron main process.

Code reference:

- [`src/main/proxy.ts`](src/main/proxy.ts)

The important route for tracing is:

- `POST /v1/traces`

That route forwards directly to the connected Phoenix instance:

- `${phoenixUrl}/v1/traces`

This is what lets the renderer export traces without talking to Phoenix directly.

### Step 3: create the renderer tracer provider

Observer creates a `WebTracerProvider` in the renderer.

Code reference:

- [`src/renderer/lib/otel.ts`](src/renderer/lib/otel.ts)

The essential parts are:

- service name on the resource
- Phoenix project name on the resource
- OTLP exporter pointed at `proxyBaseUrl/v1/traces`

In this repo, that looks like:

```ts
provider = new WebTracerProvider({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "observer-renderer",
    [SEMRESATTRS_PROJECT_NAME]: projectName,
  }),
  spanProcessors: [
    new OpenInferenceSimpleSpanProcessor({
      exporter: new OTLPTraceExporter({
        url: `${proxyBaseUrl}/v1/traces`,
      }),
    }),
  ],
});
```

### Step 4: choose the Phoenix project for exported browser traces

Observer derives a telemetry project name for chat traces in:

- [`src/renderer/lib/otel.ts`](src/renderer/lib/otel.ts)

and applies it from:

- [`src/renderer/App.tsx`](src/renderer/App.tsx)

This is useful because it lets you separate:

- the Phoenix project you are exploring in the UI
- the Phoenix project where Observer writes its own browser-originated traces

### Step 5: enable telemetry on chat completions

Observer sends chat requests through the Vercel AI SDK in:

- [`src/renderer/hooks/use-chat.ts`](src/renderer/hooks/use-chat.ts)

That hook does two important things:

- passes selected trace/span context into the prompt
- enables AI SDK telemetry so the chat itself is traced

### Step 6: verify the proxy path

Observer makes the OTLP export destination visible in the sidebar.

Code references:

- [`src/renderer/App.tsx`](src/renderer/App.tsx)
- [`src/renderer/components/layout/app-sidebar.tsx`](src/renderer/components/layout/app-sidebar.tsx)

When configured correctly, the UI should make it clear that:

- the OTLP export target is `http://127.0.0.1:<port>/v1/traces`
- the proxy is connected to a real Phoenix base URL

## Querying traces and spans back into the app

Observer also demonstrates the other half of the loop: reading traces back out of Phoenix.

Code reference:

- [`src/renderer/lib/phoenix.ts`](src/renderer/lib/phoenix.ts)

This app uses Phoenix REST endpoints through the same proxy for:

- project discovery
- trace listing
- span lookup for a selected trace

That means the app is both:

- a Phoenix client
- a browser tracing example

## Files worth reading first

If you want the shortest guided path through the codebase, start here:

1. [`src/renderer/lib/otel.ts`](src/renderer/lib/otel.ts)
2. [`src/main/proxy.ts`](src/main/proxy.ts)
3. [`src/renderer/hooks/use-chat.ts`](src/renderer/hooks/use-chat.ts)
4. [`src/renderer/App.tsx`](src/renderer/App.tsx)
5. [`src/renderer/lib/phoenix.ts`](src/renderer/lib/phoenix.ts)

## Running the app

```bash
pnpm install
pnpm start
```

Useful checks:

```bash
pnpm typecheck
pnpm lint
pnpm check
```

## How to verify browser tracing works

1. Start Phoenix
2. Start Observer
3. Connect Observer to your Phoenix base URL
4. Select one or more traces in the UI
5. Send a chat analysis prompt
6. Confirm a new trace is exported by Observer into Phoenix

## Troubleshooting

### Phoenix returns `unsupported media type`

Make sure you are using an exporter Phoenix accepts.

In this app, the renderer uses:

- `@opentelemetry/exporter-trace-otlp-proto`

### Traces do not appear in the intended Phoenix project

Check that `SEMRESATTRS_PROJECT_NAME` is set on the provider resource in:

- [`src/renderer/lib/otel.ts`](src/renderer/lib/otel.ts)

### Browser traces are not reaching Phoenix

Check both legs of the route:

1. renderer exporter target: `proxyBaseUrl/v1/traces`
2. proxy forward target: `phoenixUrl/v1/traces`

Relevant files:

- [`src/renderer/lib/otel.ts`](src/renderer/lib/otel.ts)
- [`src/main/proxy.ts`](src/main/proxy.ts)

### `localhost:6006` behaves inconsistently

Normalize it to:

```text
http://localhost:6006
```

Observer does that in:

- [`src/main/store.ts`](src/main/store.ts)
- [`src/main/proxy.ts`](src/main/proxy.ts)

### Exact span lookup returns the wrong spans

In this app’s Phoenix instance, exact trace span filtering behaved correctly with:

- `trace_id=<id>`

That logic lives in:

- [`src/renderer/lib/phoenix.ts`](src/renderer/lib/phoenix.ts)
