import httpx

from aiops.commands import health, smoke
from aiops.commands.smoke import SmokeResult
from tests.conftest import FakeLLM


def result(error_rate: float = 0.0, p95: float = 120.0) -> SmokeResult:
    return SmokeResult(
        base_url="https://x",
        requests=30,
        errors=int(error_rate * 30),
        error_rate=error_rate,
        p50_ms=p95 / 2,
        p95_ms=p95,
        paths=[],
        failures=["/api/ideas → 500"] if error_rate else [],
    )


def verdict(healthy: bool, confidence: float) -> FakeLLM:
    return FakeLLM(
        {
            "AIVerdict": {
                "healthy": healthy,
                "confidence": confidence,
                "summary": "s",
                "anomalies": ["a"],
                "suspected_cause": "db pool",
            }
        }
    )


def test_clean_release_promotes(offline: FakeLLM) -> None:
    gate = health.gate(result(), offline)
    assert gate.decision == "promote"
    assert "decided on SLOs only" in health.render(gate, result())


def test_slo_breach_rolls_back_even_if_ai_is_happy() -> None:
    gate = health.gate(result(error_rate=0.2), verdict(True, 0.99))
    assert gate.decision == "rollback"
    assert gate.breaches


def test_latency_regression_vs_baseline(offline: FakeLLM) -> None:
    gate = health.gate(result(p95=900), offline, baseline=result(p95=300))
    assert any("regressed" in b for b in gate.breaches)


def test_confident_ai_rolls_back_quiet_failure() -> None:
    gate = health.gate(result(), verdict(False, 0.9), logs="ERROR pool exhausted")
    assert gate.decision == "rollback"
    assert "db pool" in health.render(gate, result())


def test_unsure_ai_does_not_roll_back() -> None:
    assert health.gate(result(), verdict(False, 0.5)).decision == "promote"


def test_smoke_counts_errors_and_latency() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500 if request.url.path == "/api/stats" else 200)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    out = smoke.run("https://app.example", rounds=2, client=client)
    assert out.requests == 12
    assert out.errors == 2
    assert out.failures[0] == "/api/stats → 500"


def test_smoke_records_transport_errors() -> None:
    def boom(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("down", request=request)

    out = smoke.run(
        "https://down", rounds=1, client=httpx.Client(transport=httpx.MockTransport(boom))
    )
    assert out.error_rate == 1.0
