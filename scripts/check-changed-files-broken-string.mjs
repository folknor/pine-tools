#!/usr/bin/env node
// INV047 safety check: every fixture the regression report marks as changed
// should carry a broken-string (CE10017-shape) record - i.e. be a file TV
// rejects at the lexer stage - because the INV047 lexer/parser recovery fixes
// only alter behavior after a broken string literal. A changed file WITHOUT
// one would mean we changed behavior on a possibly TV-clean file - flag it.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const report = JSON.parse(
  readFileSync(path.join(root, 'lint-reports', 'regression-report.json'), 'utf8'),
);
const baseline = JSON.parse(
  readFileSync(path.join(root, 'lint-reports', 'local-baseline.json'), 'utf8'),
);

const MARKER = 'Missing enclosing character in the literal string';

let suspicious = 0;
for (const f of report.filesChanged ?? []) {
  const baselineErrors = baseline.files[f.file]?.errors ?? [];
  const inBaseline = baselineErrors.some((e) => e.message?.includes(MARKER));
  const inAppeared = (f.appeared ?? []).some((e) => e.message?.includes(MARKER));
  if (!inBaseline && !inAppeared) {
    suspicious++;
    console.log(`NO broken-string record: ${f.file} (appeared ${f.appeared?.length ?? 0}, disappeared ${f.disappeared?.length ?? 0})`);
  }
}
console.log(
  suspicious === 0
    ? `OK: all ${report.filesChanged?.length ?? 0} changed files carry a broken-string record`
    : `${suspicious} changed file(s) WITHOUT a broken-string record - inspect them`,
);
