console.log('Copy Text Exclude extension loaded!');

let excludeMode = false;
let excludedRanges = [];

// Key handlers for toggle mode
document.addEventListener('keydown', (e) => {
  // Cmd+Shift+E to toggle
  if (e.metaKey && e.shiftKey && e.key === 'e') {
    e.preventDefault();
    excludeMode = !excludeMode;

    if (excludeMode) {
      console.log('Exclude mode ON');
      document.body.style.border = '3px solid #4a90e2';
      document.body.classList.add('exclude-mode-active');
      clearExclusions();
    } else {
      console.log('Exclude mode OFF');
      document.body.style.border = '';
      document.body.classList.remove('exclude-mode-active');
      clearExclusions();
    }
    return;
  }

  // Escape to exit
  if (e.key === 'Escape' && excludeMode) {
    e.preventDefault();
    excludeMode = false;
    document.body.style.border = '';
    document.body.classList.remove('exclude-mode-active');
    clearExclusions();
    return;
  }

  // Intercept Cmd+C
  if (e.metaKey && e.key === 'c' && document.querySelectorAll('.excluded-text').length > 0) {
    e.preventDefault();
    console.log('Copying without excluded text');
    copyWithoutExcluded();
    clearExclusions();
    return false;
  }
});

// Prevent drag behavior
document.addEventListener('dragstart', (e) => {
  if (excludeMode) {
    e.preventDefault();
    return false;
  }
}, true);

// Track selection state
let isMouseDown = false;
let hasMovedMouse = false;

// Prevent link clicks and other default behaviors in exclude mode
document.addEventListener('click', (e) => {
  if (excludeMode) {
    e.preventDefault();
    e.stopPropagation();
    console.log('Prevented click in exclude mode');
    return false;
  }
}, true); // Use capture phase to intercept before link handlers

document.addEventListener('mousedown', (e) => {
  if (!excludeMode) return;

  // Prevent default on links, buttons, etc.
  if (e.target.tagName === 'A' ||
      e.target.closest('a') ||
      e.target.tagName === 'BUTTON' ||
      e.target.closest('button')) {
    e.preventDefault();
    e.stopPropagation();
    console.log('Prevented default on interactive element');
  }

  isMouseDown = true;
  hasMovedMouse = false;
  console.log('Mouse down in exclude mode');
}, true); // Use capture phase

document.addEventListener('mousemove', () => {
  if (!excludeMode || !isMouseDown) return;
  hasMovedMouse = true;
});

document.addEventListener('mouseup', () => {
  if (!excludeMode || !isMouseDown) return;
  isMouseDown = false;

  // Only process if user actually dragged to select
  if (!hasMovedMouse) {
    console.log('Click without drag - ignoring');
    return;
  }

  // IMMEDIATELY capture selection - no setTimeout!
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    console.log('No selection range');
    return;
  }

  if (selection.isCollapsed) {
    console.log('Selection is collapsed');
    return;
  }

  const selectedText = selection.toString();
  if (!selectedText || selectedText.trim().length === 0) {
    console.log('No actual text in selection');
    return;
  }

  console.log('Selected text:', selectedText.substring(0, 50) + '...');

  try {
    const range = selection.getRangeAt(0);

    // Clone the range before modifying
    excludedRanges.push(range.cloneRange());

    // Create marker span
    const span = document.createElement('span');
    span.className = 'excluded-text';
    span.style.cssText = 'text-decoration: line-through !important; opacity: 0.5 !important; background: rgba(255,0,0,0.2) !important;';

    // Try to wrap the selection
    try {
      // For simple selections within a single text node
      range.surroundContents(span);
      console.log('Wrapped with surroundContents');
    } catch (e) {
      // For complex selections spanning multiple elements
      try {
        const contents = range.extractContents();
        span.appendChild(contents);
        range.insertNode(span);
        console.log('Wrapped with extractContents');
      } catch (e2) {
        console.error('Both wrapping methods failed:', e2);
      }
    }

    console.log(`Marked exclusion #${excludedRanges.length}`);

    // Verify it worked
    const markedCount = document.querySelectorAll('.excluded-text').length;
    console.log(`Total marked exclusions on page: ${markedCount}`);

  } catch (err) {
    console.error('Failed to process selection:', err);
  }

  // Clear the selection after processing
  selection.removeAllRanges();
});

function clearExclusions() {
  document.querySelectorAll('.excluded-text').forEach(el => {
    const parent = el.parentNode;
    while (el.firstChild) {
      parent.insertBefore(el.firstChild, el);
    }
    parent.removeChild(el);
  });
  excludedRanges = [];
  console.log('Cleared all exclusions');
}

function copyWithoutExcluded() {
  const selection = window.getSelection();
  const hasSelection = selection.rangeCount > 0 && !selection.isCollapsed;

  let textToCopy = '';
  let sourceDescription = '';

  if (hasSelection) {
    // User has text selected - copy that selection minus any excluded parts within it
    const range = selection.getRangeAt(0);
    const container = document.createElement('div');
    container.appendChild(range.cloneContents());

    // Remove excluded portions from the selection
    const excludedCount = container.querySelectorAll('.excluded-text').length;
    container.querySelectorAll('.excluded-text').forEach(el => {
      console.log('Removing from selection:', el.textContent.substring(0, 30));
      el.remove();
    });

    // CRITICAL FIX: Need to temporarily add container to document for innerText to work
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);
    textToCopy = container.innerText;
    document.body.removeChild(container);

    sourceDescription = `selected text (removed ${excludedCount} exclusions)`;
    console.log(`Extracted text length: ${textToCopy.length}`);

  } else {
    // No selection - copy entire page minus exclusions
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll('.excluded-text').forEach(el => el.remove());
    clone.querySelectorAll('script, style').forEach(el => el.remove()); // Also remove scripts/styles

    // Create a temporary container and add to document
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.appendChild(clone);
    document.body.appendChild(tempDiv);
    textToCopy = tempDiv.innerText;
    document.body.removeChild(tempDiv);

    sourceDescription = 'entire page';
  }

  if (!textToCopy || textToCopy.trim().length === 0) {
    console.error('No text to copy after removing exclusions');
    alert('No text remaining after removing exclusions');
    return;
  }

  const excludedCount = document.querySelectorAll('.excluded-text').length;
  console.log(`Copying ${sourceDescription}: ${textToCopy.length} characters`);
  console.log(`Total exclusions on page: ${excludedCount}`);

  navigator.clipboard.writeText(textToCopy).then(() => {
    console.log('Successfully copied to clipboard');
    // Visual feedback - green flash
    document.body.style.border = '3px solid #4caf50';
    setTimeout(() => {
      document.body.style.border = excludeMode ? '3px solid #4a90e2' : '';
    }, 300);
  }).catch(err => {
    console.error('Failed to copy:', err);
    alert('Copy failed - you may need to grant clipboard permissions');
  });
}