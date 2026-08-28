import { pathToFileURL } from 'node:url';

const DEFAULT_BASE_URL = 'https://app.bugagent.com';
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

function retryDelayMs(response, attempt) {
  const retryAfter = Number(response.headers.get('retry-after'));
  if (Number.isFinite(retryAfter) && retryAfter >= 0) return retryAfter * 1000;
  return Math.min(30_000, 500 * (2 ** attempt));
}

function boundedLimit(value, fallback = 10) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new Error('limit must be an integer from 1 to 100');
  }
  return parsed;
}

export function createBugAgentClient({
  apiKey = process.env.BUGAGENT_API_KEY,
  baseUrl = process.env.BUGAGENT_BASE_URL || DEFAULT_BASE_URL,
  fetchImpl = globalThis.fetch,
  sleepImpl = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  timeoutMs = 20_000,
  maxReadRetries = 3,
} = {}) {
  if (!apiKey?.startsWith('ba_live_')) {
    throw new Error('Set BUGAGENT_API_KEY to a workspace-scoped ba_live_ key');
  }
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required');

  const origin = new URL(baseUrl);
  async function request(path, options = {}) {
    const method = options.method || 'GET';
    let response;
    for (let attempt = 0; ; attempt += 1) {
      response = await fetchImpl(new URL(path, origin), {
        ...options,
        method,
        signal: options.signal || AbortSignal.timeout(timeoutMs),
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...options.headers,
        },
      });
      if (method !== 'GET' || !RETRYABLE_STATUS.has(response.status) || attempt >= maxReadRetries) break;
      await sleepImpl(retryDelayMs(response, attempt));
    }
    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { error: 'Server returned a non-JSON response' };
    }
    if (!response.ok) {
      const message = typeof payload?.error === 'string' ? payload.error : response.statusText;
      const error = new Error(`bugAgent API ${response.status}: ${message}`);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  return {
    listProjects() {
      return request('/api/projects');
    },
    listReports({ project, projectId, status, limit, offset } = {}) {
      const query = new URLSearchParams({ limit: String(boundedLimit(limit)) });
      if (project) query.set('project', project);
      if (projectId) query.set('project_id', projectId);
      if (status) query.set('status', status);
      if (offset !== undefined) query.set('offset', String(offset));
      return request(`/api/reports?${query}`);
    },
    createReport({ title, description, projectId, severity = 's3', type = 'logic' } = {}) {
      if (typeof title !== 'string' || title.trim().length < 3) {
        throw new Error('title must contain at least 3 characters');
      }
      if (typeof projectId !== 'string' || !projectId.trim()) {
        throw new Error('projectId is required; resolve it with the projects command');
      }
      return request('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description?.trim() || undefined,
          project_id: projectId.trim(),
          severity,
          type,
          metadata: { source: 'public-api-quickstart' },
        }),
      });
    },
  };
}

function flags(tokens) {
  const parsed = {};
  for (let index = 0; index < tokens.length; index += 2) {
    const flag = tokens[index];
    const value = tokens[index + 1];
    if (!flag?.startsWith('--') || value === undefined) {
      throw new Error(`Expected --name value, received: ${tokens.slice(index).join(' ')}`);
    }
    parsed[flag.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
  }
  return parsed;
}

export async function runCli(argv = process.argv.slice(2), output = console.log) {
  const [command, ...tokens] = argv;
  const options = flags(tokens);
  const client = createBugAgentClient();
  let result;

  if (command === 'projects') result = await client.listProjects();
  else if (command === 'bugs') result = await client.listReports(options);
  else if (command === 'report') result = await client.createReport(options);
  else throw new Error('Usage: node bugagent.mjs <projects|bugs|report> [--name value]');

  output(JSON.stringify(result, null, 2));
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
