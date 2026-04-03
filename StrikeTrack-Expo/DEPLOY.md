# Deploy StrikeTrack Web to Render

## Option A: Repo root is StrikeTrack-Expo

If your Git repo only contains StrikeTrack-Expo (or you deploy from this folder):

1. Push your code to GitHub/GitLab/Bitbucket.
2. In [Render Dashboard](https://dashboard.render.com) → **New** → **Static Site**.
3. Connect your repo.
4. Settings (or use the `render.yaml` in the repo):
   - **Build Command:** `npm install && npm run build:web`
   - **Publish Directory:** `dist`
5. Click **Create Static Site**.

---

## Option B: Repo root is StrikeTrack (parent folder)

If your repo has `StrikeTrack/` and `StrikeTrack-Expo/` inside:

1. Connect the repo in Render.
2. Set **Root Directory:** `StrikeTrack-Expo`
3. **Build Command:** `npm install && npm run build:web`
4. **Publish Directory:** `dist`
5. Create the site.

---

## After deploy

- Your site will be at `https://striketrack-xxxx.onrender.com` (or a custom domain).
- Data is stored in the browser (localStorage); nothing is sent to a server.
- Each deploy runs on every push to your branch.
