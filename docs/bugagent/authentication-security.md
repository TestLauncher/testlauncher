# Authentication and Security

## Workspace API keys

Create keys in **Settings -> Developers -> API Keys**. A key is bound to the
workspace where it was created. Project selectors can narrow access inside that
workspace; they cannot switch the key to another workspace.

Send the key only from trusted server-side code:

```http
Authorization: Bearer ba_live_REPLACE_LOCALLY
```

Never embed it in browser JavaScript, a mobile binary, a public repository,
logs, screenshots, or an issue description.

## Least-privilege recipes

| Integration | Scopes |
| --- | --- |
| Bug reader | `reports:read` |
| Bug editor | `reports:read`, `reports:write` |
| Usage monitor | `usage:read` |
| Web automation author | `automations:write` |
| Web automation runner | `automations:run` |
| Mobile observer | `mobile:read` |
| Mobile author | `mobile:read`, `mobile:write` |
| Mobile runner | `mobile:read`, `mobile:run` |
| Test catalog manager | `reports:read`, `test_cases:read`, `test_cases:write` |
| External test worker | `test_runs:read`, `test_runs:write` |

An MCP tool omitted from the API-key allowlist remains delegated-OAuth-only,
regardless of which scopes a key has.

The REST server applies the same rule by method and path. A workspace API key
is accepted only when the public endpoint card names an API-key scope and the
key contains that exact scope. Other authenticated routes require a dashboard
session and return `403` to API keys. Do not treat an undocumented route as an
integration contract even if it shares the public application origin.

## Rotation and revocation

For zero-downtime rotation:

1. Create a second key with the same minimum scopes.
2. Update one consumer at a time.
3. Verify each consumer with a read-only request.
4. Revoke the original key.

Regenerating a key invalidates its prior secret immediately; it is not a
zero-downtime operation.

## Delegated MCP OAuth

OAuth-capable MCP hosts can use Authorization Code with PKCE. Generate static
client credentials only for hosts that require a client ID and secret. The
connector identifies the MCP client; calls execute as the signed-in user and
that user's active bugAgent workspace. Confirm the active workspace before
approving consent on a multi-workspace account.

The canonical OAuth protected resource is:

```text
https://mcp.bugagent.com/mcp
```

Standards-aware clients discover it from:

```text
https://mcp.bugagent.com/.well-known/oauth-protected-resource/mcp
```

When a client asks for a resource or audience, use the canonical value exactly.
bugAgent binds opaque access and rotating refresh tokens to that resource, the
OAuth client, the signed-in user, and the granted scopes. A token issued for a
different resource or presented by another OAuth client is rejected.

Do not forward a bugAgent OAuth token to another service or treat it as a
general-purpose API or workspace key. Do not attempt to inspect or decode an
OAuth token; it is intentionally opaque.

## Browser capture keys

The browser session-capture SDK uses a separate project-bound key beginning
with `ba_pub_`. It is safe to expose only because the server restricts it to
the `sessions:capture` capability, one workspace, one project, exact configured
origins, and bounded capture quotas.

- Send it in `X-BugAgent-Key`, never `Authorization`.
- Never put a secret `ba_live_` key in browser code.
- Browser keys can submit capture evidence but cannot read sessions, reports,
  members, settings, or other workspace data.
- Video evidence uses `POST /api/sessions/capture-video`, requires
  `Content-Length`, is capped at 50 MiB, and can be attached once per session.

## Tenant-safe behavior

- Keep workspace keys and cached project IDs together in configuration.
- Resolve projects using an exact UUID whenever possible.
- Verify that each discovered project's `team_id`/`workspace_id` equals the
  workspace UUID stored with the credential before writing.
- Treat `404` as both "missing" and "not authorized"; do not infer existence.
- Reject ambiguous project names instead of selecting the first match.
- Keep production and staging keys in separate secret stores.

Report a suspected credential exposure or cross-tenant issue using
[SECURITY.md](../../SECURITY.md).
