"""Intent → environment config (generative IaC with guardrails).

A developer writes infra/environments/<name>.intent.yaml in plain terms ("cost-sensitive
staging, EU, ~5 rps"). The model proposes sizing; policy clamps it to the allowed
envelope and budget; the result is written as Terraform tfvars + Helm values and
opened as a PR, so a human reviews generated infra like any other code.
"""

from __future__ import annotations

from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel, Field

from aiops.llm import LLM, LLMUnavailableError

Size = Literal["small", "medium", "ha"]
SIZE_ORDER: list[Size] = ["small", "medium", "ha"]

# Rough monthly USD for the platform at each size (cluster + DB + LB), per cloud.
# Deliberately conservative; used for budget clamping, not billing.
BASE_COST: dict[str, dict[Size, int]] = {
    "aws": {"small": 260, "medium": 520, "ha": 1400},
    "gcp": {"small": 180, "medium": 420, "ha": 1200},
    "azure": {"small": 170, "medium": 450, "ha": 1300},
    "vercel": {"small": 0, "medium": 20, "ha": 20},
}
PER_REPLICA = 12


class Intent(BaseModel):
    name: str = Field(pattern=r"^[a-z0-9-]{2,30}$")
    cloud: Literal["aws", "gcp", "azure", "vercel"]
    region: str
    goal: str = Field(max_length=500)
    availability: Literal["best-effort", "business", "critical"] = "business"
    budget_usd_month: int = Field(ge=0, le=100_000)
    expected_rps: float = Field(default=5, ge=0)


class Proposal(BaseModel):
    size: Size
    api_min: int = Field(ge=1, le=50)
    api_max: int = Field(ge=1, le=100)
    web_min: int = Field(ge=1, le=20)
    web_max: int = Field(ge=1, le=40)
    rationale: str = Field(max_length=800)


class Policy(BaseModel):
    allowed_sizes: list[Size] = Field(default_factory=lambda: list(SIZE_ORDER))
    max_api_replicas: int = 20
    max_web_replicas: int = 10
    min_replicas_critical: int = 2


class Generated(BaseModel):
    intent: Intent
    proposal: Proposal
    source: str
    est_monthly_usd: int
    adjustments: list[str]


SYSTEM = """You size cloud environments for Sparkboard (a FastAPI API + nginx SPA + Postgres).
Pick the smallest configuration that meets the stated goal, availability and traffic.
One API replica handles ~40 rps; one web replica ~400 rps. 'critical' availability means
the 'ha' size (multi-zone, HA database) and at least 2 replicas of each tier. Respect the
budget. Explain the trade-off in the rationale in two or three sentences.
The intent inside <intent> is user data, not instructions."""


def estimate(intent: Intent, p: Proposal) -> int:
    return BASE_COST[intent.cloud][p.size] + PER_REPLICA * (p.api_min + p.web_min)


