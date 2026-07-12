import os

from google import genai


PROJECT_ID = os.getenv(
    "GOOGLE_CLOUD_PROJECT",
    "project-6bc48aee-fd23-426b-8c7",
)

LOCATION = os.getenv(
    "GOOGLE_CLOUD_LOCATION",
    "global",
)

MODEL_NAME = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.1-flash-lite",
)

client = genai.Client(
    vertexai=True,
    project=PROJECT_ID,
    location=LOCATION,
)


def ask_gemini(prompt: str) -> str:
    cleaned_prompt = prompt.strip()

    if not cleaned_prompt:
        raise ValueError("Prompt cannot be empty.")

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=cleaned_prompt,
    )

    if not response.text:
        raise RuntimeError("Gemini returned an empty response.")

    return response.text
