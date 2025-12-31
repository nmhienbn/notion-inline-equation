// content.js - Two modes: inline and block conversion

const ROOTS = [".notion-page-content", ".notion-frame", "main", "body"];
const HUD_Z = 2147483646;
const STEP_DELAY = 20;

const sleep = ms => new Promise(r => setTimeout(r, ms));

const isEditable = el => !!el && (el.getAttribute("contenteditable") === "true" || el.isContentEditable);
const isCodeCtx = el => el.closest?.(".notion-code-block, pre, code");
const isMathAlready = el => el.closest?.(".notion-equation, .katex");

// Hotkey detector
function isInlineEqHotkey(e) {
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
  return e.key === "E" && e.shiftKey && (isMac ? e.metaKey : e.ctrlKey) && !e.altKey;
}

// ==================== MODE 1: INLINE CONVERSION ====================

// Collect text nodes containing $
function* textNodes(root) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (!n.nodeValue || n.nodeValue.indexOf("$") === -1) return NodeFilter.FILTER_REJECT;
      if (!n.parentElement) return NodeFilter.FILTER_REJECT;
      if (!isEditable(n.parentElement)) return NodeFilter.FILTER_REJECT;
      if (isCodeCtx(n.parentElement)) return NodeFilter.FILTER_REJECT;
      if (isMathAlready(n.parentElement)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  let cur; while ((cur = w.nextNode())) yield cur;
}

// Find $...$ / $$...$$ (with \$ escape)
function findDollarSpans(text) {
  const spans = [];
  const n = text.length;
  let i = 0;
  while (i < n) {
    let open = -1, dbl = false;
    for (let j = i; j < n; j++) {
      if (text[j] === "\\") { j++; continue; }
      if (text[j] === "$") { dbl = (j + 1 < n && text[j + 1] === "$"); open = j; break; }
    }
    if (open === -1) break;
    const openLen = dbl ? 2 : 1;

    let k = open + openLen, close = -1;
    for (; k < n; k++) {
      if (text[k] === "\\") { k++; continue; }
      if (text[k] === "$") {
        if (dbl) { if (k + 1 < n && text[k + 1] === "$") { close = k + 2; break; } }
        else { close = k + 1; break; }
      }
    }
    if (close === -1) { i = open + 1; continue; }

    const innerStart = open + openLen;
    const innerEnd = close - (dbl ? 2 : 1);
    if (innerEnd > innerStart) spans.push({ open, innerStart, innerEnd, close, dbl });
    i = close;
  }
  return spans;
}

// HUD
function makeHUD(mode) {
  let hud = document.getElementById("eq-hud");
  if (hud) {
    updateHUDText(hud, mode);
    return hud;
  }
  hud = document.createElement("div");
  hud.id = "eq-hud";
  Object.assign(hud.style, {
    position: "fixed", top: "8px", right: "8px",
    background: "rgba(20,20,20,0.9)", color: "#fff",
    font: "12px system-ui, sans-serif", padding: "8px 10px",
    borderRadius: "8px", zIndex: String(HUD_Z), pointerEvents: "none",
    boxShadow: "0 2px 12px rgba(0,0,0,0.3)", maxWidth: "360px", lineHeight: "1.4"
  });
  updateHUDText(hud, mode);
  document.documentElement.appendChild(hud);
  return hud;
}

function updateHUDText(hud, mode) {
  if (mode === "block") {
    hud.innerHTML =
      "<b>Block Conversion (Mode 2)</b><br/>" +
      "Converting `$$...$$` blocks to block equations...<br/>" +
      "<b>ESC</b> to stop";
  } else if (mode === "inline-to-block") {
    hud.innerHTML =
      "<b>Inline-to-Block (Mode 3)</b><br/>" +
      "Converting single inline equations to block equations...<br/>" +
      "<b>ESC</b> to stop";
  } else {
    hud.innerHTML =
      "<b>Inline Equation Mode</b><br/>" +
      "Press <b>Cmd/Ctrl+Shift+E</b> to convert. Auto-advances.<br/>" +
      "<b>B</b> back • <b>ESC</b> exit";
  }
}

const showHUD = (mode) => {
  const hud = makeHUD(mode);
  hud.style.display = "block";
};
const hideHUD = () => { 
  const h = document.getElementById("eq-hud"); 
  if (h) h.style.display = "none"; 
};

