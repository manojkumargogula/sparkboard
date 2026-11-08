import json
from pathlib import Path

import pytest
import yaml

from aiops import cli
from aiops.commands import health, smoke
from aiops.llm import LLM, LLMUnavailableError


@pytest.fixture(autouse=True)
def _env(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> Path:
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    out = tmp_path / "gh_output"
    monkeypatch.setenv("GITHUB_OUTPUT", str(out))
    monkeypatch.setenv("GITHUB_STEP_SUMMARY", str(tmp_path / "summary.md"))
    return out


def outputs(path: Path) -> str:
    return path.read_text() if path.exists() else ""


def test_health_and_envgen_commands(tmp_path: Path, _env: Path) -> None:
    current = tmp_path / "smoke.json"
    current.write_text(
        json.dumps(
            {
                "base_url": "x",
                "requests": 10,
                "errors": 0,
                "error_rate": 0,
                "p50_ms": 50,
                "p95_ms": 90,
                "paths": [],
                "failures": [],
            }
        )
    )
    assert (
        cli.main(["health", "--current", str(current), "--baseline", str(tmp_path / "none")]) == 0
    )
    assert "promote" in outputs(_env)

    intent = tmp_path / "dev.intent.yaml"
    intent.write_text(
        yaml.safe_dump(
            {
                "name": "dev",
                "cloud": "vercel",
                "region": "fra1",
                "goal": "cheap",
                "budget_usd_month": 50,
            }
        )
    )
    policy = tmp_path / "policy.yaml"
    policy.write_text("max_api_replicas: 4\n")
    assert (
        cli.main(
            [
                "envgen",
                "--intent",
                str(intent),
                "--policy",
                str(policy),
                "--out-dir",
                str(tmp_path / "gen"),
            ]
        )
        == 0
    )
    assert (tmp_path / "gen" / "dev.tfvars").exists()


def test_smoke_command(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    fake = smoke.SmokeResult(
        base_url="u", requests=1, errors=0, error_rate=0, p50_ms=1, p95_ms=1, paths=[], failures=[]
    )
    monkeypatch.setattr(smoke, "run", lambda url, rounds, headers: fake)
    out = tmp_path / "s.json"
    assert cli.main(["smoke", "--url", "https://x", "--out", str(out), "--header", "X-A: b"]) == 0
    assert json.loads(out.read_text())["requests"] == 1


def test_real_llm_without_key_is_disabled() -> None:
    llm = LLM(api_key="")
    assert llm.enabled is False
    with pytest.raises(LLMUnavailableError):
        llm.structured("s", "p", health.AIVerdict)
