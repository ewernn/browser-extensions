chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
    const currentTab = tabs[0];
    
    switch (command) {
      case "new-tab-right":
        chrome.tabs.create({index: currentTab.index + 1});
        break;
        
      case "move-tab-left":
        if (currentTab.index > 0) {
          chrome.tabs.move(currentTab.id, {index: currentTab.index - 1});
        }
        break;
        
      case "move-tab-right":
        const allTabs = await chrome.tabs.query({currentWindow: true});
        if (currentTab.index < allTabs.length - 1) {
          chrome.tabs.move(currentTab.id, {index: currentTab.index + 1});
        }
        break;
    }
  });
});