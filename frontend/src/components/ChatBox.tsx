import { useState } from "react";
import type {
  FormEvent,
  KeyboardEvent,
} from "react";

import { sendChatMessage } from "../api/chat";
import type { ChatMessage } from "../types";
import { Message } from "./Message";

const initialMessages: ChatMessage[] = [
  {
    id: "welcome-message",
    role: "assistant",
    content:
      "Hello! I am CloudAssist AI. Ask me anything about Kubernetes, Google Cloud, or cloud-native applications.",
  },
];

function createMessageId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

export function ChatBox() {
  const [messages, setMessages] =
    useState<ChatMessage[]>(initialMessages);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const cleanedPrompt = prompt.trim();

    if (!cleanedPrompt || loading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: "user",
      content: cleanedPrompt,
    };

    setMessages((currentMessages) => [
      ...currentMessages,
      userMessage,
    ]);

    setPrompt("");
    setLoading(true);

    try {
      const answer = await sendChatMessage(cleanedPrompt);

      const assistantMessage: ChatMessage = {
        id: createMessageId(),
        role: "assistant",
        content: answer,
      };

      setMessages((currentMessages) => [
        ...currentMessages,
        assistantMessage,
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createMessageId(),
          role: "assistant",
          content: `I could not complete that request. ${errorMessage}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
  ): void {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  function clearConversation(): void {
    setMessages(initialMessages);
    setPrompt("");
  }

  return (
    <section className="chat-card">
      <div className="chat-toolbar">
        <div>
          <p className="toolbar-label">Live conversation</p>
          <p className="toolbar-description">
            Powered by FastAPI and Gemini on Google Cloud
          </p>
        </div>

        <button
          type="button"
          className="clear-button"
          onClick={clearConversation}
          disabled={loading}
        >
          Clear chat
        </button>
      </div>

      <div
        className="messages"
        aria-live="polite"
        aria-label="Conversation"
      >
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}

        {loading && (
          <article className="message message-assistant">
            <div className="message-avatar" aria-hidden="true">
              AI
            </div>

            <div className="message-content">
              <span className="message-author">
                CloudAssist AI
              </span>

              <div
                className="typing-indicator"
                aria-label="CloudAssist AI is responding"
              >
                <span />
                <span />
                <span />
              </div>
            </div>
          </article>
        )}
      </div>

      <form className="composer" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="chat-prompt">
          Ask CloudAssist AI a question
        </label>

        <textarea
          id="chat-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about Kubernetes, GKE, or AI governance..."
          rows={3}
          maxLength={2000}
          disabled={loading}
        />

        <div className="composer-footer">
          <span>
            Press Enter to send · Shift + Enter for a new line
          </span>

          <button
            className="send-button"
            type="submit"
            disabled={loading || !prompt.trim()}
          >
            {loading ? "Thinking…" : "Send"}
          </button>
        </div>
      </form>
    </section>
  );
}