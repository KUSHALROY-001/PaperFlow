"""Exam-name -> template-draft generation for the /generate-template
endpoint (template-generate-client.js). Unrelated to PDF question
extraction - split out of provider.py, see backend/worker/ARCHITECTURE.md.
"""

from ..schema import extract_json_payload

# ---------------------------------------------------------------------------
# Template generation ("Build with AI" on Create Template - see
# http_server.py's POST /generate-template, the synchronous entry point
# that calls this). Unlike everything else in this module, there are no
# questions involved at all - just exam metadata (sections, marks,
# duration) drawn from whatever the model already knows about a
# well-known exam's real pattern.
# ---------------------------------------------------------------------------
TEMPLATE_GENERATION_SYSTEM_PROMPT = """
You are an expert on exam formats and patterns from around the world -
entrance exams, government/banking recruitment exams, school exams, and
general study test formats.

Given the name of an exam, return a JSON object describing that exam's
REAL, CURRENT structure as accurately as you can. Exam patterns change
over time - section splits, question counts, and marking schemes
(especially negative marking) get revised by conducting bodies from year
to year, so an older or memorized pattern can be actively wrong even for
a well-known exam. Use search results / research findings about the
exam's most recently published official pattern when they're available to
you, and prefer them over your own general training knowledge wherever
the two disagree - your training data has a cutoff and may predate a
pattern change. If it's not a specific well-known exam (e.g. a generic
school subject or an exam you don't recognize), produce a sensible,
realistic structure for that kind of exam rather than inventing
implausible numbers.

Return only valid JSON, no markdown, matching this exact shape:
{
  "name": string - a clean, properly-capitalized exam name,
  "description": string - one or two sentences describing the exam,
  "category": one of "entrance_exam", "government_exam", "banking_exam", "school_exam", "study_notes", "custom",
  "difficulty": one of "Easy", "Medium", "Hard", "Variable",
  "color": one of "orange", "blue", "emerald", "amber", "rose", "teal", "purple", "indigo",
  "questionCount": integer - total questions across all sections,
  "durationMinutes": integer or null if the exam has no fixed time limit,
  "marksPerCorrect": number - marks awarded per correct answer (the most common value across sections if it varies),
  "negativeMarksPerWrong": number - marks deducted per wrong answer, 0 if there's no negative marking,
  "tags": array of short strings (subjects/domains covered),
  "sections": array of {
    "name": string (e.g. "Physics", "Quantitative Aptitude"),
    "topics": array of short topic strings typically covered in this section,
    "questionCount": integer or null,
    "marksPerCorrect": number or null (only if this section's marking differs from the overall marksPerCorrect above),
    "negativeMarksPerWrong": number or null (only if this section's marking differs from the overall negativeMarksPerWrong above)
  },
  "markingSchemeDescription": string or null - a short human-readable note on the marking scheme (e.g. "Partial marking on multiple-correct questions"), only if there's something worth calling out beyond the plain marksPerCorrect/negativeMarksPerWrong numbers
}
""".strip()


def build_template_generation_prompt(exam_name):
    return f'Exam name: "{exam_name}"'.strip()


# Runs the AI's raw JSON through the exact validators
# extraction-templates.service.js#createTemplate already uses for a
# manually-submitted template - see that function's own call sites for
# each of these. A malformed/out-of-range AI response fails here as a
# ValueError with a message describing what was wrong, same failure mode
# a malformed manual submission would hit, rather than reaching the
# frontend as something that LOOKS like a valid template but silently
# isn't.
def _normalize_generated_template(payload, exam_name):
    if not isinstance(payload, dict):
        raise ValueError("AI response was not a JSON object")

    name = str(payload.get("name") or exam_name).strip() or exam_name

    sections = []
    for index, raw_section in enumerate(payload.get("sections") or []):
        if not isinstance(raw_section, dict):
            continue
        section_name = str(raw_section.get("name") or "").strip()
        if not section_name:
            continue
        topics = [
            str(topic).strip()
            for topic in (raw_section.get("topics") or [])
            if str(topic).strip()
        ]
        section = {"name": section_name, "topics": topics}
        for key in ("questionCount", "marksPerCorrect", "negativeMarksPerWrong"):
            value = raw_section.get(key)
            if value is not None:
                section[key] = value
        sections.append(section)

    marking_scheme_description = payload.get("markingSchemeDescription")
    settings = {}
    if marking_scheme_description:
        settings["marking_scheme"] = {
            "description": str(marking_scheme_description).strip()
        }

    return {
        "name": name,
        "description": (payload.get("description") or "").strip() or None,
        "category": payload.get("category"),
        "difficulty": payload.get("difficulty"),
        "color": payload.get("color"),
        "questionCount": payload.get("questionCount"),
        "durationMinutes": payload.get("durationMinutes"),
        "marksPerCorrect": payload.get("marksPerCorrect"),
        "negativeMarksPerWrong": payload.get("negativeMarksPerWrong"),
        "tags": [
            str(tag).strip() for tag in (payload.get("tags") or []) if str(tag).strip()
        ],
        "sections": sections,
        "settings": settings,
    }


def generate_template_from_exam_name(exam_name, provider):
    response_text = provider.generate_template_json(
        TEMPLATE_GENERATION_SYSTEM_PROMPT,
        build_template_generation_prompt(exam_name),
    )
    payload = extract_json_payload(response_text)
    return _normalize_generated_template(payload, exam_name)