# bugAgent Developer Manual

This manual is the public integration guide for bugAgent REST and MCP clients.
It complements the live endpoint and tool references:

- [REST API reference](https://bugagent.com/api-reference/)
- [MCP guide](https://bugagent.com/mcp/)
- [Machine-readable REST reference index](https://bugagent.com/api-reference-index.json)
- [Machine-readable MCP tool index](https://bugagent.com/mcp-tool-index.json)
- [Runnable examples](../../examples/bugagent/)

## Choose an interface

| Interface | Use it for | Authentication |
| --- | --- | --- |
| REST | CI, scripts, services, and deterministic integrations | Workspace API key on endpoints with a named scope |
| MCP | AI clients that need tool discovery and structured actions | Workspace API key for scoped tools, or delegated OAuth for interactive tools |
| Dashboard routes | Browser workflows and account administration | Signed-in dashboard session |

REST and MCP overlap, but they are not guaranteed to expose identical
operations. Use only the contract documented for the interface you selected.
The REST reference's method, path, audience, and named scope are enforced
server-side; proximity to another public endpoint does not grant API-key access.

## Read next

1. [Authentication and security](./authentication-security.md)
2. [REST contract patterns](./rest-contract.md)
3. [MCP contract patterns](./mcp-contract.md)

## Safety baseline

- Use one key per service and environment.
- Grant only the required scopes.
- Resolve an exact project in the key-bound workspace before writing.
- Use synthetic accounts and staging targets for automation.
- Require human approval before destructive or status-changing agent actions.
- Never place keys, target credentials, cookies, or customer data in source.
