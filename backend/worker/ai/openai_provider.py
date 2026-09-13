import json
from urllib import request

from ..config import AI_MODEL, AI_TIMEOUT_SECONDS, OPENAI_API_KEY
from .schemas import OPENAI_QUESTION_RESPONSE_SCHEMA, OPENAI_TEMPLATE_RESPONSE_SCHEMA


OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"

QUESTION_TEXT_FORMAT = {
    "format": {
        "type": "json_schema",
        "name": "question_extraction",
        "schema": OPENAI_QUESTION_RESPONSE_SCHEMA,
        "strict": True,
    }
}

# Own dedicated structured-output format - generate_json below is hardwired
# to QUESTION_TEXT_FORMAT (and always has been; every other AI feature in
# this codebase only ever asks for questions), so a template-generation
# request has to go through its own method with its own format rather than
# risk having OpenAI's strict mode force the response into the wrong shape.
TEMPLATE_TEXT_FORMAT = {
    "format": {
        "type": "json_schema",
        "name": "template_generation",
        "schema": OPENAI_TEMPLATE_RESPONSE_SCHEMA,
        "strict": True,
    }
}


class OpenAIProvider:
    name = "openai"

    def __init__(self):
        if not OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY is required when AI_PROVIDER=openai")
        self.model = AI_MODEL or "gpt-5"

    def _request(self, system_prompt, user_prompt, text_format, max_output_tokens, tools=None):
        payload = {
            "model": self.model,
            "input": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "max_output_tokens": max_output_tokens,
            "text": text_format,
        }
        if tools:
            payload["tools"] = tools

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

    def generate_json(self, system_prompt, user_prompt):
        return self._request(
            system_prompt, user_prompt, QUESTION_TEXT_FORMAT, 12000
        )

    # A template draft is one small object - kept modest so a wandering
    # response gets cut off (surfacing as a clear parse error) rather than
    # silently costing far more than this feature should ever need. Bumped
    # from the original 2000 to 4000 to leave room for the web_search
    # tool's own intermediate call/result items, which OpenAI counts
    # against this same output budget before the final structured message
    # - the final JSON object itself is still tiny.
    #
    # Unlike Gemini (see gemini_provider.py#generate_template_json's
    # two-call workaround), OpenAI's Responses API supports combining a
    # tool (web_search) with text.format structured output in one call,
    # so this stays single-call: the model searches for the exam's
    # current pattern and returns the schema-constrained JSON directly.
    def generate_template_json(self, system_prompt, user_prompt):
        return self._request(
            system_prompt,
            user_prompt,
            TEMPLATE_TEXT_FORMAT,
            4000,
            tools=[{"type": "web_search"}],
        )