"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();

const PORT = process.env.PORT || 5000;

// ======================================================
// A² BUILDER BACKEND
// VERSION 3.0
// ======================================================

// ------------------------------------------------------
// MIDDLEWARE
// ------------------------------------------------------

app.use(cors());

app.use(
  express.json({
    limit: "10mb"
  })
);

// ------------------------------------------------------
// GLOBAL CONFIGURATION
// ------------------------------------------------------

const CONFIG = {

  // Maximum time an external API request can run
  timeout: Number(
    process.env.AI_TIMEOUT || 60000
  ),

  // ----------------------------------------------------
  // GEMINI
  // ----------------------------------------------------

  gemini: {
    key: process.env.GEMINI_API_KEY,

    model:
      process.env.GEMINI_MODEL ||
      "gemini-2.5-flash"
  },

  // ----------------------------------------------------
  // OPENROUTER
  // ----------------------------------------------------

  openrouter: {
    key:
      process.env.OPENROUTER_API_KEY,

    model:
      process.env.OPENROUTER_MODEL ||
      "openai/gpt-oss-20b"
  },

  // ----------------------------------------------------
  // MISTRAL
  // ----------------------------------------------------

  mistral: {
    key:
      process.env.MISTRAL_API_KEY,

    model:
      process.env.MISTRAL_MODEL ||
      "mistral-small-latest"
  },

  // ----------------------------------------------------
  // GROQ
  // ----------------------------------------------------

  groq: {
    key:
      process.env.GROQ_API_KEY,

    model:
      process.env.GROQ_MODEL ||
      "llama-3.3-70b-versatile"
  },

  // ----------------------------------------------------
  // CEREBRAS
  // ----------------------------------------------------

  cerebras: {
    key:
      process.env.CEREBRAS_API_KEY,

    model:
      process.env.CEREBRAS_MODEL ||
      "llama-3.3-70b"
  },

  // ----------------------------------------------------
  // TOGETHER AI
  // ----------------------------------------------------

  together: {
    key:
      process.env.TOGETHER_API_KEY,

    model:
      process.env.TOGETHER_MODEL ||
      "meta-llama/Llama-3.3-70B-Instruct-Turbo"
  },

  // ----------------------------------------------------
  // COHERE
  // ----------------------------------------------------

  cohere: {
    key:
      process.env.COHERE_API_KEY,

    model:
      process.env.COHERE_MODEL ||
      "command-a-plus-05-2026"
  },

  // ----------------------------------------------------
  // FIREWORKS AI
  // ----------------------------------------------------

  fireworks: {
    key:
      process.env.FIREWORKS_API_KEY,

    model:
      process.env.FIREWORKS_MODEL ||
      "accounts/fireworks/models/deepseek-v4-flash"
  },

  // ----------------------------------------------------
  // PEXELS
  // ----------------------------------------------------

  pexels: {
    key:
      process.env.PEXELS_API_KEY
  }
};

// ======================================================
// BASIC HELPERS
// ======================================================

function hasKey(value) {

  return (
    typeof value === "string" &&
    value.trim().length > 0
  );

}

// ======================================================
// GET CONFIGURED AI PROVIDERS
// ======================================================

function getConfiguredProviders() {

  const providers = [];

  if (hasKey(CONFIG.gemini.key)) {
    providers.push("gemini");
  }

  if (hasKey(CONFIG.openrouter.key)) {
    providers.push("openrouter");
  }

  if (hasKey(CONFIG.mistral.key)) {
    providers.push("mistral");
  }

  if (hasKey(CONFIG.groq.key)) {
    providers.push("groq");
  }

  if (hasKey(CONFIG.cerebras.key)) {
    providers.push("cerebras");
  }

  if (hasKey(CONFIG.together.key)) {
    providers.push("together");
  }

  if (hasKey(CONFIG.cohere.key)) {
    providers.push("cohere");
  }

  if (hasKey(CONFIG.fireworks.key)) {
    providers.push("fireworks");
  }

  return providers;
}

// ======================================================
// CLEAN AI OUTPUT
// ======================================================

function cleanAIOutput(text) {

  if (!text) {
    return "";
  }

  let output = String(text).trim();

  // Remove opening markdown code fences
  output = output.replace(
    /^```(?:html|javascript|js|node|json)?\s*/i,
    ""
  );

  // Remove closing markdown code fence
  output = output.replace(
    /\s*```$/i,
    ""
  );

  return output.trim();

}

// ======================================================
// DEMO FALLBACK
// ======================================================

