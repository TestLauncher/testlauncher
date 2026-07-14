# TestLauncher

> Agentic quality infrastructure for zero-tolerance enterprises.

This is the public home for **TestLauncher** — working examples and integration
samples for building on the TestLauncher platform (Launch App, bugAgent,
qualThread, ARC, manualTesting, and the open [OQA](https://oqa.ai) standard).

## Start with bugAgent

The first public examples are intentionally small, dependency-free, and safe to
copy into another repository:

- [bugAgent REST API quickstart](./examples/bugagent/api-quickstart/) - list
  projects and reports, file a structured bug from Node.js, or report a failed
  GitHub Actions run.
- [bugAgent MCP quickstart](./examples/bugagent/mcp/) - connect an AI client and
  use project-scoped bug-report workflows.
- [bugAgent for Hermes Agent](./examples/bugagent/hermes-agent/) - public
  community preview for executing a human-curated suite through a
  bugAgent-maintained skill.

Bug-report API and MCP access can be used on the Free plan. Individual tools,
including Test Cases, continue to follow their product entitlement.

## Repository layout

- `examples/` - runnable product integrations and starter code.
- `skills/` - installable agent skills published in standard skill-repo form.
- `.github/workflows/` - checks that keep every published example runnable and
  free of committed credentials.

## Learn more

- Website: [testlauncher.com](https://testlauncher.com)
- bugAgent: [bugagent.com](https://bugagent.com)
- bugAgent API: [bugagent.com/api-reference](https://bugagent.com/api-reference/)
- bugAgent MCP: [bugagent.com/mcp](https://bugagent.com/mcp/)
- Security reports: [SECURITY.md](./SECURITY.md)
- Open standard: [oqa.ai](https://oqa.ai)

## License

Released under the [MIT License](./LICENSE).
