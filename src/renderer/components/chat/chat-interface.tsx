import { useState } from "react";

import type { ChatMessage, Project } from "../../../shared/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const MessageBlock = ({ message }: { message: ChatMessage }) => (
  <div
    className={`rounded-2xl border px-4 py-3 ${message.role === "assistant" ? "border-white/10 bg-white/5" : "border-[color:var(--primary)]/20 bg-[color:var(--primary)]/10"}`}
  >
    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
      {message.role}
    </p>
    <p className="whitespace-pre-wrap text-sm leading-6">{message.content || "..."}</p>
  </div>
);

export const ChatInterface = ({
  project,
  messages,
  selectedTraceCount,
  isStreaming,
  error,
  onSend,
  onClear,
}: {
  project: Project | null;
  messages: ChatMessage[];
  selectedTraceCount: number;
  isStreaming: boolean;
  error: string | null;
  onSend: (content: string) => Promise<void>;
  onClear: () => void;
}) => {
  const [value, setValue] = useState("");

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden py-4">
      <CardHeader className="border-b border-white/8 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Trace analysis chat</CardTitle>
            <CardDescription className="max-w-[32rem] leading-5">
              Stream model output in the renderer while telemetry exports route to Phoenix through
              the proxy.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClear}>
              Clear
            </Button>
            <Button
              size="sm"
              disabled={!project || !value.trim() || isStreaming}
              onClick={async () => {
                const nextValue = value;
                setValue("");
                await onSend(nextValue);
              }}
            >
              {isStreaming ? "Streaming..." : "Send"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-5 pt-4">
        <div className="rounded-2xl border border-dashed border-white/8 bg-black/20 px-4 py-2.5 text-sm text-[color:var(--muted-foreground)]">
          Selected traces in context:{" "}
          <span className="font-semibold text-[color:var(--foreground)]">{selectedTraceCount}</span>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-auto pr-1">
          {messages.length === 0 ? (
              <div className="rounded-2xl border border-white/8 bg-white/3 px-4 py-5 text-sm text-[color:var(--muted-foreground)]">
              Ask the model to summarize, compare, or critique selected traces. Observer will stream
              the response and trace the completion back into Phoenix.
            </div>
          ) : null}
          {messages.map((message) => (
            <MessageBlock key={message.id} message={message} />
          ))}
        </div>
        <div className="space-y-3">
          <Textarea
            placeholder={
              project
                ? "Ask about selected traces, failure modes, slow spans, or prompt design."
                : "Create a project to start chatting."
            }
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
};
