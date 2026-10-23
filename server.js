
"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

const PORT = Number(process.env.PORT) || 3000;

app.disable("x-powered-by");

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN
    ? process.env.ALLOWED_ORIGIN.split(",").map(s => s.trim())
    : true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "X-Request-ID"]
}));

app.use(express.json({
  limit: "25mb"
}));

app.use(express.urlencoded({
  extended: false,
  limit: "1mb"
}));

// Check which AI providers have API keys configured.
function getConfiguredProviders() {
  const providers = {
    gemini: "GEMINI_API_KEY",
    mistral: "MISTRAL_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    groq: "GROQ_API_KEY",
    cerebras: "CEREBRAS_API_KEY",
    together: "TOGETHER_API_KEY",
    cohere: "COHERE_API_KEY",
    cloudflare: "CLOUDFLARE_API_TOKEN"
  };

  return Object.entries(providers)
    .filter(([name, key]) => {
      if (name === "cloudflare") {
        return Boolean(
          (process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || process.env.CLOUDFLARE_TOKEN) &&
          (process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID)
        );
      }
      return Boolean(process.env[key]);
    })
    .map(([name]) => name);
}

// Basic welcome route.
app.get("/", (req, res) => {
  res.json({
    success: true,
    name: "A² Builder Backend",
    message: "Backend is running.",
    version: "1.0.0"
  });
});

// Health check.
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    service: "A² Builder Backend",
    version: "1.0.0",
    configuredAIProviders: getConfiguredProviders(),
    configuredAIProviderCount: getConfiguredProviders().length,
    timestamp: new Date().toISOString()
  });
});

// Provider configuration status.
app.get("/api/providers", (req, res) => {
  const configured = getConfiguredProviders();

  res.json({
    success: true,
    providers: [
      "gemini",
      "mistral",
      "openrouter",
      "groq",
      "cerebras",
      "together",
      "cohere",
      "fireworks"
    ].map(name => ({
      name,
      configured: configured.includes(name)
    }))
  });
});

console.log("A² Builder backend foundation loaded.");

/* =========================================
   BATCH 4 — A² BUILDER AI ENGINE
========================================= */

const AI_SYSTEM_PROMPT = `
You are the AI coding assistant for A² Builder.

Help users build, debug, explain, and improve websites,
web applications, and backend APIs.

Rules:
- Follow the user's instructions carefully.
- Preserve existing features when modifying code.
- Generate complete, practical code when requested.
- Use HTML, CSS, and JavaScript appropriately.
- Never expose API keys or secret credentials.
- Never claim code has been deployed or executed unless
  that operation actually happened.
- Explain errors clearly and suggest useful fixes.
`;

function getErrorMessage(error) {
  return String(error?.message || error || "Unknown error");
}

const AI_PROVIDERS = {
  gemini: {
    key: "GEMINI_API_KEY",
    model: "gemini-2.5-flash",
    url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    type: "gemini"
  },

  mistral: {
    key: "MISTRAL_API_KEY",
    model: "mistral-small-latest",
    url: "https://api.mistral.ai/v1/chat/completions"
  },

  openrouter: {
    key: "OPENROUTER_API_KEY",
    model: "google/gemini-2.5-flash",
    url: "https://openrouter.ai/api/v1/chat/completions"
  },

  groq: {
    key: "GROQ_API_KEY",
    model: "llama-3.3-70b-versatile",
    url: "https://api.groq.com/openai/v1/chat/completions"
  },

  cerebras: {
    key: "CEREBRAS_API_KEY",
    model: "llama-3.3-70b",
    url: "https://api.cerebras.ai/v1/chat/completions"
  },

  together: {
    key: "TOGETHER_API_KEY",
    model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    url: "https://api.together.xyz/v1/chat/completions"
  },

  cohere: {
    key: "COHERE_API_KEY",
    model: "command-a-03-2025",
    url: "https://api.cohere.com/v2/chat",
    type: "cohere"
  },

  fireworks: {
    key: "FIREWORKS_API_KEY",
    model: "accounts/fireworks/models/llama-v3p3-70b-instruct",
    url: "https://api.fireworks.ai/inference/v1/chat/completions"
  }
};

const AI_PROVIDER_ORDER = [
  "gemini",
  "groq",
  "cerebras",
  "mistral",
  "openrouter",
  "together",
  "cohere",
  "fireworks"
];

async function requestProvider(providerName, prompt, systemPrompt) {
  const config = AI_PROVIDERS[providerName];

  if (!config) {
    throw new Error("Unknown AI provider: " + providerName);
  }

  const apiKey = process.env[config.key];

  if (!apiKey) {
    throw new Error(providerName + " API key is not configured.");
  }

  let response;
  let body;

  if (config.type === "gemini") {
    response = await fetch(
      config.url + "?key=" + encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [{
            role: "user",
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 8192
          }
        }),
        signal: AbortSignal.timeout(60000)
      }
    );
  } else if (config.type === "cohere") {
    response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.model,
        stream: false,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: prompt
          }
        ]
      }),
      signal: AbortSignal.timeout(60000)
    });
  } else {
    response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 8192
      }),
      signal: AbortSignal.timeout(60000)
    });
  }

  body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const providerError =
      body?.error?.message ||
      body?.message ||
      body?.detail ||
      ("HTTP " + response.status);

    throw new Error(
      providerName + " request failed: " + providerError
    );
  }

  let answer = "";

  if (config.type === "gemini") {
    answer = (body.candidates?.[0]?.content?.parts || [])
      .map(part => part.text || "")
      .join("\n");
  } else if (config.type === "cohere") {
    answer = (body.message?.content || [])
      .filter(item => item.type === "text")
      .map(item => item.text || "")
      .join("\n");
  } else {
    answer = body.choices?.[0]?.message?.content || "";
  }

  if (!answer.trim()) {
    throw new Error(providerName + " returned an empty response.");
  }

  return answer.trim();
}

