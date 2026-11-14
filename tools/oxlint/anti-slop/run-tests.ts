// Runs every vendored rule test. Each test file throws on failure.
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const rulesDir = join(import.meta.dirname, "rules");
let failed = 0;

for (const file of readdirSync(rulesDir).filter((f) => f.endsWith(".test.ts"))) {
  try {
    execFileSync(process.execPath, [join(rulesDir, file)], { stdio: "inherit" });
    console.log(`ok   ${file}`);
  } catch {
    console.log(`FAIL ${file}`);
    failed++;
  }
}

process.exit(failed > 0 ? 1 : 0);
