import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { FILES, ROOT, REPO, readPackage, validateEntries, validateMarketplace,
  buildZip, validateZip, crc32 } from './bugagent-plugin.mjs';
import { validateSchema } from './bugagent-plugin-schema.mjs';

const source = readPackage();
function changed(name, value) {
  const entries = new Map(source);
  entries.set(name, Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)));
  return entries;
}
const json = name => JSON.parse(source.get(name));

test('public source, license and discovery validate without networking', () => {
  validateEntries(source);
  validateMarketplace(JSON.parse(readFileSync(join(REPO, '.agents/plugins/marketplace.json'))));
  assert(source.get('LICENSE').equals(readFileSync(join(REPO, 'LICENSE'))));
});

test('ZIP is deterministic across map order and validates against source', () => {
  const first = buildZip(source);
  const second = buildZip(new Map([...source].reverse()));
  assert(first.equals(second));
  validateZip(first, source);
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926);
});

test('ZIP headers, directory, CRCs, modes and root paths agree', () => {
  const zip = buildZip(source);
  const end = zip.length - 22;
  assert.equal(zip.readUInt32LE(end), 0x06054b50);
  assert.equal(zip.readUInt16LE(end + 10), FILES.length);
  let central = zip.readUInt32LE(end + 16);
  const centralStart = central;
  let local = 0;
  for (const name of FILES) {
    const data = source.get(name);
    assert.equal(zip.readUInt32LE(local), 0x04034b50);
    assert.equal(zip.readUInt16LE(local + 8), 0);
    assert.equal(zip.readUInt16LE(local + 12), 33);
    assert.equal(zip.readUInt32LE(local + 14), crc32(data));
    assert.equal(zip.readUInt32LE(local + 18), data.length);
    const length = zip.readUInt16LE(local + 26);
    assert.equal(zip.subarray(local + 30, local + 30 + length).toString(), name);
    assert(zip.subarray(local + 30 + length, local + 30 + length + data.length).equals(data));
    assert.equal(zip.readUInt32LE(central), 0x02014b50);
    assert.equal(zip.readUInt32LE(central + 42), local);
    assert.equal(zip.readUInt32LE(central + 38) >>> 16, 0o100644);
    assert(zip.subarray(central + 6, central + 32).equals(zip.subarray(local + 4, local + 30)));
    assert.equal(zip.subarray(central + 46, central + 46 + length).toString(), name);
    central += 46 + length;
    local += 30 + length + data.length;
  }
  assert.equal(local, centralStart);
  assert.equal(central, end);
  assert.equal(zip.readUInt32LE(end + 12), central - centralStart);
});

test('rejects missing, extra and traversal entries', () => {
  const missing = new Map(source);
  missing.delete('mcp.json');
  assert.throws(() => validateEntries(missing));
  for (const name of ['.env', '../private.txt', '/private.txt', 'skills/extra/SKILL.md']) {
    const extra = new Map(source).set(name, Buffer.from('not allowed'));
    assert.throws(() => buildZip(extra), /allowlist/);
  }
});

test('rejects broader endpoints, credential fields and extra servers', () => {
  for (const mutate of [
    m => { m.mcpServers['bugagent-capture'].url = 'https://mcp.bugagent.com/mcp'; },
    m => { m.mcpServers['bugagent-capture'].headers = {}; },
    m => { m.mcpServers['bugagent-capture'].env = {}; },
    m => { m.mcpServers['bugagent-capture'].type = 'http'; },
    m => { m.mcpServers.extra = { type: 'stdio', command: 'example' }; },
  ]) {
    const m = json('mcp.json'); mutate(m);
    assert.throws(() => validateEntries(changed('mcp.json', m)));
  }
});

test('rejects unknown manifest fields, preview listing copy and invalid skill frontmatter', () => {
  const manifest = json('plugin.json'); manifest.apiKey = '';
  assert.throws(() => validateEntries(changed('plugin.json', manifest)));
  delete manifest.apiKey; manifest.description = 'Preview: capture bugs';
  assert.throws(() => validateEntries(changed('plugin.json', manifest)));
  assert.throws(() => validateEntries(changed('skills/bugagent-capture/SKILL.md', '# Missing frontmatter')));
});

test('listing uses verified URLs and enforces documented OpenAI interface limits', () => {
  for (const mutate of [
    m => { m.homepage = 'https://invalid.example'; },
    m => { m.extensions['com.openai'].interface.supportURL = 'https://bugagent.com/support/'; },
    m => { m.extensions['com.openai'].interface.privacyPolicyURL = 'http://bugagent.com/privacy/'; },
    m => { m.extensions['com.openai'].interface.termsOfServiceURL = ''; },
    m => { m.extensions['com.openai'].interface.shortDescription = 'x'.repeat(31); },
    m => { m.extensions['com.openai'].interface.longDescription = 'Demo plugin'; },
    m => { m.extensions['com.openai'].interface.secret = ''; },
  ]) {
    const m = json('plugin.json'); mutate(m);
    assert.throws(() => validateEntries(changed('plugin.json', m)));
  }
});

