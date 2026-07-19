#!/usr/bin/env node
/**
 * QMDJ golden fixture validator — the L1 provenance gate.
 *
 * Run by CI before the engine suite. Fails the build if any fixture:
 *   - doesn't conform to fixture.schema.json
 *   - lacks at least one source (the no-fabrication rule)
 *   - has an instant without an explicit UTC offset
 *
 * Warns (does not fail) if:
 *   - a fixture has fewer than 2 independent sources, or crossChecked=false
 *     (Phase 1 exit criterion is two references — surfaced, not blocking,
 *      so work-in-progress fixtures can land behind the golden test itself)
 *
 * Only files matching *.fixture.json are validated. Templates should be
 * named *.fixture.json.template so they are ignored until filled in.
 *
 * Dependencies (devDependencies at repo root): ajv, ajv-formats
 *   pnpm add -D -w ajv ajv-formats
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GOLDEN_DIR = join(__dirname, '..', 'packages', 'engine', 'tests', 'golden');
const SCHEMA_PATH = join(GOLDEN_DIR, 'fixture.schema.json');

const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);

const files = readdirSync(GOLDEN_DIR).filter((f) => f.endsWith('.fixture.json'));

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

  if (!validate(data)) {
    console.error(`✗ ${file}: schema violations:`);
    for (const err of validate.errors) {
      console.error(`    ${err.instancePath || '(root)'} ${err.message}`);
    }
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
