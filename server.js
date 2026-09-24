const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));


// ==========================================
// A² BUILDER — API KEYS
// ==========================================

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY;

const MISTRAL_API_KEY =
  process.env.MISTRAL_API_KEY;

const OPENROUTER_API_KEY =
  process.env.OPENROUTER_API_KEY;

const GROQ_API_KEY =
  process.env.GROQ_API_KEY;

const CEREBRAS_API_KEY =
  process.env.CEREBRAS_API_KEY;

const NVIDIA_API_KEY =
  process.env.NVIDIA_API_KEY;

const COHERE_API_KEY =
  process.env.COHERE_API_KEY;

const FREEAI_API_KEY =
  process.env.FREEAI_API_KEY;

const CLOUDFLARE_API_TOKEN =
  process.env.CLOUDFLARE_API_TOKEN;

const PEXELS_API_KEY =
  process.env.PEXELS_API_KEY;


// ==========================================
// CONFIGURATION
// ==========================================

const SYSTEM_PROMPT = `
You are A² Builder, an AI coding assistant.

Help the user create websites and applications
from their instructions.

Generate clean, complete and working code.
When code is requested, make it practical and
ready to use.

Be clear and helpful.
`;


// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/", (req, res) => {

  res.json({
    name: "A² Builder Backend",
    status: "online",
    version: "2.0.0",
    providers: 9
  });

});


// ==========================================
// UTILITY
// ==========================================

function checkKey(key, name) {

  if (!key) {
    throw new Error(
      name + " is not configured."
    );
  }

}


// ==========================================
// COMMON OPENAI-COMPATIBLE REQUEST
// ==========================================

async function openAIStyleRequest(
  url,
  apiKey,
  model,
  prompt,
  providerName
) {

  checkKey(
    apiKey,
    providerName + "_API_KEY"
  );

  const response = await fetch(
    url,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        "Authorization":
          "Bearer " + apiKey
      },

      body: JSON.stringify({

        model: model,

        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },

          {
            role: "user",
            content: prompt
          }
        ],

        temperature: 0.3

      })
    }
  );

  const data =
    await response.json();

  if (!response.ok) {

    const error =
      new Error(
        data?.error?.message ||
        data?.message ||
        providerName +
        " request failed."
      );

    error.status =
      response.status;

    throw error;
  }

  const answer =
    data?.choices?.[0]?.message?.content ||
    "";

  if (!answer) {

    throw new Error(
      providerName +
      " returned an empty response."
    );

  }

  return answer;
}
// ==========================================
// PROVIDER 1 — GEMINI
// ==========================================

async function askGemini(prompt) {

  checkKey(
    GEMINI_API_KEY,
    "GEMINI"
  );

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=" +
    GEMINI_API_KEY;

  const response =
    await fetch(url, {

      method: "POST",

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({

        contents: [
          {
            parts: [
              {
                text:
                  SYSTEM_PROMPT +
                  "\n\nUser request:\n" +
                  prompt
              }
            ]
          }
        ]

      })
    });

  const data =
    await response.json();

  if (!response.ok) {

    const error =
      new Error(
        data?.error?.message ||
        "Gemini request failed."
      );

    error.status =
      response.status;

    throw error;
  }

  const answer =
    data?.candidates?.[0]
      ?.content?.parts
      ?.map(part => part.text || "")
      .join("") ||
    "";

  if (!answer) {

    throw new Error(
      "Gemini returned an empty response."
    );
  }

  return answer;
}


// ==========================================
// PROVIDER 2 — MISTRAL
// ==========================================

async function askMistral(prompt) {

  return openAIStyleRequest(

    "https://api.mistral.ai/v1/chat/completions",

    MISTRAL_API_KEY,

    "mistral-small-latest",

    prompt,

    "MISTRAL"
  );
}


// ==========================================
// PROVIDER 3 — OPENROUTER
// ==========================================

async function askOpenRouter(prompt) {

  return openAIStyleRequest(

    "https://openrouter.ai/api/v1/chat/completions",

    OPENROUTER_API_KEY,

    "openrouter/auto",

    prompt,

    "OPENROUTER"
  );
}


// ==========================================
// PROVIDER 4 — GROQ
// ==========================================

async function askGroq(prompt) {

  return openAIStyleRequest(

    "https://api.groq.com/openai/v1/chat/completions",

    GROQ_API_KEY,

    "llama-3.3-70b-versatile",

    prompt,

    "GROQ"
  );
}


