import { useEffect, useMemo, useRef, useState } from "react";

import { streamText } from "ai";

import type { ChatMessage, Project, SpanRecord, TraceRecord } from "../../shared/types";
import { createLanguageModel } from "../lib/ai";
import { getChatTracer } from "../lib/otel";

const createMessage = (role: ChatMessage["role"], content: string): ChatMessage => ({
  id: crypto.randomUUID(),
  role,
  content,
});

const serializeSpan = (span: SpanRecord) => ({
  attributes: span.attributes,
  durationMs: span.durationMs,
  events: span.events,
  name: span.name,
  parentSpanId: span.parentSpanId,
  spanId: span.spanId,
  spanKind: span.spanKind,
  statusCode: span.statusCode,
  statusMessage: span.statusMessage,
});

const buildTraceContext = (
  traces: TraceRecord[],
  selectedTraceSpansByTraceId: Record<string, SpanRecord[]>,
) => {
  if (traces.length === 0) {
    return "No Phoenix traces are currently selected.";
  }

  return JSON.stringify(
    traces.map((trace) => ({
      childSpans: (selectedTraceSpansByTraceId[trace.traceId] ?? []).map(serializeSpan),
      traceId: trace.traceId,
      projectName: trace.projectName,
      statusCode: trace.statusCode,
      rootSpanName: trace.rootSpanName,
      startTime: trace.startTime,
      endTime: trace.endTime,
      latencyMs: trace.latencyMs,
      raw: trace.raw,
    })),
    null,
    2,
  );
};

export const useChat = (
  project: Project | null,
  selectedTraces: TraceRecord[],
  selectedTraceSpansByTraceId: Record<string, SpanRecord[]>,
) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const selectedTraceIds = useMemo(
    () => selectedTraces.map((trace) => trace.traceId),
    [selectedTraces],
  );

  const sendMessage = async (content: string) => {
    if (!project || !content.trim()) {
      return;
    }

    const nextUserMessage = createMessage("user", content.trim());
    const assistantMessage = createMessage("assistant", "");
    const priorMessages = [...messagesRef.current, nextUserMessage];
    setMessages([...priorMessages, assistantMessage]);
    setIsStreaming(true);
    setError(null);

    try {
      const result = streamText({
        model: createLanguageModel(project),
        system: [
          "You are Observer, an assistant that analyzes Phoenix traces.",
          "Be concise, technical, and action-oriented.",
          `Selected trace ids: ${selectedTraceIds.join(", ") || "none"}`,
          buildTraceContext(selectedTraces, selectedTraceSpansByTraceId),
        ].join("\n\n"),
        messages: priorMessages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        experimental_telemetry: {
          isEnabled: true,
          functionId: "observer-trace-analysis",
          tracer: getChatTracer(),
          metadata: {
            observerProjectId: project.id,
            observerProjectName: project.name,
            selectedTraceCount: selectedTraces.length,
          },
        },
      });

      for await (const chunk of result.textStream) {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantMessage.id
              ? { ...message, content: `${message.content}${chunk}` }
              : message,
          ),
        );
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to stream chat response";
      setError(message);
      setMessages((current) =>
        current.map((chatMessage) =>
          chatMessage.id === assistantMessage.id
            ? { ...chatMessage, content: `Error: ${message}` }
            : chatMessage,
        ),
      );
    } finally {
      setIsStreaming(false);
    }
  };

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
    clear: () => setMessages([]),
  };
};
