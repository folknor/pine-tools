# INV048 - type/namespace names as values (CE10272/CE10074), and the cftc_code data gap

Date: 2026-06-07. Origin: TODO #3 ("`chart.point` flagged 'Unknown
property' - checker bug"). The investigation inverted the premise:
there was no positional false positive left to fix, but a family of
false NEGATIVES and one genuine data-gap FP were hiding behind it.

## What #3 turned out to be

1. **All annotation/constructor/template/member contexts for
   `chart.point` were already clean** (probed locally: `var chart.point
   p = na`, `chart.point p2 = chart.point.now()`,
   `array.new<chart.point>()`, `map.new<int, chart.point>()`, UDF/method
   params, UDT fields - zero errors). The FP the task described had
   been fixed by intervening parser work; the corpus baseline held zero
   `Unknown property 'point'` records.
   NOTE: early reproduction attempts were misleading because snippets
   without `//@version=6` run as v1, where the v6-gated checks are off.
2. **`x = chart.point` in value position is an error in TV** - so our
   member-path error at that site was never a positional FP, only a
   wording mismatch (and our wording, "Unknown property 'point' on
   namespace 'chart'", was misleading: `point` IS a property of
   `chart` - a type, not a value).
3. **Bare type/namespace identifiers in value position were silent
   false negatives**: `x = line` / `x = ta` / `x = int` resolved to the
   seeded builtin symbols and passed.
4. **`syminfo.cftc_code` was a genuine FP from a data gap** (2 corpus
   records in `b9a7b4c5…053625be…pine:225-226`): a real variable TV
   accepts that the v6 reference does not document.

## Probes (pine-lint --tv, all 2026-06-07)

All probes share the frame `//@version=6` / `indicator("t")` /
`<line 3>` / `plot(close)`. TV verdicts verbatim:

| line 3 | TV verdict |
|---|---|
| `x = chart.point` | CE10272 `Undeclared identifier "chart.point"`, 3:5-3:15 |
| `x = polyline` | CE10272 `"polyline"`, 3:5-3:12 |
| `x = line` | CE10272 `"line"`, 3:5-3:8 |
| `x = int` | CE10272 `"int"`, 3:5-3:7 |
| `x = array` | CE10272 `"array"`, 3:5-3:9 |
| `x = series` | CE10272 `"series"`, 3:5-3:10 |
| `x = ta` | CE10272 `"ta"`, 3:5-3:6 |
| `x = strategy` | CE10272 `"strategy"`, 3:5-3:12 |
| `x = input` | CE10272 `"input"`, 3:5-3:9 |
| `x = barmerge.lookhead_on` (member typo) | CE10272 `"barmerge.lookhead_on"`, 3:5-3:24 |
| `x = syminfo.cftc_code` | **accepted**; `x` typed `simple string`, zero errors |

Two declaration-frame probes (lines 3-5):

- `type Foo` / `    int a = 1` / `x = Foo` → **accepted**, zero errors
  (response returns Foo.new/Foo.copy signatures, proving TV parsed it).
  A bare UDT name as a value is fine by TV - quirky, since the
  response also assigns `x` no variable entry, but it is the probed
  verdict.
- `enum E` / `    a = "A"` / `x = E` → CE10074 `Cannot use the "E" as a
  value. Use one of the enum's fields instead.`, zero-width anchor at
  5:5-5:5.

Rule decoded: **any name that exists only as a built-in type, type
keyword, qualifier, or namespace (including function namespaces like
`strategy`/`input`) is CE10272 "Undeclared identifier" when referenced
bare in value position**, anchored at the identifier span. User UDT
names are exempt; user enum names get CE10074 with a zero-width
anchor. TV's wording for unknown members (typos like
`barmerge.lookhead_on`) is the same CE10272 with the full dotted name.

## Implementation (checker.ts)

