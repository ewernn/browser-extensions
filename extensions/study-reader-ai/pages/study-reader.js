// Study Reader + AI Extension JavaScript

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const previewWrapper = document.getElementById('previewWrapper');
const mainContainer = document.getElementById('mainContainer');
const toggleEditorBtn = document.getElementById('toggleEditor');
const darkModeToggle = document.getElementById('darkModeToggle');
const editorWrapper = document.getElementById('editorWrapper');
const tooltip = document.getElementById('tooltip');
const selectionPopup = document.getElementById('selectionPopup');
const explainBtn = document.getElementById('explainBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');
const providerSelect = document.getElementById('providerSelect');
const modelSelect = document.getElementById('modelSelect');
const apiKeyInput = document.getElementById('apiKeyInput');
const promptTemplate = document.getElementById('promptTemplate');
const resetPrompt = document.getElementById('resetPrompt');
const saveSettings = document.getElementById('saveSettings');
const resizer = document.getElementById('resizer');

// Load explanations from sessionStorage (persists until tab closes)
let explanations = {};
try {
  const stored = sessionStorage.getItem('explanations');
  if (stored) {
    explanations = JSON.parse(stored);
  }
} catch (e) {
  console.log('Could not load explanations from session');
}

let selectedText = '';

// Settings and provider configurations
const defaultPrompt = 'Explain "{term}" in simple terms. Include key points and a brief example if relevant. Keep it concise (under 50 words).';

let settings = {
  provider: 'gemini',
  model: 'gemini-2.5-flash-lite',  // Default to cheapest
  apiKeys: {
    gemini: '',
    openai: '',
    anthropic: '',
    xai: ''
  },
  customPrompt: defaultPrompt
};

// Load settings from browser storage
async function loadSettings() {
  try {
    const stored = await browser.storage.local.get(['settings', 'editorContent']);
    if (stored.settings) {
      settings = { ...settings, ...stored.settings };
    }
    if (stored.editorContent) {
      editor.value = stored.editorContent;
      updatePreview();
    }
  } catch (e) {
    console.log('Using default settings');
  }
}

// Save settings to browser storage
async function saveSettingsToStorage() {
  try {
    await browser.storage.local.set({ settings });
  } catch (e) {
    console.log('Could not save settings');
  }
}

// Auto-save editor content
let saveTimeout;
function autoSaveContent() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    try {
      await browser.storage.local.set({ editorContent: editor.value });
    } catch (e) {
      console.log('Could not auto-save content');
    }
  }, 1000);
}

const providers = {
  gemini: {
    name: 'Google Gemini',
    models: [
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite - Most cost-effective' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash - Best price-performance' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro - Latest thinking model' }
    ],
    getUrl: (model, key) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    buildRequest: (prompt) => ({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 150
        }
      })
    }),
    parseResponse: (data) => data.candidates[0].content.parts[0].text
  },
  openai: {
    name: 'OpenAI',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini - Cheapest' },
      { id: 'gpt-4o', name: 'GPT-4o - Standard' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo - Most capable' }
    ],
    getUrl: () => 'https://api.openai.com/v1/chat/completions',
    buildRequest: (prompt, model, key) => ({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: 150,  // Updated for OpenAI
        temperature: 0.7
      })
    }),
    parseResponse: (data) => data.choices[0].message.content
  },
  anthropic: {
    name: 'Anthropic Claude',
    models: [
      { id: 'claude-3.5-haiku-20241022', name: 'Claude 3.5 Haiku - Fastest/cheapest' },
      { id: 'claude-3.5-sonnet-20241022', name: 'Claude 3.5 Sonnet - Balanced' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus - Most powerful' }
    ],
    getUrl: () => 'https://api.anthropic.com/v1/messages',
    buildRequest: (prompt, model, key) => ({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,  // Anthropic still uses max_tokens
        temperature: 0.7
      })
    }),
    parseResponse: (data) => data.content[0].text
  },
  xai: {
    name: 'xAI Grok',
    models: [
      { id: 'grok-beta', name: 'Grok Beta - Free/cheapest' },
      { id: 'grok-2-mini', name: 'Grok 2 Mini - Efficient' },
      { id: 'grok-2', name: 'Grok 2 - Full capability' }
    ],
    getUrl: () => 'https://api.x.ai/v1/chat/completions',
    buildRequest: (prompt, model, key) => ({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: 150,  // Updated for OpenAI
        temperature: 0.7
      })
    }),
    parseResponse: (data) => data.choices[0].message.content
  }
};

function updateModelSelect() {
  const provider = providers[providerSelect.value];
  modelSelect.innerHTML = '';
  provider.models.forEach(model => {
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = model.name;
    if (model.id === settings.model) {
      option.selected = true;
    }
    modelSelect.appendChild(option);
  });
}

