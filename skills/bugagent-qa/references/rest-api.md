# Operator-Only REST Recovery

This is a human-run recovery runbook, not an instruction for Hermes to execute.
Use it from a separate operator terminal only when bugAgent MCP is unavailable
and direct REST calls are approved. Keep the same `external_run_id` across
retries.

Set the key in the process environment; never put it in a script or prompt:

```bash
export BUGAGENT_API_KEY='ba_live_REPLACE_LOCALLY'
```

## Start or resume

```bash
curl --fail-with-body https://app.bugagent.com/api/v1/test-executions \
  -H "Authorization: Bearer ${BUGAGENT_API_KEY}" \
  -H 'Content-Type: application/json' \
  --data '{
    "suite_id": "SUITE_UUID",
    "external_run_id": "hermes:SUITE_UUID:CALLER_RUN_ID",
    "name": "Hermes staging smoke",
    "agent": "hermes"
  }'
```

A new run returns `201`; an idempotent resume returns `200` with the same run.

## Free quotas and throttling

Free allows 10 stored cases, 1 suite, 3 folders, 10 total runs per UTC month,
and at most 3 external-agent runs per month. Only 1 external run may be active,
and its immutable plan may contain at most 10 cases. Free also allows 2 active
workspace API keys. Deleting a run does not reset monthly usage, and completed
or aborted external runs cannot be reopened.

Execution-contract responses expose `RateLimit-Limit`,
`RateLimit-Remaining`, and `RateLimit-Reset`. Free permits 30 requests per API
key and 60 per workspace per minute. A request-rate `429` includes
`Retry-After`; wait and retry the same operation. A monthly-quota `429` requires
waiting for the next UTC calendar month or moving to a paid plan. A `409` may
mean another external run is still active. A `503` means the distributed
limiter is unavailable and the API has failed closed; honor `Retry-After`.

## Read plan pages and canonical state

```bash
curl --fail-with-body \
  "https://app.bugagent.com/api/v1/test-executions/RUN_UUID?cursor=-1&limit=100" \
  -H "Authorization: Bearer ${BUGAGENT_API_KEY}"
```

Use `plan.next_cursor` for the next request until `plan.has_more` is false.

## Submit results

```bash
curl --fail-with-body \
  https://app.bugagent.com/api/v1/test-executions/RUN_UUID/results \
  -H "Authorization: Bearer ${BUGAGENT_API_KEY}" \
  -H 'Content-Type: application/json' \
  --data @templates/result-batch.json
```

The API accepts 1-200 unique case IDs that already belong to the run. Prefer
batches of 50. A different second status for the same case returns `409`.

## Abort safely

```bash
curl --fail-with-body -X POST \
  https://app.bugagent.com/api/v1/test-executions/RUN_UUID/abort \
  -H "Authorization: Bearer ${BUGAGENT_API_KEY}"
```

Abort is idempotent and preserves partial results. A completed run cannot be
aborted.
