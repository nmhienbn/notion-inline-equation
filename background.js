chrome.commands.onCommand.addListener(async c => {
  if (c !== "convert_inline_equations") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { t: "RUN_CONVERT" });
});
