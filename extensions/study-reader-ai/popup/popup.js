document.getElementById('openReader').addEventListener('click', () => {
  browser.tabs.create({
    url: browser.runtime.getURL('pages/study-reader.html')
  });
  window.close();
});