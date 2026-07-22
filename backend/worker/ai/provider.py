from ..config import AI_MAX_CHARS_PER_CHUNK, AI_PROVIDER
from .schemas import extract_json_payload, normalize_ai_questions


SYSTEM_PROMPT = """
You convert extracted exam PDF text into clean mock-test question JSON.
Return only valid JSON. Do not include markdown.
Use zero-based option indexes.
If an answer is missing or uncertain, choose the most likely option, lower confidence, set needs_review true, and explain in issues.
Keep original meaning. Do not invent questions that are not present in the text.
Expected shape:
{
  "questions": [
    {
      "question_no": 1,
      "topic": null,
      "subtopic": null,
      "passage": null,
      "text": "Question text",
      "options": ["A option", "B option", "C option", "D option"],
      "correct_option_indexes": [0],
      "source_page": 1,
      "confidence": 0,
      "needs_review": true,
      "issues": []
    }
  ]
}
""".strip()


def get_provider():
    if AI_PROVIDER in ("", "disabled", "none", "off", "false"):
        return None

    if AI_PROVIDER == "openai":
        from .openai_provider import OpenAIProvider

        return OpenAIProvider()

    if AI_PROVIDER == "gemini":
        from .gemini_provider import GeminiProvider

        return GeminiProvider()

    raise RuntimeError(f"Unsupported AI_PROVIDER: {AI_PROVIDER}")


def enhance_questions_with_ai(pages, regex_questions, pdf_path=None):
    regex_count = len(regex_questions)
    provider = get_provider()
    if not provider:
        return regex_questions, {
            "enabled": False,
            "provider": "disabled",
            "regexQuestionsParsed": regex_count,
            "questionsFromAi": 0,
            "errors": [],
        }

    questions_by_no = {}
    errors = []

    for chunk_index, chunk in enumerate(chunk_pages(pages), start=1):
        user_prompt = build_user_prompt(chunk, regex_questions)
        try:
            response_text = provider.generate_json(SYSTEM_PROMPT, user_prompt)
            payload = extract_json_payload(response_text)
            ai_questions = normalize_ai_questions(payload, source=f"{provider.name}_ai_v1")
            for question in ai_questions:
                questions_by_no[question["question_no"]] = question
        except Exception as error:
            errors.append({"chunk": chunk_index, "message": str(error)})

    if not questions_by_no and pdf_path and hasattr(provider, "generate_json_from_pdf_images"):
        try:
            response_texts = provider.generate_json_from_pdf_images(
                SYSTEM_PROMPT,
                build_pdf_prompt(regex_questions),
                pdf_path,
            )
            for chunk_index, response_text in enumerate(response_texts, start=1):
                payload = extract_json_payload(response_text)
                ai_questions = normalize_ai_questions(payload, source=f"{provider.name}_image_ai_v1")
                for question in ai_questions:
                    questions_by_no[question["question_no"]] = question
        except Exception as error:
            errors.append({"chunk": "pdf_images", "message": str(error)})

    if not questions_by_no and pdf_path and hasattr(provider, "generate_json_from_pdf"):
        try:
            response_text = provider.generate_json_from_pdf(
                SYSTEM_PROMPT,
                build_pdf_prompt(regex_questions),
                pdf_path,
            )
            payload = extract_json_payload(response_text)
            ai_questions = normalize_ai_questions(payload, source=f"{provider.name}_pdf_ai_v1")
            for question in ai_questions:
                questions_by_no[question["question_no"]] = question
        except Exception as error:
            errors.append({"chunk": "pdf", "message": str(error)})

    ai_questions = [questions_by_no[key] for key in sorted(questions_by_no)]
    if not ai_questions:
        return regex_questions, {
            "enabled": True,
            "provider": provider.name,
            "regexQuestionsParsed": regex_count,
            "questionsFromAi": 0,
            "errors": errors,
            "fallback": "regex_parser",
        }

    return ai_questions, {
        "enabled": True,
        "provider": provider.name,
        "regexQuestionsParsed": regex_count,
        "questionsFromAi": len(ai_questions),
        "errors": errors,
        "fallback": None,
    }


def chunk_pages(pages):
    chunks = []
    current = []
    current_size = 0

    for page in pages:
        page_text = f"\n\n[PAGE {page['page']}]\n{page['text']}"
        if current and current_size + len(page_text) > AI_MAX_CHARS_PER_CHUNK:
            chunks.append("".join(current))
            current = []
            current_size = 0

        current.append(page_text)
        current_size += len(page_text)

    if current:
        chunks.append("".join(current))

    return chunks


def build_user_prompt(chunk, regex_questions):
    regex_preview = [
        {
            "question_no": question.get("question_no"),
            "text": question.get("text"),
            "options": question.get("options"),
            "correct_option_indexes": question.get("correct_option_indexes"),
            "confidence": question.get("confidence"),
        }
        for question in regex_questions[:20]
    ]

    return f"""
Extract and clean all MCQ questions from this PDF text chunk.
Use the regex parser preview as hints only. Prefer the PDF text when there is a conflict.

Regex parser preview:
{regex_preview}

PDF text chunk:
{chunk}
""".strip()


def build_pdf_prompt(regex_questions):
    regex_preview = [
        {
            "question_no": question.get("question_no"),
            "text": question.get("text"),
            "options": question.get("options"),
            "correct_option_indexes": question.get("correct_option_indexes"),
            "confidence": question.get("confidence"),
        }
        for question in regex_questions[:20]
    ]

    return f"""
Extract and clean all MCQ questions from the attached PDF.
This may be a scanned PDF, so inspect the PDF content directly.
Use the regex parser preview as hints only. If the preview is empty, rely on the PDF.

Regex parser preview:
{regex_preview}
""".strip()