function demoResponse(prompt, mode = "website") {

  if (mode === "api") {

    return `const express = require("express");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "A² Builder generated API"
  });
});

app.get("/api/hello", (req, res) => {
  res.json({
    success: true,
    message: "Hello from your generated API!"
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Generated API running on port " + PORT);
});`;

  }

  return `<!DOCTYPE html>

<html lang="en">

<head>

  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>A² Builder Demo</title>

  <script src="https://cdn.tailwindcss.com"></script>

</head>

<body class="bg-slate-950 text-white min-h-screen">

  <main class="min-h-screen flex items-center justify-center p-6">

    <section
      class="max-w-xl w-full bg-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl"
    >

      <div class="text-5xl mb-5">
        🚀
      </div>

      <h1 class="text-3xl font-bold mb-3">
        A² Builder
      </h1>

      <p class="text-slate-300 mb-6">
        AI demo mode is currently active.
      </p>

      <div
        class="bg-slate-950 rounded-xl p-4 border border-slate-800"
      >

        <p class="text-sm text-slate-400 mb-2">
          Your prompt:
        </p>

        <p class="text-amber-300 break-words">
          ${String(prompt)
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")}
        </p>

      </div>

      <p class="text-sm text-slate-500 mt-6">
        Configure at least one AI API key on the backend
        to enable live AI generation.
      </p>

    </section>

  </main>

</body>

</html>`;
}

// ======================================================
// SAFE ERROR MESSAGE
// ======================================================

function getErrorMessage(error) {

  if (!error) {
    return "Unknown error";
  }

  if (error.name === "AbortError") {
    return "Request timed out.";
  }

  return (
    error.message ||
    "Unknown API error."
  );

  }
// ======================================================
// A² BUILDER — AI PROVIDER CONNECTIONS
// BATCH 2/6
// ======================================================


// ======================================================
// REQUEST WITH TIMEOUT
// ======================================================

async function fetchWithTimeout(url, options = {}) {

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, CONFIG.timeout);

  try {

    return await fetch(url, {
      ...options,
      signal: controller.signal
    });

  } finally {

    clearTimeout(timeout);

  }

}


// ======================================================
// GEMINI
// ======================================================

async function callGemini(prompt, systemPrompt) {

  if (!hasKey(CONFIG.gemini.key)) {

    throw new Error(
      "Gemini API key is not configured."
    );

  }

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    `${CONFIG.gemini.model}:generateContent` +
    `?key=${CONFIG.gemini.key}`;

  const response = await fetchWithTimeout(
    url,
    {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({

        systemInstruction: {

          parts: [
            {
              text: systemPrompt
            }
          ]

        },

        contents: [

          {

            role: "user",

            parts: [
              {
                text: prompt
              }
            ]

          }

        ]

      })

    }
  );

  const data =
    await response.json();

  if (!response.ok) {

    throw new Error(
      data?.error?.message ||
      `Gemini returned HTTP ${response.status}`
    );

  }

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("") ||
    "";

  if (!text.trim()) {

    throw new Error(
      "Gemini returned an empty response."
    );

  }

  return text;

}


// ======================================================
// GENERIC OPENAI-COMPATIBLE PROVIDER
// ======================================================

async function callCompatibleProvider({

  name,

  key,

  model,

  url,

  prompt,

  systemPrompt,

  extraHeaders = {}

}) {

  if (!hasKey(key)) {

    throw new Error(
      `${name} API key is not configured.`
    );

  }

  const response =
    await fetchWithTimeout(
      url,
      {

        method: "POST",

        headers: {

          "Content-Type":
            "application/json",

          "Authorization":
            `Bearer ${key}`,

          ...extraHeaders

        },

        body: JSON.stringify({

          model,

          messages: [

            {

              role: "system",

              content:
                systemPrompt

            },

            {

              role: "user",

              content:
                prompt

            }

          ],

          temperature: 0.2

        })

      }
    );

  const data =
    await response.json();

  if (!response.ok) {

    throw new Error(

      data?.error?.message ||

      data?.message ||

      `${name} returned HTTP ${response.status}`

    );

  }

  const text =

    data?.choices?.[0]?.message?.content ||

    data?.choices?.[0]?.text ||

    "";

  if (!text.trim()) {

    throw new Error(
      `${name} returned an empty response.`
    );

  }

  return text;

}


// ======================================================
// OPENROUTER
// ======================================================

