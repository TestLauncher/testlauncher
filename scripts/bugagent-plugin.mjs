import assert from 'node:assert/strict';
import { constants, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ROOT = join(REPO, 'plugins/bugagent');
export const OUTPUT = join(ROOT, 'dist/bugagent-preview.zip');
export const FILES = Object.freeze([
  'LICENSE', 'MCP-CONTRACT.md', 'README.md', 'REVIEW-CASES.md', 'SUBMISSION.md',
  'mcp.json', 'plugin.json', 'skills/bugagent-capture/SKILL.md',
]);
const MAX_FILE = 128 * 1024;
const endpoint = 'https://mcp.bugagent.com/mcp/capture';
const schema = 'https://agent-plugins.org/schemas/1.0.0/';

function keys(value, expected) {
  assert(value && typeof value === 'object' && !Array.isArray(value), 'Expected object');
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), 'Unexpected or missing fields');
}

function regular(path) {
  const stat = lstatSync(path);
  assert(stat.isFile() && stat.nlink === 1, `Not a regular unlinked file: ${path}`);
  assert(stat.size <= MAX_FILE, `File exceeds size limit: ${path}`);
}

export function readPackage(root = ROOT) {
  const base = resolve(root);
  assert.equal(realpathSync(base), base, 'Package root cannot traverse symlinks');
  const entries = new Map();
  for (const name of FILES) {
    let current = base;
    for (const segment of name.split('/').slice(0, -1)) {
      current = join(current, segment);
      assert(lstatSync(current).isDirectory(), `Symlink or non-directory: ${current}`);
    }
    const path = join(base, name);
    regular(path);
    entries.set(name, readFileSync(path));
  }
  return entries;
}