test('package guidance requires profile tool and exactly the five intended tool names', () => {
  for (const name of ['skills/bugagent-capture/SKILL.md', 'MCP-CONTRACT.md', 'REVIEW-CASES.md']) {
    const content = source.get(name).toString();
    assert.throws(() => validateEntries(changed(name, content.replaceAll('capture_get_profile', 'capture_get_identity'))));
  }
});

test('schema evaluator enforces object, reference, oneOf and string constraints', () => {
  const schema = {
    type: 'object', required: ['name', 'server'], additionalProperties: false,
    properties: { name: { type: 'string', minLength: 1, maxLength: 4, pattern: '^[a-z]+$' },
      server: { $ref: '#/$defs/server' } },
    $defs: { server: { oneOf: [{ const: 'http' }, { type: 'integer' }] } },
  };
  validateSchema({ name: 'test', server: 'http' }, schema);
  validateSchema({ name: 'test', server: 1 }, schema);
  for (const value of [null, [], {}, { name: '', server: 1 }, { name: 'UP', server: 1 },
    { name: 'longer', server: 1 }, { name: 'ok', server: false }, { name: 'ok', server: 1, extra: 1 }]) {
    assert.throws(() => validateSchema(value, schema));
  }
  assert.throws(() => validateSchema(1, { oneOf: [{ type: 'number' }, { type: 'integer' }] }));
});

test('schema evaluator enforces items, additionalProperties, propertyNames and not/enum', () => {
  const schema = { type: 'object', propertyNames: { not: { enum: ['reserved'] } },
    additionalProperties: { type: 'array', items: { type: 'string' } } };
  validateSchema({ allowed: ['one', 'two'] }, schema);
  for (const value of [{ reserved: [] }, { allowed: [1] }, { allowed: 'not-array' }]) {
    assert.throws(() => validateSchema(value, schema));
  }
  validateSchema('x', true);
  assert.throws(() => validateSchema('x', false));
});

test('schema evaluator fails closed on unsupported constraints even in unused branches', () => {
  assert.throws(() => validateSchema({}, { properties: { unused: { format: 'uri' } } }), /Unsupported/);
  assert.throws(() => validateSchema({}, { $ref: 'https://invalid.example/schema' }), /local/);
  assert.throws(() => validateSchema({}, { $ref: '#/$defs/missing' }), /Unresolved/);
  assert.throws(() => validateSchema({}, { $defs: { unused: { minimum: 1 } } }), /Unsupported/);
});

test('rejects representative sensitive content, binary and oversized inputs', () => {
  for (const text of ['ba_live_SYNTHETIC', 'api_key=synthetic', 'Bearer synthetic',
    '/Users/example/private', 'host.internal', '00000000-0000-4000-8000-000000000000',
    '\u0000binary', 'x'.repeat(128 * 1024 + 1)]) {
    assert.throws(() => validateEntries(changed('README.md', text)));
  }
  const invalid = new Map(source).set('README.md', Buffer.from([0xff]));
  assert.throws(() => validateEntries(invalid));
});

test('rejects wrong marketplace paths or automatic installation', () => {
  for (const mutate of [
    m => { m.plugins[0].source.path = '../private'; },
    m => { m.plugins[0].policy.installation = 'INSTALLED_BY_DEFAULT'; },
  ]) {
    const m = JSON.parse(readFileSync(join(REPO, '.agents/plugins/marketplace.json')));
    mutate(m); assert.throws(() => validateMarketplace(m));
  }
});

test('rejects ZIP corruption, trailing data, truncation and stale source', () => {
  const zip = buildZip(source);
  const corrupt = Buffer.from(zip); corrupt[50] ^= 1;
  for (const bytes of [corrupt, zip.subarray(0, -1), Buffer.concat([zip, Buffer.from('extra')])]) {
    assert.throws(() => validateZip(bytes, source));
  }
  assert.throws(() => validateZip(zip, changed('README.md', 'Changed public documentation.')));
});

test('disk reader excludes unlisted files and rejects symlink files, directories and roots', () => {
  const temp = mkdtempSync(join(ROOT, '.plugin-test-'));
  try {
    const fixture = join(temp, 'package');
    for (const [name, data] of source) {
      mkdirSync(dirname(join(fixture, name)), { recursive: true });
      writeFileSync(join(fixture, name), data);
    }
    writeFileSync(join(fixture, '.env'), 'synthetic excluded content');
    assert(buildZip(readPackage(fixture)).equals(buildZip(source)));
    rmSync(join(fixture, 'README.md'));
    symlinkSync(join(ROOT, 'README.md'), join(fixture, 'README.md'));
    assert.throws(() => readPackage(fixture), /regular/);
    rmSync(join(fixture, 'README.md'));
    writeFileSync(join(fixture, 'README.md'), source.get('README.md'));
    rmSync(join(fixture, 'skills'), { recursive: true });
    symlinkSync(join(ROOT, 'skills'), join(fixture, 'skills'));
    assert.throws(() => readPackage(fixture), /non-directory/);
    symlinkSync(ROOT, join(temp, 'root-link'));
    assert.throws(() => readPackage(join(temp, 'root-link')), /symlinks/);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
