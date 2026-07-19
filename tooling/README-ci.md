# QMDJ CI — Setup Notes & Script Contract

This folder plus `.github/workflows/` implements the five-layer testing model.
Drop these files into the repo root, then wire the pieces below.

## 1. The script contract (what Claude Code must wire up)

The workflows call these package scripts. They don't exist yet — creating
them (and the tests behind them) is the build work. Names are the contract;
implementations can evolve freely behind them.

| Package | Script | What it runs |
|---|---|---|
| `@qmdj/engine` | `test:golden` | Loads every `tests/golden/*.fixture.json`, computes the chart, deep-compares against `expected` |
| `@qmdj/engine` | `test:boundary` | Generated solar-term ±1min cases, 晚子时, 换旬, and the §4.3 interaction case |
| `@qmdj/engine` | `test:invariants` | Property tests: 9 palaces populated, 地盘 permutation valid, purity (same input → identical output), 值符/值使 consistency, fired patterns satisfy their own `when` |
| `@qmdj/engine` | `test:patterns` | One positive + one negative fixture per 格局 registry rule |
| `@qmdj/engine` | `test:parity` | Golden fixtures re-run in Vitest browser mode (Chromium); results must be identical to Node |
| `@qmdj/engine` | `test:perf` | Budget assertions: month summary and 180-day search timings |
| `@qmdj/server` | `test:contract` | Each tRPC endpoint's response deep-equals a direct engine call |
| `@qmdj/web` | `test:components` | 12-segment bar colour mapping, PalaceCell slot layout (神→门→星→干→支), markers 空/马/迫/墓 — fed by golden fixture data |
| `@qmdj/web` | `test:e2e` | Playwright smoke: calendar → day panel → hour paging → search → .ics |
| `@qmdj/web` | `test:visual` | Playwright screenshot comparison on known charts (guards the dark+gold look per §9) |
| all | `typecheck`, `lint`, `build` | Standard |

Root devDependencies needed by the validator:

```
pnpm add -D -w ajv ajv-formats
```

## 2. Branch protection (do this once, in GitHub settings)

Settings → Branches → Add rule for `main`:
- Require a pull request before merging
- Require status checks to pass → select **`ci-gate`** (the single
  aggregate job — it accounts for path-skipped jobs correctly)
- Optionally: require branches to be up to date before merging

With this in place, "no engine change merges with a red golden test" is
enforced by the platform, not by discipline.

## 3. Fixture workflow

1. Copy `fixture.schema.json`'s shape via the provided
   `*.fixture.json.template`, fill every `TODO_VERIFY` **from your verified
   sources** (never from an AI's memory), rename to `*.fixture.json`.
2. `node tooling/validate-fixtures.mjs` locally — schema + provenance check.
3. Commit. The golden runner picks it up automatically (no registration step).
4. **Changing an existing fixture** = declaring the previous truth wrong.
   Do it in its own commit with an explanation, never bundled with an
   engine change that "makes it pass".

The validator warns (doesn't fail) when a fixture has <2 independent
sources or `crossChecked: false`, matching the Phase 1 exit criterion
without blocking work-in-progress.

## 4. Where StackBlitz fits

StackBlitz is a preview/manual-testing environment, not part of the CI
chain. Since the repo lives on GitHub:

- CI runs on GitHub Actions against every PR — StackBlitz doesn't need to
  do anything for tests to run.
- Keep StackBlitz pointed at the GitHub repo (import-from-GitHub), so
  what you preview there is what CI has already vetted. Avoid editing in
  StackBlitz without pushing back to GitHub — anything that only lives in
  a StackBlitz workspace is outside the guardrails.

## 5. Known gaps (deliberate)

- **Deploy target undefined.** `main.yml`'s deploy job is a stub; the
  post-deploy smoke test is sketched in comments. Choose a host, then
  replace the stub and enable the smoke job.
- **Perf budget numbers** live inside `test:perf`, not in the workflow —
  start generous (e.g. month summary < 500ms cold), tighten after Phase 2
  memoization.
- **`patterns` field in fixtures** is optional until the §5 registry
  lands in Phase 3; once fixtures include it, the golden runner should
  assert exact set equality (no unexpected patterns firing either).
