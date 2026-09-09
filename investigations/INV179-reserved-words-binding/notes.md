# INV179 - reserved words accepted in binding positions

Source: finding 9 of `../strategies/PINE-LINT-BUGS.md`. Direction: local misses
an error TradingView raises.

`pine-lint -H` accepted `f(float to) => to * 2` clean while TV answered
`""to"" cannot be used as a variable or function name.` The report also named
`from`, and asked explicitly for the SET to be enumerated rather than for the
two known words to be special-cased.

## Repro

`repro.pine`:

```pine
//@version=6
indicator("t")
f(float to) =>
    to * 2
plot(f(close))
```

| Validator | Verdict (2026-09-09) |
|---|---|
| `pine-lint -H` | clean |
| `pine-lint -H --tv` | `3:9: error: ""to"" cannot be used as a variable or function name.` |

## The sweep

`scripts/probe-reserved-word-bindings.mjs` sends 49 candidate words through
seven binding positions - 343 probes - and records TV's raw verdict alongside
ours. Candidates are deliberately wider than any list we hold: the lexer's
keywords, the words the reference calls keywords, the loop-header words
(`to`, `by`, `in`, and the one the lexer does not know, `from`), the
qualifiers and the base types. Words TV ACCEPTS are as much of a result as
words it rejects, so nothing was pre-filtered.

Each probe binds the word and then reads it, so a word cannot pass by being
unused. Every run sends four controls - a script TV must accept and one TV must
reject, before AND after the sweep - because an empty error list from a
throttled `--tv` call is indistinguishable from "TV accepted it", and that
ambiguity is what manufactured G002. All four passed on both runs.

Full raw output, per probe, with the exact `.pine` source of each:
`probe.json` (2026-09-09).

`both` = TV and we reject. `us only` = TV accepts, we reject. `-` = both
silent. `GAP` = TV rejects, we accept - the finding.

| word | param | fnName | assign | varDecl | forCounter | forInCounter | udtField |
|---|---|---|---|---|---|---|---|
| `if` | both | both | both | both | both | both | **GAP** |
| `else` | **GAP** | both | **GAP** | both | both | both | **GAP** |
| `for` | both | both | both | both | both | both | **GAP** |
| `while` | both | both | both | both | both | both | **GAP** |
| `break` | **GAP** | both | **GAP** | both | both | both | **GAP** |
| `continue` | **GAP** | both | **GAP** | both | both | both | **GAP** |
| `return` | both | both | both | both | both | us only | **GAP** |
| `switch` | both | both | both | both | both | both | **GAP** |
| `case` | - | us only | us only | us only | us only | us only | - |
| `default` | - | us only | us only | us only | us only | us only | - |
| `do` | **GAP** | **GAP** | **GAP** | **GAP** | **GAP** | - | **GAP** |
| `var` | both | both | both | both | both | both | **GAP** |
| `varip` | both | both | both | both | both | both | **GAP** |
| `const` | us only | us only | us only | us only | us only | us only | - |
| `na` | - | us only | us only | us only | us only | us only | - |
| `true` | both | both | both | both | both | both | both |
| `false` | both | both | both | both | both | both | both |
| `export` | both | both | both | both | both | both | **GAP** |
| `import` | both | both | both | both | both | both | **GAP** |
| `as` | **GAP** | both | both | both | both | both | **GAP** |
| `in` | **GAP** | both | both | both | both | both | **GAP** |
| `to` | **GAP** | both | both | both | both | both | **GAP** |
| `by` | **GAP** | both | both | both | both | both | **GAP** |
| `from` | - | - | - | - | - | - | - |
| `type` | - | us only | - | us only | us only | us only | - |
| `enum` | - | us only | - | us only | us only | us only | - |
| `method` | - | - | - | us only | us only | us only | - |
| `and` | both | both | both | both | both | both | **GAP** |
| `or` | both | both | both | both | both | both | **GAP** |
| `not` | both | both | both | both | both | both | **GAP** |
| `once` | - | us only | - | - | - | - | - |
| `indicator` | - | us only | - | - | - | - | - |
| `strategy` | - | us only | - | - | - | - | - |
| `library` | - | us only | - | - | - | - | - |
| `int` .. `map` | - | us only | - | - | - | - | - |
| `series`, `simple` | - | us only | - | us only | - | - | - |
| `input` | - | us only | - | us only | us only | us only | - |

