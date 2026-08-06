import json
from urllib import request

from ..config import AI_MODEL, AI_TIMEOUT_SECONDS, OPENAI_API_KEY
from .schemas import OPENAI_QUESTION_RESPONSE_SCHEMA


OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"

QUESTION_TEXT_FORMAT = {
    "format": {
        "type": "json_schema",
        "name": "question_extraction",
        "schema": OPENAI_QUESTION_RESPONSE_SCHEMA,
        "strict": True,
    }
}


class OpenAIProvider:
    name = "openai"

    def __init__(self):
        if not OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY is required when AI_PROVIDER=openai")
        self.model = AI_MODEL or "gpt-5"

    def generate_json(self, system_prompt, user_prompt):
        payload = {
            "model": self.model,
            "input": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "max_output_tokens": 12000,
            "text": QUESTION_TEXT_FORMAT,
        }

        req = request.Request(
            OPENAI_RESPONSES_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        with request.urlopen(req, timeout=AI_TIMEOUT_SECONDS) as response:
            data = json.loads(response.read().decode("utf-8"))

        if data.get("output_text"):
            return data["output_text"]

        chunks = []
        for item in data.get("output", []):
            for content in item.get("content", []):
                text = content.get("text")
                if text:
                    chunks.append(text)

        return "\n".join(chunks)