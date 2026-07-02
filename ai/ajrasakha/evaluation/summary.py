def _parse_score(value) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def build_summary(results: list[dict]) -> dict:
    total = len(results)

    technical_passed = sum(1 for r in results if r.get("technical_pass") is True)
    routing_passed   = sum(1 for r in results if r.get("routing_pass") is True)
    tool_passed      = sum(1 for r in results if r.get("tool_pass") is True)

    failed = total - technical_passed

    # ── Answer Relevancy ──────────────────────────────────────────────────
    ran = [r for r in results if r.get("answerrelevancymetric_passed") in ("PASS", "FAIL")]
    answer_relevancy_evaluated = len(ran)
    answer_relevancy_passed    = sum(1 for r in ran if r.get("answerrelevancymetric_passed") == "PASS")

    scores = [_parse_score(r.get("answerrelevancymetric_score")) for r in ran]
    valid_scores = [s for s in scores if s is not None]
    answer_relevancy_mean_score = (
        round(sum(valid_scores) / len(valid_scores), 4) if valid_scores else None
    )

    # ── Faithfulness + ContextualRelevancy skip counts ───────────────────
    faithfulness_skipped         = sum(1 for r in results if r.get("faithfulnessmetric_passed") == "SKIPPED")
    contextual_relevancy_skipped = sum(1 for r in results if r.get("contextualrelevancymetric_passed") == "SKIPPED")

    return {
        "total_cases": total,
        "technical_passed": technical_passed,
        "routing_passed":   routing_passed,
        "tool_passed":      tool_passed,
        "failed_cases":     failed,
        # Answer Relevancy
        "answer_relevancy_evaluated":  answer_relevancy_evaluated,
        "answer_relevancy_passed":     answer_relevancy_passed,
        "answer_relevancy_mean_score": answer_relevancy_mean_score,
        # Skip counts (pending retrieval_context from AI service)
        "faithfulness_skipped":         faithfulness_skipped,
        "contextual_relevancy_skipped": contextual_relevancy_skipped,
    }