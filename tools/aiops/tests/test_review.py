from aiops.commands import review
from tests.conftest import FakeLLM

MIG = "app/backend/alembic/versions/0002_x.py"
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
    diff = "diff --git a/app/ui/src/x.ts b/app/ui/src/x.ts\n+x\n"
    assert review.review(diff, llm).risk == "high"


def test_large_deletions_are_medium(offline: FakeLLM) -> None:
    diff = "diff --git a/a.py b/a.py\n" + "-gone\n" * 900
    assert review.review(diff, offline).risk == "medium"


def test_model_diff_keeps_code_and_lists_the_rest() -> None:
    code = "diff --git a/app/backend/x.py b/app/backend/x.py\n+print(1)\n"
    docs = "diff --git a/docs/a.md b/docs/a.md\n+text\n"
    lock = "diff --git a/app/ui/package-lock.json b/app/ui/package-lock.json\n+{}\n"
    big = "diff --git a/app/ui/big.ts b/app/ui/big.ts\n" + "+x\n" * 100
    shown, omitted = review.model_diff(code + docs + lock + big, limit=200)
    assert shown == code
    assert omitted == ["docs/a.md", "app/ui/package-lock.json", "app/ui/big.ts"]
