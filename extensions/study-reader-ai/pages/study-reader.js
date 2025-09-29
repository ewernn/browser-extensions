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
const modelDisplay = document.getElementById('modelDisplay');
const modelPriceInfo = document.getElementById('modelPriceInfo');
const modelCostDisplay = document.getElementById('modelCostDisplay');
const contextWindowSize = document.getElementById('contextWindowSize');

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
  provider: 'openai',
  model: 'gpt-5-nano',  // Default to cheapest overall
  apiKeys: {
    gemini: '',
    openai: '',
    xai: ''
  },
  customPrompt: defaultPrompt,
  contextWindowChars: 0  // Context window size in characters (0 = disabled)
};

// Check if we're running as an extension
const isExtension = typeof browser !== 'undefined' && browser.storage;

// Load settings from storage
async function loadSettings() {
  try {
    if (isExtension) {
      const stored = await browser.storage.local.get(['settings', 'editorContent']);
      if (stored.settings) {
        settings = { ...settings, ...stored.settings };
      }
      if (stored.editorContent) {
        editor.value = stored.editorContent;
        updatePreview();
      }
    } else {
      // Use localStorage as fallback
      const storedSettings = localStorage.getItem('settings');
      if (storedSettings) {
        settings = { ...settings, ...JSON.parse(storedSettings) };
      }
      const storedContent = localStorage.getItem('editorContent');
      if (storedContent) {
        editor.value = storedContent;
        updatePreview();
      }
    }
  } catch (e) {
    console.log('Error loading settings:', e);
  }
}

// Save settings to storage
async function saveSettingsToStorage() {
  try {
    if (isExtension) {
      await browser.storage.local.set({ settings });
    } else {
      localStorage.setItem('settings', JSON.stringify(settings));
    }
  } catch (e) {
    console.log('Could not save settings:', e);
  }
}

// Auto-save editor content
let saveTimeout;
function autoSaveContent() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    try {
      if (isExtension) {
        await browser.storage.local.set({ editorContent: editor.value });
      } else {
        localStorage.setItem('editorContent', editor.value);
      }
    } catch (e) {
      console.log('Could not auto-save content:', e);
    }
  }, 1000);
}

