function setupButton(id, mode) {
  document.getElementById(id).addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.runtime.sendMessage({
        t: "RUN_EQUATION_CONVERTER_MODE",
        tabId: tab.id,
        mode
      });
      await chrome.storage.local.set({ lastMode: mode });
    }
    window.close();
  });
}

setupButton('mode1', 'inline');
setupButton('mode2', 'block');
setupButton('mode3', 'inline_to_block');
