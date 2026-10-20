# Regen Hybrid Load Calculator

Two pages in one GitHub Pages app:

| Page | Who uses it | Link after upload |
|---|---|---|
| `form.html` | Customers – appliance list, hours of use, CEB/LECO details, signature | `https://udithapana.github.io/Load-Calculation/form.html` |
| `index.html` | Design team – 24-hour load profile, inverter check, Excel sheet | `https://udithapana.github.io/Load-Calculation/` |

## Upload to GitHub Pages

1. Repository: **Load-Calculation** under `udithapana`.
2. Upload every file in this folder to the repository root (flat – no sub-folders).
3. Settings → Pages → Deploy from branch → `main` / root → Save.

The install id in `manifest.webmanifest` is `"/Load-Calculation/"`, matching the repository folder. If the repository is ever renamed, change the id to `"/<new-repo-name>/"`.

## Files

- `index.html` – engineer app (installable from Chrome)
- `form.html` – customer form (also prints a blank paper form)
- `common.js` – appliance catalogue and load-analysis engine (shared)
- `common.css` – shared styles
- `xlsx-writer.js` – builds the Excel load calculation sheet in the browser (no internet library needed)
- `manifest.webmanifest` (install settings: own id and scope `./`), `sw.js` (offline cache for this folder only), `icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`

## Notes

- Storage keys all start with `hlc_`; the app never clears other apps' data. The service worker is registered with scope `./`, its caches start with `load-calc-`, and it only ever deletes its own caches.
- Customer form drafts are saved on the customer's phone until they send the file.
- Customer form files (`Regen_LoadForm_….json`) and project files (`Regen_LoadProject_….json`) open with **Open file**. Files sent through WhatsApp open even if the phone renames or labels them differently.