// ==========================================
// PROVIDER 5 — CEREBRAS
// ==========================================

async function askCerebras(prompt) {

  return openAIStyleRequest(

    "https://api.cerebras.ai/v1/chat/completions",

    CEREBRAS_API_KEY,

    "llama-3.3-70b",

    prompt,

    "CEREBRAS"
  );
  }
// ==========================================
// PROVIDER 6 — NVIDIA NIM
// ==========================================

async function askNvidia(prompt) {

  return openAIStyleRequest(

    "https://integrate.api.nvidia.com/v1/chat/completions",

    NVIDIA_API_KEY,

    "meta/llama-3.1-8b-instruct",

    prompt,

    "NVIDIA"
  );
}


// ==========================================
// PROVIDER 7 — COHERE
// ==========================================

async function askCohere(prompt) {

  checkKey(
    COHERE_API_KEY,
    "COHERE"
  );

  const response =
    await fetch(
      "https://api.cohere.com/v2/chat",
      {

        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Authorization":
            "Bearer " +
            COHERE_API_KEY
        },

        body: JSON.stringify({

          model:
            "command-a-03-2025",

          messages: [

            {
              role: "system",
              content:
                SYSTEM_PROMPT
            },

            {
              role: "user",
              content:
                prompt
            }

          ]

        })

      }
    );

  const data =
    await response.json();

  if (!response.ok) {

    const error =
      new Error(
        data?.message ||
        data?.error?.message ||
        "Cohere request failed."
      );

    error.status =
      response.status;

    throw error;
  }

  const answer =
    data?.message?.content
      ?.map(item =>
        item?.text || ""
      )
      .join("") || "";

  if (!answer) {

    throw new Error(
      "Cohere returned an empty response."
    );

  }

  return answer;
}


// ==========================================
// PROVIDER 8 — FREE.AI
// ==========================================

async function askFreeAI(prompt) {

  return openAIStyleRequest(

    "https://api.free.ai/v1/chat/completions",

    FREEAI_API_KEY,

    "free",

    prompt,

    "FREEAI"
  );
}


// ==========================================
// PROVIDER 9 — CLOUDFLARE WORKERS AI
// ==========================================

async function askCloudflare(prompt) {

  checkKey(
    CLOUDFLARE_API_TOKEN,
    "CLOUDFLARE"
  );

  checkKey(
    process.env.CLOUDFLARE_ACCOUNT_ID,
    "CLOUDFLARE_ACCOUNT_ID"
  );

  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID;

  const model =
    "@cf/meta/llama-3.1-8b-instruct";

  const url =
    "https://api.cloudflare.com/client/v4/accounts/" +
    accountId +
    "/ai/run/" +
    model;

  const response =
    await fetch(url, {

      method: "POST",

      headers: {

        "Content-Type":
          "application/json",

        "Authorization":
          "Bearer " +
          CLOUDFLARE_API_TOKEN

      },

      body: JSON.stringify({

        messages: [

          {
            role: "system",
            content: SYSTEM_PROMPT
          },

          {
            role: "user",
            content: prompt
          }

        ]

      })

    });

  const data =
    await response.json();

  if (!response.ok) {

    const error =
      new Error(
        data?.errors?.[0]?.message ||
        "Cloudflare request failed."
      );

    error.status =
      response.status;

    throw error;
  }

  const answer =
    data?.result?.response || "";

  if (!answer) {

    throw new Error(
      "Cloudflare returned an empty response."
    );

  }

  return answer;
}  
// ==========================================
// PROVIDER LIST
// ==========================================

const providers = [

  {
    name: "gemini",
    fn: askGemini
  },

  {
    name: "mistral",
    fn: askMistral
  },

  {
    name: "openrouter",
    fn: askOpenRouter
  },

  {
    name: "groq",
    fn: askGroq
  },

  {
    name: "cerebras",
    fn: askCerebras
  },

  {
    name: "nvidia",
    fn: askNvidia
  },

  {
    name: "cohere",
    fn: askCohere
  },

  {
    name: "freeai",
    fn: askFreeAI
  },

  {
    name: "cloudflare",
    fn: askCloudflare
  }

];


// ==========================================
// AUTOMATIC FALLBACK
// ==========================================

