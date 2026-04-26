# Source Code & Build Instructions

## Build Environment

- **Operating system:** any (macOS, Linux, Windows)
- **Required tools:** none
- **Node / npm / bundlers:** not used

## Build Steps

There is **no build step**. The submitted `.xpi` / `.zip` is the source tree exactly as present in this repository. No transpilation, no minification, no concatenation, no code generation is performed on the author's code.

To reproduce the submitted package:

```sh
cd study-reader-ai
zip -rq ../study-reader-ai.zip . -x "*.DS_Store" "*/.DS_Store" "SOURCE.md"
```

## Author Source Files (unminified, human-written)

- `manifest.json`
- `background.js`
- `pages/study-reader.html`
- `pages/study-reader.css`
- `pages/study-reader.js`
- `icons/*`

## Third-Party Open-Source Libraries (vendored in `libs/`)

These are unmodified minified distributions from upstream releases. The minified versions are shipped as-is; per AMO policy, minified open-source libraries do not need to be de-minified.

| File | Library | Version | License | Upstream |
|---|---|---|---|---|
| `libs/marked.min.js` | marked | 15.0.12 | MIT | https://github.com/markedjs/marked/releases/tag/v15.0.12 |
| `libs/purify.min.js` | DOMPurify | 3.2.4 | Apache-2.0 / MPL-2.0 | https://github.com/cure53/DOMPurify/releases/tag/3.2.4 |
| `libs/katex.min.js` | KaTeX | latest stable | MIT | https://github.com/KaTeX/KaTeX/releases |
| `libs/katex.min.css` | KaTeX | (matches katex.min.js) | MIT | https://github.com/KaTeX/KaTeX/releases |
| `libs/auto-render.min.js` | KaTeX auto-render | (matches katex.min.js) | MIT | https://github.com/KaTeX/KaTeX/releases |
| `libs/fonts/*.woff2` | KaTeX fonts | (matches katex.min.js) | OFL-1.1 / MIT | https://github.com/KaTeX/KaTeX/releases |

Each library file retains its original copyright/license header verbatim at the top of the minified file. Reviewers can diff byte-for-byte against the tagged upstream release.

## Verification

To verify the submitted build matches this source:
1. Download this source archive and extract it.
2. Run the `zip` command above.
3. Compare the resulting archive's file list and contents to the uploaded `.xpi`.
