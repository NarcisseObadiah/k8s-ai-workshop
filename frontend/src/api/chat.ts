import type { ChatApiResponse } from "../types";

interface ApiErrorResponse {
  detail?: string;
  message?: string;
}

export async function sendChatMessage(prompt: string): Promise<string> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const errorData = (await response.json()) as ApiErrorResponse;
      message = errorData.detail ?? errorData.message ?? message;
    } catch {
      // The response did not contain JSON.
    }

    throw new Error(message);
  }

  const data = (await response.json()) as ChatApiResponse;

  if (!data.answer) {
    throw new Error("The backend returned an empty response.");
  }

  return data.answer;
}