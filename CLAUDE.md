@AGENTS.md

## More Rules

### General rules

- Subagents must always be launched in the foreground (never
  `run_in_background: true`) so the user can approve tool requests.

### Memory rules

Do not use your Memory functionality. Do not read, write, or update
memories. Do not suggest saving things to memory. Durable context belongs
in CLAUDE.md or the relevant docs.

### Bash rules

- Never use `sed`, `find`, `awk`, `head`, `tail`, or complex bash commands.
- Never `find /`.
- Never run `git` with `-C <path>`.
- One Bash() invocation === one command.
- Never chain commands with `&&`.
- Never chain commands with `;`.
- Never chain/pipe commands with `|`. Exception: piping into `review` is
  allowed (writing scratch prompt files is wasteful).
- Never capture stdout into env vars (`UUID=$(...)`).
- Never read or write from `/tmp`. All data lives in the project.

### git commit rules

- Never commit unless the user explicitly asks for that specific commit. A
  prior "commit" authorization covers only what was ready then, not later
  edits. When unsure, leave changes unstaged and wait.
- Never commit markdown changes alone. Bundle them with upcoming code commits.
- When committing other changes: always tag along markdown files if dirty.
- Write substantive engineering-focused commit messages.
- Never `git push` unless the user explicitly asks. Stop after the commit.

### Multi-Agent Orchestration

**Always get permission** from the user before launching subagents.

**Do NOT use git worktree isolation for parallel agents.** Worktrees create
merge conflicts that silently drop agent work. Instead, launch agents in the
same tree with strict file ownership - zero overlap.

Agent coordination rules:

- Each agent gets exclusive ownership of specific files. No two agents touch
  the same file.
- Agents must read their target file FIRST. Do not replace existing code with
  placeholders or stub it out.
- Agents must NOT run builds, the test suite, or the CLI install (`pnpm test`,
  `pnpm run build`, `pnpm run install:cli`). The orchestrator validates
  between agents.

Audit protocol:

- Do not trust agent claims of completion. Verify existence + wiring + behavior.
- Use the 3-pass audit structure: domain-specific verification, then
  cross-cutting reconciliation (does the new instruction actually dispatch? is
  the new builtin actually installed?), then editorial normalization.
- Any discrepancies doc should contain only current gaps, not historical
  records. Remove resolved items entirely.

Subagent prompt rules:

- Scope the investigation, not the report. Caps like "under 1500 chars" or
  "max 15 findings" throw away signal you asked them to surface.
- Invite lateral findings up front. If they notice a bug, optimization, smell,
  or anything surprising while doing the scoped work, they should flag it, even
  when it's outside the immediate task.
- Name the question, not the method. Don't prescribe tools ("use `git diff`",
  "use `Read`"), don't prescribe steps ("read in full, not just hunks"), don't
  enumerate files when the scope already implies them ("packages/core only" +
  the agent's own `ls` / `git diff --name-only` is enough). Prescribing the
  method wastes tokens and signals distrust.
- Don't restate rules the agent already inherits. Subagents load the same
  CLAUDE.md as the main session, so the bash rules, no-worktrees, gremlins,
  etc. are already in scope. Re-listing them is noise.
- Do pass anything learned in *this* conversation that the agent can't see: the
  user's framing, prior decisions, what's already been ruled out, the specific
  claim being audited.
- For review tasks, ask for findings labeled *bug* / *gap* / *smell* / *nit* so
  the orchestrator can triage without re-reading the whole report.
