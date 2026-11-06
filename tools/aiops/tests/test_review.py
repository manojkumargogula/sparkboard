from aiops.commands import review
from tests.conftest import FakeLLM

MIG = "apps/api/alembic/versions/0002_x.py"
MIGRATION_DIFF = f"""diff --git a/{MIG} b/{MIG}
+op.drop_column("ideas", "title")
diff --git a/README.md b/README.md
+docs
"""


def test_floor_flags_migrations_even_without_ai(offline: FakeLLM) -> None:
    result = review.review(MIGRATION_DIFF, offline)
    assert result.risk == "high"
    assert result.ai is None
    assert "database migration" in result.floor_reasons[0]
    assert "AI review unavailable" in review.render(result)


def test_ai_cannot_lower_the_floor() -> None:
    llm = FakeLLM(
        {
            "AIReview": {
                "summary": "Looks fine",
                "risk": "low",
                "risk_reasons": [],
                "findings": [{"file": "a.py", "severity": "warning", "message": "drops a column"}],
                "suggested_tests": ["migration round-trip"],
            }
        }
    )
    result = review.review(MIGRATION_DIFF, llm)
    assert result.risk == "high"
    md = review.render(result)
    assert "drops a column" in md
    assert "second human approval" in md


def test_ai_can_raise_risk() -> None:
    llm = FakeLLM(
        {
            "AIReview": {
                "summary": "SQL injection",
                "risk": "high",
                "risk_reasons": ["raw SQL"],
                "findings": [],
                "suggested_tests": [],
            }
        }
    )
    diff = "diff --git a/apps/web/src/x.ts b/apps/web/src/x.ts\n+x\n"
    assert review.review(diff, llm).risk == "high"


def test_large_deletions_are_medium(offline: FakeLLM) -> None:
    diff = "diff --git a/a.py b/a.py\n" + "-gone\n" * 900
    assert review.review(diff, offline).risk == "medium"