(The base-type rows `int float bool string color line label box table array
matrix map` are identical and collapsed; `probe.json` has them individually.)

## What the set actually is

TV rejects exactly these 22 in a binding position, and nothing else in the
candidate list:

```
and as break by continue do else export false for if import in not or
return switch to true var varip while
```

Three things about that set are worth stating, because none of them could have
been guessed from a list we already had:

- **`do` is in it, and `do` is not a Pine v6 construct at all.** It is not in
  `LEXER_KEYWORDS`, so it lexes as an ordinary identifier and was accepted in
  every position - the only word in the sweep that gapped six ways.
- **`const`, `na`, `type`, `enum`, `method`, `once`, `case` and `default` are
  NOT in it.** TV accepts all of them as names. Several sit in our
  `RESERVED_KEYWORDS`, which is why the `us only` column is as full as it is.
  The two lists answer different questions and must not be merged.
- **`from` is not in it.** See below.

## `from` is not reserved - the report was misreading TV

The report gives a second repro, `span(float from, float to)`, and reads TV's
`4:12: Syntax error at input "from"` as `from` being rejected "the same way"
with a worse message. It is not. Probed 2026-09-09:

| Probe | TV |
|---|---|
| `f(float from) => from * 2` (`probe.json`, `from`/`param`) | clean |
| `span(float from, float b) => math.abs(b - from)` | clean - and TV echoes back `span(series float from, series float b) -> series float` |
| `span(float from, float to) => math.abs(to - from)` (`from-two-param.pine`) | `4:12: Syntax error at input "from"` |

`from` alone is fine in every one of the seven positions, and TV will even name
it in a signature. The rejection appears only when `to` is also present, so the
offence is `to`'s.

**The rule is stronger than "TV reported it at `from`'s column", and the
stronger form is what to remember.** Putting a word that is not reserved in the
first slot draws the error onto that word instead:

```
span(float a, float to)  ->  TV: 3:12: Syntax error at input "a"
```

`a` is at column 12. So **TV anchors this parse cascade at the FIRST parameter,
whichever word occupies it** - it is not that `from` is treated specially, it is
that `from` happened to be first. Stating it as "`from`'s column" reads as a
fact about `from` and would not have predicted the `a` result.

This is the blame-the-wrong-token behaviour the methodology section warns about
(G001), landing on a word that looked guilty by association. The cheap guard is
a second probe that swaps the parameter order; it costs one call and settles it.

(Credit where due: the swap probe is `../strategies`' own, from the round that
re-verified this fix. Our sweep established `from` was innocent by testing it
alone; theirs established what TV was actually pointing at.)

## Fix

One measured set, `TV_RESERVED_BINDING_NAMES` in `constants/keywords.ts`, kept
separate from `RESERVED_KEYWORDS` for the reason given above. Applied at the two
binding sites that had no check at all:

- **Parameter names** - in `functionDeclaration` and `methodDeclaration`, NOT in
  `parseFunctionParams`. That matters: `parseFunctionParams` also runs
  SPECULATIVELY on any `name(...)` the parser has not yet resolved, and a call
  like `f_newLine(quarters or eighths, ...)` parses as a `<type> <name>` pair
  whose "name" is `or`. Checking inside it put 1343 new errors on `and`/`or`/
  `not` across 260 corpus files. The name's own position now travels on the
  param (`nameLine`/`nameColumn`) so the committed declaration can still anchor
  the error at the name, where TV puts it.
- **UDT field names** - in `scanTypeFieldAtCurrent`, deferred past its
  trailing-name check for the same reason the CE10288 qualifier error is: the
  scanner runs on every body-indent line and a non-field line must not draw a
  diagnostic.

Both keep the binding and carry on, matching TV, so a reserved parameter's uses
in the body do not cascade into undefined-variable errors TV never emits.

Regression fixture:
`packages/core/test/fixtures/regression/INV179-reserved-words-binding.pine`,
which pins `to`, `by`, `do` and `in` and carries `from`, `type` and `na` as
must-stay-clean controls.

