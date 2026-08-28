import { pathToFileURL } from 'node:url';

const DEFAULT_URL = 'https://mcp.bugagent.com/mcp';

export function parseMcpBody(text) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('MCP returned an empty response');
  if (!trimmed.startsWith('event:') && !trimmed.includes('\ndata:')) return JSON.parse(trimmed);
  for (const block of trimmed.split(/\r?\n\r?\n/)) {
    const data = block.split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');
    if (data && data !== '[DONE]') return JSON.parse(data);
  }
  throw new Error('MCP event stream contained no JSON data event');
}

export function createMcpClient({
  apiKey = process.env.BUGAGENT_API_KEY,
  url = process.env.BUGAGENT_MCP_URL || DEFAULT_URL,
  fetchImpl = globalThis.fetch,
  timeoutMs = 20_000,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required');
  let requestId = 0;

  async function post(method, params = {}, { auth = true, notification = false } = {}) {
    if (auth && !apiKey?.startsWith('ba_live_')) {
      throw new Error('Set BUGAGENT_API_KEY to a workspace-scoped ba_live_ key');
    }
    const response = await fetchImpl(url, {
      method: 'POST',
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        Accept: 'application/json, text/event-stream',
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        ...(!notification ? { id: ++requestId } : {}),
        method,
        ...(Object.keys(params).length ? { params } : {}),
      }),
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`MCP HTTP ${response.status}: ${text.slice(0, 500)}`);
    if (notification && !text.trim()) return null;
    const payload = parseMcpBody(text);
    if (payload.error) throw new Error(`MCP ${payload.error.code}: ${payload.error.message}`);
    return payload.result ?? payload;
  }

  return {
    initialize() {
      return post('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'testlauncher-public-example', version: '1.0.0' },
      }, { auth: false });
    },
    initialized() {
      return post('notifications/initialized', {}, { auth: false, notification: true });
    },
    listTools() {
      return post('tools/list');
    },
    async callTool(name, args = {}) {
      const result = await post('tools/call', { name, arguments: args });
      if (result.isError) {
        const message = result.content?.find((item) => item.type === 'text')?.text || 'Tool returned an error';
        throw new Error(message);
      }
      return result;
    },
  };
}

async function main() {
  const client = createMcpClient();
  await client.initialize();
  await client.initialized();
  const tools = await client.listTools();
  console.log(`Visible tools: ${tools.tools?.length ?? 0}`);
  const projects = await client.callTool('list_projects');
  console.log(JSON.stringify(projects.structuredContent ?? projects.content, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
