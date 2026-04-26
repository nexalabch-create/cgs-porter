# Safe-fix patterns (🟢)

This is the **closed list** of 8 patterns that the loop is allowed to auto-apply. Adding a 9th requires a code review + updating both `triage.mjs` (the GREEN_CODES set) and `apply-safe-fix.mjs` (a new handler).

The principle: every pattern here is a **textual or declarative change** — it does not affect business logic, it does not change runtime behavior in ways that could surprise a user, and it is verifiable by re-running the existing test suite.

---

## 1. `VERCEL_URL_STALE`

**What**: Vercel deploy URLs in `CLAUDE.md` or `README.md` get stale every push (Vercel uses deployment-hash domains). The actual canonical aliases are `cgs-porter.vercel.app` + `cgs-porter-admin.vercel.app`, so any non-canonical Vercel URL in docs that isn't the latest live one is drift.

**Detection**:
```js
// In run-loop.mjs staticScan()
const docsToScan = ['CLAUDE.md', 'README.md'];
const liveUrls = await fetchLatestVercelProdUrls();
const stale = content.match(/https:\/\/[a-z0-9-]+\.vercel\.app/g)
  .filter((u) => u !== liveUrls.mobile && u !== liveUrls.admin
    && !u.endsWith('cgs-porter.vercel.app')
    && !u.endsWith('cgs-porter-admin.vercel.app'));
```

**Fix**: replace stale URL with the live one. Sourced from `npx vercel ls --prod`.

**Why safe**: just text in markdown docs. No runtime impact.

---

## 2. `IMG_ALT_MISSING`

**What**: `<img src="...">` tags without an `alt` attribute. Bad for a11y; flagged by the audit-website skill.

**Detection**: regex over `.jsx` / `.tsx` files in `src/` and `admin/src/`.

**Fix**: append `alt=""` (decorative — empty alt is the safe default; real descriptive alt is a 🟡 propose).

**Why safe**: empty alt is HTML-spec-compliant for decorative images and never breaks rendering. If the image *is* meaningful and needs descriptive text, the loop won't catch the difference — that's a 🟡 task.

---

## 3. `THEME_COLOR_WRONG`

**What**: PWA expects `<meta name="theme-color" content="#e91e8c">` (CGS magenta). If the value is missing or different, browsers don't tint the address bar.

**Detection**: `qa-smoke.mjs` already checks this — emits `SMOKE_WARN: PWA <meta theme-color>`.

**Fix**: replace the `content` attribute value to `#e91e8c` (the documented CGS brand color). If the meta tag is entirely missing, insert it after `<meta name="viewport">`.

**Why safe**: meta-tag content. No JS, no logic. Visual-only.

**Status**: handler stub — falls through to 🟡 until full HTML parser is wired.

---

## 4. `APPLE_TOUCH_ICON_MISSING`

**What**: `<link rel="apple-touch-icon" href="/icon-180.png">` should be in `index.html`. Without it, iOS Safari uses a screenshot as the home-screen icon (ugly).

**Detection**: `qa-smoke.mjs` checks this — emits `SMOKE_WARN: apple-touch-icon`.

**Fix**: insert the link tag in `<head>` after the manifest link.

**Why safe**: declarative HTML link tag. No runtime side effects.

**Status**: handler stub — same as #3.

---

## 5. `CONSOLE_LOG_LEFT`

**What**: `console.log()` or `console.debug()` left in production code (`src/` or `admin/src/`). Pollutes the browser console for users.

**Detection**: `git grep -n -E 'console\.(log|debug)\s*\('` in `src/` and `admin/src/`. Skip if line is a comment or `console.error` (intentional).

**Fix**: delete the line **only if the entire line is the console call** (standalone, not part of a larger expression). If it's in the middle of an expression chain or a complex statement, skip and let triage classify as 🟡.

**Why safe**: removing a standalone log call cannot change program behavior. It's purely diagnostic output.

**Edge cases**:
- `console.error` is preserved (those are intentional — error handlers).
- Multi-line console calls (`console.log(`...\n...`)`) are skipped (handler returns no-op).

---

## 6. `IMPORT_BROKEN`

**What**: ESLint reports `Unable to resolve path to module` with high confidence — typically a typo in a relative import after a file rename.

**Detection**: parse `eslint --format=json` output, filter rule=`import/no-unresolved` with `severity=2`.

**Fix**: scan the directory of the importing file for a similarly-named file (Levenshtein distance ≤ 2). If exactly one match → rewrite the import. If zero or multiple → skip (🟡).

**Why safe**: only applied when there's a single unambiguous candidate. The build will catch any miss instantly during verify.

**Status**: handler stub — needs ESLint integration.

---

## 7. `WHITESPACE_DRIFT`

**What**: Trailing whitespace on lines, missing newline at EOF.

**Detection**: scan all `.js`, `.jsx`, `.ts`, `.tsx`, `.md` files for `[ \t]+$` per line, or last char ≠ `\n`.

**Fix**: strip trailing whitespace, append final newline.

**Why safe**: pure formatting. Most editors do this anyway — git diff will be clean.

**Note**: only enabled if `.editorconfig` or Prettier config doesn't already enforce — to avoid clashing with existing tooling.

---

## 8. `UNUSED_VAR`

**What**: ESLint `no-unused-vars` with confidence=high (variable declared but never referenced anywhere).

**Detection**: parse `eslint --format=json`, filter rule=`no-unused-vars`, exclude any in files matching `*.test.*` or `*.spec.*`.

**Fix**: remove the declaration line.

**Why safe**: by definition the variable was never read, so removing it can't change runtime behavior. The build verifies the file still compiles.

**Why excluded from tests**: in test files, sometimes you intentionally have unused setup variables (e.g., `const { unmount } = render(...)`).

**Status**: handler stub — needs ESLint integration.

---

## What's deliberately NOT here

The following look like they could be auto-fixed but are 🟡 in this skill:

- **Magic-number extraction** — semantic; needs naming judgment.
- **Adding `key` props to lists** — usually safe, but the wrong key (e.g., index when items reorder) silently breaks React reconciliation.
- **Tailwind class deduplication** — `class="p-4 p-4"` looks safe, but some libraries (cva) generate duplicates intentionally.
- **`useEffect` cleanup functions** — semantic. Wrong cleanup is worse than no cleanup.
- **`async/await` instead of `.then`** — equivalent on paper, but error propagation is subtly different.

If the user wants any of these auto-fixed eventually, it requires a new code, a new handler, and a new test fixture proving it doesn't regress.