const providers = {
  gemini: {
    name: 'Google Gemini',
    models: [
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', cost100: '~$0.005', costPerM: '$0.10/$0.40 per 1M tokens' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', cost100: '~$0.03', costPerM: '$0.30/$2.50 per 1M tokens' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', cost100: '~$0.11', costPerM: '$1.25/$10.00 per 1M tokens' }
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
      { id: 'gpt-5-nano', name: 'GPT-5 Nano', cost100: '~$0.004', costPerM: '$0.05/$0.40 per 1M tokens' },
      { id: 'gpt-5-mini', name: 'GPT-5 Mini', cost100: '~$0.02', costPerM: '$0.25/$2.00 per 1M tokens' },
      { id: 'gpt-5', name: 'GPT-5', cost100: '~$0.11', costPerM: '$1.25/$10.00 per 1M tokens' }
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
  xai: {
    name: 'xAI Grok',
    models: [
      { id: 'grok-4-fast-non-reasoning', name: 'Grok 4 Fast Non-Reasoning', cost100: '~$0.006', costPerM: '$0.20/$0.50 per 1M tokens' },
      { id: 'grok-4-fast-reasoning', name: 'Grok 4 Fast Reasoning', cost100: '~$0.006', costPerM: '$0.20/$0.50 per 1M tokens' },
      { id: 'grok-4-0709', name: 'Grok 4', cost100: '~$0.17', costPerM: '$3.00/$15.00 per 1M tokens' }
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
  try {
    const provider = providers[providerSelect.value];
    if (!provider) {
      console.error('Provider not found:', providerSelect.value);
      return;
    }
    modelSelect.innerHTML = '';
    provider.models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      // Just show model name in the dropdown
      option.textContent = model.name;
      if (model.id === settings.model) {
        option.selected = true;
      }
      modelSelect.appendChild(option);
    });
    updatePriceInfo();
  } catch (e) {
    console.error('Error updating model select:', e);
  }
}

function updatePriceInfo() {
  const provider = providers[providerSelect.value];
  const selectedModel = provider.models.find(m => m.id === modelSelect.value);

  // Update the cost display next to the Model label
  if (selectedModel && selectedModel.cost100 && modelCostDisplay) {
    modelCostDisplay.textContent = `${selectedModel.cost100} per 100 queries`;
  } else if (modelCostDisplay) {
    modelCostDisplay.textContent = '';
  }

  // Update the per-million cost below the dropdown
  if (selectedModel && selectedModel.costPerM && modelPriceInfo) {
    modelPriceInfo.textContent = `(${selectedModel.costPerM})`;
    modelPriceInfo.style.display = 'block';
  } else if (modelPriceInfo) {
    modelPriceInfo.style.display = 'none';
  }
}

function updateModelDisplay() {
  // Only show model if user has an API key for current provider
  const hasApiKey = settings.apiKeys[settings.provider] && settings.apiKeys[settings.provider].length > 0;

  if (!hasApiKey) {
    modelDisplay.textContent = '';
    return;
  }

  const provider = providers[settings.provider];
  const model = provider.models.find(m => m.id === settings.model);
  if (model) {
    // Show shortened model name
    const shortName = model.name.split(' - ')[0];
    modelDisplay.textContent = shortName;
  } else {
    modelDisplay.textContent = '';
  }
}

// Extract context window around selected text
function getContextWindow(fullText, selectedText, selectionStart, selectionEnd, contextLength) {
  // If context is disabled (0), return empty strings
  if (!contextLength || contextLength <= 0) {
    return { beforeText: '', afterText: '' };
  }

  // Get before context
  const beforeStart = Math.max(0, selectionStart - contextLength);
  let beforeText = fullText.substring(beforeStart, selectionStart);

  // Trim to word boundary if we're not at the start
  if (beforeStart > 0) {
    const firstSpace = beforeText.indexOf(' ');
    if (firstSpace > 0 && firstSpace < 20) {
      beforeText = beforeText.substring(firstSpace + 1);
    }
    beforeText = '...' + beforeText;
  }

  // Get after context
  const afterEnd = Math.min(fullText.length, selectionEnd + contextLength);
  let afterText = fullText.substring(selectionEnd, afterEnd);

  // Trim to word boundary if we're not at the end
  if (afterEnd < fullText.length) {
    const lastSpace = afterText.lastIndexOf(' ');
    if (lastSpace > afterText.length - 20 && lastSpace > 0) {
      afterText = afterText.substring(0, lastSpace);
    }
    afterText = afterText + '...';
  }

  // Normalize line breaks to spaces
  beforeText = beforeText.replace(/\s+/g, ' ').trim();
  afterText = afterText.replace(/\s+/g, ' ').trim();

  return { beforeText, afterText };
}

async function getExplanation(term, contextBefore = '', contextAfter = '') {
  const normalizedTerm = term.trim().toLowerCase();

  // Create a cache key that includes context if provided
  const cacheKey = (contextBefore || contextAfter)
    ? `${normalizedTerm}::${contextBefore}::${contextAfter}`
    : normalizedTerm;

  if (explanations[cacheKey]) {
    return explanations[cacheKey];
  }

  const provider = providers[settings.provider];
  const apiKey = settings.apiKeys[settings.provider];

  if (!apiKey) {
    // Auto-open settings for first-time users
    settingsModal.classList.add('show');
    return `Please set your ${provider.name} API key in Settings (Settings opened automatically)`;
  }

  // Build prompt with or without context
  let prompt;
  if (contextBefore || contextAfter) {
    // Include context in the prompt
    const contextStr = `${contextBefore} [[${term}]] ${contextAfter}`.trim();
    prompt = `Given this context: "${contextStr}"

${settings.customPrompt.replace('{term}', term)}`;
  } else {
    // Simple prompt without context
    prompt = settings.customPrompt.replace('{term}', term);
  }

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
    explanations[cacheKey] = explanation;

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

  if (isExtension) {
    try {
      await browser.storage.local.set({ darkMode: isDark });
    } catch (e) {
      console.log('Error saving dark mode:', e);
    }
  } else {
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
  // Normalize whitespace: newlines/tabs → spaces, multiple spaces → single space
  selectedText = selection.toString().replace(/\s+/g, ' ').trim();

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

  // Debug: Check if selection crosses block boundaries
  const startBlock = range.startContainer.nodeType === Node.TEXT_NODE
    ? range.startContainer.parentElement
    : range.startContainer;
  const endBlock = range.endContainer.nodeType === Node.TEXT_NODE
    ? range.endContainer.parentElement
    : range.endContainer;

  const crossesBlocks = startBlock !== endBlock &&
    (startBlock.tagName !== endBlock.tagName ||
     !startBlock.parentElement ||
     startBlock.parentElement !== endBlock.parentElement);

  console.log('Selection debug:', {
    text: selectedText,
    crossesBlocks,
    startBlock: startBlock.tagName,
    endBlock: endBlock.tagName,
    rangeStart: range.startOffset,
    rangeEnd: range.endOffset
  });

  // Get context if context window is enabled (> 0 characters)
  let contextBefore = '';
  let contextAfter = '';

  if (settings.contextWindowChars > 0) {
    // Normalize both texts the same way to ensure we find the selection
    const fullText = (previewWrapper.textContent || '').replace(/\s+/g, ' ');
    const normalizedSelected = selectedText.replace(/\s+/g, ' ').trim();
    const selectionStart = fullText.indexOf(normalizedSelected);

    console.log('Context debug:', {
      foundAt: selectionStart,
      searchingFor: normalizedSelected.substring(0, 50),
      fullTextLength: fullText.length
    });

    if (selectionStart !== -1) {
      const context = getContextWindow(
        fullText,
        normalizedSelected,
        selectionStart,
        selectionStart + normalizedSelected.length,
        settings.contextWindowChars
      );
      contextBefore = context.beforeText;
      contextAfter = context.afterText;

      console.log('Context extracted:', {
        before: contextBefore.substring(0, 50) + '...',
        after: '...' + contextAfter.substring(contextAfter.length - 50)
      });
    }
  }

  const span = document.createElement('span');
  span.className = 'explained-term';
  span.dataset.term = selectedText.trim().toLowerCase();

  // Handle highlighting based on whether selection crosses blocks
  if (crossesBlocks) {
    console.log('Cross-block selection detected - highlighting first block only');

    // Create a new range for just the first block
    const firstBlockRange = document.createRange();
    firstBlockRange.setStart(range.startContainer, range.startOffset);

    // Find the end of the first block's text content
    let endNode = range.startContainer;
    let endOffset = range.startOffset;

    // Walk through the first block to find its last text node
    const walker = document.createTreeWalker(
      startBlock,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let lastTextNode = null;
    while (walker.nextNode()) {
      lastTextNode = walker.currentNode;
    }

    if (lastTextNode) {
      firstBlockRange.setEnd(lastTextNode, lastTextNode.textContent.length);
    }

    try {
      firstBlockRange.surroundContents(span);
      console.log('Highlighted first block portion successfully');
    } catch(e) {
      console.log('First block highlighting failed, trying simpler approach');
      // Even simpler fallback: just insert marker at start
      span.textContent = '→';
      span.className = 'explained-term explained-marker';
      range.insertNode(span);
    }
  } else {
    // Single block selection - use normal highlighting
    try {
      range.surroundContents(span);
      console.log('Highlighting succeeded with surroundContents');
    } catch(e) {
      console.log('surroundContents failed:', e.message, '- trying fallback');
      try {
        const contents = range.extractContents();
        span.appendChild(contents);
        range.insertNode(span);
        console.log('Highlighting succeeded with fallback method');
      } catch(e2) {
        console.error('Both highlighting methods failed:', e2);
        // Still proceed without highlighting
      }
    }
  }

  window.getSelection().removeAllRanges();

  // Add loading spinner
  const spinner = document.createElement('span');
  spinner.className = 'loading-spinner';
  span.appendChild(spinner);

  // Get explanation with context if enabled
  const explanation = await getExplanation(selectedText, contextBefore, contextAfter);

  // Remove spinner
  if (spinner.parentNode) {
    spinner.remove();
  }

  // Don't update preview - it would destroy the highlighting we just added
  // updatePreview();

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
  console.log('Settings clicked - current settings:', settings);
  console.log('Modal element:', settingsModal);

  apiKeyInput.value = settings.apiKeys[settings.provider] || '';
  providerSelect.value = settings.provider || 'gemini';
  modelSelect.value = settings.model || 'gemini-2.5-flash-lite';
  promptTemplate.value = settings.customPrompt || defaultPrompt;
  contextWindowSize.value = settings.contextWindowChars || 0;
  updateModelSelect();
  updatePriceInfo();
  settingsModal.classList.add('show');

  console.log('Modal classes after adding show:', settingsModal.classList.toString());
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

modelSelect.addEventListener('change', () => {
  updatePriceInfo();
});

resetPrompt.addEventListener('click', () => {
  promptTemplate.value = defaultPrompt;
});

saveSettings.addEventListener('click', async () => {
  settings.provider = providerSelect.value;
  settings.model = modelSelect.value;
  settings.apiKeys[settings.provider] = apiKeyInput.value;
  settings.customPrompt = promptTemplate.value;

  // Parse and validate context window size
  const contextSize = parseInt(contextWindowSize.value) || 0;
  settings.contextWindowChars = Math.min(Math.max(contextSize, 0), 1000); // Clamp between 0-1000

  await saveSettingsToStorage();
  updateModelDisplay();
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
  let darkMode = false;
  if (isExtension) {
    try {
      const stored = await browser.storage.local.get('darkMode');
      darkMode = stored.darkMode === true;
    } catch (e) {
      console.log('Error loading dark mode:', e);
    }
  } else {
    darkMode = localStorage.getItem('darkMode') === 'true';
  }

  if (darkMode) {
    document.body.classList.add('dark');
    darkModeToggle.classList.add('active');
  }

  // Set default content if empty
  if (!editor.value) {
    editor.value = defaultContent;
  }

  updateModelSelect();
  updateModelDisplay();
  updatePreview();
}

// Start the extension
initialize();