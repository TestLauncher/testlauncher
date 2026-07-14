# bugAgent REST API Quickstart

This zero-dependency Node.js example lists projects and bug reports and creates
a structured report. It requires Node.js 20 or newer.

## 1. Create a key

In bugAgent, open **Settings -> Developers -> API Keys** and create a dedicated
workspace key with:

- `reports:read` to list projects and reports;
- `reports:write` to create a report.

Set it for the current terminal session:

```bash
export BUGAGENT_API_KEY='ba_live_REPLACE_LOCALLY'
```

Do not add the value to this repository or to client-side browser code.

## 2. Run the examples

No package install is required. The script uses Node's built-in `fetch`. Start
with a connection check:

```bash
node bugagent.mjs projects
```

Copy an exact project slug from that response before creating a report. The API
uses the workspace default when no valid project selector is supplied, so
automation that must target one project should also verify the returned
`project_id`.

```bash
node bugagent.mjs bugs --project bugagent --status new --limit 10
node bugagent.mjs report \
  --title "Checkout total changes after refresh" \
  --description "Steps: add two items and refresh. Expected: total stays fixed. Actual: discount disappears." \
  --project bugagent \
  --severity s2
```

The create response includes the report UUID, workspace short ID, project short
ID, and project metadata. Keep the project short ID when linking the report from
another tool.

## 3. Report a failed GitHub Actions run

Copy `bugagent.mjs` into `.github/scripts/bugagent.mjs`, then adapt
[github-actions-report-failure.yml](./github-actions-report-failure.yml) in your
existing test workflow. Add:

- `BUGAGENT_API_KEY` as a GitHub Actions secret, using a dedicated key with only
  `reports:write`;
- `BUGAGENT_PROJECT` as a repository variable containing the exact project slug.

The example preserves the failed job status after filing the report and links
the bug back to the workflow run. It intentionally does not upload logs or
artifacts, which may contain secrets or customer data.

The supplied workflow runs only on pushes to `main` or manual dispatch. Keep
pull-request tests in a separate workflow with no bugAgent secret. Do not add
`pull_request` or `pull_request_target` to this secret-bearing example: code
from an untrusted branch must never run in a job that can read the key.

## Optional local target

For a local or staging-compatible API deployment:

```bash
export BUGAGENT_BASE_URL='http://localhost:4321'
```

The script never prints the API key. HTTP failures include the status and the
server's safe error message.

Full reference: [bugagent.com/api-reference](https://bugagent.com/api-reference/).
