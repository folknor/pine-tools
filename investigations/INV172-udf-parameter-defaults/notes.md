# INV172 - UDF parameter defaults were never validated

Found 2026-08-27 by the `member-called-as-function` mutation operator on its
first run (TODO #48), which is the point of that operator existing: the corpus
cannot contain this shape, because TradingView rejects it and the corpus is
published working scripts.

## How it surfaced

The mutant spliced `text.align_right(1)` into a corpus fixture and we accepted
the file whole. The site was not a call argument - it was a function
SIGNATURE's parameter default:

```pine
cell(table t_able, int column, int row, string data, color = color.white,
     align = text.align_right(1)) => t_able.cell(...)
```

The identical call in argument position IS caught. So the gap was not the
CE10271 rule; it was that **nothing walked parameter defaults at all**.

That is two gaps, and the second is larger: as well as never checking the
default expression's own validity, we had none of TradingView's rules about
what a default may BE.

## The rule, measured

`probes/grid.mjs` - 20 cells, one script each (a second error in the same
script could come from the shape rather than the default, and the attribution
would be a guess). Re-runnable, and `--local` runs the same grid against our
own validator, so it doubles as the after-the-fix check.

Probed 2026-08-27. Preamble is `//@version=6`, `indicator("INV172")`,
`userVar = 42`, `userFn(int a) => a + 1`; each cell is the default in
`f(int x, y = <cell>) => x`.

| default | TV |
|---|---|
| `5`, `5.5`, `-5`, `"a"`, `true`, `#FF0000` | clean |
| `(5)`, `-(1)` | clean |
| `close` (built-in variable) | clean |
| `color.red`, `text.align_right` (built-in constants) | clean |
| `timenow` | clean |
| `int y = na` (parameter TYPED) | clean |
| `-userVar` | **clean** - see the oddity below |
| `na` (parameter untyped) | **CE10169** at the parameter name |
| `userVar` (user variable) | **CE10132** at the EXPRESSION |
| `math.max(1, 2)`, `userFn(1)`, `int(na)` | **CE10133** at the parameter name |
| `1 + 2`, `true ? 1 : 2`, `1 > 2`, `close + 1` | **CE10134** at the parameter name |

Messages, verbatim:

- **CE10132** `Cannot use "{id}" as the default value of a type's field. The
  default value cannot be a function, variable or calculation.`
- **CE10133** `The default value cannot be a function, variable or
  calculation.`
- **CE10134** `The default value assigned to a parameter must be either a
  literal value (e.g., "5") or a built-in variable (e.g., "close").`
- **CE10169** `"na" cannot be used as the default value if the parameter's
  type is not defined. Use "<type> <parameterName> = na" instead`

### Read the codes off the SHAPE, never off the wording

Both of the obvious readings are wrong, which is why the grid was worth
building before writing any code:

- **CE10133 says "cannot be a function, variable or calculation"** - but TV
  accepts `close`, `color.red` and `timenow`. A built-in reference is fine;
  only a USER variable is rejected, and with a different code (CE10132).
- **CE10132 says "the default value of a type's field"** - but it fires on a
  plain function parameter that has nothing to do with a UDT.

Two anchors, also measured rather than assumed: CE10132 lands on the
expression, the other three on the parameter name.

### The oddity we deliberately reproduce

`-userVar` is **clean** at TV while the bare `userVar` is CE10132. TV does not
look inside a unary expression. That is almost certainly a hole in TV's own
rule, and we match it rather than "fixing" it: flagging there would reject
scripts TradingView compiles, which is the one direction this checker must not
move in. Recorded so a later reader does not read it as our bug.

## The fix

`checkParamDefaults` in `checker-declarations.ts`, called from both the
FunctionDeclaration and MethodDeclaration arms. Shape-dispatched, with the
built-in-versus-user split made the same way the rest of the checker makes it
(built-ins are defined at line 0 by `initializeBuiltins`).

Unprobed expression shapes - `ArrayExpression`, `IndexExpression`,
`IfExpression`, `SwitchExpression` - are ACCEPTED rather than assigned a
guessed code. A miss on an unmeasured shape beats inventing a diagnostic, and
each is one probe away.

## Verification

`probes/grid.mjs --local` reproduces TradingView's column **cell for cell** -
same verdict, same code, same anchor, on all 20.

The method form matches too (`method m(T self, int k, z = userVar)` -> CE10132
at 7:29 on both), and `int y = na` is clean on both.

- Full suite 479 passing.
- `regression-check` 0 changed fixtures. As with INV170 and INV171 that is
  weak evidence and should not be read as strong: published working scripts
  cannot contain a default TradingView rejects, so the corpus exercises none
  of this.
- **The mutation pool is the gate that means something here**: the operator's
  5,189 mutants over 697 both-clean fixtures now report 5,189 killed, up from
  5,188 with one survivor.

### Known residual: the CE10165 cascade

TV follows CE10132 with `No value assigned to the "y" parameter in h()` at
every CALL site, because a parameter whose default was rejected becomes
required. We emit the CE10132 and not the cascade. Deliberate for now - the
cascade is a second rule about a rejected parameter's arity, not about
defaults - and it costs a tv-only diagnostic on any file carrying this shape,
of which the corpus has none.

### Scoped out, with the evidence already taken

**UDT field defaults share the rule** and are NOT implemented here. Probed the
same day:

```pine
type T
    int a = 5           // clean
    int b = userVar     // CE10132 at 6:13, the expression
    float c = 1 + 2     // CE10134 at 7:5, the field declaration
```

Same codes, different anchor for CE10134 (the field's own start rather than a
parameter name), so it is a real second implementation rather than a shared
call. Tracked in TODO #83.

One measurement caveat for whoever picks it up: TV reported only the first two
of the three violations in that snippet, and on the full fixture it reported
3 of 5. TV truncates; the per-cell isolated probes above are what establish
each verdict, not the multi-violation runs.