export function validateEntries(entries) {
  assert(entries instanceof Map, 'Expected file map');
  assert.deepEqual([...entries.keys()].sort(), [...FILES].sort(), 'File allowlist mismatch');
  for (const [name, data] of entries) {
    assert(Buffer.isBuffer(data) && data.length > 0 && data.length <= MAX_FILE, `Invalid file: ${name}`);
    const text = new TextDecoder('utf-8', { fatal: true }).decode(data);
    assert(!/[\x00-\x08\x0b-\x1f\x7f]/.test(text), `Control characters: ${name}`);
    assert(!/-----BEGIN .*PRIVATE KEY|\b(?:ba_live_|sk-proj-|ghp_|github_pat_|AKIA)[A-Za-z0-9_]+/i.test(text), `Possible secret: ${name}`);
    assert(!/\b(?:api[_-]?key|client[_-]?secret|access[_-]?token|password)\s*[=:]\s*["']?\S+/i.test(text), `Credential assignment: ${name}`);
    assert(!/\bBearer\s+\S+|\/Users\/|\/home\/|localhost|127\.0\.0\.1|\.internal\b/i.test(text), `Private/local content: ${name}`);
    assert(!/\b[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\b/i.test(text), `Concrete identifier: ${name}`);
  }
  const parse = name => JSON.parse(entries.get(name).toString('utf8'));
  const manifest = parse('plugin.json');
  keys(manifest, ['$schema', 'name', 'version', 'description', 'author', 'homepage', 'repository', 'license', 'extensions']);
  assert.equal(manifest.$schema, `${schema}plugin.schema.json`);
  assert.equal(manifest.name, 'bugagent');
  assert.match(manifest.version, /^0\.1\.0-preview\.[1-9]\d*$/);
  assert.equal(typeof manifest.description, 'string');
  assert(manifest.description.length > 0, 'Missing description');
  assert(!/\b(?:preview|trial|demo)\b/i.test(manifest.description), 'Preview status belongs in README, not listing copy');
  assert.deepEqual(manifest.author, { name: 'TestLauncher', url: 'https://testlauncher.com' });
  assert.equal(manifest.homepage, 'https://bugagent.com');
  assert.equal(manifest.repository, 'https://github.com/TestLauncher/testlauncher');
  assert.equal(manifest.license, 'MIT');
  keys(manifest.extensions, ['com.openai']);
  keys(manifest.extensions['com.openai'], ['interface']);
  const ui = manifest.extensions['com.openai'].interface;
  keys(ui, ['displayName', 'shortDescription', 'longDescription', 'developerName',
    'category', 'capabilities', 'websiteURL', 'supportURL', 'privacyPolicyURL', 'termsOfServiceURL']);
  for (const [field, limit] of Object.entries({ displayName: 30, shortDescription: 30, longDescription: 4000, developerName: 80 })) {
    assert(typeof ui[field] === 'string' && ui[field].trim() && [...ui[field]].length <= limit, `Invalid ${field}`);
    assert(!/\b(?:preview|trial|demo)\b/i.test(ui[field]), `Preview status belongs in README, not ${field}`);
  }
  assert.equal(ui.displayName, 'bugAgent');
  assert.equal(ui.developerName, 'TestLauncher');
  assert.equal(ui.category, 'Productivity');
  assert.deepEqual(ui.capabilities, ['Read', 'Write']);
  assert.equal(ui.websiteURL, 'https://bugagent.com');
  assert.equal(ui.supportURL, 'https://bugagent.com/docs/#support');
  assert.equal(ui.privacyPolicyURL, 'https://bugagent.com/privacy/');
  assert.equal(ui.termsOfServiceURL, 'https://bugagent.com/terms/');
  assert.deepEqual(parse('mcp.json'), {
    $schema: `${schema}mcp.schema.json`,
    mcpServers: { 'bugagent-capture': { type: 'streamable-http', url: endpoint } },
  }, 'MCP must use only the restricted endpoint, without credential/config fields');
  const skill = entries.get('skills/bugagent-capture/SKILL.md').toString('utf8');
  assert.match(skill, /^---\nname: bugagent-capture\ndescription: [^\n]+\n---\n/);
  assert(skill.includes('../../MCP-CONTRACT.md'), 'Missing local contract reference');
  const tools = ['capture_get_profile', 'capture_list_projects', 'capture_search_reports',
    'capture_get_report', 'capture_create_report'].sort();
  for (const name of ['skills/bugagent-capture/SKILL.md', 'MCP-CONTRACT.md', 'REVIEW-CASES.md']) {
    assert.deepEqual([...new Set(entries.get(name).toString('utf8').match(/\bcapture_[a-z_]+\b/g))].sort(),
      tools, `Expected five-tool contract in ${name}`);
  }
  return entries;
}

export function validateMarketplace(value) {
  assert.deepEqual(value, {
    name: 'testlauncher', interface: { displayName: 'TestLauncher Previews' },
    plugins: [{ name: 'bugagent', source: { source: 'local', path: './plugins/bugagent' },
      policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' }, category: 'Productivity' }],
  }, 'Unexpected discovery configuration');
}

export function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function buildZip(entries) {
  validateEntries(entries);
  const local = [];
  const central = [];
  let offset = 0;
  // ZIP32 STORE records: fixed DOS epoch, Unix 0644 mode, no extras or comments.
  for (const name of FILES) {
    const filename = Buffer.from(name, 'utf8');
    const data = entries.get(name);
    const crc = crc32(data);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x800, 6);
    header.writeUInt16LE(33, 12);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(data.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(filename.length, 26);
    local.push(header, filename, data);
    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50, 0);
    record.writeUInt16LE(0x0314, 4);
    header.copy(record, 6, 4, 30);
    record.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    record.writeUInt32LE(offset, 42);
    central.push(record, filename);
    offset += header.length + filename.length + data.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(FILES.length, 8);
  end.writeUInt16LE(FILES.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}

export function validateZip(zip, entries) {
  assert(Buffer.isBuffer(zip), 'Expected ZIP bytes');
  assert(zip.equals(buildZip(entries)), 'ZIP differs from canonical validated source');
}

function main(args) {
  assert(args.length === 1 && ['validate', 'build', 'validate-zip'].includes(args[0]),
    'Usage: node scripts/bugagent-plugin.mjs validate|build|validate-zip');
  const entries = validateEntries(readPackage());
  validateMarketplace(JSON.parse(readFileSync(join(REPO, '.agents/plugins/marketplace.json'), 'utf8')));
  assert(entries.get('LICENSE').equals(readFileSync(join(REPO, 'LICENSE'))), 'License must match repository');
  if (args[0] === 'validate') {
    console.log(`Validated ${FILES.length} allowlisted files and discovery (offline package checks only).`);
    return;
  }
  const zip = buildZip(entries);
  if (args[0] === 'build') {
    const dist = dirname(OUTPUT);
    mkdirSync(dist, { recursive: true });
    assert.equal(realpathSync(dist), dist, 'Output directory cannot traverse symlinks');
    try {
      const stat = lstatSync(OUTPUT);
      assert(stat.isFile() && stat.nlink === 1, 'Unsafe output file');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    writeFileSync(OUTPUT, zip, { mode: 0o600,
      flag: constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW });
  }
  assert.equal(realpathSync(OUTPUT), OUTPUT, 'Output cannot traverse symlinks');
  validateZip(readFileSync(OUTPUT), entries);
  console.log(`${args[0]}: ${OUTPUT}\nSHA-256: ${createHash('sha256').update(zip).digest('hex')}\nPackage validation is not marketplace approval.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