function highlightSelection(range) {
  let box = document.getElementById("eq-box");
  if (!box) {
    box = document.createElement("div");
    box.id = "eq-box";
    Object.assign(box.style, {
      position: "fixed", border: "2px solid #3fb950", borderRadius: "4px",
      background: "transparent", zIndex: String(HUD_Z), pointerEvents: "none"
    });
    document.documentElement.appendChild(box);
  }
  const rects = range.getClientRects();
  if (!rects.length) { box.style.display = "none"; return; }
  const r = rects[0];
  Object.assign(box.style, {
    left: `${r.left - 2}px`, top: `${r.top - 2}px`,
    width: `${r.width + 4}px`, height: `${r.height + 4}px`, display: "block"
  });
}
const hideHighlight = () => { 
  const b = document.getElementById("eq-box"); 
  if (b) b.style.display = "none"; 
};

// Selection helpers
function focusEditableFrom(node) {
  let el = node.parentElement;
  while (el && !isEditable(el)) el = el.parentElement;
  if (el) el.focus({ preventScroll: true });
  return el;
}

function setSelectionInTextNode(node, start, end) {
  const sel = window.getSelection();
  const r = document.createRange();
  r.setStart(node, start);
  r.setEnd(node, end);
  sel.removeAllRanges();
  sel.addRange(r);
  return r;
}

async function deleteSelection() {
  document.execCommand?.("delete");
  const a = document.activeElement;
  a?.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, inputType: "deleteContent" }));
  await sleep(STEP_DELAY);
}

// Build items for inline mode
function collectInlineItems() {
  const blocks = new Set();
  const roots = new Set();
  for (const s of ROOTS) document.querySelectorAll(s).forEach(n => roots.add(n));
  if (!roots.size) roots.add(document.body);

  for (const root of roots) {
    for (const tn of textNodes(root)) {
      blocks.add(tn.parentElement);
    }
  }
  return Array.from(blocks).map(block => ({ block }));
}

// Guide state for inline mode
let guide = null;

function stopGuide() {
  if (!guide) return;
  hideHUD(); 
  hideHighlight();
  window.removeEventListener("keydown", onKeyInline, true);
  if (guide.mo) { guide.mo.disconnect(); guide.mo = null; }
  guide = null;
}

async function goStepInline(delta) {
  if (!guide) return;
  const { items } = guide;
  
  let i = guide.index;
  if (i < 0) i = 0;
  
  const direction = delta >= 0 ? 1 : -1;
  let found = null;

  while (i >= 0 && i < items.length) {
    const block = items[i].block;
    for (const tn of textNodes(block)) {
      const spans = findDollarSpans(tn.nodeValue);
      if (spans.length > 0) {
        found = { tn, span: spans[0] };
        break;
      }
    }
    if (found) break;
    i += direction;
  }

  if (!found) { stopGuide(); return; }
  
  guide.index = i;
  const { tn, span: s } = found;

  const ed = focusEditableFrom(tn);
  if (!ed) {
    return goStepInline(direction);
  }

  setSelectionInTextNode(tn, s.innerEnd, s.close);
  await deleteSelection();

  setSelectionInTextNode(tn, s.open, s.innerStart);
  await deleteSelection();

  const innerLen = s.innerEnd - s.innerStart;
  const r = setSelectionInTextNode(tn, s.open, s.open + innerLen);
  highlightSelection(r);
  showHUD("inline");

  armAutoAdvanceInline();
}

function armAutoAdvanceInline() {
  if (!guide) return;

  function selectionInsideEquation() {
    const sel = window.getSelection();
    const node = sel && sel.anchorNode ? (sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode) : null;
    return node && (node.closest(".notion-equation") || node.closest(".katex"));
  }

  if (guide.mo) { guide.mo.disconnect(); guide.mo = null; }
  let rafId = null;
  let doneClickedOnce = false;
  let hotkeyDispatched = false;

  guide.mo = new MutationObserver(() => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(async () => {
      if (!guide) return;

      const dlg = findEquationDialog();
      if (dlg && !doneClickedOnce) {
        const ok = await autoClickDialogDone(dlg);
        if (ok) {
          doneClickedOnce = true;
          setTimeout(() => {
            if (guide) {
              goStepInline(+1);
            }
          }, 60);
          return;
        }
      }

      if (selectionInsideEquation()) {
        setTimeout(() => { 
          if (guide) {
            goStepInline(+1); 
          }
        }, 40);
      }
    });
  });

  guide.mo.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true
  });

  if (!hotkeyDispatched) {
    hotkeyDispatched = true;
    setTimeout(() => {
      dispatchInlineEquationHotkey();
    }, 150);
  }
}

