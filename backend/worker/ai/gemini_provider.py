import base64
import json
from urllib import request

import fitz

from ..config import (
    AI_MODEL,
    AI_PDF_PAGES_PER_CHUNK,
    AI_PDF_RENDER_SCALE,
    AI_TIMEOUT_SECONDS,
    GEMINI_API_KEY,
)


class GeminiProvider:
    name = "gemini"

    def __init__(self):
        if not GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is required when AI_PROVIDER=gemini")
        self.model = AI_MODEL or "gemini-flash-latest"

    def generate_json(self, system_prompt, user_prompt):
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": f"{system_prompt}\n\n{user_prompt}"},
                    ],
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
            },
        }

        req = request.Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "x-goog-api-key": GEMINI_API_KEY,
                "Content-Type": "application/json",
            },
            method="POST",
        )

        with request.urlopen(req, timeout=AI_TIMEOUT_SECONDS) as response:
            data = json.loads(response.read().decode("utf-8"))

        parts = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [])
        )
        return "\n".join(part.get("text", "") for part in parts).strip()

    def generate_json_from_pdf(self, system_prompt, user_prompt, pdf_path):
        pdf_bytes = pdf_path.read_bytes()
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": f"{system_prompt}\n\n{user_prompt}"},
                        {
                            "inline_data": {
                                "mime_type": "application/pdf",
                                "data": base64.b64encode(pdf_bytes).decode("ascii"),
                            }
                        },
                    ],
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
            },
        }

        req = request.Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "x-goog-api-key": GEMINI_API_KEY,
                "Content-Type": "application/json",
            },
            method="POST",
        )

        with request.urlopen(req, timeout=AI_TIMEOUT_SECONDS) as response:
            data = json.loads(response.read().decode("utf-8"))

        parts = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [])
        )
        return "\n".join(part.get("text", "") for part in parts).strip()

    def generate_json_from_pdf_images(self, system_prompt, user_prompt, pdf_path):
        responses = []

        with fitz.open(pdf_path) as document:
            for start_index in range(0, document.page_count, AI_PDF_PAGES_PER_CHUNK):
                page_parts = []
                end_index = min(start_index + AI_PDF_PAGES_PER_CHUNK, document.page_count)

                for page_index in range(start_index, end_index):
                    page = document[page_index]
                    pixmap = page.get_pixmap(
                        matrix=fitz.Matrix(AI_PDF_RENDER_SCALE, AI_PDF_RENDER_SCALE),
                        alpha=False,
                    )
                    page_parts.append(
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": base64.b64encode(pixmap.tobytes("jpeg")).decode("ascii"),
                            }
                        }
                    )

                prompt = (
                    f"{system_prompt}\n\n{user_prompt}\n\n"
                    f"Attached images are PDF pages {start_index + 1} to {end_index}. "
                    "Use these page numbers for source_page."
                )
                responses.append(self._generate_from_parts([{"text": prompt}, *page_parts]))

        return responses

    def _generate_from_parts(self, parts):
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": parts,
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
            },
        }

        req = request.Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "x-goog-api-key": GEMINI_API_KEY,
                "Content-Type": "application/json",
            },
            method="POST",
        )

        with request.urlopen(req, timeout=AI_TIMEOUT_SECONDS) as response:
            data = json.loads(response.read().decode("utf-8"))

        parts = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [])
        )
        return "\n".join(part.get("text", "") for part in parts).strip()
