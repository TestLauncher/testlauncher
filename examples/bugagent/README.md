# bugAgent Examples

These examples use the public bugAgent API and MCP server. They contain no
customer data, private product source, or required paid dependency.

| Example | Best for | Product access |
| --- | --- | --- |
| [REST API quickstart](./api-quickstart/) | Scripts, CI jobs, failure reporting, and small integrations | Bug reporting is available on Free |
| [MCP quickstart](./mcp/) | Claude Code, Cursor, and other MCP clients | Bug-report tools are available on Free |
| [Hermes Agent](./hermes-agent/) | Running an approved suite with an external agent | Community preview; bounded evaluation is available on Free |

## Security rules

1. Create a dedicated key in the intended bugAgent workspace.
2. Grant only the scopes needed by the example.
3. Store the key in an environment variable or secret manager.
4. Never commit a key, target-site login, cookie, or captured customer data.
5. Start automated execution against a staging target and synthetic account.

API keys are workspace-scoped. Project selectors cannot move an API-key request
into another workspace.