async function callOpenRouter(
  prompt,
  systemPrompt
) {

  return callCompatibleProvider({

    name: "OpenRouter",

    key:
      CONFIG.openrouter.key,

    model:
      CONFIG.openrouter.model,

    url:
      "https://openrouter.ai/api/v1/chat/completions",

    prompt,

    systemPrompt,

    extraHeaders: {

      "HTTP-Referer":
        process.env.APP_URL ||
        "https://a2-builder.app",

      "X-Title":
        "A² Builder"

    }

  });

}


// ======================================================
// MISTRAL
// ======================================================

async function callMistral(
  prompt,
  systemPrompt
) {

  return callCompatibleProvider({

    name: "Mistral",

    key:
      CONFIG.mistral.key,

    model:
      CONFIG.mistral.model,

    url:
      "https://api.mistral.ai/v1/chat/completions",

    prompt,

    systemPrompt

  });

}


// ======================================================
// GROQ
// ======================================================

async function callGroq(
  prompt,
  systemPrompt
) {

  return callCompatibleProvider({

    name: "Groq",

    key:
      CONFIG.groq.key,

    model:
      CONFIG.groq.model,

    url:
      "https://api.groq.com/openai/v1/chat/completions",

    prompt,

    systemPrompt

  });

}


// ======================================================
// CEREBRAS
// ======================================================

async function callCerebras(
  prompt,
  systemPrompt
) {

  return callCompatibleProvider({

    name: "Cerebras",

    key:
      CONFIG.cerebras.key,

    model:
      CONFIG.cerebras.model,

    url:
      "https://api.cerebras.ai/v1/chat/completions",

    prompt,

    systemPrompt

  });

}


// ======================================================
// TOGETHER AI
// ======================================================

async function callTogether(
  prompt,
  systemPrompt
) {

  return callCompatibleProvider({

    name: "Together AI",

    key:
      CONFIG.together.key,

    model:
      CONFIG.together.model,

    url:
      "https://api.together.xyz/v1/chat/completions",

    prompt,

    systemPrompt

  });

}


// ======================================================
// COHERE
// ======================================================

async function callCohere(
  prompt,
  systemPrompt
) {

  if (!hasKey(CONFIG.cohere.key)) {

    throw new Error(
      "Cohere API key is not configured."
    );

  }

  const response =
    await fetchWithTimeout(

      "https://api.cohere.com/v2/chat",

      {

        method: "POST",

        headers: {

          "Content-Type":
            "application/json",

          "Authorization":
            `Bearer ${CONFIG.cohere.key}`

        },

        body: JSON.stringify({

          model:
            CONFIG.cohere.model,

          messages: [

            {

              role: "system",

              content:
                systemPrompt

            },

            {

              role: "user",

              content:
                prompt

            }

          ],

          temperature: 0.2

        })

      }

    );

  const data =
    await response.json();

  if (!response.ok) {

    throw new Error(

      data?.message ||

      data?.error?.message ||

      `Cohere returned HTTP ${response.status}`

    );

  }

  let text = "";

  if (
    Array.isArray(
      data?.message?.content
    )
  ) {

    text =
      data.message.content
        .map(item =>
          item?.text || ""
        )
        .join("");

  } else if (
    typeof data?.message?.content ===
    "string"
  ) {

    text =
      data.message.content;

  }

  if (!text.trim()) {

    throw new Error(
      "Cohere returned an empty response."
    );

  }

  return text;

}


// ======================================================
// FIREWORKS AI
// ======================================================

async function callFireworks(
  prompt,
  systemPrompt
) {

  return callCompatibleProvider({

    name: "Fireworks AI",

    key:
      CONFIG.fireworks.key,

    model:
      CONFIG.fireworks.model,

    url:
      "https://api.fireworks.ai/inference/v1/chat/completions",

    prompt,

    systemPrompt

  });

}
// ======================================================
// A² BUILDER — PROVIDER SELECTION & FALLBACK
// BATCH 3/6
// ======================================================


// ======================================================
// ALL AI PROVIDER FUNCTIONS
// ======================================================

const PROVIDER_FUNCTIONS = {

  gemini:
    callGemini,

  openrouter:
    callOpenRouter,

  mistral:
    callMistral,

  groq:
    callGroq,

  cerebras:
    callCerebras,

  together:
    callTogether,

  cohere:
    callCohere,

  fireworks:
    callFireworks

};


// ======================================================
// AUTOMATIC PROVIDER ORDER
// ======================================================

const DEFAULT_PROVIDER_ORDER = [

  "gemini",

  "mistral",

  "openrouter",

  "groq",

  "cerebras",

  "together",

  "cohere",

  "fireworks"

];


// ======================================================
// GET PROVIDER ORDER
// ======================================================

