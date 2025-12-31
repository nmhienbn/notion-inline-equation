// content.js — Guided $...$ → Notion inline equation with auto-advance on real hotkey

const ROOTS = [".notion-page-content", ".notion-frame", "main", "body"];
const HUD_Z = 2147483646;
const STEP_DELAY = 20;

const sleep = ms => new Promise(r => setTimeout(r, ms));

const isEditable = el => !!el && (el.getAttribute("contenteditable") === "true" || el.isContentEditable);
const isCodeCtx = el => el.closest?.(".notion-code-block, pre, code");
const isMathAlready = el => el.closest?.(".notion-equation, .katex");

// --- hotkey detector: real Notion inline-equation (we don't block it)
function isInlineEqHotkey(e) {
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
  return e.key === "E" && e.shiftKey && (isMac ? e.metaKey : e.ctrlKey) && !e.altKey;
}

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

// HUD + highlight
function makeHUD() {
  let hud = document.getElementById("eq-hud");
  if (hud) return hud;
  hud = document.createElement("div");
  hud.id = "eq-hud";
  Object.assign(hud.style, {
    position: "fixed", top: "8px", right: "8px",
    background: "rgba(20,20,20,0.9)", color: "#fff",
    font: "12px system-ui, sans-serif", padding: "8px 10px",
    borderRadius: "8px", zIndex: String(HUD_Z), pointerEvents: "none",
    boxShadow: "0 2px 12px rgba(0,0,0,0.3)", maxWidth: "360px", lineHeight: "1.4"
  });
  hud.innerHTML =
    "<b>$ → equation</b><br/>" +
    "Press <b>Cmd/Ctrl+Shift+E</b> to convert. Auto-advances to next.<br/>" +
    "<b>B</b> back • <b>ESC</b> exit";
  document.documentElement.appendChild(hud);
  return hud;
}
const showHUD = () => (makeHUD().style.display = "block");
const hideHUD = () => { const h = document.getElementById("eq-hud"); if (h) h.style.display = "none"; };

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
const hideHighlight = () => { const b = document.getElementById("eq-box"); if (b) b.style.display = "none"; };

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

// Build items
function collectItems() {
  const items = [];
  const roots = new Set();
  for (const s of ROOTS) document.querySelectorAll(s).forEach(n => roots.add(n));
  if (!roots.size) roots.add(document.body);

  for (const root of roots) {
    for (const tn of textNodes(root)) {
      const spans = findDollarSpans(tn.nodeValue);
      spans.forEach(span => items.push({ tn, span }));
    }
  }
  return items;
}

// Guide state
let guide = null;

function stopGuide() {
  if (!guide) return;
  hideHUD(); hideHighlight();
  window.removeEventListener("keydown", onKey, true);
  if (guide.mo) { guide.mo.disconnect(); guide.mo = null; }
  guide = null;
}

async function goStep(delta) {
  if (!guide) return;
  const { items } = guide;
  let i = guide.index + delta;
  if (i < 0) i = 0;
  if (i >= items.length) { stopGuide(); return; }
  guide.index = i;

  const { tn } = items[i];
  const text = tn.nodeValue;
  const spans = findDollarSpans(text);
  if (!spans.length) return goStep(delta >= 0 ? +1 : -1);
  
  // Store span index in case of multiple spans in same node
  if (!guide.spanIndex) guide.spanIndex = 0;

  // If current span index is beyond available spans, go next text node
  if (delta > 0 && guide.spanIndex >= spans.length) {
    guide.spanIndex = 0; // Reset for next node
    return goStep(+1);
  }

  // If going back and current span index is 0, go previous text node
  if (delta < 0) {
    guide.spanIndex--;
    if (guide.spanIndex < 0) {
      guide.spanIndex = 0;
      return goStep(-1);
    }
  }

  const s = spans[guide.spanIndex]; // recomputed; take first current span in this node

  const ed = focusEditableFrom(tn);
  if (!ed) return goStep(delta >= 0 ? +1 : -1);

  // remove right delimiter
  setSelectionInTextNode(tn, s.innerEnd, s.close);
  await deleteSelection();

  // remove left delimiter
  setSelectionInTextNode(tn, s.open, s.innerStart);
  await deleteSelection();

  // select inner expression
  const innerLen = s.innerEnd - s.innerStart;
  const r = setSelectionInTextNode(tn, s.open, s.open + innerLen);
  highlightSelection(r);
  showHUD();

  // arm “auto-advance after Notion wraps as equation”
  armAutoAdvance();
}

