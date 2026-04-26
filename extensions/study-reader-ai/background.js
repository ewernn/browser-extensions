console.log("Study Reader background script loaded");

browser.browserAction.onClicked.addListener(async (tab) => {
  console.log("Extension icon clicked");
  browser.tabs.create({
    url: browser.runtime.getURL("pages/study-reader.html"),
    index: tab.index + 1,
  });
});
