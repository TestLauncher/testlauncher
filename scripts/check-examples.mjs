import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const required = [
  'SECURITY.md',
  '.github/dependabot.yml',
  'examples/bugagent/README.md',
  'examples/bugagent/api-quickstart/bugagent.mjs',
  'examples/bugagent/api-quickstart/github-actions-report-failure.yml',
  'examples/bugagent/mcp/README.md',
  'examples/bugagent/hermes-agent/config.example.yaml',
  'skills/bugagent-qa/SKILL.md',
];
const textExtensions = new Set(['.json', '.md', '.mjs', '.yaml', '.yml']);
const secretPatterns = [
  /ba_live_[a-f0-9]{32,}/i,
  /xox[baprs]-[a-z0-9-]{20,}/i,
  /phx_[a-z0-9]{20,}/i,
];
const bannedLocalPath = ['/Users', 'jason'].join('/');
const bannedPrivateRepo = ['TestLauncher', 'bugAgent.git'].join('/');

async function collect(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(path));
    else if (textExtensions.has(extname(entry.name))) files.push(path);
  }
  return files;
}

const failures = [];
for (const path of required) {
  try {
    await readFile(join(root, path));
  } catch {
    failures.push(`missing required example: ${path}`);
  }
}

for (const path of await collect(root)) {
  const content = await readFile(path, 'utf8');
  const label = relative(root, path);
  if (content.includes(bannedLocalPath) || content.includes(bannedPrivateRepo)) {
    failures.push(`${label}: contains a private/local repository reference`);
  }
  for (const pattern of secretPatterns) {
    if (pattern.test(content)) failures.push(`${label}: resembles a live credential`);
  }
  if (extname(path) === '.md') {
    for (const match of content.matchAll(/\]\((\.\.?\/[^)#?]+)(?:[?#][^)]*)?\)/g)) {
      const target = resolve(dirname(path), decodeURIComponent(match[1]));
      try {
        await stat(target);
      } catch {
        failures.push(`${label}: broken relative link ${match[1]}`);
      }
    }
  }
}

const skill = await readFile(join(root, 'skills/bugagent-qa/SKILL.md'), 'utf8');
const config = await readFile(join(root, 'examples/bugagent/hermes-agent/config.example.yaml'), 'utf8');
for (const token of ['list_test_suites', 'start_test_plan', 'get_test_run_plan', 'report_test_results', 'abort_test_run']) {
  if (!skill.includes(token)) failures.push(`Hermes skill is missing ${token}`);
  if (!config.includes(`- ${token}`)) failures.push(`Hermes config is missing ${token}`);
}
if (!skill.replace(/\s+/g, ' ').includes('not maintained, endorsed, or supported by Nous Research')) {
  failures.push('Hermes community disclaimer is missing');
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(`Public examples OK: ${required.length} required assets and no credential patterns.`);
