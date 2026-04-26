# Source Code & Build Instructions

## Build Environment
- **OS:** any
- **Tools required:** none (no Node, npm, or bundlers)

## Build Steps
There is no build step. The submitted package is the source tree exactly as present. No transpilation, minification, concatenation, or code generation.

To reproduce the uploaded package:
```sh
cd site-blocker-permissionless
zip -rq ../site-blocker-permissionless.zip . -x "*.DS_Store" "*/.DS_Store" "SOURCE.md"
```

## Source Files (all author-written, unminified)
- `manifest.json`
- `popup.html`
- `popup.js`
- `icon.svg`

## Third-Party Libraries
None. The extension has no dependencies.