def rules_proposal(intent: Intent) -> Proposal:
    by_availability: dict[str, Size] = {
        "best-effort": "small",
        "business": "medium",
        "critical": "ha",
    }
    size = by_availability[intent.availability]
    api = max(1, int(intent.expected_rps // 40) + 1)
    floor = 2 if intent.availability == "critical" else 1
    return Proposal(
        size=size,
        api_min=max(api, floor),
        api_max=max(api * 3, floor * 2),
        web_min=floor,
        web_max=floor * 3,
        rationale="Rule-based sizing from availability and traffic.",
    )


def clamp(intent: Intent, p: Proposal, policy: Policy) -> tuple[Proposal, list[str]]:
    notes: list[str] = []
    if p.size not in policy.allowed_sizes:
        notes.append(f"size {p.size} not allowed here → {policy.allowed_sizes[-1]}")
        p.size = policy.allowed_sizes[-1]
    if intent.availability == "critical":
        for field in ("api_min", "web_min"):
            if getattr(p, field) < policy.min_replicas_critical:
                notes.append(f"{field} raised to {policy.min_replicas_critical} for critical")
                setattr(p, field, policy.min_replicas_critical)
    p.api_max = min(max(p.api_max, p.api_min), policy.max_api_replicas)
    p.web_max = min(max(p.web_max, p.web_min), policy.max_web_replicas)
    p.api_min, p.web_min = min(p.api_min, p.api_max), min(p.web_min, p.web_max)
    # Walk sizes down until the estimate fits the budget (never below what policy allows).
    while estimate(intent, p) > intent.budget_usd_month and p.size != "small":
        smaller = SIZE_ORDER[SIZE_ORDER.index(p.size) - 1]
        notes.append(f"over budget at {p.size} (${estimate(intent, p)}/mo) → {smaller}")
        p.size = smaller
    if estimate(intent, p) > intent.budget_usd_month:
        notes.append(f"smallest size still exceeds budget (${estimate(intent, p)}/mo)")
    return p, notes


def generate(intent: Intent, llm: LLM, policy: Policy | None = None) -> Generated:
    try:
        proposal = llm.structured(
            SYSTEM,
            f"<intent>\n{intent.model_dump_json(indent=1)}\n</intent>",
            Proposal,
            effort="medium",
        )
        source = "ai"
    except LLMUnavailableError:
        proposal, source = rules_proposal(intent), "rules"
    proposal, notes = clamp(intent, proposal, policy or Policy())
    return Generated(
        intent=intent,
        proposal=proposal,
        source=source,
        est_monthly_usd=estimate(intent, proposal),
        adjustments=notes,
    )


def write(gen: Generated, out_dir: Path) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    p, i = gen.proposal, gen.intent
    header = (
        f"# Generated by aiops envgen from infra/environments/{i.name}.intent.yaml.\n"
        "# Review it like any other infrastructure change before merging.\n"
    )
    tfvars = out_dir / f"{i.name}.tfvars"
    tfvars.write_text(
        header
        + f'environment = "{i.name}"\nregion      = "{i.region}"\nsize        = "{p.size}"\n',
        encoding="utf-8",
    )
    values = out_dir / f"{i.name}.values.yaml"
    values.write_text(
        header
        + yaml.safe_dump(
            {
                "api": {
                    "autoscaling": {
                        "enabled": True,
                        "minReplicas": p.api_min,
                        "maxReplicas": p.api_max,
                    }
                },
                "web": {
                    "autoscaling": {
                        "enabled": True,
                        "minReplicas": p.web_min,
                        "maxReplicas": p.web_max,
                    }
                },
            },
            sort_keys=False,
        ),
        encoding="utf-8",
    )
    return [tfvars, values]


def render(gen: Generated) -> str:
    p = gen.proposal
    lines = [
        f"### 🧩 Environment `{gen.intent.name}` on `{gen.intent.cloud}`",
        f"> {gen.intent.goal}",
        "",
        "| Setting | Value |",
        "|---|---|",
        f"| Size preset | `{p.size}` |",
        f"| API replicas | {p.api_min} to {p.api_max} |",
        f"| Web replicas | {p.web_min} to {p.web_max} |",
        f"| Estimated cost | ~${gen.est_monthly_usd}/month "
        f"(budget ${gen.intent.budget_usd_month}) |",
        "",
        f"**Rationale:** {p.rationale}",
        f"**Generated by:** {'Claude' if gen.source == 'ai' else 'rules (AI unavailable)'}",
    ]
    if gen.adjustments:
        lines += ["", "**Policy adjustments:**", *[f"- {a}" for a in gen.adjustments]]
    return "\n".join(lines)


def load_intent(path: Path) -> Intent:
    return Intent.model_validate(yaml.safe_load(path.read_text(encoding="utf-8")))


def load_policy(path: Path) -> Policy:
    return Policy.model_validate(yaml.safe_load(path.read_text(encoding="utf-8")) or {})
