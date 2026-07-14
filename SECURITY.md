# Security Policy

## Report a vulnerability privately

Do not open a public GitHub issue for a suspected vulnerability. Email
`security@bugagent.com` with:

- the affected example, endpoint, or product surface;
- reproduction steps and the security impact;
- any relevant request IDs or sanitized evidence;
- a safe way to contact you for follow-up.

Do not include API keys, passwords, customer data, or active exploit payloads in
the initial message. We will coordinate a secure evidence channel when needed.

## Responsible testing

Use accounts, workspaces, projects, and data you own or are explicitly
authorized to test. Do not access another tenant, degrade service, send spam,
or retain personal data. Stop testing and report immediately if you encounter
data outside your authorized scope.

The latest revision on `main` is the supported version of these examples.

## Agent and CI boundaries

Test cases and target pages are untrusted input. The Hermes example limits the
bugAgent MCP tools, but it cannot sandbox a customer's agent runtime. Restrict
browser targets and network egress, do not expose shell tools to case text, and
use only synthetic accounts on non-production systems.

Keep secret-bearing GitHub Actions workflows separate from pull-request jobs.
Never run untrusted branch code in a job that can access a bugAgent API key.