async function generateWithAI(options = {}) {
  const prompt = String(options.prompt || "").trim();

  if (!prompt) {
    throw new Error("Please enter a prompt.");
  }

  if (prompt.length > 30000) {
    throw new Error("Your prompt is too long. Maximum: 30,000 characters.");
  }

  const requestedProvider = String(options.provider || "auto")
    .toLowerCase();

  const systemPrompt = String(
    options.systemPrompt || AI_SYSTEM_PROMPT
  );

  let providers;

  if (requestedProvider === "auto") {
    providers = AI_PROVIDER_ORDER.filter(name =>
      Boolean(process.env[AI_PROVIDERS[name].key])
    );
  } else {
    if (!AI_PROVIDERS[requestedProvider]) {
      throw new Error("Unsupported AI provider.");
    }

    providers = [requestedProvider];
  }

  if (!providers.length) {
    throw new Error(
      "No AI providers are configured. Add at least one API key in your hosting environment."
    );
  }

  const errors = [];

  for (const providerName of providers) {
    try {
      const answer = await requestProvider(
        providerName,
        prompt,
        systemPrompt
      );

      return {
        answer,
        provider: providerName,
        fallback: errors.length > 0,
        errors
      };
    } catch (error) {
      const message = getErrorMessage(error);

      console.error(
        "AI provider " + providerName + " failed:",
        message
      );

      errors.push({
        provider: providerName,
        message
      });

      // Explicit provider selection does not silently switch providers.
      if (requestedProvider !== "auto") {
        break;
      }
    }
  }

  const failure = new Error(
    "All available AI providers failed. Check your API keys, provider model access, and usage limits."
  );

  failure.providerErrors = errors;
  throw failure;
}

// General AI endpoint.
app.post("/api/ai", async (req, res) => {
  try {
    const result = await generateWithAI({
      prompt: req.body?.prompt,
      provider: req.body?.provider || "auto",
      systemPrompt: req.body?.systemPrompt || AI_SYSTEM_PROMPT
    });

    res.json({
      success: true,
      response: result.answer,
      answer: result.answer,
      message: result.answer,
      provider: result.provider,
      fallback: result.fallback,
      errors: result.errors
    });
  } catch (error) {
    res.status(502).json({
      success: false,
      error: getErrorMessage(error),
      providerErrors: error.providerErrors || []
    });
  }
});

// Website and application generation endpoint.
app.post("/api/generate", async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || "").trim();

    const projectContext = req.body?.project
      ? "\n\nProject context:\n" +
        (typeof req.body.project === "string"
          ? req.body.project
          : JSON.stringify(req.body.project).slice(0, 10000))
      : "";

    const result = await generateWithAI({
      prompt: prompt + projectContext,
      provider: req.body?.provider || "auto",
      systemPrompt: AI_SYSTEM_PROMPT
    });

    res.json({
      success: true,
      response: result.answer,
      answer: result.answer,
      message: result.answer,
      provider: result.provider,
      fallback: result.fallback,
      errors: result.errors
    });
  } catch (error) {
    res.status(502).json({
      success: false,
      error: getErrorMessage(error),
      providerErrors: error.providerErrors || []
    });
  }
});
  
/* =========================================
   BATCH 5 — MEDIA & WEBSITE IMPORT
========================================= */

const dns = require("node:dns").promises;
const net = require("node:net");

const PEXELS_API = "https://api.pexels.com";

function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) {
    const p = ip.split(".").map(Number);

    return (
      p[0] === 0 ||
      p[0] === 10 ||
      p[0] === 127 ||
      p[0] >= 224 ||
      (p[0] === 169 && p[1] === 254) ||
      (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
      (p[0] === 192 && p[1] === 168) ||
      (p[0] === 100 && p[1] >= 64 && p[1] <= 127)
    );
  }

  if (net.isIPv6(ip)) {
    const value = ip.toLowerCase();

    return (
      value === "::" ||
      value === "::1" ||
      value.startsWith("fc") ||
      value.startsWith("fd") ||
      /^fe[89ab]/.test(value) ||
      value.startsWith("::ffff:") ||
      value.startsWith("2001:db8:")
    );
  }

  return true;
}

async function validateExternalUrl(value) {
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error("Please provide a valid website URL.");
  }

  if (url.protocol !== "https:") {
    throw new Error("Only HTTPS website URLs are accepted.");
  }

  if (url.username || url.password) {
    throw new Error("URLs containing credentials are not accepted.");
  }

  const hostname = url.hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("This hostname is not permitted.");
  }

  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new Error("Private network addresses are not permitted.");
    }
  } else {
    let addresses;

    try {
      addresses = await dns.lookup(hostname, { all: true });
    } catch {
      throw new Error("The website hostname could not be resolved.");
    }

    if (
      !addresses.length ||
      addresses.some(item => isPrivateAddress(item.address))
    ) {
      throw new Error("This website resolves to a restricted address.");
    }
  }

  return url;
}

