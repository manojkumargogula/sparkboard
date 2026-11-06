"""`aiops` command line. Each subcommand prints markdown and sets Actions outputs."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from aiops import github
from aiops.commands import envgen, explain, health, plan, review, smoke
from aiops.llm import LLM


def _read(path: str | None) -> str:
    if not path:
        return ""
    return sys.stdin.read() if path == "-" else Path(path).read_text(encoding="utf-8")


def cmd_plan(args: argparse.Namespace, llm: LLM) -> int:
    result = plan.make_plan(args.command, llm, context=_read(args.context))
    md = plan.render(result)
    print(md)
    p = result.plan
    github.set_output("plan", p.model_dump_json())
    github.set_output("environment", p.environment.value)
    github.set_output("target", p.target.value)
    github.set_output("actions", ",".join(s.action.value for s in p.steps))
    github.set_output("requires_approval", str(p.requires_approval).lower())
    github.set_output("comment", md)
    return 0


def cmd_review(args: argparse.Namespace, llm: LLM) -> int:
    result = review.review(_read(args.diff), llm, ci_summary=_read(args.ci_summary))
    md = review.render(result)
    print(md)
    github.set_output("risk", result.risk)
    github.set_output("comment", md)
    return 0


def cmd_smoke(args: argparse.Namespace, _llm: LLM) -> int:
    headers = dict(h.split(":", 1) for h in args.header)
    result = smoke.run(
        args.url, rounds=args.rounds, headers={k.strip(): v.strip() for k, v in headers.items()}
    )
    Path(args.out).write_text(result.model_dump_json(indent=2), encoding="utf-8")
    print(f"{result.requests} requests, error rate {result.error_rate:.1%}, p95 {result.p95_ms} ms")
    return 0


def cmd_health(args: argparse.Namespace, llm: LLM) -> int:
    current = smoke.SmokeResult.model_validate_json(_read(args.current))
    baseline = (
        smoke.SmokeResult.model_validate_json(_read(args.baseline))
        if args.baseline and Path(args.baseline).exists()
        else None
    )
    slo = health.SLO(max_error_rate=args.max_error_rate, max_p95_ms=args.max_p95_ms)
    result = health.gate(current, llm, baseline=baseline, logs=_read(args.logs), slo=slo)
    md = health.render(result, current)
    print(md)
    github.summary(md)
    github.set_output("decision", result.decision)
    github.set_output("report", md)
    return 0


def cmd_envgen(args: argparse.Namespace, llm: LLM) -> int:
    intent = envgen.load_intent(Path(args.intent))
    policy = envgen.load_policy(Path(args.policy)) if args.policy else None
    gen = envgen.generate(intent, llm, policy)
    files = envgen.write(gen, Path(args.out_dir))
    md = envgen.render(gen)
    print(md)
    github.set_output("comment", md)
    github.set_output("files", json.dumps([str(f) for f in files]))
    return 0


def cmd_explain(args: argparse.Namespace, llm: LLM) -> int:
    md = explain.render(explain.explain(_read(args.log), llm, job=args.job), job=args.job)
    print(md)
    github.set_output("comment", md)
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="aiops", description=__doc__)
    sub = parser.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("plan", help="ChatOps command → policy-checked deploy plan")
    p.add_argument("--command", required=True)
    p.add_argument("--context", help="file with repo context (changed files, branch)")
    p.set_defaults(fn=cmd_plan)

    r = sub.add_parser("review", help="PR diff → risk-scored review")
    r.add_argument("--diff", required=True, help="unified diff file or - for stdin")
    r.add_argument("--ci-summary")
    r.set_defaults(fn=cmd_review)

    s = sub.add_parser("smoke", help="probe a deployment")
    s.add_argument("--url", required=True)
    s.add_argument("--rounds", type=int, default=5)
    s.add_argument("--out", default="smoke.json")
    s.add_argument("--header", action="append", default=[], help="Name: value (repeatable)")
    s.set_defaults(fn=cmd_smoke)

    h = sub.add_parser("health", help="SLO + AI health gate")
    h.add_argument("--current", required=True)
    h.add_argument("--baseline")
    h.add_argument("--logs")
    h.add_argument("--max-error-rate", type=float, default=0.01)
    h.add_argument("--max-p95-ms", type=float, default=1500)
    h.set_defaults(fn=cmd_health)

    e = sub.add_parser("envgen", help="intent yaml → tfvars + helm values")
    e.add_argument("--intent", required=True)
    e.add_argument("--policy")
    e.add_argument("--out-dir", default="environments/generated")
    e.set_defaults(fn=cmd_envgen)

    x = sub.add_parser("explain", help="explain a failed CI log")
    x.add_argument("--log", required=True)
    x.add_argument("--job", default="")
    x.set_defaults(fn=cmd_explain)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    code: int = args.fn(args, LLM())
    return code


if __name__ == "__main__":
    raise SystemExit(main())
