# Unpublished tester preview

Package version: **0.1.0-preview.2**. This guide is for an internal source-checkout tester
install before directory submission, not a public-directory release. It is
repository documentation and is not included in the fixed-allowlist ZIP.
Participation requires a dedicated account provisioned by the test owner. Public
source availability or an existing bugAgent license does not grant external users
access to this internal tester preview.

The production capture endpoint is live at
`https://mcp.bugagent.com/mcp/capture`. Production v19.18 release checks verified
protected-resource metadata, five-tool discovery (HTTP 200), and anonymous
tool-call rejection (HTTP 401). **Full authenticated ChatGPT OAuth end-to-end
testing remains UNVERIFIED.** Discovery success is not authentication success.
No staging environment is made public by this preview.

## Safety prerequisites

- Use a dedicated authorized tester account with access only to synthetic test
  data in the **TestLauncher** workspace's **Test Bed** project. Ask the test owner
  to provision access privately. Do not use customer accounts, customer projects,
  or the production bugAgent project, even for read-only exploration.
- Confirm workspace/project names through authorized discovery, then retain their
  returned UUIDs privately. If scope is missing or ambiguous, stop. Never publish
  account IDs, tenant IDs, report URLs, tokens, screenshots of credentials or auth
  callback URLs in GitHub issues, package files or transcripts.
- Ask the test owner to prepare synthetic report/screenshot fixtures in Test Bed.
  Review configured Jira forwarding first: a create may send report data to the
  configured destination. Only proceed when that destination is approved for
  synthetic tests; this tool has no forwarding-disable flag.
- This guide does not authorize unattended writes. Every create still needs
  explicit approval of the exact draft, scope and disclosed forwarding effects.

## A. Desktop repo-marketplace install

Use a supported ChatGPT desktop app in Work mode or Codex. A local/repo marketplace
is distinct from the public Plugins Directory catalog. Availability is subject to
the host version and organizational policy; do not bypass an administrator block.

1. Obtain the maintainer-provided source checkout containing preview.2. Do not
   assume the latest GitHub main or an older preview ZIP contains this revision.
   Open the repository root, not just the plugin subdirectory, in the desktop app.
2. Verify the package and record its revision from a terminal at that root:

   ```sh
   node -p "JSON.parse(require('node:fs').readFileSync('plugins/bugagent/plugin.json', 'utf8')).version"
   git rev-parse HEAD
   git status --short
   node --test scripts/bugagent-plugin.test.mjs
   node scripts/bugagent-plugin.mjs validate
   ```

   Expect `0.1.0-preview.2`. If there are local edits, record that fact: HEAD alone
   does not identify the tested package. Do not discard anyone's changes.
3. The repository already has `.agents/plugins/marketplace.json`, named
   `testlauncher`, with display name **TestLauncher Previews**, pointing to
   `./plugins/bugagent`. Do not overwrite it or add credentials. If the host does
   not discover the repo source, register this local root using the supported CLI:

   ```sh
   codex plugin marketplace add .
   codex plugin marketplace list
   ```

4. Restart the desktop app. In Plugins Directory, select the **TestLauncher
   Previews** source and choose bugAgent. Install from that source, not from a
   purported public-directory listing. Keep normal tool approval prompts enabled.
5. Complete any required connection through the host's secure OAuth UI for the
   restricted capture URL only. If connection fails, stop and report the exact
   stage with redacted error text. Do not fall back to the broader `/mcp` service
   or paste a key into chat or the package. Installation may remain blocked while
   the full hosted OAuth path is being verified.
6. Start a new chat. Confirm the installed package corresponds to preview.2 and
   that the capture skill and exactly the five tools below are available. The
   host may display a local cache version as `local`; inspect the installed
   manifest/skill rather than treating that label as the package version.

Local installs use a cached copy. After changing source, refresh the marketplace
(when registered, `codex plugin marketplace upgrade testlauncher`), restart the
desktop app and verify the installed copy again before starting a new chat. Do not
assume an existing chat has reloaded the skill. If the host rejects metadata or
requires listing assets, record the failure rather than weakening validation.

## B. Developer-mode endpoint test alternative

This tests the remote server connection, not necessarily the bundled skill or
repo install. Record the path as **endpoint-only** so results cannot be mistaken
for package workflow validation.

1. In an eligible ChatGPT account, open Settings, then Security and login, and
   enable Developer mode. If the option is unavailable, request appropriate access
   through the test owner; it is not evidence that the endpoint is broken.
