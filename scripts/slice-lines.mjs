#!/usr/bin/env node
// Extract 1-based inclusive line ranges from a file into a new file.
// Usage: node scripts/slice-lines.mjs <src> <ranges> <dest>
//   <ranges> is comma-separated start-end pairs, e.g. "1-2,1041-1090"
// Bisection helper for narrowing parser-state repros out of large fixtures
// (see INV047) without sed/head.
import { readFileSync, writeFileSync } from 'node:fs';

const [src, rangesArg, dest] = process.argv.slice(2);
if (!src || !rangesArg || !dest) {
  console.error('usage: node scripts/slice-lines.mjs <src> <start-end[,start-end...]> <dest>');
  process.exit(1);
}
const lines = readFileSync(src, 'utf8').split('\n');
const out = [];
for (const range of rangesArg.split(',')) {
  const m = range.match(/^(\d+)-(\d+)$/);
  if (!m) {
    console.error(`bad range: ${range}`);
    process.exit(1);
  }
  const start = Number(m[1]);
  const end = Number(m[2]);
  if (start < 1 || end < start) {
    console.error(`bad range: ${range}`);
    process.exit(1);
  }
  out.push(...lines.slice(start - 1, end));
}
writeFileSync(dest, out.join('\n') + '\n');
console.log(`${dest}: ${rangesArg} of ${src} (${out.length} lines)`);
