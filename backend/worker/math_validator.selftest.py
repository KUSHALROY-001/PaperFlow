"""Standalone regression test for math_validator.py - no test framework
is configured in this project, so this runs with plain python, same
pattern as code-indenter.selftest.js on the frontend:

    python worker/math_validator.selftest.py
"""

from math_validator import find_math_errors, find_all_math_errors

cases = [
    (
        "the exact bug from the Sandmeyer reaction cell - an extra '}' "
        "after \\text{Tollen's reagent} is caught",
        "The answer is $\\text{Toluene}\\xrightarrow{(iv)} "
        "\\text{Tollen's reagent}}{(i)} \\text{Cl}_2$ done.",
        1,
    ),
    (
        "the SAME reaction written correctly (balanced) is not flagged",
        "$\\text{Toluene} \\xrightarrow[(ii)H_3O^+]{(i)CrO_2Cl_2/CS_2} "
        "\\text{Benzoic acid}$",
        0,
    ),
    (
        "plain text with no math at all",
        "What is the capital of France?",
        0,
    ),
    (
        "ordinary balanced math - a fraction",
        "Simplify $\\frac{1}{2} + \\frac{1}{3}$.",
        0,
    ),
    (
        "missing closing brace",
        "Compute $\\frac{1}{2$ please.",
        1,
    ),
    (
        "missing closing bracket in \\xrightarrow[...]",
        "$A \\xrightarrow[B]{C$",
        1,
    ),
    (
        "two separate math spans, only the second is broken",
        "First $x + y = 5$, then $\\frac{1}{2$.",
        1,
    ),
    (
        "display math $$...$$ with a genuine imbalance",
        "$$\\int_0^1 x \\, dx = \\frac{1}{2}}$$",
        1,
    ),
    (
        "a literal currency amount is never mistaken for math",
        "The price is $50 and the tax is $5, total $55.",
        0,
    ),
    (
        "nested braces that are still correctly balanced",
        "$\\sqrt{\\frac{a^2}{b^2 + c^2}}$",
        0,
    ),
]

failures = 0

for name, text, expected_count in cases:
    errors = find_math_errors(text)
    ok = len(errors) == expected_count
    status = "ok  " if ok else "FAIL"
    print(f"{status} - {name} (found {len(errors)}, expected {expected_count})")
    if not ok:
        failures += 1
        for err in errors:
            print(f"       {err}")

print("\n--- find_all_math_errors: field tagging ---")

question = {
    "text": "Balanced: $x^2$",
    "explanation": "Broken: $\\frac{1}{2$",
    "passage": None,
    "options": [
        "A. $y = mx + b$",
        {"optionText": "B. $\\text{H}_2\\text{O}}$"},
    ],
}
tagged = find_all_math_errors(question)
expected_fields = {"explanation", "options[1]"}
found_fields = {e["field"] for e in tagged}
tagging_ok = found_fields == expected_fields
print(
    f"{'ok  ' if tagging_ok else 'FAIL'} - flags explanation + options[1] only "
    f"(found: {sorted(found_fields)})"
)
if not tagging_ok:
    failures += 1

total = len(cases) + 1
print(f"\n{total - failures}/{total} passed.")

if failures:
    raise SystemExit(1)
