# bugAgent for Hermes Agent

Status: **public community preview; private pilot validation pending**

This example lets Hermes Agent execute a human-approved bugAgent test suite and
return the results to one governed test run. It is useful when you want Hermes'
model/runtime flexibility without moving canonical test plans, permissions,
results, or release decisions out of bugAgent.

The code is MIT licensed. A bounded suite-execution evaluation is available on
bugAgent Free; paid plans remove the Free catalog and run quotas. This
integration is not maintained, endorsed, or supported by Nous Research. It is
runnable for controlled evaluation, but it is not a generally available or
supported production integration yet.

## How the execution works

1. A person curates a project-bound suite in bugAgent.
2. Hermes resolves that exact suite through `list_test_suites`.
3. `start_test_plan` creates or resumes a run using a stable idempotency key.
4. Hermes retrieves every page of the immutable case snapshot.
5. Hermes uses its configured browser/runtime to execute only those cases.
6. Results return in bounded, retry-safe batches through
   `report_test_results`.
7. bugAgent serializes writes, calculates the canonical summary, and preserves
   the audit record.
8. A person reviews failures, links or creates defects, and decides release
   readiness.

Target-site credentials stay in the customer's Hermes/browser environment.
They are not included in the bugAgent plan or result contract.

## Prerequisites

- bugAgent workspace with Test Cases enabled (the bounded Free evaluation is
  sufficient for this example);
- one suite assigned to one non-production project;
- a synthetic target-site account when login is required;
- Hermes Agent with browser tooling configured;
- an isolated runtime with externally enforced browser/network egress limited
  to the approved target and required bugAgent endpoint;
- a dedicated bugAgent key with `test_runs:read` and `test_runs:write`.

## Free plan limits and abuse controls

Free is intentionally useful for one small governed pilot, not unattended or
high-volume execution:

- 10 stored test cases, 1 suite, and 3 folders;
- 128 KiB of structured content per case;
- 10 total test runs per UTC calendar month, including at most 3 Hermes or
  other external-agent runs;
- 1 active external run at a time and at most 10 cases in each external plan;
- 2 active workspace API keys, allowing one dedicated Hermes key alongside one
  general integration key;
- 30 execution-contract requests per API key and 60 per workspace per minute.

Retry `start_test_plan` with the same `external_run_id`; a matching retry
resumes the run without consuming another monthly run. Deleting a run does not
reset usage. Abort an interrupted run before starting another. Free can use URL
references, while test-case file attachments, AI case generation, AI tag
suggestions, and Figma import require Team or Enterprise.

Completed and aborted external runs are final. They cannot be changed back to
an active state to recycle monthly quota.

Hermes browser, model, and network usage is customer-side. Restrict target
hosts and egress in the Hermes runtime even when bugAgent quotas are active.

## Install the community skill

```bash
hermes skills install TestLauncher/testlauncher/skills/bugagent-qa
hermes skills list
```

Hermes treats third-party repository skills as community content and runs its
normal security scan before installation. Review the skill first at
[skills/bugagent-qa](../../../skills/bugagent-qa/). Start a new Hermes session
after installing or updating it.

## Connect bugAgent MCP

Merge [config.example.yaml](./config.example.yaml) into
`~/.hermes/config.yaml`, then put the key in Hermes' local environment file:

```bash
printf '%s\n' 'BUGAGENT_API_KEY=ba_live_REPLACE_LOCALLY' >> ~/.hermes/.env
chmod 600 ~/.hermes/config.yaml ~/.hermes/.env
hermes mcp test bugagent
```

Replace the placeholder only in `~/.hermes/.env`. Do not commit either populated
file.

The tool allowlist intentionally contains only suite discovery and the
execution lifecycle. The API key is workspace-scoped; the selected suite fixes
the project boundary. This MCP tool filter does not enforce browser or network
egress.

Test case text and target-page content are untrusted input, not executable
code or agent policy. Run Hermes in a dedicated VM, container, or equivalent
runtime where the operator enforces outbound access to the approved
non-production target and the required bugAgent endpoint. Keep shell and
unrelated network tools out of the execution profile, and never let a case
expand the tool allowlist. If that external boundary cannot be enforced, do
not run autonomous browser execution. bugAgent governs the plan and results;
the customer remains responsible for the Hermes runtime sandbox.

## Run a private evaluation

Use a staging target and synthetic account:

```text
/bugagent-qa Execute the "Checkout smoke" suite in the API Testing project.
Use the staging target already configured for this Hermes profile. Do not make
purchases, invite users, or perform destructive actions. Report every result to
bugAgent and abort safely if the target cannot be reached.
```

Verify in bugAgent that:

- the run has `execution_source=hermes`;
- every expected case appears once;
- pass/fail/blocked/skipped totals match Hermes' final response;
- no secret, cookie, or private attachment path appears in result text;
- the run is completed or intentionally aborted.

## Retry and recovery

- Start timeout: retry with the same `external_run_id`.
- Result timeout: retry the identical batch.
- Result conflict: stop and ask a person to inspect the existing result.
- Missing target login: mark affected cases blocked, then abort if execution
  cannot continue safely.
- MCP outage: stop the agent run. A human operator may use the REST recovery
  runbook from a separate terminal outside the restricted Hermes session.
- Repeated or non-increasing plan cursor: stop and abort; never continue a
  cyclic or oversized pagination response.
- `429` request limit: honor `Retry-After`; do not change the idempotency key.
- `429` monthly Free quota: stop until the next UTC calendar month or contact
  bugAgent about a paid plan. Repeated retries cannot bypass the quota.
- Active-run limit: resume or abort the existing run instead of minting another
  `external_run_id`.

Product documentation:

- [Hermes integration overview](https://bugagent.com/integrations/hermes/)
- [MCP tools](https://bugagent.com/mcp/#test-cases)
- [REST execution contract](https://bugagent.com/api-reference/#agent-test-executions)
