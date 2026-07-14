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

Full setup and tool reference: [bugagent.com/mcp](https://bugagent.com/mcp/).
