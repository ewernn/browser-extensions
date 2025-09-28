# 🧩 Browser Extensions Collection

A collection of useful Firefox/Chrome browser extensions to enhance your browsing experience.

## 📚 Extensions

### [Study Reader + AI](extensions/study-reader-ai/)
AI-powered study assistant that provides instant explanations for any selected text. Supports multiple AI providers (Gemini, OpenAI, Claude, xAI) with customizable prompts.

**Features:**
- 📝 Markdown editor with live preview
- 🤖 Select text → Get AI explanations
- 🌙 Dark mode support
- 📐 LaTeX math rendering

### [Copy Text Exclude](extensions/copy-text-exclude/)
Copy text from webpages while excluding unwanted elements like timestamps, usernames, or other noise.

**Features:**
- 🎯 Smart text selection
- 🚫 Exclude specific elements
- 📋 Clean copy to clipboard

### [New Tab to Right](extensions/new-tab-to-right/)
Always open new tabs to the right of the current tab instead of at the end of the tab bar.

**Features:**
- ➡️ Opens tabs next to current tab
- 🎯 Better tab organization
- ⚡ Lightweight and fast

## 🚀 Installation

### For Development (All Extensions)

1. Clone this repository:
```bash
git clone https://github.com/yourusername/browser-extensions.git
cd browser-extensions
```

2. Load in Firefox:
   - Open Firefox and navigate to `about:debugging`
   - Click "This Firefox"
   - Click "Load Temporary Add-on..."
   - Navigate to `extensions/[extension-name]/`
   - Select the `manifest.json` file

3. Load in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extensions/[extension-name]/` folder

## 📦 Building for Release

Each extension can be packaged individually:

```bash
# Package Study Reader
cd extensions/study-reader-ai
zip -r ../../study-reader-ai.zip . -x "*.git*"

# Package Copy Text Exclude
cd extensions/copy-text-exclude
zip -r ../../copy-text-exclude.zip . -x "*.git*"

# Package New Tab to Right
cd extensions/new-tab-to-right
zip -r ../../new-tab-to-right.zip . -x "*.git*"
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Each extension may have its own license. Check the individual extension folders for details.

## 🔗 Links

- [Firefox Add-ons Store](https://addons.mozilla.org/)
- [Chrome Web Store](https://chrome.google.com/webstore)

## 👤 Author

Your Name
- GitHub: [@yourusername](https://github.com/yourusername)

## ⭐ Show your support

Give a ⭐️ if these extensions helped you!