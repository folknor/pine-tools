#!/usr/bin/env node
// Summarize lint-reports/regression-report.json: group appeared/disappeared
// records into message templates (numbers and quoted names stripped) so a
// 1000-record regression diff reads as a dozen categories. Companion to
// regression-check.mjs - run it right after.
//
// Usage: node scripts/summarize-regression.mjs [--appeared|--disappeared] [--files <template-substring>]
//   default prints both channels' category tables
//   --files lists the per-file counts for categories matching the substring
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const report = JSON.parse(
  readFileSync(path.join(root, 'lint-reports', 'regression-report.json'), 'utf8'),
);

const args = process.argv.slice(2);
const filesFilter = args.includes('--files') ? args[args.indexOf('--files') + 1] : null;
const channels = [];
if (args.includes('--appeared') || (!args.includes('--disappeared') && !filesFilter)) channels.push('appeared');
if (args.includes('--disappeared') || (!args.includes('--appeared') && !filesFilter)) channels.push('disappeared');
if (filesFilter && channels.length === 0) channels.push('appeared', 'disappeared');

function template(msg) {
  return msg
    .replace(/'[^']*'/g, "'*'")
    .replace(/"[^"]*"/g, '"*"')
    .replace(/\b\d+\b/g, 'N');
}

for (const channel of channels) {
  const byTemplate = new Map();
  for (const f of report.filesChanged ?? []) {
    for (const rec of f[channel] ?? []) {
      const t = template(rec.message);
      let entry = byTemplate.get(t);
      if (!entry) {
        entry = { count: 0, files: new Map() };
        byTemplate.set(t, entry);
      }
      entry.count++;
      entry.files.set(f.file, (entry.files.get(f.file) ?? 0) + 1);
    }
  }
  const sorted = [...byTemplate.entries()].sort((a, b) => b[1].count - a[1].count);
  console.log(`\n=== ${channel} (${sorted.reduce((s, [, e]) => s + e.count, 0)} records, ${sorted.length} categories) ===`);
  for (const [t, entry] of sorted) {
    console.log(`  ${String(entry.count).padStart(5)}  ${entry.files.size} file(s)  ${t}`);
    if (filesFilter && t.includes(filesFilter)) {
      const perFile = [...entry.files.entries()].sort((a, b) => b[1] - a[1]);
      for (const [file, n] of perFile) {
        console.log(`           ${String(n).padStart(4)}  ${file}`);
      }
    }
  }
}
