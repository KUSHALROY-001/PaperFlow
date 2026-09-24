"""JSON schema builders for each AI response shape (question extraction,
template generation, written-answer grading), in both Gemini's and
OpenAI's slightly different schema dialects (see _question_item_schema's
own comment for the dialect difference). Pure data - no parsing or
normalization logic lives here. Split out of schemas.py - see
backend/worker/ARCHITECTURE.md.
"""

def _question_item_schema(*, nullable_as_union):
    # Gemini's responseSchema is a subset of OpenAPI 3.0: optional fields are
    # marked with a separate "nullable": true flag, and it doesn't support
    # multi-type "type" arrays. OpenAI's structured outputs use standard
    # JSON Schema instead, where a nullable field is expressed as
    # "type": [<type>, "null"]. Getting this dialect wrong for a given
    # provider doesn't crash anything - the provider just won't be able to
    # enforce the schema and normalize_ai_questions()/extract_json_payload()
    # remain as the safety net - but it's worth re-checking against each
    # provider's current docs if either changes their schema dialect.
    def optional(json_type):
        if nullable_as_union:
            return {"type": [json_type, "null"]}
        return {"type": json_type, "nullable": True}

    def optional_array(item_type, **extra):
        if nullable_as_union:
            return {"type": ["array", "null"], "items": {"type": item_type}, **extra}
        return {"type": "array", "items": {"type": item_type}, "nullable": True, **extra}

    properties = {
        "question_no": {"type": "integer"},
        "topic": optional("string"),
        "subtopic": optional("string"),
        "passage": optional("string"),
        "text": {"type": "string"},
        "explanation": optional("string"),
        "question_type": {
            "type": "string",
            "enum": ["single", "multi", "fill_blank", "short_answer", "long_answer", "numerical"],
            "description": (
                "Classify the question from the source. Use single/multi only for questions "
                "with answer options; fill_blank for one or more visible blanks; short_answer "
                "for a brief written response; long_answer for an extended explanation; and "
                "numerical when the student must enter a number."
            ),
        },
        "options": {
            **optional_array("string"),
            "description": "MCQ choices only. Null for fill_blank, short_answer, long_answer, and numerical.",
        },
        "correct_option_indexes": {
            **optional_array("integer"),
            "description": "Zero-based MCQ answer indexes only. Null for non-MCQ question types.",
        },
        "accepted_answers": (
            {
                "type": ["array", "null"],
                "items": {"type": "array", "items": {"type": "string"}},
            }
            if nullable_as_union
            else {
                "type": "array",
                "nullable": True,
                "items": {"type": "array", "items": {"type": "string"}},
            }
        ) | {
            "description": "For fill_blank only: one array of acceptable strings per blank, in blank order. Null otherwise.",
        },
        "grading_rubric": (
            {
                "type": ["array", "null"],
                "items": {
                    "type": "object",
                    "properties": {"point": {"type": "string"}, "weight": {"type": "number"}},
                    "required": ["point", "weight"],
                    "additionalProperties": False,
                },
            }
            if nullable_as_union
            else {
                "type": "array",
                "nullable": True,
                "items": {
                    "type": "object",
                    "properties": {"point": {"type": "string"}, "weight": {"type": "number"}},
                    "required": ["point", "weight"],
                },
            }
        ) | {
            "description": "For short_answer/long_answer only: rubric entries shaped as {point, weight}; derive them from the paper when visible. Null when unavailable or not a written question.",
        },
        "expected_answer": {
            **optional("string"),
            "description": "For short_answer/long_answer only: a model answer when a detailed grading_rubric cannot be derived. Null otherwise.",
        },
        "answer_word_limit": {
            **optional("integer"),
            "description": "For written answers only: an explicit word limit stated by the paper. Null when no limit is stated.",
        },
        "numeric_answer": {
            **optional("number"),
            "description": "For numerical only: the expected numeric value. Null otherwise.",
        },
        "numeric_tolerance": {
            **optional("number"),
            "description": "For numerical only: allowed absolute error, 0 for exact answers. Null otherwise.",
        },
        "source_page": optional("integer"),
        "confidence": {"type": "integer"},
        "needs_review": {"type": "boolean"},
        "issues": {"type": "array", "items": {"type": "string"}},
        "diagrams": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    # A short, stable identifier for THIS specific diagram
                    # within THIS question - lowercase letters, digits, and
                    # hyphens only (matches migration 038's own DB-level
                    # CHECK constraint on question_assets.slot_key exactly,
                    # so a well-formed slot_key here never gets rejected at
                    # insert time). Referenced by a ![[img:slot_key]] marker
                    # embedded directly in text/options/a table cell - see
                    # this field's own description below for when a marker
                    # is required vs. not.
                    "slot_key": {"type": "string", "pattern": "^[a-z0-9][a-z0-9-]{0,63}$"},
                    # Same [ymin, xmin, ymax, xmax] 0-1000 convention the
                    # single-diagram version of this schema always used -
                    # see normalized_bbox_to_pixels in asset_extractor.py.
                    "bbox": {
                        "type": "array",
                        "items": {"type": "integer"},
                        "minItems": 4,
                        "maxItems": 4,
                    },
                },
                "required": ["slot_key", "bbox"],
                **({"additionalProperties": False} if nullable_as_union else {}),
            },
            "description": (
                "Every distinct diagram, circuit, graph, chart, or figure "
                "VISUALLY PRESENT on the page image for this question - not "
                "just because the question text mentions 'figure', 'shown "
                "below', 'as shown', or similar wording. Usually empty (most "
                "questions have no diagram) or has exactly one entry. A "
                "question can have MORE than one - e.g. a List-I/List-II "
                "matching question where each list item is itself an image, "
                "or a long question with a diagram in the stem AND another "
                "in one of the options. Give each entry its own distinct "
                "slot_key.\n\n"
                "If there is exactly ONE diagram for this question, set its "
                "slot_key to \"default\".\n\n"
                "If there is MORE than one diagram, give each a distinct, "
                "descriptive slot_key (e.g. \"list-i-1\", \"list-i-2\", "
                "\"option-c\").\n\n"
                "Every slot_key you list here - \"default\" included - MUST "
                "have a matching ![[img:slot_key]] marker - that literal "
                "syntax, brackets included - embedded at the EXACT point in "
                "\"text\", an \"options\" entry, or inside a markdown table "
                "cell where that specific image belongs, relative to the "
                "surrounding prose. An image with no marker anywhere has "
                "nowhere to render."
            ),
        },
        # Per-question scoring. Required when the applied template's
        # settings.marking_scheme (or per-section marks) means different
        # questions carry different +ve/-ve marks (JEE Advanced, GATE
        # 1-mark vs 2-mark, etc.). Leave null when every question uses the
        # same mock-test-level defaults - the scorer falls back to those.
        "marks_per_correct": {
            **optional("number"),
            "description": (
                "Marks awarded for a fully correct answer on THIS question. "
                "Read from the paper's own marking instructions / section "
                "header when they differ by question type or section. "
                "Leave null only when the paper uses one uniform scheme "
                "for every question."
            ),
        },
        "negative_marks_per_wrong": {
            **optional("number"),
            "description": (
                "Marks deducted for a wrong answer on THIS question "
                "(0 when the question type has no negative marking, e.g. "
                "many numerical-answer questions). Read from the paper's "
                "marking instructions when they differ by type/section. "
                "Leave null only when the paper uses one uniform scheme."
            ),
        },
        # Only meaningful for generate_questions_from_metadata's multi-group
        # batched requests (see provider.py#build_metadata_generation_prompt)
        # - a single request there can ask for several DIFFERENT topic/
        # subtopic/marks combinations at once (to cut down request count
        # against Gemini's free-tier RPD cap), so this is how the response
        # says which of the numbered "Group N:" blocks in the prompt each
        # question was written for. The caller then force-assigns that
        # group's own trusted topic/subtopic/marks - this field only ever
        # has to identify WHICH group, never what that group's values are,
        # same "don't trust the model's own classification" stance already
        # used for topic/subtopic elsewhere in this schema. Left null/absent
        # by every other caller (PDF extraction, single-group generation),
        # which never mention it in their prompts.
        "topic_group_index": {
            **optional("integer"),
            "description": (
                "Only used when the prompt lists multiple numbered "
                "'Group N:' blocks - set this to that N for every question. "
                "Leave null when the prompt describes just one, unnumbered "
                "request."
            ),
        },
    }

    schema = {
        "type": "object",
        "properties": properties,
        "required": [
            "question_no",
            "text",
            "question_type",
            "options",
            "correct_option_indexes",
            "diagrams",
        ],
    }

    if nullable_as_union:
        # OpenAI's strict structured-output mode requires every declared
        # property to also be listed in "required" (optionality is
        # expressed purely through the "null" type union above, not through
        # actually omitting the key) and disallows undeclared properties.
        schema["required"] = list(properties.keys())
        schema["additionalProperties"] = False

    return schema


