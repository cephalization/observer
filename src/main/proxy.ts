import { createAdaptorServer } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import type { Project, ProxyStatus } from "../shared/types.js";

type ProxyState = ProxyStatus & {
  server: ReturnType<typeof createAdaptorServer> | null;
};

const state: ProxyState = {
  state: "stopped",
  baseUrl: null,
  port: null,
  projectId: null,
  projectName: null,
  reachable: false,
  error: null,
  server: null,
};

const setErrorState = (error: string | null) => {
  if (error) {
    state.state = "error";
  }

  state.error = error;
};

const normalizePhoenixUrl = (value: string) => {
  const trimmed = value.trim();
  const withScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;

  return withScheme.replace(/\/+$/, "");
};

const buildHeaders = (project: Project, request: Request) => {
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "host") {
      headers.set(key, value);
    }
  });

  if (project.phoenixApiKey) {
    headers.set("Authorization", `Bearer ${project.phoenixApiKey}`);
  }

  return headers;
};

const buildProxyResponse = (response: Response) => {
  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-encoding");

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
};

const forwardRequest = async ({
  body,
  headers,
  method,
  targetUrl,
}: {
  body?: ArrayBuffer;
  headers: Headers;
  method: string;
  targetUrl: string;
}) => {
  const response = await fetch(targetUrl, {
    method,
    headers,
    body,
  });

  return buildProxyResponse(response);
};

const createProxyApp = (project: Project) => {
  const app = new Hono();
  const phoenixUrl = normalizePhoenixUrl(project.phoenixUrl);

  app.use(
    "*",
    cors({
      origin: "*",
      allowHeaders: ["*"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    }),
  );

  app.get("/health", async (context) => {
    await refreshProxyHealth();
    return context.json(getProxyStatus(), state.reachable ? 200 : 503);
  });

  app.get("/arize_phoenix_version", async (context) => {
    const response = await fetch(`${phoenixUrl}/arize_phoenix_version`, {
      headers: buildHeaders(project, context.req.raw),
    });

    return buildProxyResponse(response);
  });

  app.post("/v1/traces", async (context) => {
    const headers = buildHeaders(project, context.req.raw);
    const body = await context.req.raw.arrayBuffer();

    return forwardRequest({
      body,
      headers,
      method: "POST",
      targetUrl: `${phoenixUrl}/v1/traces`,
    });
  });

  app.all("/v1/*", async (context) => {
    const url = new URL(context.req.url);
    const targetUrl = `${phoenixUrl}${url.pathname}${url.search}`;
    const method = context.req.method;
    const headers = buildHeaders(project, context.req.raw);
    const body =
      method === "GET" || method === "HEAD" ? undefined : await context.req.raw.arrayBuffer();

    return forwardRequest({
      body,
      headers,
      method,
      targetUrl,
    });
  });

  return app;
};

export const getProxyStatus = (): ProxyStatus => ({
  state: state.state,
  baseUrl: state.baseUrl,
  port: state.port,
  projectId: state.projectId,
  projectName: state.projectName,
  reachable: state.reachable,
  error: state.error,
});

export const refreshProxyHealth = async () => {
  if (!state.baseUrl || !state.projectId) {
    state.reachable = false;
    return getProxyStatus();
  }

  try {
    const response = await fetch(`${state.baseUrl}/arize_phoenix_version`);
    state.reachable = response.ok;
    setErrorState(response.ok ? null : `Phoenix responded with ${response.status}`);
    if (response.ok && state.state === "error") {
      state.state = "ready";
    }
  } catch (cause) {
    state.reachable = false;
    setErrorState(cause instanceof Error ? cause.message : "Unable to reach Phoenix");
  }

  return getProxyStatus();
};

export const stopProxy = async () => {
  if (!state.server) {
    state.state = "stopped";
    state.baseUrl = null;
    state.port = null;
    state.projectId = null;
    state.projectName = null;
    state.reachable = false;
    state.error = null;
    return getProxyStatus();
  }

  await new Promise<void>((resolve, reject) => {
    state.server?.close((error?: Error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  state.server = null;
  state.state = "stopped";
  state.baseUrl = null;
  state.port = null;
  state.projectId = null;
  state.projectName = null;
  state.reachable = false;
  state.error = null;
  return getProxyStatus();
};

export const startProxy = async (project: Project) => {
  try {
    await stopProxy();

    state.state = "starting";
    state.projectId = project.id;
    state.projectName = project.name;

    const app = createProxyApp(project);
    const server = createAdaptorServer(app);

    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => {
        server.off("error", reject);
        resolve();
      });
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Proxy did not bind to a TCP port");
    }

    state.server = server;
    state.port = address.port;
    state.baseUrl = `http://127.0.0.1:${address.port}`;
    state.state = "ready";
    state.error = null;

    await refreshProxyHealth();
    return getProxyStatus();
  } catch (cause) {
    state.server = null;
    state.port = null;
    state.baseUrl = null;
    state.reachable = false;
    setErrorState(cause instanceof Error ? cause.message : "Failed to start proxy");
    return getProxyStatus();
  }
};
