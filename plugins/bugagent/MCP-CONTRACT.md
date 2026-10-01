# Restricted MCP contract

Public interface summary verified by read-only inspection of the backend capture
implementation. This documents implemented behavior, not hosted availability or
directory approval. No live MCP calls were made. Hosted OAuth/reviewer validation
and publisher access remain pending; this is preview source, not a published
directory plugin.

Intended transport: Streamable HTTP at https://mcp.bugagent.com/mcp/capture only.
Use the host's secure connection flow. Never include credentials in this package.

## Inputs and defaults

All five tools accept strict JSON objects: unknown fields are rejected. UUID
inputs are validated and normalized to lowercase. All report calls require
workspace_id and project_id UUIDs. Profile and discovery do not require project_id.

| Tool | Required fields | Optional fields and defaults |
| --- | --- | --- |
| capture_get_profile | None; use `{}` | None. Identity comes from the authenticated connection. |
| capture_list_projects | None; `{}` is valid | workspace_id UUID; limit integer 1-20, default 20; offset integer 0-10000, default 0. |
| capture_search_reports | workspace_id UUID, project_id UUID | query string, trimmed, at most 500 characters, omitted or empty allowed; status from the list below; limit integer 1-20, default 20; offset integer 0-10000, default 0. |
| capture_get_report | workspace_id UUID, project_id UUID, report_id UUID | None. A short ticket ID is not a report_id. |
| capture_create_report | workspace_id UUID, project_id UUID, request_id UUID, approved literal true, title string, description string | severity defaults to s3; type defaults to functional. |

Create trims title and description before validation: title must contain 1-300
characters and description 1-20000 characters after trimming. Severity is one of
s1, s2, s3, s4. Null is not a substitute for an omitted optional field.

Supported types: ui, performance, crash, security, logic, data, network,
accessibility, compatibility, functional, ui-ux, data-integrity, feature-request,
enhancement, technical-debt, documentation, devops, ux-improvement, integration.

Search statuses: new, awaiting-triage, confirmed, in-progress, blocked, resolved,
retesting, closed, reopened. No other filters, cursor or sort input is exposed.

## Response envelopes

Successful calls return the same data object in structuredContent and as JSON
in a text content item. Success does not explicitly include isError=false.
Handled failures return isError=true and an object containing an error string
in both locations. Authentication/scope failures can additionally include
`_meta["mcp/www_authenticate"]` challenges. MCP input validation failures may be
reported by the protocol layer rather than this application error envelope.

| Tool | Successful data object |
| --- | --- |
| capture_get_profile | `{id: string}` |
| capture_list_projects | `{workspaces: [...], limit, offset, has_more, next_offset, truncated}` |
| capture_search_reports | `{reports: [...], limit, offset, has_more, next_offset, truncated}` |
| capture_get_report | `{report: {...}}` |
| capture_create_report | `{report: {...}, replayed: boolean}` |

Each discovery workspace has id, name, projects, has_more, next_offset and
truncated. Each project has id and name. Workspace/project names are capped at
200 characters and may be null when absent. Use workspace.id as workspace_id and
project.id as project_id on report calls.

Every report object contains url, id, short_id, workspace_id, project_id, title,
description, description_truncated, severity, type, status, created_at and
updated_at. The url points to the report in https://app.bugagent.com with its
workspace context; use the returned URL instead of constructing one.

Text limits are: short_id 100, title 300, severity 30, type 40, status 40, and
timestamps 40 characters. Missing text values are null. Search descriptions are
capped at 500 characters; get/create descriptions at 20000. The boolean
description_truncated indicates whether the description exceeded that limit.
Report id is the UUID used by capture_get_report; short_id is display text.

## Pagination

Use the returned next_offset, preserving scope, filters and limit. It is an
integer only when has_more is true and the next offset is at most 10000;
otherwise it is null. truncated is true when more results exist beyond the
allowed next offset. At that boundary stop and disclose incomplete coverage.
No total count, cursor or snapshot-consistency guarantee is exposed.

Discovery without workspace_id pages accessible workspaces, ordered by UUID,
and includes the first page of projects for each. Continue projects by calling
capture_list_projects with that workspace's id and nested next_offset. With an
explicit workspace_id, offset pages that workspace's projects, ordered by UUID;
top-level paging then reflects the project page. A workspace-bound key implicitly
selects its workspace even without workspace_id, so offset pages projects in
that case too. Never confuse the outer workspace page with nested project pages.

Search pages reports in the explicit workspace/project. Its has_more check probes
for another visible matching report after the returned page. A completed page
sequence only covers the selected query and current results; it is not proof
that no duplicate exists. Read full candidates when excerpts are truncated.

## Identity and authorization

capture_get_profile is authenticated and read-only, returning the connection's
user identity as id, with no display fields or caller-supplied selector. It has
the `openai/profile` metadata marker and an output schema requiring a string id.
Treat that ID as opaque; it is not a workspace or project identifier. Stable
identity across reconnects is a hosted verification requirement, not something
the package's schema checks prove.

The capture surface declares OAuth bugs:read for profile/discovery/search/get
and bugs:write for create. Workspace-bound keys require reports:read or
reports:write respectively and cannot switch workspaces. Report calls check
active workspace membership, project access, and report scope. Storage must be
available. These checks are server-side; skill instructions and client-supplied
IDs are not authorization. Transport authentication/audience validation and the
complete hosted OAuth/reviewer flow still require launch verification.

approved=true is client confirmation, not server proof of human consent and not
a report status. The skill must obtain approval of the exact sanitized payload,
destination and disclosed integration effects before calling create.

## Creation, retries and integration effects

A new create returns replayed=false. A matching retry returns the existing report
with replayed=true, potentially reflecting subsequent report changes. Creation
checks available report quota; a matching existing replay is resolved first.

Idempotency is scoped to the same immutable authenticated user, workspace UUID,
project UUID and request UUID. The payload must match exactly after normalization:
trimmed title, trimmed description, severity (default s3) and type (default
functional). Omitting those defaults and explicitly supplying them are equivalent.
Case changes or internal whitespace changes in title/description are not trimmed
away. A different normalized payload for an existing request conflicts rather than
updating the report. Changing the user or scope changes the idempotency identity.

This protection applies only while the report exists. There is no permanent
retained idempotency promise after report deletion: reusing the request can create
again and repeat creation effects. Do not infer that a timeout means no write
occurred. First resolve the outcome read-only; any retry must retain the same
identity, scope, request_id and normalized payload. If deletion or outcome is
uncertain, stop for user resolution instead of blindly retrying or generating a
new request_id. Authorization still applies to every retry.

New report creation invokes the existing configured Jira auto-sync asynchronously.
It may forward report data to Jira. Disclose this before approval; the capture
tool has no forwarding-disable input. A successful report response does not prove
Jira delivery, and integration failures are not surfaced as create failures.
Replaying an existing report does not invoke that new-create forwarding step again.

There are no attachment uploads or separate admin/delete/automation/test-case
tools in this surface. That tool restriction does not disable configured Jira
effects of report creation. No other downstream integration guarantees are made.
