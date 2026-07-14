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
