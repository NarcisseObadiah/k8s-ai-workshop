import type { ChatMessage } from "../types";

interface MessageProps {
  message: ChatMessage;
}

export function Message({ message }: MessageProps) {
  const isAssistant = message.role === "assistant";

  return (
    <article
      className={`message ${isAssistant ? "message-assistant" : "message-user"}`}
    >
      <div className="message-avatar" aria-hidden="true">
        {isAssistant ? "AI" : "You"}
      </div>

      <div className="message-content">
        <span className="message-author">
          {isAssistant ? "CloudAssist AI" : "You"}
        </span>

        <p>{message.content}</p>
      </div>
    </article>
  );
}