- `checkNonValueReference` (new, called from validateExpression's
  bare-Identifier dispatch only): a name resolving to a line-0 seeded
  builtin that is in TYPE_KEYWORDS / TYPE_NAMES / KNOWN_NAMESPACES →
  `Undeclared identifier "<name>"`. Exemption: names that are ALSO bare
  builtin variables - `dayofweek` is both a series int variable and
  the constants namespace, the only such collision in v6 (verified
  against the catalogs). A name resolving to a user symbol returns,
  except declared ENUM names → the CE10074 wording, length 0.
- validateExpression's MemberExpression case routes an Identifier
  object straight to validateIdentifier (member objects are namespace
  position, not value position - otherwise `chart.bg_color`/`ta.sma`
  would FP), then flags `obj.prop` ∈ TYPE_NAMES (i.e. `chart.point`)
  with the CE10272 wording at the member span.
- AssignmentStatement targets are write position: Identifier targets
  also route straight to validateIdentifier. A plain `=` assignment to
  a name that only resolves to a line-0 builtin (`matrix = 0.0` - the
  parser emits AssignmentStatement because the declaration path rejects
  keyword names; TV accepts these names as variables, see INV031) now
  REGISTERS a user symbol so later reads of it are values, with
  collectDeclarations' INV032 na-guard (a bare-na RHS gives no type;
  omitting the guard produced 2 corpus "Cannot assign series float to
  na" FPs, caught by regression-check).
- inferExpressionType's member branch skips the unknown-property error
  for TYPE_NAMES members so the misleading wording doesn't stack on the
  CE10272.
- New `declaredEnumNames` set alongside `declaredTypeNames` (CE10074
  needs to tell enums from UDTs).

Regression fixture:
`packages/core/test/fixtures/regression/type-namespace-as-value.pine`
(7 expected errors + every clean form: UDT-as-value, dayofweek,
keyword-named user variable read/compound-assign, annotations,
templates, member access, namespaced calls).

## The cftc_code data gap

`pine-data` lacked `syminfo.cftc_code` because the v6 reference does
not document it - re-crawled 2026-06-07: the TOC inventory is
byte-identical to the 2026-05-29 crawl (timestamp aside) and contains
no `cftc` entry, so neither crawl nor scrape can ever capture it. This
is the exact "linter accepts more than the reference documents" shape
(see G002's retraction for the rigor bar). Per CLAUDE.md, baked into
the pipeline: `UNDOCUMENTED_VARIABLES` in `generate.ts` (new map,
sibling of VARIABLE_TYPE_OVERRIDES) carries the fact + probe + date and
flows into `pine-data/v6/variables.json` (161 → 162 variables). The
fixture's two FP records disappeared; `compare-tv.mjs` on the carrier
now diffs 0/0 against TV (exact match at its one real error, 92:37).

## Corpus impact (regression-check, 2026-06-07)

- Checker round: +12 honest new records, all in 3 broken-string files
  (verified by check-changed-files-broken-string.mjs - no TV-clean file
  changed): the INV025 mangle file's shredded UDT body (`float`/`int`/
  `xloc`/`bool` fragments, 9), a comment-wrap spill line (`strategy` in
  prose, 1), and a column-1-continuation multiline string's contents
  (`line` x2) - all regions that already sprayed Undefined-variable
  noise; the new records name the same shredded tokens that previously
  resolved silently to builtin namespaces.
- Data round: -2 FPs (the cftc records), 0 appearances.
- Baseline 17032 → 17030 records across the two snapshots.

## Residue

- `x = chart.point.now` (function reference as a value, member object
  is itself a member) would flag `chart.point` rather than the full
  dotted name - acceptable approximation, the code is invalid either
  way.
- Compound assignment to an undeclared keyword name (`matrix += 1`
  with no prior `=`) stays silent (write position; pre-existing
  leniency, TV would likely flag - unprobed, no corpus rows).
- `x = myImportAlias` (bare import alias as value) stays silent -
  aliases register as user symbols; TV verdict unprobed, no corpus
  rows.
