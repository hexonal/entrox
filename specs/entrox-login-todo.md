# entrox Login Acceptance TODO

This checklist tracks the remaining login acceptance work for the entrox
white-label build. The target flow is browser authorization: the CLI opens the
provider login, the user completes web login, and entrox stores the returned
credential automatically.

## Provider Login Acceptance

- [ ] Ensure the Sub2API domain serves `/.well-known/opencode`.
- [ ] Verify the well-known response includes `auth.command` and `auth.env`.
- [ ] Run `entrox login`.
- [ ] Confirm the CLI fetches `https://entrox.996icu.wiki/.well-known/opencode`.
- [ ] Confirm the CLI runs the returned `auth.command`.
- [ ] Complete the browser login opened by the auth command.
- [ ] Confirm the auth command exits with status `0` and prints a token to stdout.
- [ ] Confirm the CLI prints `Logged into https://entrox.996icu.wiki`.
- [ ] Confirm `~/.local/share/entrox/auth.json` stores `https://entrox.996icu.wiki` with `type: "wellknown"`.
- [ ] Confirm the saved entry has the expected `key` from `auth.env` and a non-empty `token`.

## TUI Acceptance

- [ ] Start entrox with `entrox`.
- [ ] Open `/connect` or the provider dialog.
- [ ] Confirm the UI uses `entrox` branding and does not expose `OpenCode` in the login path.
- [ ] Select `Entrox` and confirm browser authorization starts without entering a provider URL.
- [ ] Confirm the provider state changes to connected.
- [ ] Send a minimal message and confirm the request is routed through Sub2API.

## Notes

- The current CLI well-known endpoint path remains `/.well-known/opencode` for compatibility.
- Legacy `OPENCODE_*`, `.opencode`, and `opencode.json/jsonc` inputs remain readable as fallback.
