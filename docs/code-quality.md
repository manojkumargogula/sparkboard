# Code quality

The standards every change must meet. CI enforces most of them (see [ci.md](ci.md)); `make check` runs the same lint, type and test steps locally.

## Branch naming

```
<type>/<short-description>
<type>/<issue-number>-<short-description>
```

- lowercase, words separated by `-`, at most 50 characters after the slash
- one branch per change; branch off `main`, merge back through a PR

| Type | Use for | Example |
|---|---|---|
| `feat` | a new user-facing feature | `feat/roadmap-filters` |
| `fix` | a bug fix | `fix/42-vote-count-race` |
| `hotfix` | an urgent production fix | `hotfix/google-sign-in-500` |
| `refactor` | restructuring with no behaviour change | `refactor/idea-repository` |
| `perf` | performance | `perf/feed-query-index` |
| `test` | tests only | `test/comments-e2e` |
| `docs` | documentation only | `docs/deployment-guide` |
| `ci` | GitHub workflows, scanners | `ci/semgrep-rules` |
| `infra` | Docker, Helm, Terraform | `infra/aks-node-pool` |
| `deps` | dependency updates | `deps/fastapi-0-163` |
| `chore` | anything else (tooling, cleanup) | `chore/remove-dead-exports` |

`main` and Dependabot's `dependabot/...` branches are the only exceptions. CI's `branch-name` check fails a PR from any other name.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/), using the same types as branches:

```
feat(web): add status filter to the roadmap
fix(api): stop double-counting votes on retry
```

Scope is optional: `api`, `web`, `aiops`, `infra`, `ci`, `docs`. Summary in the imperative, under 72 characters. Use the body to explain *why*.

## Pull requests

`main` is protected by a GitHub ruleset:

- **No direct pushes:** every change goes through a pull request.
- **All required checks must pass:** branch name, API, UI, aiops, infra, end-to-end, Semgrep, Trivy, gitleaks, both image scans, and the risk gate.
- **Branch must be up to date with `main`** before merging.
- **Linear history:** rebase or squash merges only, no merge commits.
- **All review conversations resolved** before merging.
- **No force pushes and no deletion** of `main`.
- Approvals: 0 required by the ruleset (a solo owner can't approve their own PR). High-risk PRs from anyone other than the owner need `RISK_HIGH_APPROVALS` approvals (default 2) through the risk gate.
- The repository admin can bypass the rules only when merging a PR, for emergencies. Bot PRs opened with the workflow token (the AI env-config PR) don't trigger CI, so they need that bypass or a re-run.


- Small and focused: one concern per PR.
- Fill in the template: what changed, why, how it was tested.
- CI must be green. Don't disable a check to get green; fix the cause.
- Migrations: say in the PR that they are backward compatible.

## Python (API, aiops)

| Rule | Enforced by |
|---|---|
| Formatting, 100-character lines | `ruff format` |
| Lint: pycodestyle, pyflakes, isort, naming, bugbear, pylint, security (`S`), async, FastAPI, perf, no `print` | `ruff check` (rules in `pyproject.toml`) |
| Full type hints, no implicit `Any` | `mypy --strict` |
| Security lint | `bandit` |
| No known-vulnerable dependencies | `pip-audit` |
| ≥ 85 % test coverage | `pytest --cov-fail-under=85` |

Naming: `snake_case` for modules, functions and variables, `PascalCase` for classes, `UPPER_CASE` for constants. Tests are `tests/test_<area>.py` and run against a real Postgres (`make test-db`), not mocks.

Dependencies: add them with `uv add` and commit `uv.lock`.

Major version upgrades (of any package, image or action) are not proposed by Dependabot. Do them on purpose in their own `deps/` branch, read the changelog, and run the full CI.

## TypeScript (web)

| Rule | Enforced by |
|---|---|
| Formatting, 100-character lines, Tailwind class order | `prettier` |
| Strict type-checked rules, `import type`, accessibility (`jsx-a11y`), React hooks rules, no `console.log` | `eslint` |
| `strict` TypeScript, no type errors | `tsc --noEmit` |
| Coverage ≥ 80 % lines, 70 % functions, 75 % statements, 70 % branches | `vitest` |
| First-load bundle ≤ 230 kB gzipped | `npm run size` |
| No high-severity vulnerable dependencies | `npm audit` |

Naming: components and their files in `PascalCase` (`VoteButton.tsx`), hooks `useThing.ts`, other modules `camelCase.ts`. A test sits next to its file as `Thing.test.tsx`. Feature code goes in `src/features/<feature>/`; only genuinely shared components go in `src/ui/`.

## Infrastructure

- Dockerfiles pass `hadolint`; images run as non-root and pass the Trivy image scan.
- Terraform passes `terraform fmt`, `validate` and `tflint`; resources and variables use `snake_case`.
- Helm renders for every cloud and passes `kubeconform -strict`.
- Workflows pass `actionlint`. Pin new actions to a full commit SHA with the tag in a comment, and give each job only the `permissions` it needs.

## Security findings

Fix real findings. Suppress a false positive only inline, with the reason, as described in [ci.md](ci.md#when-a-scanner-flags-something). Never commit secrets, and never put user data in URLs or logs.