async function fetchExternalWebsite(value) {
  let url = await validateExternalUrl(value);

  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: {
        "User-Agent": "A2Builder-WebsiteImporter/1.0",
        "Accept": "text/html,application/xhtml+xml"
      },
      signal: AbortSignal.timeout(15000)
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");

      if (!location) {
        throw new Error("Website redirect has no destination.");
      }

      url = await validateExternalUrl(
        new URL(location, url).toString()
      );

      continue;
    }

    if (!response.ok) {
      throw new Error("Website returned HTTP " + response.status + ".");
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.toLowerCase().includes("text/html")) {
      throw new Error("The supplied URL did not return an HTML page.");
    }

    const declaredLength = Number(
      response.headers.get("content-length") || 0
    );

    if (declaredLength > 1024 * 1024) {
      throw new Error("Website HTML exceeds the 1 MB import limit.");
    }

    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;

    try {
      while (true) {
        const { done, value: chunk } = await reader.read();

        if (done) break;

        total += chunk.byteLength;

        if (total > 1024 * 1024) {
          await reader.cancel();
          throw new Error("Website HTML exceeds the 1 MB import limit.");
        }

        chunks.push(Buffer.from(chunk));
      }
    } finally {
      reader.releaseLock();
    }

    return {
      url: url.toString(),
      html: Buffer.concat(chunks).toString("utf8")
    };
  }

  throw new Error("Too many website redirects.");
}

// Compatibility aliases for the frontend's older "Pixel" naming.
// Pexels remains the actual media provider and uses PEXELS_API_KEY from Render.
app.use((req, res, next) => {
  if (req.url === "/api/pixel/status" || req.url.startsWith("/api/pixel/status?")) {
    req.url = req.url.replace("/api/pixel/status", "/api/media/status");
  } else if (req.url.startsWith("/api/pixel/photos")) {
    req.url = req.url.replace("/api/pixel/photos", "/api/pexels/photos");
  } else if (req.url.startsWith("/api/pixel/videos")) {
    req.url = req.url.replace("/api/pixel/videos", "/api/pexels/videos");
  }
  next();
});

// Generate a new image with Cloudflare Workers AI.
// Requires CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in Render.
app.post("/api/images/generate", async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || "").trim();
    if (!prompt) {
      return res.status(400).json({ success: false, error: "Provide an image prompt." });
    }
    if (prompt.length > 2048) {
      return res.status(400).json({ success: false, error: "Image prompt must be 2,048 characters or fewer." });
    }

    const { token, accountId } = getCloudflareSettings();
    if (!token || !accountId) {
      return res.status(503).json({
        success: false,
        error: "Cloudflare AI is not configured. Add CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID to Render Environment Variables."
      });
    }

    const endpoint = CLOUDFLARE_API_BASE + "/accounts/" + encodeURIComponent(accountId) +
      "/ai/run/@cf/black-forest-labs/flux-1-schnell";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt, steps: 4 }),
      signal: AbortSignal.timeout(110000)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false || !data.result?.image) {
      const details = (data.errors || []).map(item => item.message).filter(Boolean).join("; ");
      return res.status(response.status >= 400 ? response.status : 502).json({
        success: false,
        error: details || data.message || "Cloudflare Workers AI did not return an image."
      });
    }

    res.json({
      success: true,
      provider: "Cloudflare Workers AI",
      model: "@cf/black-forest-labs/flux-1-schnell",
      image: data.result.image,
      mimeType: "image/jpeg"
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Cloudflare AI image generation failed:", message);
    res.status(502).json({ success: false, error: message });
  }
});

// Pexels configuration status.
app.get("/api/media/status", (req, res) => {
  res.json({
    success: true,
    provider: "Pexels",
    configured: Boolean(process.env.PEXELS_API_KEY),
    photosEndpoint: "/api/pexels/photos",
    videosEndpoint: "/api/pexels/videos",
    imageGenerationEndpoint: "/api/images/generate",
    imageGenerationConfigured: Boolean(
      (process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || process.env.CLOUDFLARE_TOKEN) &&
      (process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID)
    )
  });
});

// Search Pexels photos.
app.get("/api/pexels/photos", async (req, res) => {
  try {
    const apiKey = process.env.PEXELS_API_KEY;

    if (!apiKey) {
      return res.status(503).json({
        success: false,
        error: "Pexels API key is not configured."
      });
    }

    const query = String(req.query.q || "").trim();

    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Provide a search term using ?q=."
      });
    }

    const params = new URLSearchParams({
      query: query.slice(0, 200),
      per_page: String(
        Math.min(30, Math.max(1, Number(req.query.per_page) || 12))
      )
    });

    const response = await fetch(
      PEXELS_API + "/v1/search?" + params.toString(),
      {
        headers: { Authorization: apiKey },
        signal: AbortSignal.timeout(20000)
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        error: "Pexels photo search failed.",
        details: data.error || data.message || response.status
      });
    }

    res.json({
      success: true,
      total_results: data.total_results || 0,
      photos: data.photos || []
    });
  } catch (error) {
    res.status(502).json({
      success: false,
      error: getErrorMessage(error)
    });
  }
});

// Search Pexels videos.
app.get("/api/pexels/videos", async (req, res) => {
  try {
    const apiKey = process.env.PEXELS_API_KEY;

    if (!apiKey) {
      return res.status(503).json({
        success: false,
        error: "Pexels API key is not configured."
      });
    }

    const query = String(req.query.q || "").trim();

    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Provide a search term using ?q=."
      });
    }

    const params = new URLSearchParams({
      query: query.slice(0, 200),
      per_page: String(
        Math.min(30, Math.max(1, Number(req.query.per_page) || 12))
      )
    });

    const response = await fetch(
      PEXELS_API + "/videos/search?" + params.toString(),
      {
        headers: { Authorization: apiKey },
        signal: AbortSignal.timeout(20000)
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        error: "Pexels video search failed.",
        details: data.error || data.message || response.status
      });
    }

    res.json({
      success: true,
      total_results: data.total_results || 0,
      videos: data.videos || []
    });
  } catch (error) {
    res.status(502).json({
      success: false,
      error: getErrorMessage(error)
    });
  }
});