function getProviderOrder(
  requestedProvider = "auto"
) {

  const configured =
    getConfiguredProviders();


  // ----------------------------------------------------
  // USER SPECIFICALLY SELECTED A PROVIDER
  // ----------------------------------------------------

  if (
    requestedProvider &&
    requestedProvider !== "auto"
  ) {

    if (
      !PROVIDER_FUNCTIONS[
        requestedProvider
      ]
    ) {

      throw new Error(
        `Unknown AI provider: ${requestedProvider}`
      );

    }


    if (
      !configured.includes(
        requestedProvider
      )
    ) {

      throw new Error(
        `${requestedProvider} is not configured on the server.`
      );

    }


    return [
      requestedProvider
    ];

  }


  // ----------------------------------------------------
  // AUTOMATIC MODE
  // ----------------------------------------------------

  return DEFAULT_PROVIDER_ORDER.filter(
    provider =>
      configured.includes(provider)
  );

}


// ======================================================
// GENERATE USING AI
// ======================================================

async function generateWithAI({

  prompt,

  provider = "auto",

  systemPrompt,

  mode = "website"

}) {

  const providerOrder =
    getProviderOrder(provider);


  // ----------------------------------------------------
  // NO API KEYS CONFIGURED
  // ----------------------------------------------------

  if (
    providerOrder.length === 0
  ) {

    return {

      answer:
        demoResponse(
          prompt,
          mode
        ),

      provider:
        "demo-fallback",

      fallback:
        true,

      errors: [

        {
          provider:
            "system",

          error:
            "No AI API keys are configured."

        }

      ]

    };

  }


  // ----------------------------------------------------
  // STORE PROVIDER ERRORS
  // ----------------------------------------------------

  const errors = [];


  // ----------------------------------------------------
  // TRY PROVIDERS ONE BY ONE
  // ----------------------------------------------------

  for (
    const providerName
    of providerOrder
  ) {

    try {

      console.log(
        `🤖 Trying AI provider: ${providerName}`
      );


      const providerFunction =
        PROVIDER_FUNCTIONS[
          providerName
        ];


      if (
        typeof providerFunction !==
        "function"
      ) {

        throw new Error(
          `Provider function for ${providerName} is unavailable.`
        );

      }


      // ------------------------------------------------
      // CALL PROVIDER
      // ------------------------------------------------

      const answer =
        await providerFunction(
          prompt,
          systemPrompt
        );


      // ------------------------------------------------
      // CHECK RESPONSE
      // ------------------------------------------------

      if (
        answer &&
        String(answer).trim()
      ) {

        console.log(
          `✅ ${providerName} succeeded`
        );


        return {

          answer:
            cleanAIOutput(answer),

          provider:
            providerName,

          fallback:
            errors.length > 0,

          errors

        };

      }


      throw new Error(
        `${providerName} returned an empty response.`
      );


    } catch (error) {

      const message =
        getErrorMessage(error);


      console.error(
        `❌ ${providerName} failed: ${message}`
      );


      errors.push({

        provider:
          providerName,

        error:
          message

      });


      // Continue to the next provider.
      continue;

    }

  }


  // ----------------------------------------------------
  // ALL PROVIDERS FAILED
  // ----------------------------------------------------

  console.error(
    "❌ All configured AI providers failed."
  );


  return {

    answer:
      demoResponse(
        prompt,
        mode
      ),

    provider:
      "demo-fallback",

    fallback:
      true,

    errors

  };

}


// ======================================================
// TEST A SINGLE PROVIDER
// ======================================================

async function testProvider(
  providerName
) {

  const providers =
    getConfiguredProviders();


  if (
    !providers.includes(
      providerName
    )
  ) {

    return {

      provider:
        providerName,

      configured:
        false,

      success:
        false,

      error:
        "Provider is not configured."

    };

  }


  const testPrompt =
    "Reply with exactly: A2_BUILDER_TEST_OK";


  const testSystem =
    "You are testing an AI provider. " +
    "Return only the requested text.";


  try {

    const fn =
      PROVIDER_FUNCTIONS[
        providerName
      ];


    const answer =
      await fn(
        testPrompt,
        testSystem
      );


    return {

      provider:
        providerName,

      configured:
        true,

      success:
        Boolean(
          answer &&
          answer.trim()
        ),

      response:
        cleanAIOutput(answer)

    };


  } catch (error) {

    return {

      provider:
        providerName,

      configured:
        true,

      success:
        false,

      error:
        getErrorMessage(error)

    };

  }

}


// ======================================================
// TEST ALL CONFIGURED PROVIDERS
// ======================================================

