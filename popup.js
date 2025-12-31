function setupButton(id, message, mode) {
  document.getElementById(id).addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { t: message });
      await chrome.storage.local.set({ lastMode: mode });
    }
    window.close();
  });
}

setupButton('mode1', 'RUN_INLINE_CONVERT', 'inline');
setupButton('mode2', 'RUN_BLOCK_CONVERT', 'block');
setupButton('mode3', 'RUN_INLINE_TO_BLOCK_CONVERT', 'inline_to_block');