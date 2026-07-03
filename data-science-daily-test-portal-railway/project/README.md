<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/ae1d72c0-c68e-4a02-b1f8-47ea51263082

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to Railway

This repo is ready to deploy on [Railway](https://railway.app) as-is — it already includes a `railway.json`, and `server.ts` listens on Railway's dynamic `PORT`.

**Steps:**

1. Push this project to a GitHub repo (or use the Railway CLI: `railway init` then `railway up` from this folder).
2. In Railway, create a **New Project → Deploy from GitHub repo** and select it.
3. Railway auto-detects Node.js via Nixpacks and will run `npm run build` then `npm run start` (defined in `railway.json` / `package.json`).
4. Under the service's **Variables** tab, add:
   - `GEMINI_API_KEY` — your Gemini API key (**required** for all AI features: interview chat, code comparison, sandbox AI analyze, resume/career analysis).
   - `NODE_ENV` = `production` — required so the server serves the built `dist/` files instead of trying to start a Vite dev server.
5. Deploy. Railway will build, then run health checks against `/api/health`.
6. Once live, open the generated `*.up.railway.app` domain (or attach a custom domain under **Settings → Networking**).

**Notes:**
- The app already syncs its local `db.json` database to Google Cloud Firestore (see `firebase-applet-config.json`), so student/quiz data survives redeploys and container restarts even though Railway's filesystem is otherwise ephemeral.
- `APP_URL` from `.env.example` is a leftover from AI Studio's hosting and isn't used anywhere in the code — you don't need to set it on Railway.
- If you ever see AI features fall back to generic/canned responses, double check `GEMINI_API_KEY` is set correctly in the Railway service Variables.
