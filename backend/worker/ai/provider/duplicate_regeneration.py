"""Rewrites questions flagged as near-duplicates in a single bounded pass,
showing the model the existing question so it can differentiate the
replacement from it. Split out of provider.py - see
backend/worker/ARCHITECTURE.md.
"""

from ...config import AI_NOTES_QUESTIONS_PER_CHUNK
from ..gemini_provider import GeminiDailyQuotaExceededError
from ..schema import extract_json_payload, normalize_ai_questions
from .topic_batching import METADATA_GENERATION_SYSTEM_PROMPT, _pack_groups_into_batches

def build_duplicate_regeneration_prompt(batch, difficulty_hint):
    """
    batch: a list of {group_index, topic, subtopic, questionType, own_text,
    other_text} dicts - one per flagged question needing a rewrite (see
    db_duplicates.py#find_flagged_duplicate_slots). Always uses the multi-group
    "Group N:" shape (never the single-group shortcut
    build_metadata_generation_prompt uses) even when there's only one
    flagged question, since every entry here needs its own "avoid this"
    text attached regardless of batch size - unlike a normal generation
    batch, there's no meaningfully simpler single-item case to special-case
    for.

    other_text is shown so the model has something concrete to
    differentiate from, rather than just being told "try again, but
    different" with no reference point - the same canonical-example
    convergence that likely produced the duplicate in the first place
    would just as easily produce ANOTHER duplicate of the same canonical
    example on a second blind attempt.
    """
    difficulty_line = (
        ""
        if not difficulty_hint or difficulty_hint == "Variable"
        else f"\nTarget difficulty level for every question: {difficulty_hint}."
    )

    group_lines = []
    for item in batch:
        subtopic_line = (
            f' (specifically the subtopic "{item["subtopic"]}")'
            if item.get("subtopic")
            else ""
        )
        type_line = (
            "single correct option"
            if (item.get("questionType") or "single") == "single"
            else "TWO OR MORE correct options (multi-correct)"
        )
        group_lines.append(
            f'Group {item["group_index"]}: write ONE new question on '
            f'"{item["topic"]}"{subtopic_line}, with {type_line}. It must '
            f'be clearly, substantively different from this existing '
            f'question already in the question bank - a different '
            f'numerical example, scenario, or angle on the concept, not '
            f'just reworded: "{item["other_text"]}"'
        )
    group_block = "\n".join(group_lines)

    return f"""
The following {len(batch)} question(s) were flagged as too similar to a
question that already exists. Write ONE clearly distinct replacement for
each of the following {len(batch)} groups - do not merge, skip, or
reallocate between groups.
{group_block}
For every question you write, set "topic_group_index" to the Group number
(the integer right after "Group ") it was written for, and set "topic"
(and "subtopic", if that group has one) to exactly that group's own
values.{difficulty_line}
""".strip()


# flagged_slots: the output of db_duplicates.py#find_flagged_duplicate_slots - one
# dict per slot needing a rewrite, each already carrying its own topic/
# subtopic/questionType (from its original generation) plus other_text
# (the existing question it was flagged against). Batched via
# _pack_groups_into_batches exactly like generate_questions_from_metadata,
# reusing the same request-count discipline for the same reason: 10
# flagged questions should cost 1-2 extra requests, not 10.
#
# Returns a dict of {slot_id: new_question} for whichever slots got a
# usable replacement (never all of them, necessarily - a batch that errors
# out, or a response missing/misusing topic_group_index for one entry,
# just means that particular slot keeps its original content and stays in
# the review queue untouched, exactly the same "best effort, log why"
# stance the rest of this pipeline already takes) plus a summary dict.
def regenerate_flagged_duplicates(flagged_slots, difficulty_hint, provider):
    if not flagged_slots:
        return {}, {"attempted": False, "questionsRegenerated": 0, "errors": []}

    # _pack_groups_into_batches only looks at "count" - each flagged slot
    # needs exactly 1 replacement, so every entry gets count=1 regardless
    # of how many total flagged slots there are.
    pseudo_groups = [
        {
            "topic": item["topic"],
            "subtopic": item.get("subtopic"),
            "questionType": item.get("question_type"),
            "count": 1,
        }
        for item in flagged_slots
    ]
    batches = _pack_groups_into_batches(pseudo_groups, AI_NOTES_QUESTIONS_PER_CHUNK)
    # pseudo_groups[i] corresponds 1:1 with flagged_slots[i] - reuse that
    # same index to recover which slot_id/other_text a batch entry is for.
    slots_by_index = {index: item for index, item in enumerate(flagged_slots)}

    replacements = {}
    errors = []

    for batch in batches:
        prompt_batch = [
            {
                "group_index": entry["group_index"],
                "topic": entry["topic"],
                "subtopic": entry["subtopic"],
                "questionType": entry["questionType"],
                "other_text": slots_by_index[entry["group_index"]]["other_text"],
            }
            for entry in batch
        ]
        try:
            response_text = provider.generate_json(
                METADATA_GENERATION_SYSTEM_PROMPT,
                build_duplicate_regeneration_prompt(prompt_batch, difficulty_hint),
            )
            payload = extract_json_payload(response_text)
            batch_questions = normalize_ai_questions(
                payload, source=f"{provider.name}_regenerated_duplicate_v1"
            )
        except GeminiDailyQuotaExceededError as error:
            # Same reasoning as generate_questions_from_metadata: every
            # remaining batch would fail identically today, so stop here
            # rather than cycling through each one's retry attempts for
            # nothing. Whatever hasn't been regenerated yet just keeps its
            # original (flagged) content and stays in the review queue -
            # not silently lost, just not fixed by this pass.
            errors.append({"batch_size": len(batch), "message": f"Stopped early: {error}"})
            break
        except Exception as error:
            errors.append({"batch_size": len(batch), "message": str(error)})
            continue

        for question in batch_questions:
            group_index = question.get("topic_group_index")
            slot_info = slots_by_index.get(group_index)
            if slot_info is None:
                errors.append(
                    {
                        "batch_size": len(batch),
                        "message": (
                            f"Dropped a regenerated question with "
                            f"missing/invalid topic_group_index "
                            f"({group_index!r})"
                        ),
                    }
                )
                continue
            question["topic"] = slot_info["topic"]
            question["subtopic"] = slot_info.get("subtopic")
            question["question_type"] = slot_info.get("question_type") or "single"
            replacements[slot_info["slot_id"]] = question

    return replacements, {
        "attempted": True,
        "questionsRegenerated": len(replacements),
        "errors": errors,
    }


