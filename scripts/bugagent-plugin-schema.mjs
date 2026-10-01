import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT } from './bugagent-plugin.mjs';

const KEYWORDS = new Set(['$schema', '$id', 'title', 'description', 'type', 'properties',
  'additionalProperties', 'required', 'const', 'enum', 'minLength', 'maxLength',
  'pattern', 'items', '$defs', '$ref', 'oneOf', 'not', 'propertyNames']);
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function reference(root, pointer) {
  assert(typeof pointer === 'string' && pointer.startsWith('#/'), 'Only local schema references are supported');
  return pointer.slice(2).split('/').reduce((value, key) => {
    const decoded = key.replaceAll('~1', '/').replaceAll('~0', '~');
    assert(object(value) && own(value, decoded), `Unresolved reference ${pointer}`);
    return value[decoded];
  }, root);
}

// This is intentionally limited to the fetched portable schemas' keyword set.
// Check every branch before validation so unsupported constraints cannot be skipped.
function supported(schema, root) {
  if (typeof schema === 'boolean') return;
  assert(object(schema), 'Expected schema object');
  for (const key of Object.keys(schema)) assert(KEYWORDS.has(key), `Unsupported schema keyword: ${key}`);
  if (own(schema, '$schema')) assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  if (own(schema, 'type')) assert(['object', 'array', 'string', 'boolean', 'null', 'number', 'integer'].includes(schema.type), 'Unsupported type');
  if (own(schema, '$ref')) reference(root, schema.$ref);
  for (const key of ['properties', '$defs']) {
    if (own(schema, key)) {
      assert(object(schema[key]));
      for (const child of Object.values(schema[key])) supported(child, root);
    }
  }
  for (const key of ['additionalProperties', 'items', 'not', 'propertyNames']) {
    if (own(schema, key)) supported(schema[key], root);
  }
  if (own(schema, 'oneOf')) {
    assert(Array.isArray(schema.oneOf) && schema.oneOf.length > 0);
    for (const child of schema.oneOf) supported(child, root);
  }
  if (own(schema, 'required')) assert(Array.isArray(schema.required) && schema.required.every(k => typeof k === 'string'));
  if (own(schema, 'enum')) assert(Array.isArray(schema.enum) && schema.enum.length > 0);
  for (const key of ['minLength', 'maxLength']) {
    if (own(schema, key)) assert(Number.isInteger(schema[key]) && schema[key] >= 0);
  }
  if (own(schema, 'pattern')) { assert.equal(typeof schema.pattern, 'string'); new RegExp(schema.pattern, 'u'); }
}

function matches(value, schema, root, depth) {
  try { check(value, schema, root, depth); return true; }
  catch (error) { if (error instanceof assert.AssertionError) return false; throw error; }
}

function check(value, schema, root, depth = 0) {
  assert(depth < 100, 'Schema depth limit exceeded');
  if (schema === true) return;
  assert.notEqual(schema, false, 'False schema');
  if (own(schema, '$ref')) check(value, reference(root, schema.$ref), root, depth + 1);
  if (own(schema, 'const')) assert.deepEqual(value, schema.const, 'const mismatch');
  if (own(schema, 'enum')) assert(schema.enum.some(candidate => matches(value, { const: candidate }, root, depth + 1)), 'enum mismatch');
  if (own(schema, 'oneOf')) assert.equal(schema.oneOf.filter(s => matches(value, s, root, depth + 1)).length, 1, 'oneOf mismatch');
  if (own(schema, 'not')) assert(!matches(value, schema.not, root, depth + 1), 'not mismatch');
  if (own(schema, 'type')) {
    const valid = { object: object(value), array: Array.isArray(value), string: typeof value === 'string',
      boolean: typeof value === 'boolean', null: value === null,
      number: typeof value === 'number' && Number.isFinite(value), integer: Number.isInteger(value) };
    assert(valid[schema.type], `Expected ${schema.type}`);
  }
  if (typeof value === 'string') {
    const length = [...value].length;
    if (own(schema, 'minLength')) assert(length >= schema.minLength, 'minLength mismatch');
    if (own(schema, 'maxLength')) assert(length <= schema.maxLength, 'maxLength mismatch');
    if (own(schema, 'pattern')) assert(new RegExp(schema.pattern, 'u').test(value), 'pattern mismatch');
  }
  if (Array.isArray(value) && own(schema, 'items')) {
    for (const item of value) check(item, schema.items, root, depth + 1);
  }
  if (object(value)) {
    for (const key of schema.required ?? []) assert(own(value, key), `Missing ${key}`);
    for (const [key, child] of Object.entries(value)) {
      if (own(schema, 'propertyNames')) check(key, schema.propertyNames, root, depth + 1);
      if (own(schema.properties ?? {}, key)) check(child, schema.properties[key], root, depth + 1);
      else if (own(schema, 'additionalProperties')) check(child, schema.additionalProperties, root, depth + 1);
    }
  }
}

export function validateSchema(value, schema) {
  supported(schema, schema);
  check(value, schema, schema);
}

async function main() {
  assert.equal(process.argv.length, 2, 'Usage: node scripts/bugagent-plugin-schema.mjs');
  for (const name of ['plugin', 'mcp']) {
    const url = `https://agent-plugins.org/schemas/1.0.0/${name}.schema.json`;
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15000) });
    assert(response.ok, `Schema fetch failed: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert(bytes.length <= 256 * 1024, 'Schema too large');
    const schema = JSON.parse(bytes.toString('utf8'));
    assert.equal(schema.$id, url, 'Unexpected schema identity');
    validateSchema(JSON.parse(readFileSync(join(ROOT, `${name}.json`), 'utf8')), schema);
    console.log(`${name}.json passes ${url}\nSchema SHA-256: ${createHash('sha256').update(bytes).digest('hex')}`);
  }
  console.log('Portable schema checks only; no MCP calls, runtime verification or marketplace approval.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
