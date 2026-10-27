# Typing Test — v1 (frontend only, branch `prod_v1.0.0`)

Free online typing speed test. **No backend** — everything runs in the browser.
Scores persist in `localStorage` on the user's own device.

## What's inside

- **Tests:** 30s, 1 min, 2 min, 3 min, 5 min × 5 scenarios
  (Everyday, Exam, Code, Punctuation+, Quotes)
- **Feel:** word-grouped stream with visible spacing, glowing active word,
  focus blur with click-to-focus, synthesized keystroke sounds (mutable,
  persisted per device), live WPM + accuracy HUD, paste blocked
- **Results:** net/gross WPM, accuracy, character split, rank titles,
  personal-best detection, copy-to-share, per-device history
- **SEO:** keyword title/description, canonical, Open Graph + Twitter cards,
  JSON-LD (`WebApplication` + `FAQPage`), `sitemap.xml`, `robots.txt`,
  semantic HTML, FAQ + Guide long-form content
- **Ads (v2-ready, OFF in v1):** `<AdSlot>` renders `null`; commented
  AdSense script block in `index.html`; placeholder `public/ads.txt`
- **Cloudflare:** `public/_redirects` (SPA fallback) + `public/_headers`
  (security + asset caching) ship with the build automatically

## Before deploying

1. Pick your domain, e.g. `https://typingtest.example`
2. Search-replace `https://typingtest.example` with the real domain in:
   - `index.html` (canonical, OG, Twitter, JSON-LD)
   - `public/sitemap.xml`
   - `public/robots.txt`
3. Optional: add `public/og-cover.png` (1200×630) for link previews
4. Add a contact email on the About page (AdSense reviewers look for one)

## Run locally

```powershell
cd web
npm install
npm run dev     # http://localhost:5173
npm run build   # outputs static files to web/dist
```

## Deploy to Cloudflare Pages (free)

**Option A — Git (recommended, auto-deploys every push):**

1. Push branch `prod_v1.0.0` to GitHub/GitLab
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**
3. Select the repo, then set:
   - **Production branch:** `prod_v1.0.0`
   - **Root directory:** `web`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node version:** 20 (Pages → Settings → Environment Variables → `NODE_VERSION=20`)
4. Deploy. Attach your custom domain under **Custom domains**,
   then re-do the domain search-replace above and redeploy.

**Option B — Direct upload (no git):**

```powershell
cd web
npm install
npm run build
npx wrangler pages deploy dist --project-name typing-test
```

## v2 (ads) plan — do NOT do this in v1

1. Get AdSense approval (needs the custom domain + contact info + some indexed content first)
2. Fill `public/ads.txt` with Google's snippet
3. Uncomment the AdSense script in `index.html`
4. Implement `<AdSlot>` to render the `<ins class="adsbygoogle">` unit
   (below-test + sidebar slots are already positioned)

## Branch & versioning

- `master` — the existing full-stack Typing Master (untouched)
- `prod_v1.0.0` — this folder (`web/`), frontend-only product
- Future releases: `prod_v1.1.0`, `prod_v2.0.0` (ads), …
