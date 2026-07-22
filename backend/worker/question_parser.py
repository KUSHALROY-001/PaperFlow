import re


QUESTION_START_RE = re.compile(
    r"(?im)(?:^|\n)\s*(?:q(?:uestion)?\.?\s*)?(\d{1,4})[\).:\-]\s+"
)

OPTION_RE = re.compile(
    r"(?is)(?:^|\n)\s*(?:\(?([A-Da-d])\)?[\).:\-])\s+(.+?)(?=(?:\n\s*\(?[A-Da-d]\)?[\).:\-]\s+)|\Z)"
)

ANSWER_RE = re.compile(
    r"(?i)(?:answer|ans|correct\s+option)\s*[:\-]?\s*\(?([A-D])\)?"
)

TOPIC_RE = re.compile(r"(?im)^topic\s*[:\-]\s*(.+)$")


def normalize_text(text):
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def split_question_blocks(text):
    matches = list(QUESTION_START_RE.finditer(text))
    blocks = []

    for index, match in enumerate(matches):
        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        question_no = int(match.group(1))
        blocks.append((question_no, text[start:end].strip()))

    return blocks


def parse_options(block):
    options = []
    for match in OPTION_RE.finditer(block):
        option_text = match.group(2).strip()
        option_text = ANSWER_RE.sub("", option_text).strip()
        option_text = re.sub(r"\s+", " ", option_text)
        if option_text:
            options.append(option_text)
    return options


def parse_answer(block):
    match = ANSWER_RE.search(block)
    if not match:
        return [0]

    return [ord(match.group(1).upper()) - ord("A")]


def strip_question_prefix(question_no, block):
    pattern = re.compile(
        rf"(?is)^\s*(?:q(?:uestion)?\.?\s*)?{question_no}[\).:\-]\s+"
    )
    return pattern.sub("", block, count=1).strip()


def remove_options_from_text(text):
    first_option = re.search(r"(?im)(?:^|\n)\s*\(?[A-Da-d]\)?[\).:\-]\s+", text)
    if first_option:
        text = text[: first_option.start()]

    text = ANSWER_RE.sub("", text)
    return re.sub(r"\s+", " ", text).strip()


def infer_topic(block):
    match = TOPIC_RE.search(block)
    if match:
        return match.group(1).strip()
    return None


def confidence_for(question_text, options, answer_indexes):
    confidence = 35
    if len(question_text) >= 20:
        confidence += 25
    if len(options) >= 4:
        confidence += 25
    elif len(options) >= 2:
        confidence += 10
    if answer_indexes and all(0 <= index < len(options) for index in answer_indexes):
        confidence += 15
    return min(confidence, 95)


def parse_questions(pages):
    combined = "\n\n".join(
        f"\n[PAGE {page['page']}]\n{page['text']}" for page in pages
    )
    text = normalize_text(combined)
    page_lookup = []

    for page in pages:
        for match in QUESTION_START_RE.finditer(page["text"]):
            page_lookup.append((int(match.group(1)), page["page"]))

    page_by_question = {}
    for question_no, page in page_lookup:
        page_by_question.setdefault(question_no, page)

    parsed = []
    seen_numbers = set()

    for fallback_index, (question_no, block) in enumerate(split_question_blocks(text), start=1):
        if question_no in seen_numbers:
            question_no = max(seen_numbers) + 1
        seen_numbers.add(question_no)

        raw_question = strip_question_prefix(question_no, block)
        options = parse_options(raw_question)

        if len(options) < 2:
            continue

        answer_indexes = parse_answer(raw_question)
        answer_indexes = [
            index for index in answer_indexes if 0 <= index < len(options)
        ] or [0]

        question_text = remove_options_from_text(raw_question)
        if not question_text:
            question_text = f"Question {question_no}"

        parsed.append(
            {
                "question_no": question_no or fallback_index,
                "topic": infer_topic(block),
                "text": question_text,
                "options": options,
                "correct_option_indexes": answer_indexes,
                "source_page": page_by_question.get(question_no),
                "confidence": confidence_for(question_text, options, answer_indexes),
                "metadata": {
                    "parser": "regex_v1",
                    "rawBlockPreview": block[:500],
                },
            }
        )

    return parsed
