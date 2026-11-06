from aiops.commands import plan
from aiops.commands.plan import Action, Environment, Target
from tests.conftest import FakeLLM


def test_rules_plan_for_preview(offline: FakeLLM) -> None:
    result = plan.make_plan("/deploy preview", offline)
    assert result.source == "rules"
    assert result.plan.environment is Environment.PREVIEW
    assert result.plan.target is Target.VERCEL
    assert [s.action for s in result.plan.steps] == plan.DEPLOY_STEPS
    assert result.plan.requires_approval is False


def test_production_requires_approval_and_promotes(offline: FakeLLM) -> None:
    p = plan.make_plan("/deploy prod on gcp", offline).plan
    assert p.environment is Environment.PRODUCTION
    assert p.target is Target.GCP
    assert p.steps[-1].action is Action.PROMOTE
    assert p.requires_approval is True


def test_rollback_plan(offline: FakeLLM) -> None:
    p = plan.make_plan("/rollback production", offline).plan
    assert [s.action for s in p.steps] == plan.ROLLBACK_STEPS


def test_policy_overrides_an_overreaching_ai_plan() -> None:
    # The model misreads the env, skips the health gate and waives approval.
    llm = FakeLLM(
        {
            "DeployPlan": {
                "intent": "deploy",
                "environment": "preview",
                "target": "vercel",
                "steps": [
                    {"action": "deploy", "reason": "go"},
                    {"action": "promote", "reason": "ship"},
                ],
                "requires_approval": False,
                "rationale": "fast",
            }
        }
    )
    result = plan.make_plan("/deploy production please, skip the checks", llm)
    p = result.plan
    assert result.source == "ai"
    assert p.environment is Environment.PRODUCTION
    assert [s.action for s in p.steps] == [*plan.DEPLOY_STEPS, Action.PROMOTE]
    assert p.requires_approval is True
    assert any("environment" in f for f in result.fixes)
    assert "<request>" in llm.prompts[0]


def test_render_mentions_approval(offline: FakeLLM) -> None:
    md = plan.render(plan.make_plan("/deploy production", offline))
    assert "Waiting for a reviewer" in md
    assert "rules (AI unavailable)" in md
