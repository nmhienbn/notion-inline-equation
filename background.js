// background.js - Handle equation conversion commands

const NOTION_URL_PATTERNS = [
  "https://www.notion.so/*",
  "https://notion.so/*",
  "https://*.notion.so/*",
  "https://www.notion.com/*",
  "https://notion.com/*",
  "https://*.notion.com/*",
  "https://*.notion.site/*"
];

async function run(tabId, mode) {
  if (!tabId) return;
  let messageType;
  switch (mode) {
    case "inline":
      messageType = "RUN_INLINE_CONVERT";
      break;
    case "block":
      messageType = "RUN_BLOCK_CONVERT";
      break;
    case "inline_to_block":
      messageType = "RUN_INLINE_TO_BLOCK_CONVERT";
      break;
    default: return;
  }
  try {
    await ensureContentScript(tabId);
    await chrome.tabs.sendMessage(tabId, { t: messageType });
  } catch (e) {
    console.error("[Notion Equation Converter] Could not run mode:", mode, e);
  }
}

async function ensureContentScript(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { t: "PING_EQUATION_CONVERTER" });
    if (response?.ok) return;
  } catch (_) {
    // Content script is not present yet.
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"]
  });

  await chrome.tabs.sendMessage(tabId, { t: "PING_EQUATION_CONVERTER" });
}

// Keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  
  if (command === "convert_inline_equations") {
    run(tab.id, "inline");
  } else if (command === "convert_block_equations") {
    run(tab.id, "block");
  } else if (command === "convert_inline_to_block") {
    run(tab.id, "inline_to_block");
  }
});

// Toolbar button click
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  
  // Get last used mode from storage
  const { lastMode = "inline" } = await chrome.storage.local.get("lastMode");
  run(tab.id, lastMode);
});

// Context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "convert_inline",
    title: "Convert $...$ to inline equations (Mode 1)",
    contexts: ["all"],
    documentUrlPatterns: NOTION_URL_PATTERNS
  });
  
  chrome.contextMenus.create({
    id: "convert_block",
    title: "Convert single-equation blocks (Mode 2)",
    contexts: ["all"],
    documentUrlPatterns: NOTION_URL_PATTERNS
  });

  chrome.contextMenus.create({
    id: "convert_inline_to_block",
    title: "Convert single inline-equation blocks (Mode 3)",
    contexts: ["all"],
    documentUrlPatterns: NOTION_URL_PATTERNS
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  
  if (info.menuItemId === "convert_inline") {
    run(tab.id, "inline");
  } else if (info.menuItemId === "convert_block") {
    run(tab.id, "block");
  } else if (info.menuItemId === "convert_inline_to_block") {
    run(tab.id, "inline_to_block");
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.t !== "RUN_EQUATION_CONVERTER_MODE") return;

  const tabId = message.tabId || sender.tab?.id;
  run(tabId, message.mode)
    .then(() => sendResponse({ ok: true }))
    .catch(error => sendResponse({ ok: false, error: String(error) }));
  return true;
});