async function testAllProviders() {

  const configured =
    getConfiguredProviders();


  const results = [];


  for (
    const provider
    of DEFAULT_PROVIDER_ORDER
  ) {

    if (
      !configured.includes(
        provider
      )
    ) {

      results.push({

        provider,

        configured:
          false,

        success:
          false,

        error:
          "API key not configured."

      });

      continue;

    }


    const result =
      await testProvider(
        provider
      );


    results.push(
      result
    );

  }


  return results;

}
// ======================================================
// A² BUILDER — AI API ROUTES
// BATCH 4/6
// ======================================================


// ======================================================
// MAIN AI GENERATION ENDPOINT
// ======================================================

app.post("/api/ai", async (req, res) => {

  try {

    const {
      prompt,
      provider = "auto",
      mode = "website"
    } = req.body || {};


    // --------------------------------------------------
    // VALIDATE PROMPT
    // --------------------------------------------------

    if (
      !prompt ||
      typeof prompt !== "string" ||
      !prompt.trim()
    ) {

      return res.status(400).json({

        success: false,

        error:
          "Prompt parameter is required."

      });

    }


    // --------------------------------------------------
    // VALIDATE MODE
    // --------------------------------------------------

    const allowedModes = [
      "website",
      "api"
    ];


    if (
      !allowedModes.includes(mode)
    ) {

      return res.status(400).json({

        success: false,

        error:
          "Invalid mode. Use 'website' or 'api'."

      });

    }


    // ==================================================
    // WEBSITE SYSTEM PROMPT
    // ==================================================

    let systemPrompt;


    if (mode === "website") {

      systemPrompt = `

You are A² Builder AI.

You are an expert frontend web developer.

Your job is to generate complete,
functional websites and web applications
from the user's instructions.

IMPORTANT OUTPUT RULES:

1. Return ONLY raw HTML.
2. Do NOT use Markdown.
3. Do NOT use triple backticks.
4. Put CSS inside a <style> tag.
5. Put JavaScript inside a <script> tag.
6. Make the website responsive.
7. Make buttons and interactive elements work.
8. Use modern HTML, CSS and JavaScript.
9. Tailwind CSS CDN may be used when useful.
10. Do not expose API keys or secrets.
11. Do not invent secret credentials.
12. Make the interface visually polished.
13. Make it usable on Android phones.
14. Use semantic HTML.
15. Include all required code in one HTML file.

The user's request is:

${prompt}

      `.trim();

    }


    // ==================================================
    // API / BACKEND SYSTEM PROMPT
    // ==================================================

    else {

      systemPrompt = `

You are A² Builder AI.

You are an expert Node.js backend
and API developer.

Your job is to generate complete,
functional backend APIs from the user's request.

IMPORTANT OUTPUT RULES:

1. Return ONLY executable JavaScript.
2. Do NOT use Markdown.
3. Do NOT use triple backticks.
4. Use Node.js.
5. Use Express when appropriate.
6. Use express.json().
7. Create proper REST API routes.
8. Return JSON responses where appropriate.
9. Use environment variables for secrets.
10. NEVER expose API keys.
11. Do not invent secret credentials.
12. Include useful comments.
13. Make the code runnable.
14. Handle errors properly.
15. Use process.env.PORT when appropriate.

The user's request is:

${prompt}

      `.trim();

    }


    // ==================================================
    // GENERATE
    // ==================================================

    const result =
      await generateWithAI({

        prompt,

        provider,

        systemPrompt,

        mode

      });


    // ==================================================
    // RESPONSE
    // ==================================================

    return res.json({

      success: true,

      answer:
        result.answer,

      provider:
        result.provider,

      fallback:
        result.fallback,

      mode,

      errors:
        result.errors || []

    });


  } catch (error) {

    console.error(
      "❌ /api/ai error:",
      error
    );


    return res.status(500).json({

      success: false,

      error:
        getErrorMessage(error)

    });

  }

});


// ======================================================
// PROVIDER STATUS
// ======================================================

