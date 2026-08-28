# bugAgent MCP Quickstart

bugAgent exposes its public MCP server at:

```text
https://mcp.bugagent.com/mcp
```

Use MCP when an AI client should list, create, or update bug reports without a
custom HTTP script. Bug-report tools are available on the Free plan; tools for
other product areas follow their plan entitlement.

## Connect safely

1. Create a dedicated key in **Settings -> Developers -> API Keys**.
2. Select the workspace before creating it; keys cannot switch workspaces.
3. Grant `reports:read` for review and `reports:write` only when the client must
   create or update reports.
4. Put the key only in the local MCP client configuration and restrict that file
   to your operating-system user.

Generic HTTP configuration:

```json
{
  "mcpServers": {
    "bugagent": {
      "type": "http",
      "url": "https://mcp.bugagent.com/mcp",
      "headers": {
        "Authorization": "Bearer ba_live_REPLACE_LOCALLY"
      }
    }
  }
}
```

Do not commit the populated configuration. Fully restart the MCP client after
changing it.

## Direct JSON-RPC example

The included Node.js client performs the full direct lifecycle, parses JSON or
SSE responses, and checks both JSON-RPC errors and MCP `isError` results:

```bash
export BUGAGENT_API_KEY='ba_live_REPLACE_LOCALLY'
node mcp-client.mjs
```

It initializes, sends `notifications/initialized`, lists only the tools visible
to the key, and calls the read-only `list_projects` tool. Its tests use a fake
transport and do not contact production.

## Useful first prompts

```text
List the 10 newest open s1 or s2 bug reports in the API Testing project. Return
each project-scoped short ID, title, status, and reporter. Do not update them.
```

```text
Create an s3 functional bug in the API Testing project titled "Profile save
does not persist timezone". Include expected and actual behavior. Show me the
created project-scoped short ID.
```

Always name the project. For destructive or status-changing work, ask the agent
to show the intended update before applying it.

For authentication modes, output conventions, and failure handling, read the
[MCP contract guide](../../../docs/bugagent/mcp-contract.md).

Full setup and tool reference: [bugagent.com/mcp](https://bugagent.com/mcp/).
