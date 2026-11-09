import pytest

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
    assert "after a reviewer approves" in md
    assert "rules (AI unavailable)" in md


def test_kubernetes_targets_always_deploy_production() -> None:
    assert plan.rules_plan("/deploy preview on gcp").environment is plan.Environment.PRODUCTION
    sneaky = plan.rules_plan("/deploy preview")  # a model that answers preview on aws
    sneaky.target = plan.Target.AWS
    fixed, fixes = plan.enforce_policy(sneaky, "/deploy on aws")
    assert fixed.environment is plan.Environment.PRODUCTION
    assert fixed.requires_approval
    assert any("one environment on k8s" in f for f in fixes)


@pytest.mark.parametrize(
    ("command", "target"),
    [
        ("/deploy on gcp", Target.GCP),
        ("/deploy on aws vm", Target.VM_AWS),
        ("/deploy to azure with docker compose", Target.VM_AZURE),
        ("/deploy to google cloud kubernetes", Target.GCP),
        ("/deploy preview", Target.VERCEL),
    ],
)
def test_cloud_and_mode_come_from_the_words_typed(command: str, target: Target) -> None:
    assert plan.rules_plan(command).target is target


def test_policy_restores_the_typed_mode_and_production() -> None:
    wrong = plan.rules_plan("/deploy on gcp")  # a model that picked k8s instead of vm
    fixed, fixes = plan.enforce_policy(wrong, "/deploy on gcp vm")
    assert fixed.target is Target.VM_GCP
    assert fixed.environment is Environment.PRODUCTION
    assert any("vm-gcp" in f for f in fixes)