app.get("/api/providers", (req, res) => {

  const configured =
    getConfiguredProviders();


  res.json({

    success: true,


    totalProviders: 8,


    configuredCount:
      configured.length,


    configuredProviders:
      configured,


    providers: {

      gemini: {

        configured:
          hasKey(CONFIG.gemini.key),

        model:
          CONFIG.gemini.model

      },


      openrouter: {

        configured:
          hasKey(CONFIG.openrouter.key),

        model:
          CONFIG.openrouter.model

      },


      mistral: {

        configured:
          hasKey(CONFIG.mistral.key),

        model:
          CONFIG.mistral.model

      },


      groq: {

        configured:
          hasKey(CONFIG.groq.key),

        model:
          CONFIG.groq.model

      },


      cerebras: {

        configured:
          hasKey(CONFIG.cerebras.key),

        model:
          CONFIG.cerebras.model

      },


      together: {

        configured:
          hasKey(CONFIG.together.key),

        model:
          CONFIG.together.model

      },


      cohere: {

        configured:
          hasKey(CONFIG.cohere.key),

        model:
          CONFIG.cohere.model

      },


      fireworks: {

        configured:
          hasKey(CONFIG.fireworks.key),

        model:
          CONFIG.fireworks.model

      }

    }

  });

});


// ======================================================
// TEST ONE AI PROVIDER
// ======================================================

app.get(
  "/api/providers/test/:provider",
  async (req, res) => {

    try {

      const provider =
        String(
          req.params.provider || ""
        ).toLowerCase();


      if (
        !PROVIDER_FUNCTIONS[provider]
      ) {

        return res.status(400).json({

          success: false,

          error:
            `Unknown provider: ${provider}`

        });

      }


      const result =
        await testProvider(
          provider
        );


      return res.json({

        success:
          result.success,

        result

      });


    } catch (error) {

      return res.status(500).json({

        success: false,

        error:
          getErrorMessage(error)

      });

    }

  }
);


// ======================================================
// TEST ALL AI PROVIDERS
// ======================================================

app.get(
  "/api/providers/test",
  async (req, res) => {

    try {

      console.log(
        "🧪 Testing all configured AI providers..."
      );


      const results =
        await testAllProviders();


      const working =
        results.filter(
          item => item.success
        );


      const failed =
        results.filter(
          item =>
            item.configured &&
            !item.success
        );


      return res.json({

        success: true,

        totalProviders: 8,

        working:
          working.length,

        failed:
          failed.length,

        results

      });


    } catch (error) {

      console.error(
        "❌ Provider test error:",
        error
      );


      return res.status(500).json({

        success: false,

        error:
          getErrorMessage(error)

      });

    }

  }
);


// ======================================================
// ROOT / SERVER INFORMATION
// ======================================================

app.get("/", (req, res) => {

  res.json({

    success: true,

    name:
      "A² Builder Backend",

    version:
      "3.0.0",

    status:
      "online",

    aiProviders:
      8,

    configuredProviders:
      getConfiguredProviders(),

    endpoints: {

      ai:
        "POST /api/ai",

      providers:
        "GET /api/providers",

      testProvider:
        "GET /api/providers/test/:provider",

      testAll:
        "GET /api/providers/test",

      convertSite:
        "POST /api/convert-site",

      photos:
        "GET /api/pexels/photos",

      videos:
        "GET /api/pexels/videos",

      health:
        "GET /health"

    }

  });

});


// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/health", (req, res) => {

  res.json({

    success: true,

    status:
      "healthy",

    server:
      "A² Builder Backend",

    version:
      "3.0.0",

    aiProviders:
      getConfiguredProviders(),

    aiProviderCount:
      getConfiguredProviders().length,

    pexels:
      hasKey(
        CONFIG.pexels.key
      )

  });

});
// ======================================================
// A² BUILDER — WEBSITE IMPORTER & MEDIA APIs
// BATCH 5/6
// ======================================================


// ======================================================
// WEBSITE → A² BUILDER IMPORTER
// ======================================================