// Wait until the selection is inside a Notion equation (or equation node appears), then go next
function armAutoAdvance() {
  if (!guide) return;

  // Detect when the selection is inside a rendered equation OR the equation dialog appears.
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

      // 1) If the Notion equation dialog is open, auto-click Done
      const dlg = findEquationDialog();
      if (dlg && !doneClickedOnce) {
        const ok = await autoClickDialogDone(dlg);
        if (ok) {
          doneClickedOnce = true;
          // Wait for dialog to close and for Notion to insert the equation
          setTimeout(() => {
            if (guide) {
              guide.spanIndex++;
              goStep(+1);
            }
          }, 60);
          return;
        }
      }

      // 2) Fallback: if Notion rendered inline immediately (no dialog), advance
      if (selectionInsideEquation()) {
        setTimeout(() => { 
          if (guide) {
            guide.spanIndex++;
            goStep(+1);
          } 
        }, 40);
      }
    });
  });

  // Auto dispatch Ctrl+Shift+E every 150ms
  if (!hotkeyDispatched) {
    hotkeyDispatched = true;
    setTimeout(() => {
      const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
      const focused = document.activeElement;
      
      if (!focused) return; // Safety check
      
      // Dispatch keydown
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
      
      // Dispatch keypress
      const keypressEvent = new KeyboardEvent('keypress', {
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
      
      focused.dispatchEvent(keypressEvent);
    }, 150);
  }

  guide.mo.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true
  });
}

// ADD these helpers somewhere below:

// Find the inline equation dialog by looking for a contenteditable editor inside a role="dialog".
function findEquationDialog() {
  const editor = document.querySelector('div[role="dialog"] [contenteditable="true"][data-content-editable-leaf="true"]');
  return editor ? editor.closest('div[role="dialog"]') : null;
}

// Click the "Done" button inside the dialog. Returns true if we clicked it.
async function autoClickDialogDone(dialogEl) {
  if (!dialogEl) return false;

  // Try several ways to locate the Done button robustly.
  let btn = dialogEl.querySelector('div[role="button"]');
  if (btn && btn.textContent && btn.textContent.trim().toLowerCase().startsWith('done')) {
    // good
  } else {
    // Prefer exact “Done”
    btn = Array.from(dialogEl.querySelectorAll('div[role="button"]'))
      .find(b => (b.textContent || '').trim().toLowerCase() === 'done');
    // Or any button that contains the enter icon (svg.enter)
    if (!btn) btn = dialogEl.querySelector('div[role="button"] .enter')?.closest('div[role="button"]') || null;
  }

  if (!btn) return false;

  // Give Notion a beat to settle text; then click.
  await new Promise(r => setTimeout(r, 20));
  btn.click();
  return true;
}

// Key handling: ESC (exit), B (back), and detect real inline-eq hotkey to auto-advance
function onKey(e) {
  if (!guide) return;

  // Do NOT prevent the real Notion hotkey — we want Notion to receive it.
  if (isInlineEqHotkey(e)) {
    // We just note it; MutationObserver will pick up the conversion and advance.
    return;
  }

  const t = e.target;
  if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;

  if (e.key === "Escape") {
    e.preventDefault(); stopGuide();
  } else if ((e.key === "b" || e.key === "B") && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault(); goStep(-1);
  }
}

// Start guided run
async function runGuided() {
  const items = collectItems();
  if (!items.length) return;
  guide = {
    items,
    index: -1,
    mo: null, 
    spanIndex: 0
  };
  window.addEventListener("keydown", onKey, true);
  await goStep(+1);
}

chrome.runtime.onMessage.addListener(m => {
  if (m?.t === "RUN_CONVERT") runGuided();
});
