document.getElementById('saveBookmark').addEventListener('click', () => {
  const tags = document.getElementById('tags').value.split(',').map(tag => tag.trim());
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) {
      document.getElementById('status').textContent = 'Error: No active tab found';
      return;
    }
    const tab = tabs[0]; // Fixed syntax error: removed extra period
    const bookmarkData = {
      title: tab.title,
      url: tab.url,
      tags: tags,
      timestamp: new Date().toISOString()
    };

    console.log('Sending bookmark data:', bookmarkData);
    chrome.runtime.sendMessage({ action: 'saveBookmark', bookmarkData }, (response) => {
      if (response && response.success) {
        document.getElementById('status').textContent = 'Bookmark saved to storage!';
      } else {
        document.getElementById('status').textContent = 'Error saving bookmark: ' + (response?.error || 'Unknown error');
      }
    });

    if (chrome.bookmarks) {
      chrome.bookmarks.create({
        title: tab.title,
        url: tab.url
      }, (bookmark) => {
        if (chrome.runtime.lastError) {
          console.error('Bookmark creation failed:', chrome.runtime.lastError.message);
          document.getElementById('status').textContent = 'Error saving bookmark: ' + chrome.runtime.lastError.message;
        } else {
          console.log('Bookmark created:', bookmark);
        }
      });
    } else {
      console.error('chrome.bookmarks API is not available');
      document.getElementById('status').textContent = 'Error: Bookmarks API not available';
    }
  });
});

document.getElementById('submitToNotebookLM').addEventListener('click', () => {
  console.log('Sending submitToNotebookLM message');
  chrome.runtime.sendMessage({ action: 'submitToNotebookLM' });
  document.getElementById('status').textContent = 'Submitting to NotebookLM...';
});