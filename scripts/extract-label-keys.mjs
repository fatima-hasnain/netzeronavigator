#!/usr/bin/env node
/**
 * Regenerate `src/i18n/labels.en.json` from a surrogate `_manifest.json`.
 * Usage: node scripts/extract-label-keys.mjs public/models/20200224/_manifest.json
 */
import fs from 'node:fs'
import path from 'node:path'

const manifestPath = path.resolve(process.argv[2] ?? 'public/models/20200224/_manifest.json')
const outPath = path.resolve('src/i18n/labels.en.json')

const j = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const out = {}

function titleCaseFromId(s) {
  return s
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ')
}

for (const m of j['tf-models'] ?? []) {
  for (const f of m.features ?? []) {
    const id = f.feature?.id
    if (id && out[id] === undefined) out[id] = titleCaseFromId(id)
    if (f.units && out[f.units] === undefined) out[f.units] = f.units
  }
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n')
console.log(`Wrote ${outPath} (${Object.keys(out).length} keys)`)
