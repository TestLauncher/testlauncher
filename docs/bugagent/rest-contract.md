# REST Contract Patterns

## Base URL

Endpoint paths in the reference include `/api` and are relative to:

```text
https://app.bugagent.com
```

For example: `GET https://app.bugagent.com/api/reports`.

## Supported route boundary

Only method/path cards in the public API reference that display a named scope
accept workspace API keys. The server enforces an exhaustive route policy:

- an API key outside its published endpoint audience receives `403`;
- an API key missing the exact named scope receives `403`;
- a newly implemented route is unavailable until its audience is classified;
- dashboard-session, browser-capture, service-callback, and public routes do
  not become API-key endpoints merely because they live under `/api`.

This transport-level check is followed by normal workspace membership,
project, ownership, role, entitlement, and resource checks. Use the
[machine-readable reference index](https://bugagent.com/api-reference-index.json)
to discover supported API-key contracts instead of probing routes.

## Identifiers

- `workspace_id` and legacy `team_id` identify the tenant.
- `project_id` is the durable project UUID inside that workspace.
- `id` is a resource UUID.
- Report `short_id` uses `WORKSPACE-PROJECT-NNN`, such as `TEST-BA-123`.
- Older reports may also expose a workspace-only legacy short ID.

Use UUIDs for durable automation. Use short IDs in human-facing messages.

## Pagination

Endpoints use either `limit`/`offset` or `page`/`per_page`. Follow the fields on
the endpoint card; do not assume one pagination shape globally. Keep filters
stable across pages and stop when `has_more` is false or fewer items than the
requested page size are returned.

## Retries

- Retry reads after `429`, `502`, `503`, or `504` with exponential backoff and
  jitter. Honor `Retry-After` when present.
- Do not automatically retry other `4xx` responses.
- Treat `403` as an authorization or audience mismatch. Do not retry it with
  broader identifiers or another project.
- Retry writes only when the operation documents idempotency or the client can
  prove the first attempt did not commit.
- Reuse `external_run_id` when retrying external test-run creation.

## Errors

REST errors are JSON and normally include `error`. Treat messages as operator
guidance, not stable machine codes unless an endpoint explicitly documents a
code. Bound all response reads and avoid logging headers or request bodies that
may contain secrets.

## Versioning

Versioned contracts include `/api/v1/`. Unversioned endpoints with named scope
badges are supported legacy contracts. Clients must tolerate additive response
fields. Breaking changes require a new version or documented migration period;
security and tenant-isolation fixes may reject previously accepted requests.

## Read-first onboarding

1. Call `GET /api/projects` with `reports:read`.
2. Verify the returned `team_id` and store the exact workspace and project UUIDs.
3. Call a bounded report list for that project.
4. Add a write scope only when the integration is ready to mutate data.

An explicit project selector that does not resolve returns `404`; it never falls
back to another project. Only an omitted selector may use a workspace default.

See the [Node and Python quickstarts](../../examples/bugagent/api-quickstart/).
