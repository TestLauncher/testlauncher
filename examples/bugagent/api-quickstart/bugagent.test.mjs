import assert from 'node:assert/strict';
import test from 'node:test';
import { createBugAgentClient } from './bugagent.mjs';

const key = `ba_live_${'a'.repeat(64)}`;

function fakeFetch(payload, status = 200, headers = {}) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options });
    return new Response(JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json', ...headers },
    });
  };
  return { calls, fetchImpl };
}

test('lists only the API-key workspace projects', async () => {
  const fake = fakeFetch([{ id: 'project-1', slug: 'demo' }]);
  const client = createBugAgentClient({ apiKey: key, fetchImpl: fake.fetchImpl });
  assert.deepEqual(await client.listProjects(), [{ id: 'project-1', slug: 'demo' }]);
  assert.equal(fake.calls[0].url, 'https://app.bugagent.com/api/projects');
  assert.equal(fake.calls[0].options.headers.Authorization, `Bearer ${key}`);
});

test('encodes report filters and enforces a bounded limit', async () => {
  const fake = fakeFetch({ reports: [], total: 0 });
  const client = createBugAgentClient({ apiKey: key, fetchImpl: fake.fetchImpl });
  await client.listReports({ project: 'API Testing', projectId: 'project-1', status: 'new', limit: 25, offset: 50 });
  const url = new URL(fake.calls[0].url);
  assert.equal(url.searchParams.get('project'), 'API Testing');
  assert.equal(url.searchParams.get('status'), 'new');
  assert.equal(url.searchParams.get('project_id'), 'project-1');
  assert.equal(url.searchParams.get('limit'), '25');
  assert.equal(url.searchParams.get('offset'), '50');
  assert.throws(() => client.listReports({ limit: 101 }), /1 to 100/);
});

test('retries bounded read failures and honors Retry-After', async () => {
  const calls = [];
  const statuses = [429, 503, 200];
  const delays = [];
  const client = createBugAgentClient({
    apiKey: key,
    sleepImpl: async (milliseconds) => delays.push(milliseconds),
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      const status = statuses.shift();
      return new Response(JSON.stringify(status === 200 ? [] : { error: 'retry' }), {
        status,
        headers: { 'Content-Type': 'application/json', 'Retry-After': status === 429 ? '1' : '0' },
      });
    },
  });
  assert.deepEqual(await client.listProjects(), []);
  assert.equal(calls.length, 3);
  assert.deepEqual(delays, [1000, 0]);
});

test('creates a project-scoped report without placing the key in the body', async () => {
  const fake = fakeFetch({ id: 'report-1', project_short_id: 'TEST-API-001' }, 201);
  const client = createBugAgentClient({ apiKey: key, fetchImpl: fake.fetchImpl });
  await client.createReport({
    title: 'Checkout failed',
    description: 'Expected 200; received 500.',
    projectId: 'project-1',
    severity: 's2',
  });
  const body = JSON.parse(fake.calls[0].options.body);
  assert.equal(fake.calls[0].options.method, 'POST');
  assert.equal('project' in body, false);
  assert.equal(body.project_id, 'project-1');
  assert.equal(body.metadata.source, 'public-api-quickstart');
  assert.equal(JSON.stringify(body).includes(key), false);
});

test('refuses an unscoped report write', async () => {
  const fake = fakeFetch({}, 201);
  const client = createBugAgentClient({ apiKey: key, fetchImpl: fake.fetchImpl });
  assert.throws(
    () => client.createReport({ title: 'Missing project target' }),
    /projectId is required/,
  );
  assert.equal(fake.calls.length, 0);
});

test('returns a safe HTTP error without echoing the credential', async () => {
  const fake = fakeFetch({ error: 'Project not found' }, 404);
  const client = createBugAgentClient({ apiKey: key, fetchImpl: fake.fetchImpl });
  await assert.rejects(client.listProjects(), (error) => {
    assert.match(error.message, /404: Project not found/);
    assert.equal(error.message.includes(key), false);
    return true;
  });
});
