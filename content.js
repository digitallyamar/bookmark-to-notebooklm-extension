console.log('content.js loaded');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('content.js received message:', message);
  if (message.action === 'processBookmarks') {
    console.log('Processing bookmarks:', message.bookmarksByTag);
    const bookmarksByTag = message.bookmarksByTag;
    createNotebooksAndPodcasts(bookmarksByTag);
    sendResponse({ success: true });
  } else {
    console.log('Unknown message action:', message.action);
  }
  return true;
});

async function waitForElement(selector, timeout = 10000, interval = 500) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const element = document.querySelector(selector);
    if (element) {
      console.log(`Element found: ${selector}`);
      return element;
    }
    console.log(`Element not found yet: ${selector}, waiting...`);
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error(`Timeout: Element ${selector} not found after ${timeout}ms`);
}

async function waitForWebsiteChip(timeout = 10000, interval = 500) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const chips = document.querySelectorAll('span.mdc-evolution-chip__action');
    for (const chip of chips) {
      const label = chip.querySelector('span.mdc-evolution-chip__text-label > span');
      if (label) {
        const labelText = label.textContent.trim();
        console.log(`Found chip with label: ${labelText}`);
        if (labelText.toLowerCase() === 'website') {
          console.log('Website chip identified:', chip);
          return chip;
        }
      }
    }
    console.log('Website chip not found yet, waiting...');
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error('Timeout: Website chip not found after 10000ms');
}

function dispatchClick(element) {
  const clickEvent = new MouseEvent('click', {
    view: window,
    bubbles: true,
    cancelable: true
  });
  element.dispatchEvent(clickEvent);
  console.log('Dispatched click event on element:', element);
}

async function findInsertButton(timeout = 10000, interval = 500) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const buttons = document.querySelectorAll('button.submit-button');
    for (const button of buttons) {
      const label = button.querySelector('span.mdc-button__label');
      if (label && label.textContent.trim() === 'Insert') {
        console.log(`Found Insert button with label "Insert"`);
        return button;
      }
    }
    console.log(`Insert button with label "Insert" not found yet, waiting...`);
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error('Timeout: Insert button with label "Insert" not found after 10000ms');
}

async function findAddSourceButton(timeout = 10000, interval = 500) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const buttons = document.querySelectorAll('button.add-source-button');
    for (const button of buttons) {
      const label = button.querySelector('span.mdc-button__label');
      if (label && label.textContent.trim() === 'Add') {
        console.log(`Found Add Source button with label "Add"`);
        return button;
      }
    }
    console.log(`Add Source button with label "Add" not found yet, waiting...`);
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error('Timeout: Add Source button with label "Add" not found after 10000ms');
}

async function findGenerateButton(timeout = 10000, interval = 500) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const buttons = document.querySelectorAll('button.generate-button');
    for (const button of buttons) {
      const label = button.querySelector('span.mdc-button__label');
      if (label && label.textContent.trim() === 'Generate') {
        console.log(`Found Generate button with label "Generate"`);
        return button;
      }
    }
    console.log(`Generate button with label "Generate" not found yet, waiting...`);
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error('Timeout: Generate button with label "Generate" not found after 10000ms');
}

async function createNotebooksAndPodcasts(bookmarksByTag) {
  console.log('Starting createNotebooksAndPodcasts with:', bookmarksByTag);
  for (const [tag, urls] of Object.entries(bookmarksByTag)) {
    if (!tag || tag.trim() === '') {
      console.log('Skipping empty tag:', tag);
      continue;
    }

    console.log(`Creating notebook for tag: ${tag}`);
    try {
      // For the first URL, create a new notebook
      let isFirstUrl = true;

      for (const url of urls) {
        if (isFirstUrl) {
          // First URL: Create a new notebook
          const newNotebookButton = await waitForElement('button[aria-label="Create new notebook"]');
          console.log('Found New Notebook button, clicking...', newNotebookButton);
          newNotebookButton.click();
          await new Promise(resolve => setTimeout(resolve, 2000));

          const websiteChip = await waitForWebsiteChip();
          console.log('Found Website chip, clicking...', websiteChip);
          websiteChip.click();
          await new Promise(resolve => setTimeout(resolve, 2000));

          isFirstUrl = false; // Mark that we've processed the first URL
        } else {
          // Subsequent URLs: Click the "Add source" button
          const addSourceButton = await findAddSourceButton();
          console.log('Found Add Source button, clicking...', addSourceButton);
          dispatchClick(addSourceButton);
          await new Promise(resolve => setTimeout(resolve, 2000));

          const websiteChip = await waitForWebsiteChip();
          console.log('Found Website chip, clicking...', websiteChip);
          websiteChip.click();
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log(`Adding URL: ${url}`);
        const urlInput = await waitForElement('input[formcontrolname="newUrl"]');
        console.log('Setting URL input value to:', url);
        urlInput.value = url;
        urlInput.dispatchEvent(new Event('input', { bubbles: true }));
        console.log('URL input value set');

        // Wait for Angular to validate the input
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Find the correct Insert button with the label "Insert"
        const insertButton = await findInsertButton();
        console.log('Insert button HTML:', insertButton.innerHTML);

        // Check if the button is disabled
        let isDisabled = insertButton.hasAttribute('disabled') || insertButton.disabled;
        if (isDisabled) {
          console.log('Insert button is disabled, waiting for it to be enabled...');
          let attempts = 0;
          const maxAttempts = 10; // Wait up to 5 seconds
          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500));
            isDisabled = insertButton.hasAttribute('disabled') || insertButton.disabled;
            console.log(`Attempt ${attempts + 1}: Insert button disabled state: ${isDisabled}`);
            if (!isDisabled) {
              console.log('Insert button is now enabled');
              break;
            }
            attempts++;
          }
          if (isDisabled) {
            throw new Error('Insert button remained disabled after waiting');
          }
        } else {
          console.log('Insert button is already enabled');
        }

        console.log('Clicking Insert button...', insertButton);
        dispatchClick(insertButton);

        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Wait 10 seconds after the last URL is submitted to allow NotebookLM to process all URLs
      console.log('Waiting 10 seconds for NotebookLM to process all URLs...');
      await new Promise(resolve => setTimeout(resolve, 10000));

      // After all URLs are inserted, click the Generate button
      const audioOverviewButton = await findGenerateButton();
      console.log('Found Generate button, clicking...', audioOverviewButton);
      dispatchClick(audioOverviewButton);
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      console.error('Error processing tag:', tag, error.message);
      continue;
    }
  }
}