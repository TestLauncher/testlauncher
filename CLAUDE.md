# CLAUDE.md

## Project
**`TestLauncher/testlauncher`** — the public, MIT-licensed flagship repo for
**TestLauncher** (agentic quality infrastructure for zero-tolerance enterprises).
It is the home for **working examples** of building on the TestLauncher product
suite (Launch App, bugAgent, qualThread, ARC, manualTesting, and the open OQA
standard).

The repository contains runnable examples under `examples/` and installable
agent skills under `skills/`.

## Audience
This repo is **public and developer-facing** — written for engineers at
prospect/customer companies and for AI/agentic tools that read the repo. Keep it
clean, accurate, and runnable. Nothing proprietary or internal-only.

## Conventions (when adding content)
- **Examples** live under `examples/<topic>/`, each self-contained with its own
  README and runnable instructions. Prefer small, copy-pasteable samples.
- **Skills** live under `skills/<skill-name>/` so compatible agent runtimes can
  install them directly from this repository.
- Use the canonical product names and casing: Launch App, bugAgent, qualThread,
  ARC, manualTesting, OQA. Link products to their `*.testlauncher.com` homes.
- Don't duplicate the marketing site — link to `https://testlauncher.com` for
  positioning; this repo is for hands-on material.
- Keep dependencies minimal and pinned; every example must actually run.

## Related
- Marketing site: `https://testlauncher.com`.
- Open standard: `https://oqa.ai`.
