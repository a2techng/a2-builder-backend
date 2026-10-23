A² BUILDER BACKEND — EXISTING AI PROVIDERS + MEDIA/DEPLOY + ANDROID BUILD GATEWAY

IMPORTANT: This package preserves the provider and feature code in the supplied
backend version. Updating this README does not add API keys or prove that an
external provider is currently reachable. Each service requires valid environment
credentials and may have its own model access, quota, or billing limits.

FILES
- server.js: backend server and API routes.
- env.example.txt: environment-variable names only. Put real secret values in
  Render Environment settings, never in frontend code or public files.

EXISTING AI PROVIDERS
The backend code includes these AI providers and their exact environment names:
1. Google Gemini — GEMINI_API_KEY
2. Mistral — MISTRAL_API_KEY
3. OpenRouter — OPENROUTER_API_KEY
4. Groq — GROQ_API_KEY
5. Cerebras — CEREBRAS_API_KEY
6. Together AI — TOGETHER_API_KEY
7. Cohere — COHERE_API_KEY

AI provider behavior:
- GET /api/providers lists the providers/models exposed by this backend version.
- POST /api/ai and POST /api/generate use the AI provider logic in server.js.
- Provider selection can use a specific provider or "auto". In auto mode the
  backend tries configured providers according to its configured order.
- A provider is usable only when its matching key is set and the provider accepts
  the configured model/request. Having a variable name in this file does not
  mean a key is configured or the service has passed a live test.

OTHER EXISTING SERVICES AND ROUTES
- GET /api/health — basic backend health check.
- GET /api/media/status — media service configuration/status.
- GET /api/pexels/photos and GET /api/pexels/videos — Pexels media search.
- Older /api/pixel/... aliases are retained in this backend version.
- POST /api/images/generate — Cloudflare Workers AI image generation.
- POST /api/convert-site — website/project conversion route.
- GET /api/deploy/status and POST /api/deploy — Cloudflare Pages deployment.

ENVIRONMENT VARIABLES
AI:
- GEMINI_API_KEY
- MISTRAL_API_KEY
- OPENROUTER_API_KEY
- GROQ_API_KEY
- CEREBRAS_API_KEY
- TOGETHER_API_KEY
- COHERE_API_KEY

Cloudflare Pages / Workers AI:
- CLOUDFLARE_API_TOKEN
- CLOUDFLARE_ACCOUNT_ID
- CLOUDFLARE_PAGES_PROJECT (used for Pages deployment)

Pexels:
- PEXELS_API_KEY

Android build gateway:
- ANDROID_BUILD_SERVICE_URL
- ANDROID_BUILD_SERVICE_TOKEN

HOW TO APPLY SAFELY
1. Back up the currently deployed backend and its environment settings.
2. Review server.js and env.example.txt before replacing files in your backend repo.
3. Set only the keys you have. Do not delete existing AI provider variables in Render.
4. Keep all API keys and the Android service token in Render Environment settings;
   never paste secret values into index.html, client-side JavaScript, or chat.
5. Commit/push the reviewed backend files and wait for Render to redeploy.

TEST AFTER DEPLOY
Open/check these endpoints:
- GET https://a2-builder-backend.onrender.com/api/health
- GET https://a2-builder-backend.onrender.com/api/providers
- GET https://a2-builder-backend.onrender.com/api/media/status
- GET https://a2-builder-backend.onrender.com/api/pexels/photos?q=technology
- GET https://a2-builder-backend.onrender.com/api/pexels/videos?q=technology

POST tests (use an API client; do not put secret keys in the request body):
- POST /api/ai with a small prompt and a configured provider, or provider="auto".
- POST /api/images/generate with JSON such as:
  {"prompt":"A simple blue abstract technology illustration"}
- Deploy a small test project through A² Builder only after reviewing the deploy
  settings. Do not treat a successful HTTP response alone as proof the published
  site works; open the resulting URL and test it.

CLOUDFLARE NOTES
- This backend expects CLOUDFLARE_API_TOKEN (also accepts the aliases documented
  in server.js) and CLOUDFLARE_ACCOUNT_ID. Cloudflare Workers AI requires an
  appropriately permissioned token and an account with Workers AI available.
- Cloudflare Pages deployment also uses CLOUDFLARE_PAGES_PROJECT.
- PEXELS_API_KEY is separate from Cloudflare credentials.

ANDROID BUILD ADDITION — GATEWAY ONLY
This backend version adds:
- GET /api/android/status — configuration and runner health check
- POST /api/android/build — idempotent when the same request ID is reused
- GET /api/android/build/:jobId — runner job status/logs
- GET /api/android/build/:jobId/download — artifact download proxy

This is a gateway, not an Android compiler. Actual APK/AAB compilation requires a
separate secure Android runner that implements POST /api/builds with Bearer-token
authentication and returns a job ID or artifact URL. This backend does not itself
compile APK/AAB files or implement job polling/artifact storage.

Set ANDROID_BUILD_SERVICE_URL to the HTTPS URL of that runner and
ANDROID_BUILD_SERVICE_TOKEN to the shared secret in Render. Never expose the token
in the frontend or public repository. GET /api/android/status now checks the runner's public /health endpoint and reports connectivity separately from configuration. A health check still does not guarantee that a compilation will succeed. The frontend uses a stable history entry per request/job, maps the Play Store option to the backend's aab-release type, and treats status timeouts as unknown rather than automatically marking compilation failed.

The Android gateway accepts Idempotency-Key / X-Request-ID headers. It reuses the same response for a repeated request ID for up to two hours in the current backend process, reducing accidental duplicate submissions. This in-memory cache is not durable across backend restarts/redeploys. The frontend never automatically resubmits a build when acknowledgement or polling is uncertain; inspect existing job/backend/runner logs before retrying.

VERIFICATION LIMIT
Local syntax checks can verify JavaScript syntax, but cannot verify your Render
configuration, private API keys, provider quotas, Cloudflare permissions, Pexels
credentials, or remote Android runner. Test those services after deployment.


FRONTEND/BACKEND MONETISATION CONFIG HANDOFF
The Android Studio frontend includes a monetization object in the Android build request. The gateway now validates and forwards these settings to the runner:
- ads
- subscriptions
- oneTimeDigitalPurchases
- physicalGoodsAndServices
- affiliateLinks
- sponsoredContent
- billingMode (test/production)
- premiumEntitlement

Important: forwarding configuration is not the same as implementing monetization. The Android runner must still add the correct native SDKs and resources, and server-side purchase verification is required for digital billing. Never put secret payment-provider keys in the app frontend. AdMob production IDs must be valid; use test mode during development.