function dispatchInlineEquationHotkey() {
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
  let focused = document.activeElement;
  
  if (focused?.shadowRoot) {
    focused = focused.shadowRoot.activeElement || focused;
  }
  
  if (!focused || !isEditable(focused)) {
    focused = document.querySelector('[contenteditable="true"]') || focused;
  }
  
  if (!focused) return;
  
  const keydownEvent = new KeyboardEvent('keydown', {
    key: 'E',
    code: 'KeyE',
    keyCode: 69,
    which: 69,
    shiftKey: true,
    metaKey: isMac,
    ctrlKey: !isMac,
    bubbles: true,
    cancelable: true,
    composed: true
  });
  
  focused.dispatchEvent(keydownEvent);
}

function findEquationDialog() {
  const editor = document.querySelector('div[role="dialog"] [contenteditable="true"][data-content-editable-leaf="true"]');
  return editor ? editor.closest('div[role="dialog"]') : null;
}

async function autoClickDialogDone(dialogEl) {
  if (!dialogEl) return false;

  let btn = dialogEl.querySelector('div[role="button"]');
  if (btn && btn.textContent && btn.textContent.trim().toLowerCase().startsWith('done')) {
    // good
  } else {
    btn = Array.from(dialogEl.querySelectorAll('div[role="button"]'))
      .find(b => (b.textContent || '').trim().toLowerCase() === 'done');
    if (!btn) btn = dialogEl.querySelector('div[role="button"] .enter')?.closest('div[role="button"]') || null;
  }

  if (!btn) return false;

  await new Promise(r => setTimeout(r, 20));
  btn.click();
  return true;
}

function onKeyInline(e) {
  if (!guide) return;

  if (isInlineEqHotkey(e)) {
    return;
  }

  const t = e.target;
  if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;

  if (e.key === "Escape") {
    e.preventDefault(); stopGuide();
  } else if ((e.key === "b" || e.key === "B") && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault(); goStepInline(-1);
  }
}

async function runInlineMode() {
  const items = collectInlineItems();
  if (!items.length) {
    console.log('[Inline Mode] No $...$ found');
    return;
  }
  guide = {
    items,
    index: -1,
    mo: null
  };
  window.addEventListener("keydown", onKeyInline, true);
  await goStepInline(+1);
}

// ==================== MODE 2: BLOCK CONVERSION ====================

// Find blocks that contain ONLY a single equation ($$...$$)
function collectBlockEquationItems() {
  const items = [];
  const roots = new Set();
  for (const s of ROOTS) document.querySelectorAll(s).forEach(n => roots.add(n));
  if (!roots.size) roots.add(document.body);

  for (const root of roots) {
    // Find all text blocks
    const blocks = root.querySelectorAll('[contenteditable="true"]');
    
    for (const block of blocks) {
      if (isCodeCtx(block)) continue;
      if (isMathAlready(block)) continue;
      
      const text = block.textContent?.trim() || "";
      
      // Check if block contains ONLY $$...$$ (display equation)
      const match = /^\$\$(.+?)\$\$$/.exec(text);
      if (match && match[0] === text) {
        items.push({ 
          block, 
          equation: match[1].trim(),
          originalText: text
        });
      }
    }
  }
  
  return items;
}

// ==================== MODE 3: INLINE-TO-BLOCK CONVERSION ====================

