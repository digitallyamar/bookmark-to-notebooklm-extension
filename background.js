console.log('Background service worker loaded');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  if (message.action === 'saveBookmark') {
    const bookmarkData = message.bookmarkData;
    chrome.storage.local.get(['bookmarks'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting bookmarks:', chrome.runtime.lastError.message);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      const bookmarks = result.bookmarks || [];
      bookmarks.push(bookmarkData);
      chrome.storage.local.set({ bookmarks }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error saving bookmarks:', chrome.runtime.lastError.message);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('Bookmarks saved:', bookmarks);
          sendResponse({ success: true });
        }
      });
    });
    return true;
  } else if (message.action === 'submitToNotebookLM') {
    submitBookmarksToNotebookLM();
  }
});

function submitBookmarksToNotebookLM() {
  console.log('Submitting bookmarks to NotebookLM');
  const today = new Date().toISOString().split('T')[0];
  chrome.storage.local.get(['bookmarks'], (result) => {
    if (chrome.runtime.lastError) {
      console.error('Error getting bookmarks for submission:', chrome.runtime.lastError.message);
      return;
    }
    const bookmarks = (result.bookmarks || []).filter(b => b.timestamp.startsWith(today));
    if (bookmarks.length === 0) {
      console.log('No bookmarks for today.');
      return;
    }

    const bookmarksByTag = {};
    bookmarks.forEach(b => {
      b.tags.forEach(tag => {
        if (!bookmarksByTag[tag]) bookmarksByTag[tag] = [];
        bookmarksByTag[tag].push(b.url);
      });
    });

    console.log('Bookmarks by tag:', bookmarksByTag);
    chrome.tabs.create({ url: 'https://notebooklm.google.com' }, (tab) => {
      console.log('Opened NotebookLM tab:', tab.id);
      chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, updatedTab) {
        if (tabId === tab.id && changeInfo.status === 'complete') {
          console.log('NotebookLM tab fully loaded');
          chrome.tabs.onUpdated.removeListener(listener);

          // Retry sending the message up to 3 times with a delay
          let attempts = 0;
          const maxAttempts = 3;
          const retryDelay = 1000; // 1 second

          function trySendMessage() {
            attempts++;
            console.log(`Sending processBookmarks message (attempt ${attempts}/${maxAttempts}) to tab:`, tab.id);
            chrome.tabs.sendMessage(tab.id, { action: 'processBookmarks', bookmarksByTag }, (response) => {
              if (chrome.runtime.lastError) {
                console.error('Error sending message:', chrome.runtime.lastError.message);
                if (attempts < maxAttempts) {
                  console.log(`Retrying in ${retryDelay}ms...`);
                  setTimeout(trySendMessage, retryDelay);
                } else {
                  console.error('Max attempts reached. Could not send message to content script.');
                }
              } else {
                console.log('Message sent to content script, response:', response);
              }
            });
          }

          trySendMessage();
        }
      });
    });
  });
}

chrome.alarms.create('dailySubmission', {
  when: new Date(new Date().setHours(23, 59, 0, 0)).getTime(),
  periodInMinutes: 1440
});

chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('Alarm triggered:', alarm.name);
  if (alarm.name === 'dailySubmission') {
    submitBookmarksToNotebookLM();
  }
});