def _question_response_schema(*, nullable_as_union):
    schema = {
        "type": "object",
        "properties": {
            "questions": {
                "type": "array",
                "items": _question_item_schema(nullable_as_union=nullable_as_union),
            }
        },
        "required": ["questions"],
    }
    if nullable_as_union:
        schema["additionalProperties"] = False
    return schema


# Gemini responseSchema dialect (OpenAPI 3.0 subset).
GEMINI_QUESTION_RESPONSE_SCHEMA = _question_response_schema(nullable_as_union=False)

# OpenAI structured-outputs dialect (standard JSON Schema, strict mode).
OPENAI_QUESTION_RESPONSE_SCHEMA = _question_response_schema(nullable_as_union=True)


# Historical note: this used to be a module-level JSON_BLOCK_RE constant
# with an unanchored re.search() applied unconditionally before any parse
# attempt - see extract_json_payload()'s comment for why that was buggy.
# The anchored, try-parse-first version now lives inline in that function.


# Template generation (AI-generate-a-template-from-an-exam-name feature).
# A wholly different shape from the question schema above - no per-question
# fields at all - so this is its own builder rather than a variant of
# _question_item_schema/_question_response_schema. Mirrors
# extraction-templates.service.js's own validation shape exactly
# (CATEGORIES/DIFFICULTIES/COLORS enums, sections as {name, topics,
# questionCount?, marksPerCorrect?, negativeMarksPerWrong?}) so the
# provider is constrained to return something that validation can actually
# accept, not just "some JSON".
def _template_section_schema(*, nullable_as_union):
    def optional(json_type):
        if nullable_as_union:
            return {"type": [json_type, "null"]}
        return {"type": json_type, "nullable": True}

    properties = {
        "name": {"type": "string"},
        "topics": {"type": "array", "items": {"type": "string"}},
        "questionCount": optional("integer"),
        "marksPerCorrect": optional("number"),
        "negativeMarksPerWrong": optional("number"),
    }
    schema = {
        "type": "object",
        "properties": properties,
        "required": ["name", "topics"],
    }
    if nullable_as_union:
        schema["required"] = list(properties.keys())
        schema["additionalProperties"] = False
    return schema


