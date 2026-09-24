""""Generate from existing tests" - writes new questions for a given
topic/subtopic/questionType distribution, independent of any source PDF.
Split out of provider.py - see backend/worker/ARCHITECTURE.md.
"""

from ...config import AI_NOTES_QUESTIONS_PER_CHUNK
from ..gemini_provider import GeminiDailyQuotaExceededError
from ..schema import extract_json_payload, normalize_ai_questions
from .topic_batching import METADATA_GENERATION_SYSTEM_PROMPT, _pack_groups_into_batches

def build_metadata_generation_prompt(batch, difficulty_hint):
    """
    batch: a list of {group_index, topic, subtopic, questionType, count}
    dicts - one or more groups to cover in a SINGLE request. Merging
    several small groups into one request (rather than always issuing one
    request per topic/subtopic/type group) is the actual fix for burning
    through Gemini's free-tier 500-requests/day cap: a generation spread
    across many distinct topic/subtopic combinations used to cost one
    request per group even when most groups only needed 1-2 questions -
    see _pack_groups_into_batches (ai/topic_batching.py) for how groups get merged.

    For a single-group batch, the prompt reads as one plain unnumbered
    request (topic_group_index is never mentioned, and the model is never
    asked to tag anything) - this keeps the common case exactly as
    reliable as it always was, only spending the extra "which group is
    this for" instruction+field on requests that actually need it.
    """
    difficulty_line = (
        ""
        if not difficulty_hint or difficulty_hint == "Variable"
        else f"\nTarget difficulty level for every question: {difficulty_hint}."
    )

    if len(batch) == 1:
        group = batch[0]
        subtopic_line = (
            f' (specifically the subtopic "{group["subtopic"]}")'
            if group.get("subtopic")
            else ""
        )
        type_line = (
            "Every question must have exactly ONE correct option."
            if (group.get("questionType") or "single") == "single"
            else "Every question must have TWO OR MORE correct options (a multi-correct question type)."
        )
        return f"""
Write exactly {group["count"]} original multiple-choice questions on the topic
"{group["topic"]}"{subtopic_line}.
{type_line}{difficulty_line}
""".strip()

    group_lines = []
    for group in batch:
        subtopic_line = (
            f' (specifically the subtopic "{group["subtopic"]}")'
            if group.get("subtopic")
            else ""
        )
        type_line = (
            "single correct option"
            if (group.get("questionType") or "single") == "single"
            else "TWO OR MORE correct options (multi-correct)"
        )
        group_lines.append(
            f'Group {group["group_index"]}: {group["count"]} question(s) on '
            f'"{group["topic"]}"{subtopic_line}, each with {type_line}.'
        )
    group_block = "\n".join(group_lines)

    return f"""
Write questions for EACH of the following {len(batch)} groups, exactly as
many as each one asks for - do not merge, skip, or reallocate counts
between groups.
{group_block}
For every question you write, set "topic_group_index" to the Group number
(the integer right after "Group ") it was written for, and set "topic"
(and "subtopic", if that group has one) to exactly that group's own values -
never invent or substitute a different topic.{difficulty_line}
""".strip()


