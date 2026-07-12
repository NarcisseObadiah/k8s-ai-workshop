import { useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import "./App.css";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

type ChatResponse = {
  answer?: string;
  response?: string;
  message?: string;
  detail?: string;
};

const quickPrompts = [
  "Explain Kubernetes simply",
  "What is GKE Autopilot?",
  "How does self-healing work?",
  "Explain rolling updates",
];

const welcomeMessage: Message = {
  id: 1,
  role: "assistant",
  content:
    "Welcome to CloudAssist AI Workshop v2. Ask me about Kubernetes, GKE, containers, or cloud-native AI.",
};

function App() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  async function sendPrompt(value: string) {
    const cleanedPrompt = value.trim();

    if (!cleanedPrompt || isLoading) {
      return;
    }

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: cleanedPrompt,
    };

    setMessages((current) => [...current, userMessage]);
    setPrompt("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: cleanedPrompt,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as ChatResponse;

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.message ||
            `Request failed with status ${response.status}`,
        );
      }

      const answer =
        data.answer ||
        data.response ||
        data.message ||
        "The AI service completed the request but returned no text.";

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: answer,
        },
      ]);

      setIsConnected(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to connect to the AI backend.";

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: `Connection error: ${message}`,
        },
      ]);

      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendPrompt(prompt);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendPrompt(prompt);
    }
  }

  function clearChat() {
    setMessages([welcomeMessage]);
    setPrompt("");
    setIsConnected(false);
  }

  return (
    <main className="app-shell">
      <div className="orb orb-one" />
      <div className="orb orb-two" />
      <div className="orb orb-three" />

      <section className="app-card">
        <header className="app-header">
          <div className="brand">
            <div className="brand-logo">CA</div>

            <div>
              <div className="title-line">
                <h1>CloudAssist AI</h1>
                <span className="version-badge">Workshop v2</span>
              </div>

              <p>AI-powered Kubernetes learning on Google Cloud</p>
            </div>
          </div>

          <div className={`status ${isConnected ? "connected" : ""}`}>
            <span className="status-dot" />
            {isConnected ? "Vertex AI connected" : "Ready"}
          </div>
        </header>

        <section className="hero">
          <div>
            <span className="eyebrow">ENHANCED RELEASE</span>

            <h2>Your cloud-native AI copilot</h2>

            <p>
              Explore GKE Autopilot, Kubernetes self-healing, scaling,
              deployments, and production AI operations.
            </p>
          </div>

          <div className="kubernetes-icon">☸</div>
        </section>

        <section className="quick-prompts">
          {quickPrompts.map((quickPrompt) => (
            <button
              key={quickPrompt}
              type="button"
              disabled={isLoading}
              onClick={() => void sendPrompt(quickPrompt)}
            >
              {quickPrompt}
            </button>
          ))}
        </section>

        <section className="chat-toolbar">
          <span>
            {messages.length - 1}{" "}
            {messages.length - 1 === 1 ? "message" : "messages"}
          </span>

          <button type="button" onClick={clearChat}>
            Clear chat
          </button>
        </section>

        <section className="messages" aria-live="polite">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`message ${message.role}`}
            >
              <div className="avatar">
                {message.role === "assistant" ? "AI" : "You"}
              </div>

              <div className="message-bubble">
                <strong>
                  {message.role === "assistant"
                    ? "CloudAssist"
                    : "You"}
                </strong>

                <p>{message.content}</p>
              </div>
            </article>
          ))}

          {isLoading && (
            <article className="message assistant">
              <div className="avatar">AI</div>

              <div className="message-bubble">
                <strong>CloudAssist is thinking</strong>

                <div className="typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </article>
          )}
        </section>

        <form className="prompt-form" onSubmit={handleSubmit}>
          <textarea
            value={prompt}
            rows={2}
            disabled={isLoading}
            placeholder="Ask CloudAssist about Kubernetes or Google Cloud..."
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={handleKeyDown}
          />

          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
          >
            {isLoading ? "Thinking..." : "Send"}
          </button>
        </form>

        <footer>
          <span>Powered by Vertex AI</span>
          <span>•</span>
          <span>Running on GKE Autopilot</span>
          <span>•</span>
          <span>Release v2</span>
        </footer>
      </section>
    </main>
  );
}

export default App;
