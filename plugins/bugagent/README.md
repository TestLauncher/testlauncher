# bugAgent Plugin (Preview)

Public source for bug capture, possible-duplicate checking and report lookup with
an existing [bugAgent](https://bugagent.com) license. This MIT-licensed
package does not grant a bugAgent service license or change service entitlements.

**Preview source, not a published directory plugin.** The intended endpoint is
`https://mcp.bugagent.com/mcp/capture`; hosted readiness has not been verified by
this package work. The package has not been submitted, approved or published.

## Implementation and launch status

The backend implementer confirms capture_get_profile is implemented and
capture_get_report requires a report_id UUID. The parent reports that focused
local database/UI smoke checks passed twice. Those results were not independently
run here and do not establish hosted OAuth or directory readiness.

Directory launch remains blocked on hosted OAuth/reviewer verification and the
publisher's submission access. Pagination and other explicitly provisional
contract details still need confirmation. Listing assets and the eight proposed
directory review cases remain checklist gates; the local smoke checks do not
mark those cases executed. Local discovery and a validated ZIP are not publication.

## Scope

One skill uses five restricted tools: capture_get_profile, capture_list_projects,
capture_search_reports, capture_get_report and capture_create_report. It resolves
workspace/project scope, searches for possible duplicates, shows a sanitized draft,
and asks for explicit approval before creation. The read-only profile tool returns
the stable identity for the authenticated connection, not a workspace selector.
Lookup and search do not write.

There are no attachment uploads in v1. The skill can help describe a screenshot,
but cannot store its image. Use a returned ticket link to upload in the ticket UI.
Administration, deletion, automation and test-case creation are outside this MVP.

## Local discovery

The repository's `.agents/plugins/marketplace.json` points to `./plugins/bugagent`
relative to the repository root. It supports local discovery, not public directory
approval or automatic installation. After endpoint/authentication verification,
refresh the host's marketplace and install the preview deliberately. Never paste
credentials into this package or chat. Complete authentication through the host's
secure connection UI; the final supported flow must still be verified.

Do not substitute the general bugAgent MCP endpoint if the preview is unavailable.
Offline drafting remains possible; no successful capture should be claimed.

## Offline validation and build

From the repository root, with Node.js 22 or newer and no dependencies:

```sh
node --test scripts/bugagent-plugin.test.mjs
node scripts/bugagent-plugin.mjs validate
node scripts/bugagent-plugin.mjs build
node scripts/bugagent-plugin.mjs validate-zip
```

Output: `plugins/bugagent/dist/bugagent-preview.zip` (ignored by Git). Build uses
an explicit file allowlist, fixed ZIP timestamps/modes/order and no compression.
The ZIP root contains plugin.json, mcp.json, one skill and public documentation.
No marketplace catalog, build scripts, repository source, credentials or local
configuration enter the ZIP. Symlinked inputs are rejected.

Validation checks this package's deliberately narrow format and common sensitive
content, not the full upstream schema or all possible secrets. ZIP validation
requires exact equality with the canonical build from the current validated source;
it is not a general-purpose ZIP validator. Human public-content review is mandatory.
No command contacts the MCP endpoint. Passing checks proves package consistency,
not runtime behavior, endpoint readiness, security certification or marketplace approval.

For an explicit network check against the published portable JSON schemas:

```sh
node scripts/bugagent-plugin-schema.mjs
```

This command fetches only the two declared Agent Plugins schemas and validates
plugin.json and mcp.json with a dependency-free evaluator for their current keyword
set. Unknown keywords fail closed. It prints schema SHA-256 hashes for review;
it is not a general JSON Schema implementation. OpenAI extension semantics are
checked separately by the local package validator, since the portable schema
allows host-defined extension objects.

See [interface assumptions](MCP-CONTRACT.md), the [submission checklist](SUBMISSION.md),
and [proposed review cases](REVIEW-CASES.md). All eight review cases are unexecuted.

## Format references

Official [packaging](https://developers.openai.com/plugins/build/plugins) and
[submission](https://developers.openai.com/plugins/deploy/submission) documentation
was fetched before implementation on 2026-10-01. The package uses the portable
root manifest and MCP format. The OpenAI interface includes verified public URLs;
registered server IDs and unverified submission metadata are omitted.

## Verified public listing destinations

On 2026-10-01, HTTP GET returned 200 for the [website](https://bugagent.com),
[support documentation](https://bugagent.com/docs/#support),
[privacy policy](https://bugagent.com/privacy/), and [terms](https://bugagent.com/terms/).
The support document includes a support section and public support email.
This verifies the public pages, not the capture endpoint or legal sufficiency.

Listing descriptions describe intended functionality without preview/trial/demo
wording. That wording change is not a readiness claim: keep this package out of
submission until the complete hosted runtime, account identity, pagination
contract, review cases, and listing assets have been verified. The README and
submission checklist remain the source of release status.

Package source is covered by [MIT](LICENSE). Hosted bugAgent access remains subject
to its existing license and service terms.