// Import external website HTML for use in the IDE.
app.post("/api/convert-site", async (req, res) => {
  try {
    const websiteUrl = String(req.body?.url || "").trim();

    if (!websiteUrl) {
      return res.status(400).json({
        success: false,
        error: "Provide a website URL."
      });
    }

    const result = await fetchExternalWebsite(websiteUrl);

    // Return source HTML; this route does not yet recreate
    // the website into separate editable project files.
    const titleMatch = result.html.match(
      /<title\b[^>]*>([\s\S]*?)<\/title>/i
    );

    const title = titleMatch
      ? titleMatch[1].replace(/<[^>]*>/g, "").trim()
      : "Imported Website";

    res.json({
      success: true,
      sourceUrl: result.url,
      title: title.slice(0, 300),
      html: result.html,
      message: "Website HTML imported successfully."
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: getErrorMessage(error)
    });
  }
});

console.log("A² Builder media and import routes loaded.");
 
/* =========================================
   BATCH 6 — FINAL SERVER SETUP
========================================= */


/* =========================================
   CLOUDFLARE PAGES — FREE WEBSITE DEPLOYMENT
   Uses credentials stored in Render Environment Variables.
========================================= */

const crypto = require("node:crypto");

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";

function getCloudflareSettings() {
  const token =
    process.env.CLOUDFLARE_API_TOKEN ||
    process.env.CF_API_TOKEN ||
    process.env.CLOUDFLARE_TOKEN;

  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    process.env.CF_ACCOUNT_ID;

  const defaultProject =
    process.env.CLOUDFLARE_PAGES_PROJECT ||
    process.env.CF_PAGES_PROJECT ||
    "";

  return { token, accountId, defaultProject };
}

function cleanPagesProjectName(value) {
  let name = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, 28);

  if (!name) name = "a2-builder-site";
  if (!/^[a-z0-9]/.test(name)) name = "site-" + name;
  return name;
}

function getAssetContentType(filePath) {
  const extension = String(filePath).toLowerCase().split(".").pop();
  const types = {
    html: "text/html; charset=utf-8",
    htm: "text/html; charset=utf-8",
    css: "text/css; charset=utf-8",
    js: "application/javascript; charset=utf-8",
    mjs: "application/javascript; charset=utf-8",
    json: "application/json; charset=utf-8",
    txt: "text/plain; charset=utf-8",
    svg: "image/svg+xml",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    ico: "image/x-icon",
    woff: "font/woff",
    woff2: "font/woff2",
    map: "application/json",
    xml: "application/xml",
    pdf: "application/pdf"
  };
  return types[extension] || "application/octet-stream";
}

function normalizeDeploymentFiles(input) {
  let source = input;

  if (Array.isArray(input)) {
    source = {};
    for (const item of input) {
      if (item && typeof item.path === "string") {
        source[item.path] = item.content;
      }
    }
  }

  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error("Provide files as an object like {\"index.html\":\"...\"} or an array of {path, content}.");
  }

  const entries = Object.entries(source);
  if (!entries.length) throw new Error("No project files were supplied.");
  if (entries.length > 1000) throw new Error("A maximum of 1,000 files can be deployed at once.");

  const files = {};
  let totalBytes = 0;

  for (const [rawPath, rawContent] of entries) {
    const filePath = String(rawPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
    if (
      !filePath ||
      filePath.split("/").some(part => !part || part === "." || part === "..") ||
      filePath.startsWith(".git/") ||
      filePath.includes("\0")
    ) {
      throw new Error("Invalid project file path: " + rawPath);
    }

    if (typeof rawContent !== "string" && !Buffer.isBuffer(rawContent)) {
      throw new Error("File content must be text for: " + filePath);
    }

    const content = Buffer.isBuffer(rawContent) ? rawContent : Buffer.from(rawContent, "utf8");
    totalBytes += content.length;
    if (content.length > 25 * 1024 * 1024) {
      throw new Error("File exceeds Cloudflare's 25 MB file limit: " + filePath);
    }
    files[filePath] = content;
  }

  if (totalBytes > 20 * 1024 * 1024) {
    throw new Error("Total deployment content exceeds the 20 MB A² Builder limit.");
  }

  if (!Object.keys(files).some(name => name.toLowerCase() === "index.html")) {
    throw new Error("Your project must include an index.html file.");
  }

  return files;
}

async function cloudflareRequest(path, options = {}) {
  const { token } = getCloudflareSettings();
  const response = await fetch(CLOUDFLARE_API_BASE + path, {
    ...options,
    headers: {
      Authorization: "Bearer " + token,
      ...(options.headers || {})
    },
    signal: options.signal || AbortSignal.timeout(60000)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    const detail = (data.errors || [])
      .map(item => item.message)
      .filter(Boolean)
      .join("; ");
    throw new Error(detail || data.message || ("Cloudflare API returned HTTP " + response.status));
  }
  return data;
}

async function ensureCloudflarePagesProject(accountId, projectName) {
  const basePath = "/accounts/" + encodeURIComponent(accountId) + "/pages/projects/" +
    encodeURIComponent(projectName);

  try {
    await cloudflareRequest(basePath, { method: "GET" });
    return;
  } catch (error) {
    // Only try creating the project when it does not already exist.
    if (!/404|not found|could not find|project/i.test(getErrorMessage(error))) {
      // Cloudflare's error wording varies; project creation is idempotently
      // attempted below, and an "already exists" response is handled there.
    }
  }

  try {
    await cloudflareRequest("/accounts/" + encodeURIComponent(accountId) + "/pages/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: projectName,
        production_branch: "main",
        deployment_configs: {
          production: { compatibility_date: "2025-01-01" }
        }
      })
    });
  } catch (error) {
    // If it already exists, allow the deployment to continue.
    const message = getErrorMessage(error).toLowerCase();
    if (!message.includes("already exists") && !message.includes("already been taken") &&
        !message.includes("project name")) {
      throw error;
    }
  }
}

