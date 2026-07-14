import { pathToFileURL } from 'node:url';

const DEFAULT_BASE_URL = 'https://app.bugagent.com';

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
} = {}) {
  if (!apiKey?.startsWith('ba_live_')) {
    throw new Error('Set BUGAGENT_API_KEY to a workspace-scoped ba_live_ key');
  }
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required');

  const origin = new URL(baseUrl);
  async function request(path, options = {}) {
    const response = await fetchImpl(new URL(path, origin), {
      ...options,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
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
    listReports({ project, status, limit } = {}) {
      const query = new URLSearchParams({ limit: String(boundedLimit(limit)) });
      if (project) query.set('project', project);
      if (status) query.set('status', status);
      return request(`/api/reports?${query}`);
    },
    createReport({ title, description, project, severity = 's3', type = 'logic' } = {}) {
      if (typeof title !== 'string' || title.trim().length < 3) {
        throw new Error('title must contain at least 3 characters');
      }
      return request('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description?.trim() || undefined,
          project: project?.trim() || undefined,
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
    parsed[flag.slice(2).replaceAll('-', '_')] = value;
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
