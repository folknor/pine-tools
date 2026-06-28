# INV137 - Equality mismatch diagnostics for nonliteral operands

## Status

Fixed 2026-06-28.

## Source

TODO #57 residual. The earlier INV096 fix aligned `==`/`!=` CE10123 messages
for the corpus-covered single-literal cases, but residual shapes such as
`boolVar == stringVar` and `color.red == 1` still used the old generic local
message:

```text
Type mismatch: cannot apply '==' to bool and string
```

## Regression fixture

`packages/core/test/fixtures/regression/INV137-equality-nonliteral-mismatch.pine`

## TV probe

Measured 2026-06-28 with:

```bash
pine-lint --tv packages/core/test/fixtures/regression/INV137-equality-nonliteral-mismatch.pine
```

Exact script sent:

```pine
// @test regression/INV137-equality-nonliteral-mismatch
// @description `==`/`!=` mismatches without the old single-literal shape still use TV's CE10123 operator template. TV picks the lower-priority operand as the offender: color loses to int (expected float), int loses to enum, enum loses to bool/string, and bool loses to string. Probed 2026-06-28 via pine-lint --tv, see INV137.
// @expects parse: success
// @expects error: line=10, message=/Cannot call "operator ==" with argument "expr0"="b".*"const bool".*"const string"/
// @expects error: line=11, message=/Cannot call "operator !=" with argument "expr1"="b".*"const bool".*"const string"/
// @expects error: line=12, message=/Cannot call "operator ==" with argument "expr0"="color.red".*"const color".*"const float"/
// @expects error: line=13, message=/Cannot call "operator ==" with argument "expr1"="color.red".*"const color".*"const float"/
// @expects error: line=14, message=/Cannot call "operator ==" with argument "expr0"="v".*"const E".*"const bool"/
// @expects error: line=15, message=/Cannot call "operator ==" with argument "expr1"="i".*"const int".*"const enum"/
// @expects error: line=16, message=/Cannot call "operator ==" with argument "expr0"="v".*"const E".*"const string"/
// @expects errors: 7

//@version=6
indicator("INV137 equality nonliteral mismatch")
enum E
    a
    b
bool b = true
string s = "x"
v = E.a
int i = 1
badVar = b == s
badVarFlip = s != b
badColor = color.red == 1
badColorFlip = 1 == color.red
badEnumBool = v == b
badEnumInt = v == i
badEnumString = v == s
okColor = color.red != color.blue
okEnum = v == E.b
used = na(badVar) or na(badVarFlip) or na(badColor) or na(badColorFlip) or na(badEnumBool) or na(badEnumInt) or na(badEnumString)
plot(used ? 1 : okColor ? 2 : okEnum ? 3 : 0)
```

TV result, error payload:

```json
{"success":true,"errors":[{"code":"CE10123","ctx":{"argDisplayName":"expr0","argUserFriendlyRepresentation":"b","argumentType":"const bool","currentTypeDocStr":"const string","funId":"operator ==","typePostfix":""},"start":{"column":10,"line":22},"end":{"column":10,"line":22}},{"code":"CE10123","ctx":{"argDisplayName":"expr1","argUserFriendlyRepresentation":"b","argumentType":"const bool","currentTypeDocStr":"const string","funId":"operator !=","typePostfix":""},"start":{"column":19,"line":23},"end":{"column":19,"line":23}},{"code":"CE10123","ctx":{"argDisplayName":"expr0","argUserFriendlyRepresentation":"color.red","argumentType":"const color","currentTypeDocStr":"const float","funId":"operator ==","typePostfix":""},"start":{"column":12,"line":24},"end":{"column":20,"line":24}},{"code":"CE10123","ctx":{"argDisplayName":"expr1","argUserFriendlyRepresentation":"color.red","argumentType":"const color","currentTypeDocStr":"const float","funId":"operator ==","typePostfix":""},"start":{"column":21,"line":25},"end":{"column":29,"line":25}},{"code":"CE10123","ctx":{"argDisplayName":"expr0","argUserFriendlyRepresentation":"v","argumentType":"const E","currentTypeDocStr":"const bool","funId":"operator ==","typePostfix":""},"start":{"column":15,"line":26},"end":{"column":15,"line":26}},{"code":"CE10123","ctx":{"argDisplayName":"expr1","argUserFriendlyRepresentation":"i","argumentType":"const int","currentTypeDocStr":"const enum","funId":"operator ==","typePostfix":""},"start":{"column":19,"line":27},"end":{"column":19,"line":27}},{"code":"CE10123","ctx":{"argDisplayName":"expr0","argUserFriendlyRepresentation":"v","argumentType":"const E","currentTypeDocStr":"const string","funId":"operator ==","typePostfix":""},"start":{"column":17,"line":28},"end":{"column":17,"line":28}}]}
```