async function deployFilesToCloudflarePages(files, projectName) {
  const { token, accountId } = getCloudflareSettings();
  if (!token || !accountId) {
    throw new Error(
      "Cloudflare is not configured in Render. Add CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID to Render Environment Variables."
    );
  }

  await ensureCloudflarePagesProject(accountId, projectName);

  const projectPath = "/accounts/" + encodeURIComponent(accountId) +
    "/pages/projects/" + encodeURIComponent(projectName);

  const tokenResult = await cloudflareRequest(projectPath + "/upload-token", {
    method: "GET"
  });
  const uploadJwt = tokenResult.result && tokenResult.result.jwt;
  if (!uploadJwt) throw new Error("Cloudflare did not return an asset upload token.");

  const assets = Object.entries(files).map(([filePath, content]) => {
    const hash = crypto.createHash("md5").update(content).digest("hex");
    return { filePath, content, hash, contentType: getAssetContentType(filePath) };
  });

  const missingResult = await (async () => {
    const response = await fetch(CLOUDFLARE_API_BASE + "/pages/assets/check-missing", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + uploadJwt,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ hashes: assets.map(asset => asset.hash) }),
      signal: AbortSignal.timeout(60000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      throw new Error(
        (data.errors || []).map(item => item.message).filter(Boolean).join("; ") ||
        "Cloudflare could not check which files need uploading."
      );
    }
    return Array.isArray(data.result) ? data.result : [];
  })();

  const missingSet = new Set(missingResult);
  const missingAssets = assets.filter(asset => missingSet.has(asset.hash));

  // Cloudflare accepts a batch of base64-encoded asset values.
  for (let offset = 0; offset < missingAssets.length; offset += 20) {
    const batch = missingAssets.slice(offset, offset + 20).map(asset => ({
      key: asset.hash,
      value: asset.content.toString("base64"),
      base64: true,
      metadata: { contentType: asset.contentType }
    }));

    const response = await fetch(CLOUDFLARE_API_BASE + "/pages/assets/upload", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + uploadJwt,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(batch),
      signal: AbortSignal.timeout(60000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      throw new Error(
        (data.errors || []).map(item => item.message).filter(Boolean).join("; ") ||
        "Cloudflare failed to upload project assets."
      );
    }
  }

  // Register newly uploaded hashes before asking Pages to build the manifest.
  // Cloudflare's direct-upload workflow requires this step after /assets/upload.
  if (missingAssets.length) {
    const upsertResponse = await fetch(CLOUDFLARE_API_BASE + "/pages/assets/upsert-hashes", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + uploadJwt,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ hashes: missingAssets.map(asset => asset.hash) }),
      signal: AbortSignal.timeout(60000)
    });
    const upsertData = await upsertResponse.json().catch(() => ({}));
    if (!upsertResponse.ok || upsertData.success === false) {
      throw new Error(
        (upsertData.errors || []).map(item => item.message).filter(Boolean).join("; ") ||
        "Cloudflare could not register the uploaded website assets."
      );
    }
  }

  // Pages deployment manifests use root-relative paths such as /index.html.
  const manifest = {};
  for (const asset of assets) {
    const rootPath = "/" + asset.filePath.replace(/^\/+/, "");
    manifest[rootPath] = asset.hash;
  }

  const form = new FormData();
  form.append("manifest", JSON.stringify(manifest));
  form.append("branch", "main");
  form.append("commit_dirty", "false");
  form.append("commit_message", "Deployed by A² Builder");

  const deployment = await cloudflareRequest(projectPath + "/deployments", {
    method: "POST",
    body: form
  });

  const result = deployment.result || {};
  const url = result.url ||
    (Array.isArray(result.aliases) && result.aliases[0]) ||
    (result.subdomain ? "https://" + result.subdomain + ".pages.dev" :
      "https://" + projectName + ".pages.dev");

  return {
    projectName,
    url,
    deploymentId: result.id || null,
    status: result.latest_stage?.status || "queued",
    filesDeployed: assets.length
  };
}

// Safe status endpoint: reports configuration without exposing secrets.
app.get("/api/deploy/status", (req, res) => {
  const config = getCloudflareSettings();
  res.json({
    success: true,
    provider: "Cloudflare Pages",
    configured: Boolean(config.token && config.accountId),
    projectConfigured: Boolean(config.defaultProject),
    endpoint: "/api/deploy"
  });
});

// Deploy generated website files to a free Cloudflare Pages subdomain.
// Expected JSON: { "projectName": "royal-styles", "files": { "index.html": "...", "style.css": "...", "script.js": "..." } }
app.post("/api/deploy", async (req, res) => {
  try {
    const body = req.body || {};
    const config = getCloudflareSettings();

    const suppliedName = body.projectName || body.project_name || body.name ||
      config.defaultProject || ("a2-site-" + Date.now().toString(36));
    const projectName = cleanPagesProjectName(suppliedName);
    const files = normalizeDeploymentFiles(body.files || body.projectFiles || body.project);

    const result = await deployFilesToCloudflarePages(files, projectName);
    res.status(200).json({
      success: true,
      message: "Website deployment request completed.",
      provider: "Cloudflare Pages",
      ...result
    });
  } catch (error) {
    console.error("Cloudflare Pages deployment failed:", getErrorMessage(error));
    res.status(502).json({
      success: false,
      error: getErrorMessage(error),
      provider: "Cloudflare Pages"
    });
  }
});

console.log("A² Builder Cloudflare Pages deployment routes loaded.");



/* =========================================
   A² BUILDER ANDROID BUILD GATEWAY
   Forward requests to a separately secured Android build runner.
   This endpoint does not compile APK/AAB files itself.
========================================= */

const ANDROID_BUILD_SERVICE_URL = process.env.ANDROID_BUILD_SERVICE_URL || "";
const ANDROID_BUILD_SERVICE_TOKEN = process.env.ANDROID_BUILD_SERVICE_TOKEN || "";