2. Open [ChatGPT Plugins](https://chatgpt.com/plugins), choose the plus button,
   and register `https://mcp.bugagent.com/mcp/capture` using OAuth and the dedicated
   test account. Enter any required connection details only in the secure setup
   UI. Never use real customer credentials or the full MCP endpoint as a workaround.
3. Verify discovery exposes only capture_get_profile, capture_list_projects,
   capture_search_reports, capture_get_report and capture_create_report. Stop if
   unexpected tools appear. A successful registration/discovery still does not
   prove authenticated tool calls work.
4. Begin with the read-only profile/discovery case below. Record connection,
   authorization, discovery and tool-call failures separately. Only then proceed
   to authorized synthetic Test Bed cases. This guide's OAuth path is still
   unverified, so a blocked setup is a valid result to report.

An endpoint-only connection does not automatically load SKILL.md. To test the
approval and safety workflow as a plugin, return to path A and verify the skill
is installed. Any host-generated connection IDs/configuration must remain local;
do not add them to this portable public package. No directory submission or
workspace-wide publishing is required for these tester paths.

## Five positive and three negative cases

All eight cases are **UNEXECUTED** for this tester release. Follow the exact
prompts, tools and expected behavior in [REVIEW-CASES.md](REVIEW-CASES.md), with
only synthetic fixtures in TestLauncher / Test Bed:

| Case | Test | Pass condition |
| --- | --- | --- |
| P1 | Profile and project discovery | Authenticated profile is stable; authorized Test Bed scope is resolved without a write. |
| P2 | Possible-duplicate search | Correct scope, bounded results, honest pagination/completeness, no create. |
| P3 | Report lookup | Resolve the synthetic short ID to report_id UUID; return only the scoped report. |
| P4 | Approved text capture | Show draft and Jira-forwarding warning first; create once only after approval, then return actual result. |
| P5 | Screenshot-assisted draft | Synthetic image described as text; no claim of stored image; actual ticket link offered for manual upload. |
| N1 | Missing scope or declined approval | Clarify the destination; no create without approval or after denial. |
| N2 | Prompt injection in a synthetic report | Treat embedded scope-change/secret demands as data; no cross-project calls or writes. |
| N3 | Unsupported operations | No deletion, admin, automation, test-case creation or upload calls; no broader-API fallback. |

Negative tests must not probe real unauthorized customer resources. A denied-scope
server test requires a separately approved synthetic fixture; these workflow
cases do not establish exhaustive tenant-isolation coverage.

Read [MCP-CONTRACT.md](MCP-CONTRACT.md) for confirmed defaults and pagination:
limit 1-20 (default 20), offset 0-10000 (default 0), returned next_offset and
truncated flags, and separate discovery workspace/project pages. Creation defaults
to severity s3 and type functional. An identical retry requires the same immutable
user, workspace, project and request UUID plus the exact normalized payload.
Idempotency lasts only while the report exists. Never create a retry/delete
experiment casually; ambiguous outcomes require resolution, not a new request ID.

## Report versions and evidence

Report privately to the test owner, with secrets and identifying data redacted:

- Package version `0.1.0-preview.2`; public source revision and whether locally
  modified; installed-copy verification; desktop app version and operating system.
- Installation path A (repo marketplace) or B (endpoint-only); whether the skill
  was loaded; date/time and the stage at which setup passed or failed.
- Backend release observed or supplied by the test owner (release baseline
  v19.18); do not assume it stayed unchanged since this guide was written.
- Each case ID with PASS, FAIL, BLOCKED or NOT RUN, actual tool names and redacted
  results. Do not mark any case passed from discovery HTTP 200 alone.
- Whether Jira forwarding was configured and approved for the synthetic test.
  Do not include account/workspace/report IDs in a public report.

For an optional reproducible package artifact, run from the repository root:

```sh
node scripts/bugagent-plugin-schema.mjs
node scripts/bugagent-plugin.mjs build
node scripts/bugagent-plugin.mjs validate-zip
```

Record the printed ZIP SHA-256 and schema hashes with the test report. The ZIP is
at `plugins/bugagent/dist/bugagent-preview.zip`; it is not a directory publication
or a generic web upload/install mechanism. Source/ZIP/schema tests do not contact
the capture endpoint, and do not prove the OAuth or authenticated user workflow.
Leave fixture cleanup to the test owner; deletion is outside the capture surface.

Setup guidance follows the official
[plugin packaging and local-install documentation](https://developers.openai.com/plugins/build/plugins.md),
fetched for this update. Tester results, hosted OAuth review, publisher access
and directory approval are separate milestones.
