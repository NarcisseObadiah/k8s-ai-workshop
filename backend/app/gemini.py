import vertexai
from vertexai.generative_models import GenerativeModel

PROJECT_ID = "project-6bc48aee-fd23-426b-8c7"
LOCATION = "europe-west1"   # We'll verify this region later

vertexai.init(
    project=PROJECT_ID,
    location=LOCATION,
)

model = GenerativeModel("gemini-2.5-flash")


def ask_gemini(prompt: str):

    response = model.generate_content(prompt)

    return response.text
