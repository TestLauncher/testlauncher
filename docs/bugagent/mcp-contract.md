# MCP Contract Patterns

## Server

```text
https://mcp.bugagent.com/mcp
```

The server uses JSON-RPC 2.0 over Streamable HTTP. Send:

```http
Content-Type: application/json
Accept: application/json, text/event-stream
```

## Lifecycle

A direct client should:

1. send `initialize`;
2. send `notifications/initialized` when its transport requires it;
3. call `tools/list`;
4. call a selected tool with `tools/call`.

bugAgent currently supports stateless HTTP requests and may return JSON or SSE.
The [direct MCP example](../../examples/bugagent/mcp/) parses both formats.

## Discovery and authorization

- Unauthenticated discovery may expose tool metadata, but calls require auth.
- An authenticated API-key `tools/list` response is filtered by key scopes.
- Delegated OAuth exposes the interactive catalog.
- A visible tool can still fail a plan, entitlement, role, project, ownership,
  quota, or input check.
- An explicit project selector that does not resolve fails instead of falling
  back to a different project. Use a project UUID returned by `list_projects`
  for unattended writes.

### OAuth protected resource

Delegated OAuth uses the canonical RFC 8707 resource identifier:

```text
https://mcp.bugagent.com/mcp
```

RFC 9728 metadata is published at
`https://mcp.bugagent.com/.well-known/oauth-protected-resource/mcp`. Clients
that expose a resource or audience field should use the canonical identifier
exactly. Compatible clients that omit the parameter are bound to the same
resource by the authorization server.

OAuth tokens are opaque and specific to one MCP client, user, resource, and
scope set. They are not interchangeable with `ba_live_` workspace API keys and
must not be forwarded to the REST API or another MCP server. Refresh tokens
rotate; replace the stored value after every successful refresh and never retry
with the prior value.

## Outputs

All tools return human-readable `content`. Tools with declared output schemas
also return typed top-level `structuredContent`; other tools use
`structuredContent.result`. Clients should inspect `isError`, not only the HTTP
status, and tolerate additive fields.

## Failure handling

- HTTP `401`: replace or refresh the credential.
- OAuth `invalid_grant`: discard the authorization code or old refresh token
  and begin a new authorization flow; do not replay it.
- HTTP `429`: honor `Retry-After` and back off.
- JSON-RPC error: correct the request envelope before retrying.
- `isError: true`: read the returned tool content and correct the input,
  entitlement, role, project, or operation.

For destructive calls, show the exact workspace, project, resource, and action
to a human before invoking the tool.