def _template_response_schema(*, nullable_as_union):
    def optional(json_type):
        if nullable_as_union:
            return {"type": [json_type, "null"]}
        return {"type": json_type, "nullable": True}

    properties = {
        "name": {"type": "string"},
        "description": optional("string"),
        # Kept as free-form strings here, not a token-level enum
        # constraint - the provider dialects don't agree on enum syntax
        # the same way they don't agree on nullable syntax, and
        # extraction-templates.service.js's requiredEnum already rejects
        # anything outside CATEGORIES/DIFFICULTIES/COLORS with a clear
        # 400 the frontend surfaces - the same safety net every other
        # field here already relies on instead of trusting the schema
        # alone.
        "category": {"type": "string"},
        "difficulty": {"type": "string"},
        "color": {"type": "string"},
        "questionCount": {"type": "integer"},
        "durationMinutes": optional("integer"),
        "marksPerCorrect": {"type": "number"},
        "negativeMarksPerWrong": {"type": "number"},
        "tags": {"type": "array", "items": {"type": "string"}},
        "sections": {
            "type": "array",
            "items": _template_section_schema(nullable_as_union=nullable_as_union),
        },
        "markingSchemeDescription": optional("string"),
    }
    schema = {
        "type": "object",
        "properties": properties,
        "required": [
            "name",
            "category",
            "difficulty",
            "color",
            "questionCount",
            "marksPerCorrect",
            "negativeMarksPerWrong",
            "tags",
            "sections",
        ],
    }
    if nullable_as_union:
        schema["required"] = list(properties.keys())
        schema["additionalProperties"] = False
    return schema


GEMINI_TEMPLATE_RESPONSE_SCHEMA = _template_response_schema(nullable_as_union=False)
OPENAI_TEMPLATE_RESPONSE_SCHEMA = _template_response_schema(nullable_as_union=True)


def _grading_response_schema(*, nullable_as_union):
    # Key order matters: analysis and criteria_scores come BEFORE the overall
    # percentage so the score is derived from the criteria, not the other way
    # round. (Alphabetical order is identical, on purpose.)
    score_item = {
        "type": "object",
        "properties": {
            "criterion_id": {"type": "string"},
            "score": {"type": "number"},
        },
        "required": ["criterion_id", "score"],
    }
    item = {
        "type": "object",
        "properties": {
            "analysis": {"type": "string"},
            "criteria_scores": {"type": "array", "items": score_item},
            "percentage": {"type": "number"},
            "points_hit": {"type": "array", "items": {"type": "string"}},
            "question_index": {"type": "integer"},
        },
        "required": [
            "analysis",
            "criteria_scores",
            "percentage",
            "points_hit",
            "question_index",
        ],
    }
    if nullable_as_union:
        score_item["additionalProperties"] = False
        item["additionalProperties"] = False
    schema = {
        "type": "object",
        "properties": {
            "grades": {
                "type": "array",
                "items": item,
            }
        },
        "required": ["grades"],
    }
    if nullable_as_union:
        schema["additionalProperties"] = False
    return schema


GEMINI_GRADING_RESPONSE_SCHEMA = _grading_response_schema(nullable_as_union=False)
OPENAI_GRADING_RESPONSE_SCHEMA = _grading_response_schema(nullable_as_union=True)


