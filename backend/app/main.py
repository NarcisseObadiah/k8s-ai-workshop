from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models import ChatRequest, ChatResponse
from app.gemini import ask_gemini

app = FastAPI(
    title="CloudAssist AI",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health():

    return {
        "status": "running",
        "application": "CloudAssist AI"
    }


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):

    answer = ask_gemini(request.prompt)

    return ChatResponse(answer=answer)
