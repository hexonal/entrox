# Entrox

Entrox is an AI coding agent for terminal, desktop, and automation workflows.

## Installation

### macOS / Linux (Homebrew)

```bash
HOMEBREW_NO_AUTO_UPDATE=1 brew tap hexonal/entrox
(HOMEBREW_NO_AUTO_UPDATE=1 brew trust hexonal/entrox || true)
HOMEBREW_NO_AUTO_UPDATE=1 brew install hexonal/entrox/entrox
```

### Windows (Scoop)

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
scoop bucket add entrox https://github.com/hexonal/scoop-entrox
scoop install entrox
```

For local testing from this repository, build the CLI package and run the
generated `entrox` binary.

## Usage

```bash
entrox login
entrox
```

`entrox login` uses the bundled Entrox provider URL and opens the browser-based
authorization flow. Legacy configuration files and environment variables remain
readable for compatibility, but new user-facing paths use Entrox names.

## Configuration

Entrox reads `entrox.json` / `entrox.jsonc` first and falls back to legacy config
files when present. Project config directories follow the same rule:
`.entrox` first, legacy fallback second.

## Development

The default upstream branch for this repository lineage is `dev`. Keep Entrox
white-label work isolated on feature branches and preserve compatibility
surfaces such as provider IDs, protocol headers, and legacy config names.

Useful local checks:

```bash
bun run typecheck
bun test test/brand/brand.test.ts test/cli/import.test.ts test/cli/cmd/pr.test.ts
bun run build --single --skip-install --skip-embed-web-ui
```

## Support

For product support and security contact, use https://entrox.996icu.wiki/support.