function validAndroidPackageId(value) {
  return typeof value === "string" &&
    value.length <= 200 &&
    /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(value);
}

function validateAndroidBuildRequest(body) {
  const allowedTypes = new Set(["apk-debug", "apk-release", "aab-release"]);
  if (!body || !allowedTypes.has(String(body.type || ""))) {
    return { error: "Unsupported build type. Use apk-debug, apk-release, or aab-release." };
  }

  const config = body.config;
  const files = body.files;
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return { error: "Android app configuration is required." };
  }
  if (!validAndroidPackageId(String(config.packageId || ""))) {
    return { error: "Enter a valid package ID, for example com.example.myapp." };
  }
  const appName = String(config.appName || "").trim();
  if (!appName || appName.length > 80) {
    return { error: "App name is required and must be 80 characters or fewer." };
  }
  if (!files || typeof files !== "object" || Array.isArray(files)) {
    return { error: "Project files are required." };
  }

  const names = Object.keys(files);
  if (!names.length || names.length > 200) {
    return { error: "Project must contain 1–200 files." };
  }

  let totalBytes = 0;
  const safeFiles = {};
  for (const name of names) {
    if (typeof name !== "string" || name.length > 240 ||
        name.startsWith("/") || name.includes("\\") ||
        name.split("/").some(part => part === ".." || part === "." || !part)) {
      return { error: "Project contains an unsafe file path." };
    }
    const content = files[name];
    if (typeof content !== "string" && typeof content !== "number" && typeof content !== "boolean") {
      return { error: `File "${name}" must contain text.` };
    }
    const textContent = String(content);
    totalBytes += Buffer.byteLength(textContent, "utf8");
    if (totalBytes > 8 * 1024 * 1024) {
      return { error: "Project files exceed the 8 MB build request limit." };
    }
    safeFiles[name] = textContent;
  }

  const intInRange = (value, fallback, min, max) =>
    Math.max(min, Math.min(max, Number.parseInt(value, 10) || fallback));

  return {
    value: {
      type: body.type,
      config: {
        appName,
        packageId: String(config.packageId),
        versionName: String(config.versionName || "1.0.0").slice(0, 32),
        versionCode: intInRange(config.versionCode, 1, 1, 2100000000),
        minSdk: intInRange(config.minSdk, 23, 21, 35),
        targetSdk: intInRange(config.targetSdk, 35, 23, 35),
        orientation: ["portrait", "landscape", "auto"].includes(config.orientation) ? config.orientation : "auto",
        theme: ["light", "dark", "system"].includes(config.theme) ? config.theme : "system",
        permissions: config.permissions && typeof config.permissions === "object" ? config.permissions : {},
        admob: config.admob && typeof config.admob === "object" ? config.admob : {},
        monetization: config.monetization && typeof config.monetization === "object" ? {
          ads: Boolean(config.monetization.ads),
          subscriptions: Boolean(config.monetization.subscriptions),
          oneTimeDigitalPurchases: Boolean(config.monetization.oneTimeDigitalPurchases),
          physicalGoodsAndServices: Boolean(config.monetization.physicalGoodsAndServices),
          affiliateLinks: Boolean(config.monetization.affiliateLinks),
          sponsoredContent: Boolean(config.monetization.sponsoredContent),
          billingMode: ["test", "production"].includes(config.monetization.billingMode) ? config.monetization.billingMode : "test",
          premiumEntitlement: typeof config.monetization.premiumEntitlement === "string" ? config.monetization.premiumEntitlement.slice(0, 120) : "premium"
        } : {},
        notifications: config.notifications && typeof config.notifications === "object" ? config.notifications : {},
        assets: config.assets && typeof config.assets === "object" ? config.assets : {}
      },
      files: safeFiles
    }
  };
}

// Request deduplication is intentionally scoped to the backend process. It protects
// the same submitted request from duplicate taps/replays; it is not a durable job DB.
const androidBuildRequestCache = new Map();
const ANDROID_BUILD_REQUEST_TTL_MS = 2 * 60 * 60 * 1000;
const ANDROID_BUILD_REQUEST_CACHE_LIMIT = 500;

function pruneAndroidBuildRequestCache() {
  const now = Date.now();
  for (const [key, record] of androidBuildRequestCache) {
    if (!record || record.expiresAt <= now) androidBuildRequestCache.delete(key);
  }
  while (androidBuildRequestCache.size > ANDROID_BUILD_REQUEST_CACHE_LIMIT) {
    const oldestKey = androidBuildRequestCache.keys().next().value;
    if (oldestKey === undefined) break;
    androidBuildRequestCache.delete(oldestKey);
  }
}

function validAndroidRequestId(value) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(value);
}

