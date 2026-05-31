# Security

## Threat Model

Entrox is an AI-powered coding assistant that runs locally on your machine. It
provides an agent system with access to shell execution, file operations, web
access, and configured external services.

## No Sandbox

Entrox does not sandbox the agent. The permission system is a user-experience
control that prompts before sensitive actions, but it is not designed to provide
security isolation.

If you need true isolation, run Entrox inside a Docker container or VM.

## Server Mode

Server mode is opt-in only. When enabled, set a server password to require HTTP
Basic Auth. Without this, the server runs unauthenticated and must be protected
by the operator.

## Out Of Scope

| Category                       | Rationale                                                               |
| ------------------------------ | ----------------------------------------------------------------------- |
| Server access when opted in    | If server mode is enabled, API access is expected behavior              |
| Sandbox escapes                | The permission system is not a sandbox                                  |
| LLM provider data handling     | Data sent to configured LLM providers is governed by their policies     |
| MCP server behavior            | External MCP servers are outside the Entrox trust boundary              |
| Malicious config files         | Users control their own config; modifying it is not an attack vector    |

## Reporting Security Issues

Report security issues through https://entrox.996icu.wiki/support.
