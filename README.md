# Notion Equation Converter (Inline & Block)

A Chrome extension to convert LaTeX-style math into **native Notion equations**. It supports three modes: inline conversion, block conversion, and promoting inline equations to block equations.

---

## Features

### Mode 1: Inline Conversion (`$...$`)
*   Scans for `$ math $` or `$$ math $$` inside text blocks.
*   Converts them into Notion's **inline equation** format.
*   Handles multiple equations per block.
*   **Trigger:** `Ctrl+M` (macOS: `Cmd+Shift+M`)

### Mode 2: Block Conversion (`$$...$$`)
*   Scans for blocks that contain **only** a display equation wrapped in `$$...$$`.
*   Converts the entire block into a Notion **Block Equation**.
*   **Trigger:** `Ctrl+Shift+B` (macOS: `Cmd+Shift+B`)

### Mode 3: Inline-to-Block Promotion
*   Scans for text blocks that contain **only** a single existing inline equation.
*   Converts them into a Notion **Block Equation**.
*   Useful for fixing equations that were pasted or formatted incorrectly as inline.
*   **Trigger:** `Ctrl+Shift+X` (macOS: `Cmd+Shift+X`)

---

## Installation

1. Download or clone this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the folder containing `manifest.json`.

---

## Usage

### 1. Inline Mode
Write your math using LaTeX syntax wrapped in dollar signs:
> The solution is $x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$.

Press **Ctrl+M** (or use the extension menu). The extension will walk through the page, converting each instance.

### 2. Block Mode
Write a block containing only a double-dollar equation:
> $$ \sum_{i=0}^n i^2 = \frac{(n^2+n)(2n+1)}{6} $$

Press **Ctrl+Shift+B**. The extension will convert these text blocks into proper Notion Equation Blocks.

### 3. Inline-to-Block Mode
If you have a block that is just a single inline equation (e.g., imported content), press **Ctrl+Shift+X** to convert it to a full Equation Block.

---

## HUD & Controls

When a conversion mode is active, a HUD appears in the top-right corner.

*   **ESC**: Stop the current process.
*   **B** (Inline mode): Step back to the previous equation.

---

## Example

**Before**

```
E = mc^2  can be written as $E=mc^2$ in Notion.
```

**After**

* `$E=mc^2$` becomes a proper Notion inline equation block.

---

## Troubleshooting

* If the keyboard shortcut doesn’t fire, set it explicitly in `chrome://extensions/shortcuts`.
* **Reload Required:** If you just installed the extension, refresh your Notion tab before using it.
