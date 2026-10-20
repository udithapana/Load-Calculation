# Regen Hybrid Load Calculator

Two pages in one GitHub Pages app:

| Page | Who uses it | Link after upload |
|---|---|---|
| `form.html` | Customers – appliance list, hours of use, CEB/LECO details, signature | `https://udithapana.github.io/Hybrid-Load-Calculator/form.html` |
| `index.html` | Design team – 24-hour load profile, inverter check, Excel sheet | `https://udithapana.github.io/Hybrid-Load-Calculator/` |

## Upload to GitHub Pages

1. Create a repository named **Hybrid-Load-Calculator** under `udithapana`.
2. Upload every file in this folder to the repository root (flat – no sub-folders).
3. Settings → Pages → Deploy from branch → `main` / root → Save.

If you use a different repository name, change `"id"` in `manifest.json` to `"/<your-repo-name>/"` so the installed app does not clash with your other apps on udithapana.github.io.

## Files

- `index.html` – engineer app (installable from Chrome)
- `form.html` – customer form (also prints a blank paper form)
- `common.js` – appliance catalogue and load-analysis engine (shared)
- `common.css` – shared styles
- `xlsx-writer.js` – builds the Excel load calculation sheet in the browser (no internet library needed)
- `manifest.json`, `icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`

## Notes

- Storage keys all start with `hlc_`; the app never clears other apps' data. No service worker is used.
- Customer form drafts are saved on the customer's phone until they send the file.
- Customer form files (`Regen_LoadForm_….json`) and project files (`Regen_LoadProject_….json`) open with **Open file**. Files sent through WhatsApp open even if the phone renames or labels them differently.
