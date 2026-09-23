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