app.post(
  "/api/convert-site",
  async (req, res) => {

    try {

      const {
        url
      } = req.body || {};


      // ------------------------------------------------
      // CHECK URL
      // ------------------------------------------------

      if (
        !url ||
        typeof url !== "string" ||
        !url.trim()
      ) {

        return res.status(400).json({

          success: false,

          error:
            "Target URL is required."

        });

      }


      // ------------------------------------------------
      // PARSE URL
      // ------------------------------------------------

      let targetUrl;

      try {

        targetUrl =
          new URL(
            url.trim()
          );

      } catch {

        return res.status(400).json({

          success: false,

          error:
            "Invalid website URL."

        });

      }


      // ------------------------------------------------
      // ONLY HTTP / HTTPS
      // ------------------------------------------------

      if (
        ![
          "http:",
          "https:"
        ].includes(
          targetUrl.protocol
        )
      ) {

        return res.status(400).json({

          success: false,

          error:
            "Only HTTP and HTTPS websites are supported."

        });

      }


      console.log(
        `🌐 Importing website: ${targetUrl.href}`
      );


      // ------------------------------------------------
      // FETCH WEBSITE
      // ------------------------------------------------

      const response =
        await fetchWithTimeout(

          targetUrl.href,

          {

            method: "GET",

            headers: {

              "User-Agent":
                "A2-Builder-Website-Importer/3.0",

              "Accept":
                "text/html,application/xhtml+xml"

            }

          }

        );


      if (!response.ok) {

        throw new Error(

          `Website returned HTTP ${response.status}`

        );

      }


      // ------------------------------------------------
      // READ HTML
      // ------------------------------------------------

      const rawHtml =
        await response.text();


      // ------------------------------------------------
      // CLEAN IMPORTED HTML
      // ------------------------------------------------

      const cleanedHtml =
        rawHtml

          // Remove script tags
          .replace(

            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,

            ""

          )

          // Remove stylesheet link tags
          .replace(

            /<link[^>]*rel=["']stylesheet["'][^>]*>/gi,

            ""

          )

          // Remove preload stylesheet links
          .replace(

            /<link[^>]*as=["']style["'][^>]*>/gi,

            ""

          );


      // ------------------------------------------------
      // LIMIT IMPORT SIZE
      // ------------------------------------------------

      const MAX_HTML_SIZE =
        50000;


      const extractedContent =
        cleanedHtml.substring(
          0,
          MAX_HTML_SIZE
        );


      // ------------------------------------------------
      // RETURN PROJECT DATA
      // ------------------------------------------------

      return res.json({

        success: true,

        originalUrl:
          targetUrl.href,

        originalLength:
          rawHtml.length,

        extractedLength:
          cleanedHtml.length,

        truncated:
          cleanedHtml.length >
          MAX_HTML_SIZE,

        extractedContent

      });


    } catch (error) {

      console.error(
        "❌ Website importer error:",
        getErrorMessage(error)
      );


      return res.status(500).json({

        success: false,

        error:
          `Website import failed: ${getErrorMessage(error)}`

      });

    }

  }
);


// ======================================================
// PEXELS PHOTOS
// ======================================================

app.get(
  "/api/pexels/photos",
  async (req, res) => {

    try {

      const query =
        String(
          req.query.q ||
          "technology"
        ).trim();


      // ------------------------------------------------
      // LIMIT RESULTS
      // ------------------------------------------------

      let perPage =
        Number(
          req.query.per_page ||
          3
        );


      if (
        !Number.isFinite(perPage)
      ) {

        perPage = 3;

      }


      perPage =
        Math.max(
          1,
          Math.min(
            perPage,
            20
          )
        );


      // ------------------------------------------------
      // CHECK PEXELS KEY
      // ------------------------------------------------

      if (
        !hasKey(
          CONFIG.pexels.key
        )
      ) {

        return res.json({

          success: true,

          photos: [],

          total_results: 0,

          configured: false,

          message:
            "PEXELS_API_KEY is not configured."

        });

      }


      // ------------------------------------------------
      // BUILD PEXELS URL
      // ------------------------------------------------

      const pexelsUrl =
        "https://api.pexels.com/v1/search" +

        `?query=${encodeURIComponent(query)}` +

        `&per_page=${perPage}`;


      console.log(
        `🖼️ Pexels photo search: ${query}`
      );


      // ------------------------------------------------
      // REQUEST PEXELS
      // ------------------------------------------------

      const response =
        await fetchWithTimeout(

          pexelsUrl,

          {

            method: "GET",

            headers: {

              "Authorization":
                CONFIG.pexels.key,

              "Accept":
                "application/json"

            }

          }

        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(

          data?.error ||

          `Pexels returned HTTP ${response.status}`

        );

      }


      // ------------------------------------------------
      // RETURN DATA
      // ------------------------------------------------

      return res.json({

        ...data,

        success: true,

        configured: true

      });


    } catch (error) {

      console.error(
        "❌ Pexels photos error:",
        getErrorMessage(error)
      );


      return res.status(500).json({

        success: false,

        error:
          "Failed to fetch Pexels photos.",

        details:
          getErrorMessage(error)

      });

    }

  }
);


// ======================================================
// PEXELS VIDEOS
// ======================================================

app.get(
  "/api/pexels/videos",
  async (req, res) => {

    try {

      const query =
        String(
          req.query.q ||
          "technology"
        ).trim();


      // ------------------------------------------------
      // LIMIT RESULTS
      // ------------------------------------------------

      let perPage =
        Number(
          req.query.per_page ||
          2
        );


      if (
        !Number.isFinite(perPage)
      ) {

        perPage = 2;

      }


      perPage =
        Math.max(
          1,
          Math.min(
            perPage,
            10
          )
        );


      // ------------------------------------------------
      // CHECK PEXELS KEY
      // ------------------------------------------------

      if (
        !hasKey(
          CONFIG.pexels.key
        )
      ) {

        return res.json({

          success: true,

          videos: [],

          total_results: 0,

          configured: false,

          message:
            "PEXELS_API_KEY is not configured."

        });

      }


      // ------------------------------------------------
      // BUILD PEXELS URL
      // ------------------------------------------------

      const pexelsUrl =
        "https://api.pexels.com/videos/search" +

        `?query=${encodeURIComponent(query)}` +

        `&per_page=${perPage}`;


      console.log(
        `🎥 Pexels video search: ${query}`
      );


      // ------------------------------------------------
      // REQUEST PEXELS
      // ------------------------------------------------

      const response =
        await fetchWithTimeout(

          pexelsUrl,

          {

            method: "GET",

            headers: {

              "Authorization":
                CONFIG.pexels.key,

              "Accept":
                "application/json"

            }

          }

        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(

          data?.error ||

          `Pexels returned HTTP ${response.status}`

        );

      }


      // ------------------------------------------------
      // RETURN DATA
      // ------------------------------------------------

      return res.json({

        ...data,

        success: true,

        configured: true

      });


    } catch (error) {

      console.error(
        "❌ Pexels videos error:",
        getErrorMessage(error)
      );


      return res.status(500).json({

        success: false,

        error:
          "Failed to fetch Pexels videos.",

        details:
          getErrorMessage(error)

      });

    }

  }
);


// ======================================================
// MEDIA STATUS
// ======================================================

app.get(
  "/api/media/status",
  (req, res) => {

    res.json({

      success: true,

      pexels: {

        configured:
          hasKey(
            CONFIG.pexels.key
          )

      },

      endpoints: {

        photos:
          "/api/pexels/photos?q=technology",

        videos:
          "/api/pexels/videos?q=technology"

      }

    });

  }
);
/* =====================================================
   A² BUILDER BACKEND — BATCH 6
   FINAL ERROR HANDLING + SERVER STARTUP
===================================================== */

/* =========================
   1. 404 HANDLER
========================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    method: req.method,
    path: req.originalUrl,
    message: "The requested A² Builder API endpoint does not exist."
  });
});


/* =========================
   2. GLOBAL ERROR HANDLER
========================= */

app.use((err, req, res, next) => {
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.error("A² BUILDER SERVER ERROR");
  console.error("Method:", req.method);
  console.error("Path:", req.originalUrl);
  console.error("Error:", err);
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  if (res.headersSent) {
    return next(err);
  }

  const statusCode =
    Number(err.statusCode || err.status || 500);

  res.status(
    statusCode >= 400 && statusCode < 600
      ? statusCode
      : 500
  );

  res.json({
    success: false,
    error: "A² Builder server error",
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong on the server."
        : getErrorMessage(err)
  });
});


/* =========================
   3. PROCESS ERROR SAFETY
========================= */

process.on("uncaughtException", (error) => {
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.error("UNCAUGHT EXCEPTION");
  console.error(error);
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
});

process.on("unhandledRejection", (reason) => {
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.error("UNHANDLED PROMISE REJECTION");
  console.error(reason);
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
});


/* =========================
   4. START SERVER
========================= */

app.listen(PORT, () => {
  console.log("");
  console.log("==============================================");
  console.log("        A² BUILDER BACKEND v3.0");
  console.log("==============================================");
  console.log(`Server running on port: ${PORT}`);
  console.log(`Health: /health`);
  console.log(`AI: /api/ai`);
  console.log(`Providers: /api/providers`);
  console.log(`Convert Site: /api/convert-site`);
  console.log(`Pexels Photos: /api/pexels/photos`);
  console.log(`Pexels Videos: /api/pexels/videos`);
  console.log(`Media Status: /api/media/status`);
  console.log("==============================================");

  const configured = getConfiguredProviders();

  console.log("");
  console.log("Configured AI Providers:");

  if (configured.length === 0) {
    console.log("⚠️ No AI API keys configured.");
    console.log("Demo fallback mode is available.");
  } else {
    configured.forEach((provider, index) => {
      console.log(`${index + 1}. ${provider}`);
    });
  }

  console.log("");

  console.log(
    `Pexels API: ${
      hasKey(CONFIG.pexels.key)
        ? "Configured"
        : "Not configured"
    }`
  );

  console.log("");
  console.log("A² Builder backend is ready.");
  console.log("==============================================");
});