// Find blocks that contain ONLY a single Notion inline equation
function collectInlineToBlockItems() {
  const items = [];
  const roots = new Set();
  for (const s of ROOTS) document.querySelectorAll(s).forEach(n => roots.add(n));
  if (!roots.size) roots.add(document.body);

  for (const root of roots) {
    const blocks = root.querySelectorAll('[contenteditable="true"]');
    console.log(`[Mode 3] Checking ${blocks.length} editable blocks`);
    
    for (const block of blocks) {
      if (isCodeCtx(block)) continue;
      if (isMathAlready(block)) continue;

      

      // Debug: log blocks that might contain equations
      const text = block.textContent?.trim() || '';
      if (text.length > 0 && text.length < 200) {
        const hasKatex = block.querySelector('.katex, .katex-html, [class*="equation"]');
        if (hasKatex) {
          console.log(`[Mode 3] Block with potential equation:`, {
            text: text.substring(0, 100),
            html: block.innerHTML.substring(0, 300),
            classes: Array.from(block.querySelectorAll('[class*="equation"], .katex, .katex-html')).map(el => el.className)
          });
        }
      }

      // Look for Notion's inline equation wrapper (updated selector for new Notion)
      const inlineEqs = block.querySelectorAll('.notion-text-equation-token, .notion-equation-inline');
      if (inlineEqs.length === 0) continue;
      
      console.log(`[Mode 3] Found block with ${inlineEqs.length} inline equations`);

      // Check if there is other text content
      const clone = block.cloneNode(true);
      // Remove ALL inline equations
      clone.querySelectorAll('.notion-text-equation-token, .notion-equation-inline').forEach(eq => eq.remove());
      
      const remainingText = clone.textContent?.trim() || '';
      console.log(`[Mode 3] Remaining text after removing equations: "${remainingText}"`);
      
      // If text remains (other than whitespace), skip
      if (remainingText.length > 0) {
        console.log(`[Mode 3] Skipping block because it has other text`);
        continue;
      }

      // Extract LaTeX from annotation
      const annotation = inlineEqs[0].querySelector('annotation');
      console.log(`[Mode 3] Annotation found:`, !!annotation, annotation?.textContent);
      
      if (annotation && annotation.textContent) {
        console.log(`[Mode 3] Adding item with equation: ${annotation.textContent}`);
        items.push({ 
          block, 
          equation: annotation.textContent, 
          originalText: "Inline Equation" 
        });
      }
    }
  }
  
  console.log(`[Mode 3] Total items collected: ${items.length}`);
  return items;
}

let activeBlockGuide = null;

function stopActiveBlockGuide() {
  if (!activeBlockGuide) return;
  hideHUD();
  hideHighlight();
  activeBlockGuide = null;
}

async function convertBlockToEquation(item) {
  const { block, equation } = item;
  
  // Focus the block
  block.focus({ preventScroll: true });
  await sleep(50);
  
  // Select all text in block
  const range = document.createRange();
  range.selectNodeContents(block);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  
  highlightSelection(range);
  await sleep(60);
  
  // Delete content
  range.deleteContents(); // More reliable than execCommand
  await sleep(60);
  
  // Type /equation
  document.execCommand("insertText", false, "/equation");
  await sleep(250);
  
  // Press Enter to create equation block
  block.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true
  }));
  
  await sleep(400);
  
  // Find the equation input field
  const eqInput = document.querySelector('div[role="dialog"] [contenteditable="true"][data-content-editable-leaf="true"]');
  if (eqInput) {
    eqInput.focus();
    await sleep(60);
    
    // Insert equation
    document.execCommand("insertText", false, equation);
    await sleep(120);
    
    // Click Done or press Enter
    const doneBtn = findEquationDialog()?.querySelector('div[role="button"]');
    if (doneBtn && (doneBtn.textContent || '').toLowerCase().includes('done')) {
      doneBtn.click();
    } else {
      eqInput.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
      }));
    }
  }
  
  hideHighlight();
}

async function runGenericBlockMode(mode, itemCollector, modeName) {
  const items = itemCollector();
  
  if (!items.length) {
    console.log(`[${modeName}] No matching blocks found`);
    return;
  }
  
  console.log(`[${modeName}] Found ${items.length} blocks to convert`);
  
  activeBlockGuide = { items, currentIndex: 0, mode };
  showHUD(mode);
  
  // Process all blocks sequentially
  try {
    for (let i = 0; i < items.length; i++) {
      if (!activeBlockGuide) break; // User pressed ESC
      
      activeBlockGuide.currentIndex = i;
      try {
        await convertBlockToEquation(items[i]);
      } catch (e) {
        console.error(`[${modeName}] Error converting item ${i}`, e);
      }
      await sleep(600); // Wait between conversions
    }
  } finally {
    stopActiveBlockGuide();
    console.log(`[${modeName}] Conversion complete`);
  }
}

const runBlockMode = () => runGenericBlockMode("block", collectBlockEquationItems, "Block Mode");
const runInlineToBlockMode = () => runGenericBlockMode("inline-to-block", collectInlineToBlockItems, "Inline-to-Block Mode");

// ESC to stop block modes
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && activeBlockGuide) {
    e.preventDefault();
    stopActiveBlockGuide();
  }
});

// ==================== MESSAGE HANDLER ====================

chrome.runtime.onMessage.addListener(m => {
  if (m?.t === "RUN_INLINE_CONVERT") {
    runInlineMode();
  } else if (m?.t === "RUN_BLOCK_CONVERT") {
    runBlockMode();
  } else if (m?.t === "RUN_INLINE_TO_BLOCK_CONVERT") {
    runInlineToBlockMode();
  }
});