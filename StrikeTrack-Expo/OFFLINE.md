# Run StrikeTrack Completely Offline

## Quick start

```bash
npm run offline
```

Then open **http://localhost:3000** in your browser. Everything runs locally—no internet needed after the first build.

---

## Create a portable offline package

Use this to move the site to another machine (e.g. a laptop) and run it without internet:

### Step 1: Build and copy

```bash
cd StrikeTrack-Expo
npm run build:web
```

The `dist/` folder contains all files (HTML, JS, CSS, assets).

### Step 2: Create the package

Copy the **entire project folder** (with `dist/` and `node_modules/`) to a USB drive or another computer. For example:

```
StrikeTrack-Expo/
├── dist/           ← built website
├── node_modules/   ← needed for serve
├── package.json
└── ...
```

### Step 3: Run offline

On the other machine (with Node.js installed):

```bash
cd StrikeTrack-Expo
npx serve dist -p 3000
```

Open **http://localhost:3000**. Works fully offline; data is stored in the browser (localStorage).

---

## Minimal portable package (no Node needed on target machine)

If the target machine has **no Node.js**:

1. Build: `npm run build:web`
2. Copy only the `dist/` folder.
3. On the target machine, use a portable static server, for example:
   - [Caddy](https://caddyserver.com/download) (single executable)
   - [Mongoose](https://github.com/cesanta/mongoose) (single executable)
   - Or open `dist/index.html` in a browser (basic navigation may be limited)

4. Or install a lightweight server like Python (often pre-installed):

   ```bash
   cd dist
   python -m http.server 3000
   ```

---

## Summary

| Method | Internet needed? |
|--------|------------------|
| `npm run offline` | First run only (to fetch serve) |
| Copy `dist/` + `npx serve dist` | First run only on each machine |
| Copy `dist/` + Python server | No (Python is usually pre-installed) |

Data (batteries, readings) is saved in the browser and survives refreshes and restarts.