# topic_distribution is a list of {topic, subtopic, questionType, count,
# marksPerCorrect, negativeMarksPerWrong} dicts - see
# mock-tests.repository.js#getTopicDistributionForMockTests and
# mock-tests.service.js#scaleDistributionToTarget for how it's built and
# scaled to sum to exactly the user's requested total.
#
# Batched via _pack_groups_into_batches at up to AI_NOTES_QUESTIONS_PER_CHUNK
# total questions per request, merging multiple small groups into a single
# call wherever there's room rather than always spending one request per
# group (see that function's docstring - this is what actually keeps a
# generation spanning many distinct topics/subtopics from costing one
# request per group against Gemini's free-tier 500/day cap). Each returned
# question is tagged with which group it belongs to via topic_group_index
# (schemas.py) so topic/subtopic/marks can still be force-assigned from our
# own trusted data per group, never taken from the model's own words -
# same principle _apply_section_marks (ai/marking_scheme.py) already uses, just extended to
# work across several groups sharing one response instead of one group per
# response.
def generate_questions_from_metadata(topic_distribution, difficulty_hint, provider):
    if not topic_distribution:
        return [], {"attempted": False, "questionsGenerated": 0, "errors": []}

    all_questions = []
    errors = []

    batches = _pack_groups_into_batches(
        topic_distribution, AI_NOTES_QUESTIONS_PER_CHUNK
    )
    # group_index -> group dict, for force-assigning topic/subtopic/marks
    # once a question's batch response tags it - built once up front
    # rather than re-deriving per batch.
    groups_by_index = {index: group for index, group in enumerate(topic_distribution)}

    for batch in batches:
        try:
            response_text = provider.generate_json(
                METADATA_GENERATION_SYSTEM_PROMPT,
                build_metadata_generation_prompt(batch, difficulty_hint),
            )
            payload = extract_json_payload(response_text)
            batch_questions = normalize_ai_questions(
                payload, source=f"{provider.name}_generated_from_metadata_v1"
            )
        except GeminiDailyQuotaExceededError as error:
            # The day's quota can't come back mid-job the way a per-minute
            # one can (see gemini_provider.py's rate limiter/retry) - every
            # remaining batch would fail identically, so stop the whole
            # generation here rather than cycling through each one's own
            # retry attempts for nothing.
            errors.append({"batch": [g["topic"] for g in batch], "message": f"Stopped early: {error}"})
            break
        except Exception as error:
            errors.append({"batch": [g["topic"] for g in batch], "message": str(error)})
            continue

        # single-group batches never ask the model to tag
        # topic_group_index at all (see build_metadata_generation_prompt),
        # so every question in that case is unambiguously this batch's one
        # and only group - no need to trust a field that was never
        # requested.
        single_group_index = batch[0]["group_index"] if len(batch) == 1 else None

        for question in batch_questions:
            group_index = (
                single_group_index
                if single_group_index is not None
                else question.get("topic_group_index")
            )
            group = groups_by_index.get(group_index)
            if group is None:
                # The model either omitted topic_group_index on a
                # multi-group request or returned one outside this batch's
                # actual groups - there's no trustworthy topic/subtopic/
                # marks to force onto this question, and guessing wrong
                # here means silently mis-scoring or mis-marking a
                # question, which is worse than just dropping it and
                # recording why.
                errors.append(
                    {
                        "batch": [g["topic"] for g in batch],
                        "message": (
                            f"Dropped a question with missing/invalid "
                            f"topic_group_index ({group_index!r}) - "
                            f"could not attribute it to a requested group"
                        ),
                    }
                )
                continue

            # Force topic/subtopic/marks to the requested group's values
            # rather than trusting the model's own classification - the
            # prompt asks for this too, but this is the deterministic
            # guarantee, same pattern _apply_section_marks above already
            # uses for template-driven marking overrides.
            question["topic"] = group["topic"]
            question["subtopic"] = group.get("subtopic")
            question["marks_per_correct"] = group.get("marksPerCorrect")
            question["negative_marks_per_wrong"] = group.get("negativeMarksPerWrong")
            question["metadata"]["generatedFromExistingTests"] = True
            all_questions.append(question)

    # Each batch's normalize_ai_questions call numbers question_no starting
    # from 1 independently within that one response - merging several
    # batches together means those numbers collide (batch 2's question 1
    # has the same question_no as batch 1's question 1). Renumbered once,
    # sequentially, across the FULL merged set at the very end, same as
    # the single-request-per-group version of this function always did.
    for index, question in enumerate(all_questions, start=1):
        question["question_no"] = index

    return all_questions, {
        "attempted": True,
        "questionsGenerated": len(all_questions),
        "errors": errors,
    }