async function getExplanation(term) {
  const normalizedTerm = term.trim().toLowerCase();

  if (explanations[normalizedTerm]) {
    return explanations[normalizedTerm];
  }

  const provider = providers[settings.provider];
  const apiKey = settings.apiKeys[settings.provider];

  if (!apiKey) {
    // Auto-open settings for first-time users
    settingsModal.classList.add('show');
    return `Please set your ${provider.name} API key in Settings (Settings opened automatically)`;
  }

  // Replace {term} in prompt template
  const prompt = settings.customPrompt.replace('{term}', term);

  try {
    let url, requestOptions;

    if (settings.provider === 'gemini') {
      url = provider.getUrl(settings.model, apiKey);
      requestOptions = provider.buildRequest(prompt);
    } else {
      url = provider.getUrl();
      requestOptions = provider.buildRequest(prompt, settings.model, apiKey);
    }

    const response = await fetch(url, requestOptions);
    const data = await response.json();

    if (data.error) {
      return `Error: ${data.error.message || data.error}`;
    }

    const explanation = provider.parseResponse(data);
    explanations[normalizedTerm] = explanation;

    // Save to sessionStorage
    try {
      sessionStorage.setItem('explanations', JSON.stringify(explanations));
    } catch (e) {
      console.log('Could not save explanations to session');
    }

    return explanation;
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

function updatePreview() {
  let content = editor.value;

  // Parse markdown first
  preview.innerHTML = marked.parse(content);

  // Then render LaTeX math
  renderMathInElement(preview, {
    delimiters: [
      {left: '$$', right: '$$', display: true},
      {left: '$', right: '$', display: false},
      {left: '\\[', right: '\\]', display: true},
      {left: '\\(', right: '\\)', display: false}
    ],
    throwOnError: false,
    trust: true
  });

  // Finally, add explained terms after math is rendered
  if (Object.keys(explanations).length > 0) {
    const walker = document.createTreeWalker(
      preview,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const textNodes = [];
    while (walker.nextNode()) {
      // Skip text inside code or script tags
      if (walker.currentNode.parentElement.tagName !== 'CODE' &&
          walker.currentNode.parentElement.tagName !== 'SCRIPT' &&
          !walker.currentNode.parentElement.closest('.katex')) {
        textNodes.push(walker.currentNode);
      }
    }

    textNodes.forEach(node => {
      let text = node.textContent;
      let hasMatch = false;

      Object.keys(explanations).forEach(term => {
        const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        if (regex.test(text)) {
          hasMatch = true;
          text = text.replace(regex, `<span class="explained-term" data-term="${term}">$&</span>`);
        }
      });

      if (hasMatch) {
        const span = document.createElement('span');
        span.innerHTML = text;
        node.parentNode.replaceChild(span, node);
      }
    });
  }

  // Add hover handlers for explained terms
  preview.querySelectorAll('.explained-term').forEach(span => {
    span.addEventListener('mouseenter', (e) => {
      const term = e.target.dataset.term;
      const explanation = explanations[term];
      if (explanation) {
        showTooltip(e.target, explanation);
      }
    });

    span.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
    });
  });
}

function showTooltip(element, text) {
  tooltip.innerHTML = marked.parse(text);

  // Render LaTeX in tooltip
  renderMathInElement(tooltip, {
    delimiters: [
      {left: '$$', right: '$$', display: true},
      {left: '$', right: '$', display: false}
    ],
    throwOnError: false
  });

  tooltip.style.display = 'block';

  const rect = element.getBoundingClientRect();
  tooltip.style.left = rect.left + 'px';
  tooltip.style.top = (rect.top - tooltip.offsetHeight - 8) + 'px';
}

// Editor
editor.addEventListener('input', () => {
  updatePreview();
  autoSaveContent();
});

// Toggle editor
toggleEditorBtn.addEventListener('click', () => {
  editorWrapper.classList.toggle('hidden');
});

// Dark mode toggle
darkModeToggle.addEventListener('click', async () => {
  document.body.classList.toggle('dark');
  darkModeToggle.classList.toggle('active');
  const isDark = document.body.classList.contains('dark');

  try {
    await browser.storage.local.set({ darkMode: isDark });
  } catch (e) {
    localStorage.setItem('darkMode', isDark);
  }
});

// Resizer functionality
let isResizing = false;
let startX = 0;
let startWidthLeft = 0;

resizer.addEventListener('mousedown', (e) => {
  isResizing = true;
  startX = e.clientX;
  startWidthLeft = editorWrapper.offsetWidth;
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (!isResizing) return;

  const deltaX = e.clientX - startX;
  const containerWidth = mainContainer.offsetWidth;
  const newWidthLeft = startWidthLeft + deltaX;

  // Limit the resize to reasonable bounds (20% to 80%)
  const minWidth = containerWidth * 0.2;
  const maxWidth = containerWidth * 0.8;

  if (newWidthLeft >= minWidth && newWidthLeft <= maxWidth) {
    const percentage = (newWidthLeft / containerWidth) * 100;
    editorWrapper.style.width = percentage + '%';
  }
});

document.addEventListener('mouseup', () => {
  isResizing = false;
  document.body.style.cursor = 'default';
  document.body.style.userSelect = 'auto';
});

// Text selection
preview.addEventListener('mouseup', (e) => {
  const selection = window.getSelection();
  selectedText = selection.toString().trim();

  if (selectedText && selectedText.length > 0) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    selectionPopup.style.display = 'block';
    selectionPopup.style.left = rect.left + (rect.width / 2) - 40 + 'px';
    selectionPopup.style.top = rect.top - 40 + 'px';
  } else {
    selectionPopup.style.display = 'none';
  }
});

