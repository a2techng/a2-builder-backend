const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));


// ===============================
// API KEYS
// ===============================

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY;

const OPENROUTER_API_KEY =
  process.env.OPENROUTER_API_KEY;

const MISTRAL_API_KEY =
  process.env.MISTRAL_API_KEY;

const PEXELS_API_KEY =
  process.env.PEXELS_API_KEY;

const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL ||
  "openrouter/auto";


// ===============================
// HEALTH CHECK
// ===============================

app.get("/", (req, res) => {

  res.json({
    name: "A² Builder Backend",
    status: "online",
    version: "1.0.0"
  });

});


// ===============================
// GEMINI
// ===============================

async function askGemini(prompt) {

  if (!GEMINI_API_KEY) {

    throw new Error(
      "GEMINI_API_KEY is not configured."
    );

  }

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=" +
    GEMINI_API_KEY;

  const response = await fetch(url, {

    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({

      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]

    })

  });

  const data = await response.json();

  if (!response.ok) {

    const error = new Error(
      data?.error?.message ||
      "Gemini request failed."
    );

    error.status = response.status;

    throw error;

  }

  const answer =
    data?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("") || "";

  if (!answer) {

    throw new Error(
      "Gemini returned an empty response."
    );

  }

  return answer;

}
// ===============================
// MISTRAL
// ===============================