async function androidRunnerFetch(pathname, options = {}, timeoutMs = 12000) {
  const runnerBase = new URL(ANDROID_BUILD_SERVICE_URL);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(new URL(pathname, runnerBase), {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

app.get("/api/android/status", async (req, res) => {
  const configured = Boolean(ANDROID_BUILD_SERVICE_URL && ANDROID_BUILD_SERVICE_TOKEN);
  if (!configured) {
    return res.json({
      success: true,
      configured: false,
      connected: false,
      status: "runner_not_configured",
      message: "Android build runner credentials are missing. Configure ANDROID_BUILD_SERVICE_URL and ANDROID_BUILD_SERVICE_TOKEN in the backend host's environment settings."
    });
  }

  try {
    const base = new URL(ANDROID_BUILD_SERVICE_URL);
    if (base.protocol !== 'https:' && base.hostname !== 'localhost') {
      return res.status(500).json({ success: false, configured: true, connected: false, status: 'runner_url_invalid', error: 'Build runner URL must use HTTPS.' });
    }
    // /health is public on the runner and does not disclose the shared secret.
    const response = await androidRunnerFetch('/health', {}, 10000);
    const runner = await response.json().catch(() => ({}));
    const connected = response.ok && runner.ok === true;
    return res.json({
      success: true,
      configured: true,
      connected,
      status: connected ? 'runner_online' : 'runner_unreachable',
      runner: connected ? { service: runner.service || 'Android build runner', queued: Number(runner.queued) || 0, active: Number(runner.active) || 0 } : undefined,
      message: connected
        ? 'Android runner is reachable. A successful health check does not guarantee that the next compilation will succeed.'
        : `Android runner health check returned HTTP ${response.status}. Check the runner service and its logs.`
    });
  } catch (error) {
    const timedOut = error && error.name === 'AbortError';
    return res.status(503).json({
      success: false,
      configured: true,
      connected: false,
      status: 'runner_unreachable',
      retryable: true,
      error: timedOut ? 'Android runner health check timed out.' : 'Could not connect to the Android runner. Check the runner URL and service logs.'
    });
  }
});

app.get("/api/android/build/:jobId", async (req, res) => {
  const jobId = String(req.params.jobId || "");
  if (!/^[A-Za-z0-9-]{8,80}$/.test(jobId)) {
    return res.status(400).json({ success: false, code: 'ANDROID_BUILD_ID_INVALID', error: "Invalid build job ID." });
  }
  if (!ANDROID_BUILD_SERVICE_URL || !ANDROID_BUILD_SERVICE_TOKEN) {
    return res.status(503).json({ success: false, retryable: false, code: 'ANDROID_BUILD_RUNNER_NOT_CONFIGURED', error: "Android build runner is not configured." });
  }

  try {
    const upstream = await androidRunnerFetch(`/api/builds/${encodeURIComponent(jobId)}`, {
      headers: { "Authorization": `Bearer ${ANDROID_BUILD_SERVICE_TOKEN}` }
    }, 15000);
    const data = await upstream.json().catch(() => ({}));
    if (upstream.ok && data && data.success && data.status === "success" && data.downloadUrl) {
      data.downloadUrl = `/api/android/build/${encodeURIComponent(jobId)}/download`;
    }
    if (!upstream.ok) {
      const notFound = upstream.status === 404;
      return res.status(notFound ? 404 : 503).json({
        success: false,
        code: notFound ? 'ANDROID_BUILD_JOB_NOT_FOUND' : 'ANDROID_RUNNER_STATUS_UNAVAILABLE',
        retryable: !notFound,
        jobId,
        status: notFound ? 'unknown' : 'checking',
        error: data.error || data.message || (notFound
          ? 'The runner no longer has this job record. The build outcome cannot be confirmed.'
          : `Android runner status endpoint returned HTTP ${upstream.status}.`)
      });
    }
    return res.status(200).json(data);
  } catch (error) {
    const timedOut = error && error.name === 'AbortError';
    return res.status(503).json({
      success: false,
      code: timedOut ? 'ANDROID_RUNNER_STATUS_TIMEOUT' : 'ANDROID_RUNNER_STATUS_UNAVAILABLE',
      retryable: true,
      jobId,
      status: 'checking',
      error: timedOut
        ? 'Android runner did not respond to this status check in time. The build has not been marked failed.'
        : 'Could not reach the Android runner for a status check. The build has not been marked failed.'
    });
  }
});

app.get("/api/android/build/:jobId/download", async (req, res) => {
  const jobId = String(req.params.jobId || "");
  if (!/^[A-Za-z0-9-]{8,80}$/.test(jobId)) return res.status(400).json({ success: false, error: "Invalid build job ID." });
  if (!ANDROID_BUILD_SERVICE_URL || !ANDROID_BUILD_SERVICE_TOKEN) return res.status(503).json({ success: false, error: "Android build runner is not configured." });
  try {
    const upstream = await androidRunnerFetch(`/api/builds/${encodeURIComponent(jobId)}/download`, {
      headers: { "Authorization": `Bearer ${ANDROID_BUILD_SERVICE_TOKEN}` }
    }, 45000);
    if (!upstream.ok) {
      const data = await upstream.json().catch(() => ({}));
      return res.status(upstream.status).json({ success: false, error: data.error || "Build artifact is not available yet." });
    }
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/octet-stream");
    const disposition = upstream.headers.get("content-disposition");
    if (disposition) res.setHeader("Content-Disposition", disposition);
    const bytes = Buffer.from(await upstream.arrayBuffer());
    return res.status(200).send(bytes);
  } catch (error) {
    const timedOut = error && error.name === 'AbortError';
    return res.status(502).json({ success: false, retryable: true, error: timedOut ? "Artifact download timed out. The build result may still be available." : "Could not download artifact from Android runner." });
  }
});

async function forwardAndroidBuildToRunner(payload, requestId) {
  let runnerBase;
  try {
    runnerBase = new URL(ANDROID_BUILD_SERVICE_URL);
    if (runnerBase.protocol !== "https:" && runnerBase.hostname !== "localhost") {
      return { status: 500, body: { success: false, code: 'ANDROID_RUNNER_URL_INVALID', retryable: false, requestId, error: "Build runner URL must use HTTPS." } };
    }
  } catch {
    return { status: 500, body: { success: false, code: 'ANDROID_RUNNER_URL_INVALID', retryable: false, requestId, error: "ANDROID_BUILD_SERVICE_URL is not a valid URL." } };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const runnerResponse = await fetch(new URL("/api/builds", runnerBase), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ANDROID_BUILD_SERVICE_TOKEN}`,
        "Idempotency-Key": requestId,
        "X-Request-ID": requestId
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const data = await runnerResponse.json().catch(() => ({}));
    if (!runnerResponse.ok) {
      // A validation/auth/queue rejection is a response from the runner, not a missing backend route.
      const isClientRejection = runnerResponse.status >= 400 && runnerResponse.status < 500;
      return {
        status: isClientRejection ? runnerResponse.status : 502,
        body: {
          success: false,
          code: isClientRejection ? 'ANDROID_RUNNER_REJECTED_REQUEST' : 'ANDROID_RUNNER_UPSTREAM_ERROR',
          retryable: !isClientRejection,
          requestId,
          upstreamStatus: runnerResponse.status,
          error: data.error || data.message || `Android runner returned HTTP ${runnerResponse.status}.`
        }
      };
    }
    if (!(data.jobId || data.artifactUrl || data.downloadUrl)) {
      return {
        status: 502,
        body: {
          success: false,
          code: 'ANDROID_RUNNER_INVALID_RESPONSE',
          retryable: true,
          requestId,
          error: "The runner responded but did not return a job ID or artifact URL. The build outcome is not confirmed; check the runner logs before retrying."
        }
      };
    }
    return {
      status: 202,
      body: {
        success: true,
        requestId,
        jobId: data.jobId || null,
        status: data.status || (data.jobId ? 'queued' : 'success'),
        artifactUrl: data.artifactUrl || data.downloadUrl || null,
        message: data.message || (data.jobId ? "Build accepted by Android runner." : "Runner returned an artifact.")
      }
    };
  } catch (error) {
    const timedOut = error && error.name === 'AbortError';
    return {
      status: 502,
      body: {
        success: false,
        code: timedOut ? 'ANDROID_BUILD_REQUEST_TIMEOUT' : 'ANDROID_RUNNER_UNREACHABLE',
        retryable: true,
        requestId,
        error: timedOut
          ? "The runner did not acknowledge this build request within 20 seconds. It may still have received the request; check the existing runner logs before submitting another build."
          : "Could not confirm a connection to the Android runner. The request outcome is unknown; check backend/runner logs before submitting another build."
      }
    };
  } finally {
    clearTimeout(timer);
  }
}

app.post("/api/android/build", async (req, res) => {
  const checked = validateAndroidBuildRequest(req.body);
  if (checked.error) return res.status(400).json({ success: false, code: 'ANDROID_BUILD_REQUEST_INVALID', retryable: false, error: checked.error });

  if (!ANDROID_BUILD_SERVICE_URL || !ANDROID_BUILD_SERVICE_TOKEN) {
    return res.status(503).json({
      success: false,
      code: "ANDROID_BUILD_RUNNER_NOT_CONFIGURED",
      retryable: false,
      error: "Android build runner is not configured. No APK or AAB was created."
    });
  }

  const suppliedRequestId = req.get('Idempotency-Key') || req.get('X-Request-ID') || req.body?.requestId || '';
  if (suppliedRequestId && !validAndroidRequestId(suppliedRequestId)) {
    return res.status(400).json({ success: false, code: 'ANDROID_BUILD_REQUEST_ID_INVALID', retryable: false, error: 'Request ID must be 8–128 characters using letters, numbers, dots, underscores, colons, or hyphens.' });
  }
  const requestId = suppliedRequestId || crypto.randomUUID();
  pruneAndroidBuildRequestCache();

  const cached = androidBuildRequestCache.get(requestId);
  if (cached && cached.expiresAt > Date.now()) {
    try {
      const prior = await cached.promise;
      return res.status(prior.status).json({ ...prior.body, deduplicated: true });
    } catch {
      // A failed cache promise falls through to a new tracked request only if it was removed.
      return res.status(502).json({ success: false, code: 'ANDROID_BUILD_REQUEST_OUTCOME_UNKNOWN', retryable: true, requestId, error: 'A previous request with this ID is still unresolved. Check its status/logs instead of submitting it again.' });
    }
  }

  const record = { expiresAt: Date.now() + ANDROID_BUILD_REQUEST_TTL_MS, promise: null };
  record.promise = forwardAndroidBuildToRunner(checked.value, requestId)
    .then(result => {
      record.expiresAt = Date.now() + ANDROID_BUILD_REQUEST_TTL_MS;
      return result;
    })
    .catch(error => ({
      status: 502,
      body: { success: false, code: 'ANDROID_BUILD_REQUEST_OUTCOME_UNKNOWN', retryable: true, requestId, error: getErrorMessage(error) }
    }));
  androidBuildRequestCache.set(requestId, record);
  pruneAndroidBuildRequestCache();

  const result = await record.promise;
  return res.status(result.status).json(result.body);
});

console.log("A² Builder Android build gateway routes loaded.");


// Handle unknown routes.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found.",
    path: req.path,
    method: req.method
  });
});

// Central error handler.
app.use((err, req, res, next) => {
  console.error("A² Builder server error:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    success: false,
    error: "An internal server error occurred."
  });
});

// Start the server only when this file runs directly.
if (require.main === module) {
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log("-------------------------------------");
    console.log("A² BUILDER BACKEND");
    console.log("-------------------------------------");
    console.log("Port:", PORT);
    console.log("Health: /api/health");
    console.log("AI: /api/ai");
    console.log("Generation: /api/generate");
    console.log("Providers: /api/providers");
    console.log("Media: /api/media/status (Pexels)");
    console.log("Media aliases: /api/pixel/photos and /api/pixel/videos");
    console.log("Website import: /api/convert-site");
    console.log("Configured AI providers:", getConfiguredProviders().length);
    console.log("-------------------------------------");
  });

  server.requestTimeout = 120000;
  server.headersTimeout = 125000;

  process.on("unhandledRejection", (reason) => {
    console.error(
      "Unhandled promise rejection:",
      getErrorMessage(reason)
    );
  });
}

module.exports = app;
