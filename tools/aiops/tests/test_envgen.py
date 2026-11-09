from pathlib import Path

import yaml

from aiops.commands import envgen
from aiops.commands.envgen import Intent, Policy
from tests.conftest import FakeLLM


def intent(**kw: object) -> Intent:
    base = {
        "name": "production",
        "goal": "cost-sensitive launch",
        "availability": "best-effort",
        "budget_usd_month": 400,
        "expected_rps": 5,
    }
    return Intent.model_validate(base | kw)


def test_rules_sizing_when_ai_is_off(offline: FakeLLM) -> None:
    gen = envgen.generate(intent(), offline)
    assert gen.source == "rules"
    assert gen.proposal.size == "small"
    assert gen.est_monthly_usd <= 400


def test_budget_clamps_an_expensive_ai_proposal() -> None:
    llm = FakeLLM(
        {
            "Proposal": {
                "size": "ha",
                "api_min": 3,
                "api_max": 9,
                "web_min": 2,
                "web_max": 4,
                "rationale": "be safe",
            }
        }
    )
    gen = envgen.generate(intent(budget_usd_month=300), llm)
    assert gen.proposal.size == "small"
    assert any("over budget" in a for a in gen.adjustments)


def test_critical_gets_two_replicas_minimum() -> None:
    llm = FakeLLM(
        {
            "Proposal": {
                "size": "ha",
                "api_min": 1,
                "api_max": 1,
                "web_min": 1,
                "web_max": 1,
                "rationale": "x",
            }
        }
    )
    gen = envgen.generate(intent(availability="critical", budget_usd_month=5000), llm)
    assert gen.proposal.api_min == 2
    assert gen.proposal.web_min == 2
    assert gen.proposal.api_max >= 2


def test_policy_disallowed_size_and_impossible_budget(offline: FakeLLM) -> None:
    gen = envgen.generate(
        intent(availability="critical", budget_usd_month=10),
        offline,
        Policy(allowed_sizes=["small", "medium"]),
    )
    assert gen.proposal.size == "small"
    assert any("still exceeds budget" in a for a in gen.adjustments)


def test_write_and_load(tmp_path: Path, offline: FakeLLM) -> None:
    path = tmp_path / "production.intent.yaml"
    path.write_text(yaml.safe_dump(intent().model_dump()))
    gen = envgen.generate(envgen.load_intent(path), offline)
    tfvars, values = envgen.write(gen, tmp_path / "out")
    assert 'size        = "small"' in tfvars.read_text()
    assert yaml.safe_load(values.read_text())["api"]["autoscaling"]["enabled"] is True
    assert "Environment `production`" in envgen.render(gen)