async function askMistral(prompt) {
  if (!MISTRAL_API_KEY) {
    throw new Error(
      "MISTRAL_API_KEY is not configured."
    );
  }

  const response = await fetch(
    "https://api.mistral.ai/v1/chat/completions",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "Authorization":
          "Bearer " + MISTRAL_API_KEY
      },

      body: JSON.stringify({
        model: "mistral-small-latest",

        messages: [
          {
            role: "system",
            content:
              "You are A² Builder, an AI coding agent. Generate complete, working websites and applications from user instructions. Return useful code and explanations when appropriate."
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

  const data = await response.json();

  console.log(
    "Mistral response status:",
    response.status
  );

  if (!response.ok) {
    const error = new Error(
      data?.message ||
      data?.error?.message ||
      "Mistral request failed."
    );

    error.status = response.status;

    throw error;
  }

  const answer =
    data?.choices?.[0]?.message?.content || "";

  if (!answer) {
    throw new Error(
      "Mistral returned an empty response."
    );
  }

  return answer;
}
// ===============================
// OPENROUTER
// ===============================

async function askOpenRouter(prompt) {

  if (!OPENROUTER_API_KEY) {

    throw new Error(
      "OPENROUTER_API_KEY is not configured."
    );

  }

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {

      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "Authorization":
          "Bearer " + OPENROUTER_API_KEY
      },

      body: JSON.stringify({

        model: OPENROUTER_MODEL,

        messages: [
          {
            role: "system",
            content:
              "You are A² Builder, an AI coding agent. Generate working websites and applications from user instructions."
          },
          {
            role: "user",
            content: prompt
          }
        ]

      })

    }
  );

  const data = await response.json();

  if (!response.ok) {

    const error = new Error(
      data?.error?.message ||
      "OpenRouter request failed."
    );

    error.status = response.status;

    throw error;

  }

  const answer =
    data?.choices?.[0]?.message?.content || "";

  if (!answer) {

    throw new Error(
      "OpenRouter returned an empty response."
    );

  }

  return answer;

}


// ===============================
// AUTOMATIC AI FALLBACK
// ===============================
async function askAI(prompt) {

  const errors = [];

  // GEMINI
  try {
    console.log("A² Builder: Trying Gemini...");

    const answer = await askGemini(prompt);

    console.log("A² Builder: Gemini succeeded.");

    return {
      answer,
      provider: "gemini"
    };

  } catch (error) {
    console.error(
      "GEMINI ERROR:",
      error.message,
      "STATUS:",
      error.status || "unknown"
    );

    errors.push(
      "Gemini: " +
      error.message
    );
  }


  // MISTRAL
  try {
    console.log("A² Builder: Trying Mistral...");

    const answer = await askMistral(prompt);

    console.log("A² Builder: Mistral succeeded.");

    return {
      answer,
      provider: "mistral"
    };

  } catch (error) {
    console.error(
      "MISTRAL ERROR:",
      error.message,
      "STATUS:",
      error.status || "unknown"
    );

    errors.push(
      "Mistral: " +
      error.message
    );
  }


  // OPENROUTER
  try {
    console.log("A² Builder: Trying OpenRouter...");

    const answer =
      await askOpenRouter(prompt);

    console.log(
      "A² Builder: OpenRouter succeeded."
    );

    return {
      answer,
      provider: "openrouter"
    };

  } catch (error) {
    console.error(
      "OPENROUTER ERROR:",
      error.message,
      "STATUS:",
      error.status || "unknown"
    );

    errors.push(
      "OpenRouter: " +
      error.message
    );
  }


  // ALL FAILED
  throw new Error(
    errors.join("\n")
  );
}
// ===============================
// AI ENDPOINT
// ===============================

app.post("/api/ai", async (req, res) => {
  try {
    const prompt = req.body?.prompt;
    const provider = req.body?.provider || "auto";

    if (!prompt) {
      return res.status(400).json({
        error: "Prompt is required."
      });
    }

    console.log(
      "A² Builder request:",
      provider
    );

    let result;

    // =========================
    // GEMINI ONLY
    // =========================
    if (provider === "gemini") {
      console.log("Using Gemini...");

      result = {
        answer: await askGemini(prompt),
        provider: "gemini"
      };
    }

    // =========================
    // MISTRAL ONLY
    // =========================
    else if (provider === "mistral") {
      console.log("Using Mistral...");

      result = {
        answer: await askMistral(prompt),
        provider: "mistral"
      };
    }

    // =========================
    // OPENROUTER ONLY
    // =========================
    else if (provider === "openrouter") {
      console.log("Using OpenRouter...");

      result = {
        answer: await askOpenRouter(prompt),
        provider: "openrouter"
      };
    }

    // =========================
    // AUTO
    // Gemini → Mistral → OpenRouter
    // =========================
    else {
      console.log("Using automatic AI fallback...");

      result = await askAI(prompt);
    }

    res.json({
      answer: result.answer,
      provider: result.provider
    });

  } catch (error) {

    console.error(
      "AI ERROR:",
      error
    );

    res.status(500).json({
      error: "AI provider failed.",
      details: error.message
    });
  }
});


// ===============================
// PEXELS PHOTOS
// ===============================

app.get("/api/pexels/photos", async (req, res) => {

  try {

    const query =
      req.query.q || "technology";

    if (!PEXELS_API_KEY) {

      return res.status(500).json({
        error: "PEXELS_API_KEY is not configured."
      });

    }

    const response = await fetch(
      "https://api.pexels.com/v1/search?query=" +
      encodeURIComponent(query),
      {
        headers: {
          Authorization: PEXELS_API_KEY
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {

      return res.status(response.status).json(
        data
      );

    }

    res.json(data);

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

});


// ===============================
// PEXELS VIDEOS
// ===============================

app.get("/api/pexels/videos", async (req, res) => {

  try {

    const query =
      req.query.q || "technology";

    if (!PEXELS_API_KEY) {

      return res.status(500).json({
        error: "PEXELS_API_KEY is not configured."
      });

    }

    const response = await fetch(
      "https://api.pexels.com/v1/videos/search?query=" +
      encodeURIComponent(query),
      {
        headers: {
          Authorization: PEXELS_API_KEY
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {

      return res.status(response.status).json(
        data
      );

    }

    res.json(data);

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

});


// ===============================
// START SERVER
// ==============================

const PORT =
  process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {

  console.log(
    `A² Builder Backend running on port ${PORT}`
  );

});
