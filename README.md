# Notion Inline `$ → Equation` Converter

A Chrome extension to convert `$...$` (and `$$...$$`) into **true Notion inline equations** by simulating the real Notion workflow.

---

## Features

* Detects inline math wrapped in `$...$` or `$$...$$` inside editable Notion blocks.
* Skips code blocks, already-converted equations, and escaped `\$`.
* Converts math into native inline equations by simulating key presses.
* Auto-advances to the next equation after each conversion.
* Lightweight on-screen HUD with minimal controls.
* Three ways to trigger:

  * **Keyboard:** Windows/Linux `Ctrl+M`, macOS `Command+Shift+M`
  * **Toolbar button:** Click the extension icon
  * **Right-click menu:** “Convert \$…\$ to inline equations”

---

## Installation

1. Download or clone this repository.
2. Open Chrome and go to:

   ```
   chrome://extensions/
   ```
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the folder with `manifest.json`, `background.js`, and `content.js`.

> Notes:
>
> * Permissions used: `activeTab`, `scripting`, and `contextMenus`.
> * Works on `notion.so` and custom `notion.site` domains.

---

## Usage

1. Open any Notion page and write something like:

   ```
   The equation of a circle is $x^2 + y^2 = r^2$.
   ```

2. Trigger the converter using **any** of the following:

   * **Keyboard:**

     * Windows/Linux: `Ctrl+M`
     * macOS: `Command+Shift+M` (avoids the OS-reserved `Command+M`)
   * **Toolbar button:** Click the extension icon in the Chrome toolbar.
   * **Right-click menu:** Choose “Convert \$…\$ to inline equations”.

3. Each trigger converts the next `$…$` to an inline equation and advances. Repeat to process the whole page.

### HUD controls during conversion

* `ESC` → Exit
* `B` → Step back one target
* `Cmd/Ctrl+Shift+E` → Use Notion’s native inline-equation hotkey; auto-advance continues

---

## Customizing the Shortcut

You can change shortcuts at:

```
chrome://extensions/shortcuts
```

If `Command+Shift+M` conflicts on macOS, pick an alternative (e.g., `Option+M` or `Ctrl+Shift+M`).

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
* The toolbar button and right-click menu are reliable fallbacks on pages or systems where shortcuts are blocked.