async function askAI(prompt) {

  const errors = [];

  for (
    const provider of providers
  ) {

    console.log(
      "A² Builder: Trying " +
      provider.name +
      "..."
    );

    try {

      const answer =
        await provider.fn(prompt);

      console.log(
        "A² Builder: " +
        provider.name +
        " succeeded."
      );

      return {

        answer: answer,

        provider:
          provider.name

      };

    } catch (error) {

      console.error(
        provider.name.toUpperCase() +
        " ERROR:",
        error.message,
        "STATUS:",
        error.status ||
        "unknown"
      );

      errors.push(

        provider.name +
        ": " +
        error.message

      );

    }

  }


  throw new Error(
    "All AI providers failed:\n" +
    errors.join("\n")
  );

    }
  // ==========================================
// AI ENDPOINT
// ==========================================

app.post("/api/ai", async (req, res) => {

  try {

    const prompt =
      req.body?.prompt;

    const provider =
      req.body?.provider || "auto";


    // --------------------------------------
    // CHECK PROMPT
    // --------------------------------------

    if (!prompt) {

      return res.status(400).json({

        error:
          "Prompt is required."

      });

    }


    console.log(
      "A² Builder request:",
      provider
    );


    let result;


    // ======================================
    // AUTOMATIC MODE
    // ======================================

    if (
      provider === "auto" ||
      provider === "all" ||
      !provider
    ) {

      console.log(
        "Using 9-provider automatic fallback..."
      );

      result =
        await askAI(prompt);

    }


    // ======================================
    // SPECIFIC PROVIDER
    // ======================================

    else {

      const selected =
        providers.find(
          item =>
            item.name.toLowerCase() ===
            provider.toLowerCase()
        );


      if (!selected) {

        return res.status(400).json({

          error:
            "Unknown AI provider.",

          availableProviders:
            providers.map(
              item => item.name
            )

        });

      }


      console.log(
        "Using selected provider:",
        selected.name
      );


      result = {

        answer:
          await selected.fn(prompt),

        provider:
          selected.name

      };

    }


    // ======================================
    // SUCCESS
    // ======================================

    return res.json({

      success: true,

      answer:
        result.answer,

      provider:
        result.provider

    });


  } catch (error) {

    console.error(
      "AI ERROR:",
      error
    );


    return res.status(500).json({

      success: false,

      error:
        "AI provider failed.",

      details:
        error.message

    });

  }

});
  // ==========================================
// PEXELS PHOTOS
// ==========================================

app.get("/api/pexels/photos", async (req, res) => {

  try {

    const query =
      req.query.q || "technology";

    if (!PEXELS_API_KEY) {

      return res.status(500).json({

        error:
          "PEXELS_API_KEY is not configured."

      });

    }

    const response =
      await fetch(
        "https://api.pexels.com/v1/search?query=" +
        encodeURIComponent(query),
        {
          headers: {
            Authorization:
              PEXELS_API_KEY
          }
        }
      );

    const data =
      await response.json();

    if (!response.ok) {

      return res
        .status(response.status)
        .json(data);

    }

    res.json(data);

  } catch (error) {

    console.error(
      "Pexels photo error:",
      error
    );

    res.status(500).json({

      error:
        error.message

    });

  }

});


// ==========================================
// PEXELS VIDEOS
// ==========================================

app.get("/api/pexels/videos", async (req, res) => {

  try {

    const query =
      req.query.q || "technology";

    if (!PEXELS_API_KEY) {

      return res.status(500).json({

        error:
          "PEXELS_API_KEY is not configured."

      });

    }

    const response =
      await fetch(
        "https://api.pexels.com/v1/videos/search?query=" +
        encodeURIComponent(query),
        {
          headers: {
            Authorization:
              PEXELS_API_KEY
          }
        }
      );

    const data =
      await response.json();

    if (!response.ok) {

      return res
        .status(response.status)
        .json(data);

    }

    res.json(data);

  } catch (error) {

    console.error(
      "Pexels video error:",
      error
    );

    res.status(500).json({

      error:
        error.message

    });

  }

});


// ==========================================
// START SERVER
// ==========================================

const PORT =
  process.env.PORT || 10000;

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      "================================"
    );

    console.log(
      "A² Builder Backend is running"
    );

    console.log(
      "Port:",
      PORT
    );

    console.log(
      "AI Providers:",
      providers.length
    );

    console.log(
      "Providers:",
      providers
        .map(p => p.name)
        .join(" → ")
    );

    console.log(
      "================================"
    );

  }
);
