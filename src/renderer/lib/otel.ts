import { trace } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

import {
  OpenInferenceSimpleSpanProcessor,
  isOpenInferenceSpan,
} from "@arizeai/openinference-vercel";
import { SEMRESATTRS_PROJECT_NAME } from "@arizeai/openinference-semantic-conventions";

let provider: WebTracerProvider | null = null;

export const shutdownTracing = async () => {
  if (!provider) {
    return;
  }

  await provider.shutdown();
  provider = null;
};

export const initializeTracing = async (proxyBaseUrl: string, projectName: string) => {
  await shutdownTracing();

  provider = new WebTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: "observer-renderer",
      [SEMRESATTRS_PROJECT_NAME]: projectName,
      "observer.project_name": projectName,
    }),
    spanProcessors: [
      new OpenInferenceSimpleSpanProcessor({
        exporter: new OTLPTraceExporter({
          url: `${proxyBaseUrl}/v1/traces`,
        }),
        spanFilter: isOpenInferenceSpan,
      }),
    ],
  });

  provider.register();
};

export const getChatTracer = () => trace.getTracer("observer.chat");