// Explain button
explainBtn.addEventListener('click', async () => {
  if (!selectedText) return;

  selectionPopup.style.display = 'none';

  const selection = window.getSelection();
  const range = selection.getRangeAt(0);

  const span = document.createElement('span');
  span.className = 'explained-term';
  span.dataset.term = selectedText.trim().toLowerCase();

  try {
    range.surroundContents(span);
  } catch(e) {
    const contents = range.extractContents();
    span.appendChild(contents);
    range.insertNode(span);
  }

  window.getSelection().removeAllRanges();

  // Add loading spinner
  const spinner = document.createElement('span');
  spinner.className = 'loading-spinner';
  span.appendChild(spinner);

  // Get explanation
  const explanation = await getExplanation(selectedText);

  // Remove spinner
  if (spinner.parentNode) {
    spinner.remove();
  }

  // Update preview to show all highlighted terms
  updatePreview();

  // Add hover handlers
  span.addEventListener('mouseenter', (e) => {
    if (explanation) {
      showTooltip(e.target, explanation);
    }
  });

  span.addEventListener('mouseleave', () => {
    tooltip.style.display = 'none';
  });
});

// Hide selection popup on outside click
document.addEventListener('click', (e) => {
  if (!selectionPopup.contains(e.target) && !preview.contains(e.target)) {
    selectionPopup.style.display = 'none';
  }
});

// Hide tooltip on scroll
previewWrapper.addEventListener('scroll', () => {
  tooltip.style.display = 'none';
});

// Settings modal
settingsBtn.addEventListener('click', () => {
  apiKeyInput.value = settings.apiKeys[settings.provider];
  providerSelect.value = settings.provider;
  modelSelect.value = settings.model;
  promptTemplate.value = settings.customPrompt;
  updateModelSelect();
  settingsModal.classList.add('show');
});

closeSettings.addEventListener('click', () => {
  settingsModal.classList.remove('show');
});

settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    settingsModal.classList.remove('show');
  }
});

providerSelect.addEventListener('change', () => {
  updateModelSelect();
  apiKeyInput.value = settings.apiKeys[providerSelect.value] || '';
});

resetPrompt.addEventListener('click', () => {
  promptTemplate.value = defaultPrompt;
});

saveSettings.addEventListener('click', async () => {
  settings.provider = providerSelect.value;
  settings.model = modelSelect.value;
  settings.apiKeys[settings.provider] = apiKeyInput.value;
  settings.customPrompt = promptTemplate.value;

  await saveSettingsToStorage();
  settingsModal.classList.remove('show');
});

// Initial content
const defaultContent = `# Study Reader + AI

## Quick Start

**Copy and paste your study material here** — articles, notes, papers, or any text you want to understand better.

## How It Works

1. **Paste your content** in this editor (left side)
2. **Select any text** in the preview (right side)
3. **Click "Explain"** to get AI-powered explanations
4. **Hover over highlighted terms** to review explanations

## Features

- **Focus Mode**: Click the 📝 button to hide this editor
- **Dark Mode**: Toggle the switch in the top right
- **AI Providers**: Click ⚙️ to choose between Gemini, OpenAI, Claude, or xAI
- **Custom Prompts**: Modify how explanations are generated

## Example Text to Try

The mitochondria is the powerhouse of the cell, responsible for producing ATP through cellular respiration. This process involves glycolysis, the Krebs cycle, and the electron transport chain.

## Math Support

Supports LaTeX equations: $E = mc^2$ and $$\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$

---

**Start by pasting your study material here!**`;

// Initialize on load
async function initialize() {
  await loadSettings();

  // Load dark mode preference
  try {
    const stored = await browser.storage.local.get('darkMode');
    if (stored.darkMode) {
      document.body.classList.add('dark');
      darkModeToggle.classList.add('active');
    }
  } catch (e) {
    // Fallback to localStorage for testing
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
      document.body.classList.add('dark');
      darkModeToggle.classList.add('active');
    }
  }

  // Set default content if empty
  if (!editor.value) {
    editor.value = defaultContent;
  }

  updateModelSelect();
  updatePreview();
}

// Start the extension
initialize();