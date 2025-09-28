// Open Study Reader when extension icon is clicked
browser.browserAction.onClicked.addListener(() => {
  browser.tabs.create({
    url: browser.runtime.getURL('pages/study-reader.html')
  });
});

// Handle messages from the study reader page
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openTab') {
    browser.tabs.create({ url: browser.runtime.getURL('pages/study-reader.html') });
  }
  return true;
});