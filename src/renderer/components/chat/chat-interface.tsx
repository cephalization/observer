import { useState } from "react";

import { MessageSquareTextIcon, PinIcon, PinOffIcon, RotateCcwIcon } from "lucide-react";

import type { ChatMessage, Project } from "../../../shared/types";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const MessageBlock = ({ message }: { message: ChatMessage }) => (
  <Message from={message.role}>
    <MessageContent>
      <MessageResponse>{message.content || "..."}</MessageResponse>
    </MessageContent>
  </Message>
);

export const ChatInterface = ({
  project,
  messages,
  selectedTraceCount,
  selectedSpanCount,
  isContextLoading,
  isPinned,
  isStreaming,
  error,
  onSend,
  onClear,
  onTogglePinned,
}: {
  project: Project | null;
  messages: ChatMessage[];
  selectedTraceCount: number;
  selectedSpanCount: number;
  isContextLoading: boolean;
  isPinned: boolean;
  isStreaming: boolean;
  error: string | null;
  onSend: (content: string) => Promise<void>;
  onClear: () => void;
  onTogglePinned: () => void;
}) => {
  const [value, setValue] = useState("");

  const handleSubmit = async (message: PromptInputMessage) => {
    if (!message.text.trim()) {
      return;
    }

    setValue("");
    await onSend(message.text);
  };

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden py-4">
      <CardHeader className="border-b border-white/8 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Trace analysis chat</CardTitle>
            <CardDescription className="max-w-[32rem] leading-5">
              Stream model output in the renderer while telemetry exports route to Phoenix through
              the proxy.
            </CardDescription>
            {project ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="secondary">{project.llmProvider}</Badge>
                <Badge variant="outline">{project.llmModel}</Badge>
                <Badge variant="outline">{selectedSpanCount} child spans</Badge>
              </div>
            ) : null}
          </div>
          <MessageActions>
            <MessageAction
              label={isPinned ? "Unpin chat pane" : "Pin chat pane"}
              onClick={onTogglePinned}
              tooltip={isPinned ? "Unpin chat pane" : "Pin chat pane"}
            >
              {isPinned ? <PinOffIcon className="size-3.5" /> : <PinIcon className="size-3.5" />}
            </MessageAction>
            <MessageAction label="Clear conversation" onClick={onClear} tooltip="Clear conversation">
              <RotateCcwIcon className="size-3.5" />
            </MessageAction>
          </MessageActions>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-5 pt-4">
        <div className="rounded-2xl border border-dashed border-white/8 bg-black/20 px-4 py-2.5 text-sm text-[color:var(--muted-foreground)]">
          Selected traces in context: <span className="font-semibold text-foreground">{selectedTraceCount}</span>
          <span className="mx-2 text-white/20">/</span>
          span records: <span className="font-semibold text-foreground">{selectedSpanCount}</span>
        </div>

        <Conversation className="min-h-0 flex-1 rounded-2xl border border-white/6 bg-black/15">
          <ConversationContent className="gap-4 p-5">
            {messages.length === 0 ? (
              <ConversationEmptyState
                description="Ask the model to summarize, compare, or critique selected traces. Observer will stream the response and trace the completion back into Phoenix."
                icon={<MessageSquareTextIcon className="size-10" />}
                title="Start trace analysis"
              />
            ) : (
              messages.map((message) => <MessageBlock key={message.id} message={message} />)
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <PromptInput className="mt-auto" onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea
              onChange={(event) => setValue(event.currentTarget.value)}
              placeholder={
                project
                  ? "Ask about selected traces, failure modes, slow spans, or prompt design."
                  : "Create a project to start chatting."
              }
              value={value}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputButton disabled variant="ghost">
                {selectedTraceCount} traces
              </PromptInputButton>
              <PromptInputButton disabled variant="ghost">
                {isContextLoading ? "loading spans..." : `${selectedSpanCount} spans`}
              </PromptInputButton>
            </PromptInputTools>
            <PromptInputSubmit
              disabled={!project || !value.trim() || isContextLoading}
              status={isStreaming ? "streaming" : "ready"}
            />
          </PromptInputFooter>
        </PromptInput>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </CardContent>
    </Card>
  );
};
