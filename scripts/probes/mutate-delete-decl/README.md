# `delete-decl` builtin-namespace-shadow probes (TODO #48)

Why these exist: `mutate.mjs`'s `delete-decl` operator generated a site for
`extend = false` in the corpus fixture `2eeb43fa906f…`, whose ONLY use is
`extend.none`. Because `extend` is also a builtin NAMESPACE, deleting the
declaration leaves the member access valid, so the mutant is not broken Pine and
TV accepts it. It was the last `local-accepts` in the full-pool dry-run, and it
was never a survivor candidate at all - the same wasted-probe shape as the
documented `:=` skip.

The operator now discounts a use that is a namespace-member access on a builtin
namespace, so the site is only generated when some use actually DEPENDS on the
declaration. These four scripts are the discriminating pair plus their deleted
forms, kept so the claim is re-runnable rather than asserted.

Run:

```bash
node scripts/mutate.mjs scripts/probes/mutate-delete-decl/shadow-only.pine \
  --operators delete-decl --sites-per 99          # expect: no mutable sites found
node scripts/mutate.mjs scripts/probes/mutate-delete-decl/shadow-plus-bare.pine \
  --operators delete-decl --sites-per 99          # expect: 1 site at 3:1
node scripts/lint-batch.mjs --tv scripts/probes/mutate-delete-decl
```

## TV verdicts (`pine-lint --tv`, 2026-08-03)

| script | TV |
|---|---|
| `shadow-only.pine` (`extend = false`, used only as `extend.none`) | clean |
| `shadow-only-deleted.pine` (the mutant) | **clean** - so the site was a wasted probe |
| `shadow-plus-bare.pine` (also uses `extend` bare) | clean |
| `shadow-plus-bare-deleted.pine` (the mutant) | **`5:6 Undeclared identifier "extend"`** - a real CE10272, site correctly kept |

The two deleted forms disagreeing with each other is what makes this decisive:
the skip is keyed on whether a use depends on the declaration, not on the name
being `extend`. It also confirms `--tv` answered rather than returning an empty
result, since one of the four comes back with a real error.