## After

The sweep re-run against the fixed build is `probe-after.json` (2026-09-09,
same four controls, all passing).

The first pass took **35 gaps to 7**. The second pass, below, took it to **3**:

```
remaining: else/assign, break/assign, continue/assign
newly opened: none
we stopped rejecting: none
```

Both passes moved only what they aimed at - the `us only` column is
byte-identical across all three runs, so nothing was closed by becoming
stricter somewhere unrelated. The 3 that remain are one family: the assign
position, where TV answers with a different diagnostic entirely (see below).

Also verified: `pnpm test` 489 pass, `node scripts/regression-check.mjs` 0
changed fixtures over 1879.

## Second pass (2026-09-09, after `../strategies` re-verified)

Three corrections and additions, all from re-probing rather than reasoning.

**The message is CE10150 and carries a ctx.** We emitted the prose with no
`code` and no `ctx`, so a consumer had to pattern-match the string;
`../strategies`' `differential.tsv` reads `ctx`. `ParserError` now carries
optional `code`/`ctx` and the CLI passes them through the way it already did
for validation errors. This is the first coded syntax-stage diagnostic.

**TV's quoting is per-site, and we had it wrong in one place.** TV's template is
`"{keyword}" cannot be used as a variable or function name.` and it fills
`keyword` inconsistently:

| Site | TV ctx | TV renders |
|---|---|---|
| parameter | `"\"to\""` | `""to""` |
| UDT field | `"in"` | `"in"` |
| assignment / `var` / function name / `for` counter | `"do"` | `"do"` |

Only the parameter site doubles. Our UDT field error had been copying the
parameter site's doubled form, so it was wrong from the day it landed - the
first pass verified the PARAMETER wording against TV and assumed the field site
matched. Both now mirror their own site. The fixtures anchor with `^...$`,
because an unanchored `/"in" cannot/` matches inside `""in""` and would have
passed either way - which is exactly how the mistake survived the first pass.

**The four remaining `do` sites are closed.** Plain assignment, `var`
declaration, function name and counted `for` all now report at TV's position
with TV's wording. The check is guarded on the token being an IDENTIFIER rather
than on the name being `do`: every other reserved word is in `LEXER_KEYWORDS`,
arrives as a KEYWORD token, and has already failed the surrounding parse with
TV's own wording, so checking again would double-report. `do` is the only word
TV reserves that Pine v6 does not use, so it is the only one that lexes as an
ordinary identifier. The guard states the property instead of the name, so a
word added to the set later behaves correctly whichever way it lexes.

The counted-`for` check is deferred past the for-in branch on purpose: TV
rejects `for do = 0 to 5` and accepts `for do in xs`. Fixture:
`INV179-do-declaration-sites.pine`, whose `for do in` line is the control.

**Note on a scope claim worth not inheriting.** `../strategies` reports zero
remaining gaps across 41 candidate words in three binding positions. That is
consistent with these measurements and still misses `do`, because a candidate
list derived from Pine's keyword set structurally cannot contain a word Pine
does not define. `do` gapped in six of seven positions here precisely because
it is absent from every such list, including ours before this investigation.
**A reserved-word sweep has to include words the language does not have.**

## Not fixed here, and why

- **`else`, `break`, `continue` in an `assign` position.** TV answers
  `Syntax error at input {value}` there, not the reserved-name message - a
  different diagnostic from a different part of its grammar. Left open rather
  than approximated with the wrong wording.
- **The `us only` column - roughly 60 probes where WE reject and TV accepts.**
  That is the opposite direction and outside this finding, but it is real and
  large, most visibly every base type as a function name (`float(float x) =>`)
  and `const`/`na`/`type`/`enum` as ordinary names. Worth its own
  investigation; recorded here so the measurement is not lost.
- **One TV inconsistency, in the safe direction.** TV accepts
  `for return in ...` while rejecting `return` in `for x = 0 to 5`. We reject
  both. Left alone. (The matching `for do in ...` leniency IS mirrored, since
  the `do` check had to be written from scratch and could simply be placed
  after the for-in branch.)
