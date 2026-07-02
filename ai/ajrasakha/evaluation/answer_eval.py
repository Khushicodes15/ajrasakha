"""
evaluate_response_quality — answer quality evaluation via DeepEval.

====================================================================
Metric activation matrix (PR1):
--------------------------------------------------------------------
Metric                    | retrieval_context provided? | Runs?
--------------------------------------------------------------------
AnswerRelevancyMetric     | always                       | YES
FaithfulnessMetric        | non-empty list               | YES (auto-activates)
ContextualRelevancyMetric | non-empty list               | YES (auto-activates)
--------------------------------------------------------------------
When retrieval_context is absent/empty, Faithfulness and
ContextualRelevancy are SKIPPED (not stubbed to 0) because:
  - Running them against [] produces misleading faithfulness scores.
  - The project exists to catch exactly that kind of false negative.
  - Capturing retrieval_context from the AI service is tracked as a
    separate follow-up PR (requires mentor approval).

Return keys — identical across all three states (disabled/skipped/scored):
  answer_quality_enabled
  answerrelevancymetric_score / _passed / _reason
  faithfulnessmetric_score / _passed / _reason
  contextualrelevancymetric_score / _passed / _reason
====================================================================
"""

from ajrasakha.evaluation.judge import get_judge


def evaluate_response_quality(result: dict, enabled: bool = False) -> dict:
    """
    Evaluate agent response quality using DeepEval metrics.

    Called by run.py: run_case() -> evaluate_response_quality(result, enabled=...)

    result fields consumed (from executors.py run_mock_case / run_live_case):
      result["query"]         — user question  (LLMTestCase.input)
      result["response_text"] — agent answer   (LLMTestCase.actual_output)
      result.get("context")   — retrieved docs (LLMTestCase.retrieval_context)
                                 NOTE: currently always [] — see module docstring

    enabled == False  → stub response, all keys present, values = "", "disabled"
    enabled == True   → real evaluation; Faithfulness/ContextualRelevancy
                        SKIPPED when retrieval_context is empty
    """

    query = result.get("query", "")
    answer = result.get("response_text", "")
    retrieval_context = result.get("context") or []

    # ------------------------------------------------------------------
    # Guard: empty query or answer (matches deepeval_metrics.py behavior)
    # ------------------------------------------------------------------
    if not query or not str(query).strip() or not answer or not str(answer).strip():
        return _quality_dict(
            answerrelevancy={"score": "", "passed": "", "reason": "answer_missing"},
            faithfulness={"score": "", "passed": "", "reason": "answer_missing"},
            contextual_relevancy={"score": "", "passed": "", "reason": "answer_missing"},
            enabled=True,
        )

    # ------------------------------------------------------------------
    # Stub — preserve return shape so CSV column positions never shift
    # ------------------------------------------------------------------
    if not enabled:
        return _quality_dict(
            answerrelevancy={"score": "", "passed": "", "reason": "disabled"},
            faithfulness={"score": "", "passed": "", "reason": "disabled"},
            contextual_relevancy={"score": "", "passed": "", "reason": "disabled"},
            enabled=False,
        )

    # ------------------------------------------------------------------
    # Judge (mock / ollama / anthropic) — resolved once, shared
    # ------------------------------------------------------------------
    judge = get_judge()

    # ------------------------------------------------------------------
    # Metric definitions — all three always defined so column keys are
    # identical whether skipped or scored.
    # requires_context=True means: skip if retrieval_context is empty.
    # AnswerRelevancy always runs (needs only input + actual_output).
    # ------------------------------------------------------------------
    from deepeval.metrics import (
        AnswerRelevancyMetric,
        FaithfulnessMetric,
        ContextualRelevancyMetric,
    )
    from deepeval.test_case import LLMTestCase

    METRICS = [
        ("answerrelevancymetric",    AnswerRelevancyMetric,    False),  # always runs — needs only input+output
        ("faithfulnessmetric",        FaithfulnessMetric,       True),   # only if retrieval_context non-empty
        ("contextualrelevancymetric", ContextualRelevancyMetric, True),  # only if retrieval_context non-empty
    ]

    test_case = LLMTestCase(
        input=query,
        actual_output=answer,
        retrieval_context=retrieval_context,
    )

    # ------------------------------------------------------------------
    # Evaluate each metric, skipping Faithfulness+Contextual when no
    # retrieval_context is available
    # ------------------------------------------------------------------
    results = {}

    for metric_key, metric_cls, requires_context in METRICS:
        skip_reason = (
            "pending: retrieval_context not exposed by AI service — "
            "tracked as follow-up"
        )

        if requires_context and not retrieval_context:
            # Honest SKIP — do not run against empty context
            results[metric_key] = {"score": "", "passed": "SKIPPED", "reason": skip_reason}
            continue

        try:
            metric = metric_cls(threshold=0.5, model=judge, async_mode=False)
            metric.measure(test_case, _show_indicator=False)
            # CORRECT attribute names (confirmed from installed deepeval v4.0.7):
            #   metric.score   -> float
            #   metric.success -> bool   (NOT metric.passed)
            #   metric.reason  -> str
            raw_score = metric.score
            passed = metric.success
            reason = metric.reason or ""
        except Exception as exc:
            raw_score = None
            passed = False
            reason = f"Exception: {exc}"

        score_str = str(round(raw_score, 4)) if raw_score is not None else ""
        passed_str = "PASS" if passed else "FAIL"

        results[metric_key] = {
            "score": score_str,
            "passed": passed_str,
            "reason": reason,
        }

    return _quality_dict(
        answerrelevancy=results["answerrelevancymetric"],
        faithfulness=results["faithfulnessmetric"],
        contextual_relevancy=results["contextualrelevancymetric"],
        enabled=True,
    )


def _quality_dict(
    answerrelevancy: dict,
    faithfulness: dict,
    contextual_relevancy: dict,
    enabled: bool = True,
) -> dict:
    """
    Assemble the flat return dict with identical keys in all states.
    Ensures CSV column order is stable regardless of how metrics resolved.
    """
    return {
        "answer_quality_enabled": enabled,
        # AnswerRelevancyMetric
        "answerrelevancymetric_score":    answerrelevancy["score"],
        "answerrelevancymetric_passed":   answerrelevancy["passed"],
        "answerrelevancymetric_reason":   answerrelevancy["reason"],
        # FaithfulnessMetric
        "faithfulnessmetric_score":       faithfulness["score"],
        "faithfulnessmetric_passed":      faithfulness["passed"],
        "faithfulnessmetric_reason":      faithfulness["reason"],
        # ContextualRelevancyMetric
        "contextualrelevancymetric_score":  contextual_relevancy["score"],
        "contextualrelevancymetric_passed": contextual_relevancy["passed"],
        "contextualrelevancymetric_reason": contextual_relevancy["reason"],
    }