## Additional probes

The residual was not a clean global priority ladder. The older INV096 statement
that enum ranked above string was refuted for both-nonliteral operands:

```pine
//@version=6
indicator("INV137-enum")
enum E
    a
    b
v = E.a
string s = "x"
e1 = v == s
e2 = s != v
e3 = E.a == s
plot(e1 ? 1 : e2 ? 2 : e3 ? 3 : 0)
```

TV result, error payload:

```json
{"success":true,"errors":[{"ctx":{"argDisplayName":"expr0","argUserFriendlyRepresentation":"v","argumentType":"const E","currentTypeDocStr":"const string","funId":"operator =="}},{"ctx":{"argDisplayName":"expr1","argUserFriendlyRepresentation":"v","argumentType":"const E","currentTypeDocStr":"const string","funId":"operator !="}},{"ctx":{"argDisplayName":"expr0","argUserFriendlyRepresentation":"E.a","argumentType":"const E","currentTypeDocStr":"const string","funId":"operator =="}}]}
```

But a string literal against an enum still follows the literal-special rule:

```pine
//@version=6
indicator("INV137-enum-lit")
enum E
    a
    b
v = E.a
e1 = v == "x"
e2 = "x" != v
e3 = v == true
e4 = true != v
plot(0)
```

TV result, error payload:

```json
{"success":true,"errors":[{"ctx":{"argDisplayName":"expr1","argUserFriendlyRepresentation":"x","argumentType":"literal string","currentTypeDocStr":"const enum","funId":"operator =="}},{"ctx":{"argDisplayName":"expr0","argUserFriendlyRepresentation":"x","argumentType":"literal string","currentTypeDocStr":"const enum","funId":"operator !="}},{"ctx":{"argDisplayName":"expr1","argUserFriendlyRepresentation":true,"argumentType":"literal bool","currentTypeDocStr":"const enum","funId":"operator =="}},{"ctx":{"argDisplayName":"expr0","argUserFriendlyRepresentation":true,"argumentType":"literal bool","currentTypeDocStr":"const enum","funId":"operator !="}}]}
```

The relevant observed rule is:

- Exact one-literal mismatches usually flag that literal and expect the other
  operand's type. This preserves the INV096 cases such as `bool == "x"` and
  `enum == 1`.
- Nonliteral pairs use the observed primitive/enum priority:
  `float > string > bool > enum > int > color`.
- `color` as the nonliteral side falls through to that priority even when the
  other side is a literal, so `color.red == 1` flags `color.red` and expects
  `const float`.
- `int` as the nonliteral side also falls through when compared to a string
  literal, so `intVar == "x"` flags the int variable and expects `const string`.
- When the expected side is `int`, TV renders the operator overload as float
  (`const float`, or the matching qualifier), not `const int`.

Unknown, collection, UDT, and opaque-handle pairs are left on the generic
fallback because these probes do not establish a TV decision rule for them.

## Fix

`validateBinaryExpression` now routes `==`/`!=` incompatibilities through an
equality-specific offender chooser. It keeps the INV096 single-literal behavior,
adds the two probed literal exceptions, applies the nonliteral primitive/enum
priority, renders enum expected types as `const enum`, and renders expected
`int` as the operator's float overload. The equality path also asks
`describeArgForTemplate` to use `const` as the fallback qualifier for bare local
identifier operands; TV renders `bool b = true` as `const bool` in this
diagnostic, while explicitly series operands still render as `series <type>`.
