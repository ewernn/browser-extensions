# Study Reader + AI Extension

A Firefox extension that provides AI-powered explanations for any text you select. Works with multiple AI providers including Gemini, OpenAI, Claude, and xAI.

## Features

- 📝 **Markdown editor** with live preview
- 🤖 **AI explanations** - Select any text and get instant explanations
- 🌙 **Dark mode** support
- 📐 **LaTeX math** rendering
- 💾 **Auto-save** - Content persists across sessions
- 🎯 **Focus mode** - Hide editor for distraction-free reading
- ⚡ **Multiple AI providers** - Choose between Gemini, OpenAI, Claude, or xAI
- 🎨 **Custom prompts** - Customize how explanations are generated

## Installation

### For Development (Temporary Install)

1. Open Firefox
2. Navigate to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on..."
5. Navigate to the `study-reader-extension` folder
6. Select the `manifest.json` file
7. The extension is now installed!

### First Time Setup

1. Click the extension icon in your toolbar
2. Click "Open Study Reader"
3. Click the ⚙️ Settings button
4. Enter your API key for your preferred provider:
   - **Gemini**: Get key at [console.cloud.google.com](https://console.cloud.google.com)
   - **OpenAI**: Get key at [platform.openai.com](https://platform.openai.com)
   - **Anthropic**: Get key at [console.anthropic.com](https://console.anthropic.com)
   - **xAI**: Get key at [x.ai/api](https://x.ai/api)
5. Select your preferred model (defaults to cheapest option)
6. Click Save

## How to Use

1. **Paste or type** your study material in the left editor
2. **Select any text** in the right preview panel
3. **Click "Explain"** to get an AI explanation
4. **Hover** over highlighted terms to review explanations

## Customization

### Custom Prompts
- Click Settings ⚙️
- Modify the prompt template
- Use `{term}` as placeholder for selected text
- Examples:
  - "Explain {term} like I'm 5 years old"
  - "What is {term} and how is it used in practice?"
  - "Give me the etymology and history of {term}"

### Keyboard Shortcuts
- Coming soon!

## Privacy

- API keys are stored locally in your browser
- No data is sent anywhere except to your chosen AI provider
- Explanations persist only for the current browser session

## Troubleshooting

### CORS Errors
- Anthropic and OpenAI may show CORS errors when testing locally
- These will work correctly when installed as an extension
- Use Gemini or xAI for testing in development

### Icons Not Showing
- The placeholder icons are just text files
- To create proper icons:
  1. Create 48x48 and 96x96 PNG images
  2. Replace `icons/icon-48.png` and `icons/icon-96.png`

## Development

### Project Structure
```
study-reader-extension/
├── manifest.json        # Extension configuration
├── background.js        # Background script
├── popup/              # Extension popup
├── pages/              # Main application
│   ├── study-reader.html
│   ├── study-reader.css
│   └── study-reader.js
├── libs/               # Local libraries
└── icons/              # Extension icons
```

### Making Changes
1. Edit files in the `pages/` directory
2. Reload extension in `about:debugging`
3. Refresh the Study Reader tab

## Publishing

1. Create proper PNG icons (48x48 and 96x96)
2. Update version in `manifest.json`
3. Zip the extension folder
4. Submit to [addons.mozilla.org](https://addons.mozilla.org)

## License

MIT