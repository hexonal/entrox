# Entrox upstream merge guide

Goal: keep Entrox white-label behavior while reducing recurring conflicts when merging `origin/dev`.

## Rules

- Keep protocol/package compatibility surfaces unless a migration is planned:
  `@opencode-ai/*`, `OPENCODE_*`, `/.well-known/opencode`, `x-opencode-*`,
  `.opencode`, `opencode.json/jsonc`, and provider IDs.
- Prefer centralized branding helpers over editing upstream content line by line.
- Do not mass-edit locale dictionaries, built-in theme JSON, or bundled prompt source files.
  These are intentionally branded at runtime or after web build.
- Public release, docs, website, console, installer, desktop artifact, and CLI display surfaces must show Entrox.

## Central branding points

- CLI/core runtime: `packages/opencode/src/brand.ts`
- App runtime text: `packages/app/src/brand.ts`
- Console runtime text: `packages/console/app/src/lib/brand.ts`
- Web source/build output: `packages/web/src/brand.mjs` and `packages/web/script/brand-public-output.mjs`
- Guardrail scan: `script/entrox-whitelabel-check.ts`

## Merge flow

```bash
git fetch origin dev
git merge origin/dev
bun typecheck
bun --cwd packages/web build
bun run check:whitelabel
git diff --check
```

If `origin/dev` changes locale dictionaries, theme JSON, or bundled prompt text, keep the upstream version first and adjust the central branding layer only when a new public legacy string leaks through `check:whitelabel` or a focused test.
