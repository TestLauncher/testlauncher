import assert from 'node:assert/strict';
import test from 'node:test';
import { createMcpClient, parseMcpBody } from './mcp-client.mjs';

const key = `ba_live_${'a'.repeat(64)}`;

test('parses JSON and SSE responses', () => {
  assert.deepEqual(parseMcpBody('{"result":{"ok":true}}'), { result: { ok: true } });
  assert.deepEqual(parseMcpBody('event: message\ndata: {"result":{"ok":true}}\n\n'), { result: { ok: true } });
});

test('performs initialize, notification, scoped discovery, and a tool call', async () => {
  const calls = [];
  const responses = [
    { result: { serverInfo: { name: 'bugagent' } } },
    null,
    { result: { tools: [{ name: 'list_projects' }] } },
    { result: { content: [{ type: 'text', text: '[]' }], structuredContent: { result: [] } } },
  ];
  const client = createMcpClient({
    apiKey: key,
    fetchImpl: async (_url, options) => {
      const body = JSON.parse(options.body);
      calls.push({ body, headers: options.headers });
      const payload = responses.shift();
      return new Response(payload ? JSON.stringify(payload) : '', { status: payload ? 200 : 202 });
    },
  });
  await client.initialize();
  await client.initialized();
  assert.equal((await client.listTools()).tools[0].name, 'list_projects');
  assert.deepEqual((await client.callTool('list_projects')).structuredContent.result, []);
  assert.deepEqual(calls.map((call) => call.body.method), [
    'initialize', 'notifications/initialized', 'tools/list', 'tools/call',
  ]);
  assert.equal(calls[3].headers.Authorization, `Bearer ${key}`);
  assert.equal('id' in calls[1].body, false);
});

test('turns isError tool results into failures', async () => {
  const client = createMcpClient({
    apiKey: key,
    fetchImpl: async () => new Response(JSON.stringify({
      result: { isError: true, content: [{ type: 'text', text: 'API key requires scope: reports:write' }] },
    })),
  });
  await assert.rejects(client.callTool('create_bug_report'), /reports:write/);
});
