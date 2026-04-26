# Dark Reader Minimal — Source

This extension has **no build step**. The submitted package is the source. All
hand-written files (`manifest.json`, `background.js`, `content.js`, `popup.html`,
`popup.js`, `icons/moon.svg`) are plain text and ship as-is. There is no
transpilation, bundling, minification, or template engine on the developer's
side.

The only minified file is `libs/darkreader.js`, which is an **unmodified copy**
of the upstream `darkreader` npm package at version `4.9.120`. See "Reproducing
`libs/darkreader.js`" below.

## Build / reproduce instructions

### Operating system

Any Unix-like environment with `curl` and `shasum` (or `sha256sum`). Verified on
macOS 14+ and Linux. Windows users can use WSL or Git Bash.

### Required programs

- `curl` (any version that supports HTTPS — typically pre-installed)
- `shasum` (macOS / BSD; pre-installed) **or** `sha256sum` (Linux coreutils)
- `zip` (any version; pre-installed on macOS and most Linux distros)

No Node.js, no npm, no bundler, no transpiler.

### Step-by-step

1. Place the contents of this source archive into an empty directory:

       unzip dark-reader-minimal-source-1.1.0.zip -d dark-reader-minimal
       cd dark-reader-minimal

2. Verify the integrity of the vendored Dark Reader bundle:

       shasum -a 256 libs/darkreader.js
       # expected: a81e2470722a9490f4c3cb9b54ca6760f5768b35d17e5f999393cfd4956c8959

3. (Optional) Re-download from upstream to confirm byte-identical match:

       curl -sf https://unpkg.com/darkreader@4.9.120/darkreader.js -o /tmp/darkreader.js
       shasum -a 256 /tmp/darkreader.js libs/darkreader.js
       # both hashes should equal a81e2470722a9490f4c3cb9b54ca6760f5768b35d17e5f999393cfd4956c8959

4. Produce the submission zip:

       zip -r dark-reader-minimal-1.1.0.zip . \
         -x "*.DS_Store" "*.git*" "*.zip" "README.md"

   `README.md` is excluded from the submission zip because it is build-only
   documentation; it is not part of the published extension. The resulting zip
   is byte-equivalent to the uploaded extension package.

5. (Optional) Lint the result with Mozilla's `web-ext` tool:

       npx --yes web-ext lint --source-dir=.

## Reproducing `libs/darkreader.js`

```
curl -sf https://unpkg.com/darkreader@4.9.120/darkreader.js -o libs/darkreader.js
curl -sf https://unpkg.com/darkreader@4.9.120/LICENSE       -o libs/darkreader.LICENSE
shasum -a 256 libs/darkreader.js
# a81e2470722a9490f4c3cb9b54ca6760f5768b35d17e5f999393cfd4956c8959  libs/darkreader.js
```

- Upstream repository: https://github.com/darkreader/darkreader
- npm package: https://www.npmjs.com/package/darkreader
- License: MIT (see `libs/darkreader.LICENSE`)
- Pinned version: `4.9.120`
- File is consumed as-is. Not modified, not re-bundled.

## File inventory

| File                       | Author      | Notes                                             |
|----------------------------|-------------|---------------------------------------------------|
| `manifest.json`            | hand-written| Firefox MV2 manifest                              |
| `background.js`            | hand-written| Non-persistent background script                  |
| `content.js`               | hand-written| Runs at `document_start` in every http(s) tab     |
| `popup.html`               | hand-written| Browser-action popup markup + inline CSS         |
| `popup.js`                 | hand-written| Popup logic                                       |
| `icons/moon.svg`           | hand-written| Toolbar / listing icon                            |
| `icons/icon48.png`         | author      | Legacy raster icon (unused by manifest, retained) |
| `icons/icon96.png`         | author      | Legacy raster icon (unused by manifest, retained) |
| `libs/darkreader.js`       | upstream    | `darkreader@4.9.120`, MIT, unmodified             |
| `libs/darkreader.LICENSE`  | upstream    | MIT license text                                  |
| `SOURCE.md`                | hand-written| Vendoring metadata + upgrade procedure            |
| `README.md`                | hand-written| This file (source-only, excluded from submission) |

## Upgrading `libs/darkreader.js`

```
curl -sf https://unpkg.com/darkreader@<NEW_VERSION>/darkreader.js     -o libs/darkreader.js
curl -sf https://unpkg.com/darkreader@<NEW_VERSION>/LICENSE           -o libs/darkreader.LICENSE
shasum -a 256 libs/darkreader.js
```

Then update `SOURCE.md` and this README with the new version and SHA-256.
