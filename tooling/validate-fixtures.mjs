#!/usr/bin/env node
/**
 * QMDJ golden fixture validator — the L1 provenance gate.
 *
 * Run by CI before the engine suite. Fails the build if any fixture:
 *   - doesn't conform to fixture.schema.json
 *   - lacks at least one source (the no-fabrication rule)
 *   - has an instant without an explicit UTC offset
 *   - reuses another fixture's id
 *
 * Warns (does not fail) if:
 *   - a fixture has fewer than 2 independent sources, or crossChecked=false
 *     (Phase 1 exit criterion is two references — surfaced, not blocking,
 *      so work-in-progress fixtures can land behind the golden test itself)
 *
 * Only files matching *.fixture.json are validated. Templates should be
 * named *.fixture.json.template so they are ignored until filled in.
 *
 * ZERO dependencies, by design. This used to need ajv + ajv-formats, which
 * meant a lockfile entry and an install step for one script in a repo whose
 * whole point is a dependency-free engine. `check()` below implements the
 * subset of JSON Schema that fixture.schema.json actually uses, and reads the
 * schema at runtime — so the schema stays the contract, it just isn't enforced
 * by a third-party compiler any more. If the schema grows a keyword this
 * doesn't know, it says so loudly rather than passing silently.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GOLDEN_DIR = join(__dirname, '..', 'packages', 'engine', 'tests', 'golden');
const SCHEMA_PATH = join(GOLDEN_DIR, 'fixture.schema.json');

const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));

const KNOWN = new Set([
  '$schema', '$id', 'title', 'description', '$defs', '$ref', 'type', 'enum',
  'const', 'required', 'properties', 'additionalProperties', 'items', 'anyOf',
  'pattern', 'format', 'minLength', 'minItems', 'maxItems', 'minimum', 'maximum',
  'propertyNames',
]);

const FORMATS = {
  date: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)),
  uri: (v) => /^[a-z][a-z0-9+.-]*:/i.test(v),
};

/** Resolve a local "#/$defs/name" reference. */
function deref(node) {
  let guard = 0;
  while (node && node.$ref) {
    if (guard++ > 20) throw new Error(`$ref cycle at ${node.$ref}`);
    const path = node.$ref.replace(/^#\//, '').split('/');
    let target = schema;
    for (const seg of path) target = target?.[seg];
    if (!target) throw new Error(`unresolvable $ref: ${node.$ref}`);
    const { $ref, ...rest } = node;
    node = { ...target, ...rest };
  }
  return node;
}

const typeOf = (v) =>
  v === null ? 'null' : Array.isArray(v) ? 'array'
    : Number.isInteger(v) ? 'integer' : typeof v === 'number' ? 'number' : typeof v;

/** Validate `value` against `node`; push human-readable problems into `errs`. */
function check(value, node, path, errs) {
  node = deref(node);

  for (const k of Object.keys(node)) {
    if (!KNOWN.has(k)) errs.push(`${path}: schema uses unsupported keyword '${k}' — extend the validator`);
  }

  if (node.anyOf) {
    if (!node.anyOf.some((sub) => { const e = []; check(value, sub, path, e); return e.length === 0; })) {
      errs.push(`${path}: matches none of the allowed shapes`);
    }
    return;
  }

  if (node.type) {
    const actual = typeOf(value);
    const ok = node.type === 'number' ? (actual === 'number' || actual === 'integer') : actual === node.type;
    if (!ok) { errs.push(`${path}: expected ${node.type}, got ${actual}`); return; }
  }

  if (node.enum && !node.enum.includes(value)) {
    errs.push(`${path}: '${value}' is not one of ${node.enum.join(' | ')}`);
  }
  if (node.const !== undefined && value !== node.const) {
    errs.push(`${path}: expected constant ${node.const}`);
  }

  if (typeof value === 'string') {
    if (node.pattern && !new RegExp(node.pattern).test(value)) {
      errs.push(`${path}: '${value}' does not match ${node.pattern}`);
    }
    if (node.minLength != null && value.length < node.minLength) {
      errs.push(`${path}: shorter than ${node.minLength} characters`);
    }
    if (node.format && FORMATS[node.format] && !FORMATS[node.format](value)) {
      errs.push(`${path}: '${value}' is not a valid ${node.format}`);
    }
  }

  if (typeof value === 'number') {
    if (node.minimum != null && value < node.minimum) errs.push(`${path}: below minimum ${node.minimum}`);
    if (node.maximum != null && value > node.maximum) errs.push(`${path}: above maximum ${node.maximum}`);
  }

  if (Array.isArray(value)) {
    if (node.minItems != null && value.length < node.minItems) errs.push(`${path}: needs at least ${node.minItems} item(s)`);
    if (node.maxItems != null && value.length > node.maxItems) errs.push(`${path}: allows at most ${node.maxItems} item(s)`);
    if (node.items) value.forEach((v, i) => check(v, node.items, `${path}[${i}]`, errs));
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of node.required ?? []) {
      if (!(key in value)) errs.push(`${path}: missing required property '${key}'`);
    }
    const props = node.properties ?? {};
    for (const [key, v] of Object.entries(value)) {
      const sub = props[key];
      if (sub) check(v, sub, `${path}.${key}`, errs);
      else if (node.additionalProperties === false && !key.startsWith('__')) {
        errs.push(`${path}: unexpected property '${key}'`);
      }
    }
  }
}

const files = readdirSync(GOLDEN_DIR).filter((f) => f.endsWith('.fixture.json')).sort();

let failures = 0;
let warnings = 0;

if (files.length === 0) {
  console.warn(
    '⚠ No *.fixture.json files found in tests/golden/. ' +
      'The golden suite has nothing to assert — add at least the verified ' +
      '壬午日庚子时 fixture before relying on CI as a correctness gate.'
  );
  warnings++;
}

const seenIds = new Set();

for (const file of files) {
  const path = join(GOLDEN_DIR, file);
  let data;
  try {
    data = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    console.error(`✗ ${file}: invalid JSON — ${e.message}`);
    failures++;
    continue;
  }

  const errs = [];
  check(data, schema, '(root)', errs);
  if (errs.length) {
    console.error(`✗ ${file}: schema violations:`);
    for (const err of errs) console.error(`    ${err}`);
    failures++;
    continue;
  }

  // Duplicate id check
  if (seenIds.has(data.id)) {
    console.error(`✗ ${file}: duplicate fixture id '${data.id}'`);
    failures++;
    continue;
  }
  seenIds.add(data.id);

  // Provenance depth warning (Phase 1 exit criterion: 2 independent refs)
  const sourceNames = new Set((data.sources ?? []).map((s) => s.name));
  if (sourceNames.size < 2) {
    console.warn(
      `⚠ ${file}: only ${sourceNames.size} independent source(s) — ` +
        'Phase 1 exit criterion asks for 2. Not blocking, but flagged.'
    );
    warnings++;
  }
  if (data.verified?.crossChecked !== true) {
    console.warn(`⚠ ${file}: verified.crossChecked is not true yet.`);
    warnings++;
  }

  console.log(`✓ ${file} (${data.id})`);
}

console.log(
  `\nFixture validation: ${files.length} file(s), ${failures} failure(s), ${warnings} warning(s).`
);

if (failures > 0) process.exit(1);
