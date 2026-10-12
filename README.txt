A² BUILDER BACKEND FIX — DIRECT CLOUDFLARE PAGES DEPLOY + PEXELS + AI IMAGES

Included:
- server.js: your current backend, patched to register Cloudflare Pages asset hashes, use root-relative manifest paths, and provide /api/images/generate.
- env.example.txt: names of required environment variables only.

WHAT THIS FIXES
1) Website deployment: sends the actual project files received by /api/deploy to Cloudflare Pages. It registers uploaded hashes and uses paths such as /index.html in the manifest, which helps avoid a successful deploy that serves a 404.
2) Pexels photos and videos: preserves /api/pexels/photos and /api/pexels/videos and the older /api/pixel/... aliases.
3) AI picture generation: adds POST /api/images/generate using Cloudflare Workers AI FLUX.1 schnell. It returns {success:true,image:"...base64..."} for the existing frontend button.

HOW TO APPLY
1. Back up the existing backend server.js.
2. Replace server.js in the backend GitHub repository with this file.
3. Commit/push and wait for Render to finish redeploying.
4. In Render Environment Variables, use these exact names:
   - CLOUDFLARE_API_TOKEN
   - CLOUDFLARE_ACCOUNT_ID
   - PEXELS_API_KEY
   Do not put secret values in frontend code or send them in chat.
5. The environment example you previously uploaded used CLOUDFLARE_API_KEY. This backend expects CLOUDFLARE_API_TOKEN (or CF_API_TOKEN / CLOUDFLARE_TOKEN) and CLOUDFLARE_ACCOUNT_ID. Rename/set the variables in Render accordingly. Do not remove other existing AI provider keys.
6. Test:
   - GET https://a2-builder-backend.onrender.com/api/health
   - GET https://a2-builder-backend.onrender.com/api/media/status
   - GET https://a2-builder-backend.onrender.com/api/pexels/photos?q=technology
   - GET https://a2-builder-backend.onrender.com/api/pexels/videos?q=technology
   - POST https://a2-builder-backend.onrender.com/api/images/generate with JSON {"prompt":"A simple blue abstract technology illustration"}
   - Then deploy a tiny project with index.html through A² Builder.

IMPORTANT
- Pexels needs PEXELS_API_KEY in Render. This key is not the same as Cloudflare credentials.
- Cloudflare Workers AI requires a token with permission to run Workers AI, and the account must have Workers AI available.
- The code passes local syntax checks, but I cannot access your Render deployment or Cloudflare account to claim a live test passed. Test the endpoints after Render redeploys.
