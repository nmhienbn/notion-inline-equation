# Notion Inline `$ → Equation` Converter

This Chrome Extension lets you quickly convert inline math expressions written in `$...$` (or `$$...$$`) into **true Notion inline equations**.
It simulates the real Notion hotkey workflow, so you can process multiple equations automatically.

---

## Features

* Detects inline math wrapped in `$...$` or `$$...$$` inside editable Notion blocks.
* Skips code blocks, already-converted equations, and escaped `\$`.
* Converts math into Notion inline equations by simulating key presses.
* Automatically advances to the next equation after conversion.
* Provides a small on-screen HUD with instructions.
* Supports **Ctrl+M** (Windows/Linux) or **Cmd+M** (Mac) as the main shortcut.

---

## Installation

1. Download or clone this repository.
2. Open Chrome and go to:

   ```
   chrome://extensions/
   ```
3. Enable **Developer Mode** (toggle at top right).
4. Click **Load unpacked** and select the folder containing these files (`manifest.json`, `background.js`, `content.js`).

---

## Usage

1. Open any Notion page.

2. Write math expressions like:

   ```
   The equation of a circle is $x^2 + y^2 = r^2$.
   ```

3. Press **Ctrl+M** (or **Cmd+M** on Mac) to activate the converter.

   * Each press converts the next `$...$` into an inline equation.
   * Press **Ctrl+M multiple times** to convert all equations on the page.

4. HUD controls during conversion:

   * **ESC** → Exit guide
   * **B** → Go back one step
   * **Cmd/Ctrl+Shift+E** → Use Notion’s real inline-equation hotkey (auto-advance will continue)

---

## Example

Before:

```
E = mc^2  can be written as $E=mc^2$ in Notion.
```

After pressing **Ctrl+M**:

* `$E=mc^2$` is converted into a proper Notion inline equation block.

---

## Notes

* Works on `notion.so` and custom `notion.site` domains.
* Requires minimal permissions: only active tab and scripting.
* You can edit the shortcut in Chrome under:

  ```
  chrome://extensions/shortcuts
  ```

---

