const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 10000;

// ===============================
// GEMINI
// ===============================

async function askGemini(prompt) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=" +
      encodeURIComponent(process.env.GEMINI_API_KEY),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
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

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini error: ${errorText}`);
  }

  const data = await response.json();

  return (
    data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("") || ""
  );
}


// ===============================
// OPENROUTER
// ===============================

async function askOpenRouter(prompt) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://a2builder.app",
        "X-Title": "A² Builder"
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "openrouter/auto",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter error: ${errorText}`);
  }

  const data = await response.json();

  return data.choices?.[0]?.message?.content || "";
}


// ===============================
// PEXELS PHOTOS
// ===============================

async function searchPexelsPhotos(query) {
  if (!process.env.PEXELS_API_KEY) {
    throw new Error("PEXELS_API_KEY is not configured");
  }

  const url =
    "https://api.pexels.com/v1/search?query=" +
    encodeURIComponent(query) +
    "&per_page=12";

  const response = await fetch(url, {
    headers: {
      Authorization: process.env.PEXELS_API_KEY
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pexels photo error: ${errorText}`);
  }

  return await response.json();
}


// ===============================
// PEXELS VIDEOS
// ===============================

async function searchPexelsVideos(query) {
  if (!process.env.PEXELS_API_KEY) {
    throw new Error("PEXELS_API_KEY is not configured");
  }

  const url =
    "https://api.pexels.com/v1/videos/search?query=" +
    encodeURIComponent(query) +
    "&per_page=12";

  const response = await fetch(url, {
    headers: {
      Authorization: process.env.PEXELS_API_KEY
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pexels video error: ${errorText}`);
  }

  return await response.json();
}


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
// AI CODING ENDPOINT
// ===============================

app.post("/api/ai", async (req, res) => {
  try {
    const { prompt, provider = "gemini" } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({
        error: "A prompt is required"
      });
    }

    const systemPrompt = `
You are A² Builder, an AI coding agent.

Your job is to help users create and modify websites and web applications.

When the user asks you to build something:
- Understand the complete request.
- Generate clean HTML, CSS and JavaScript.
- Make the result responsive for phones and computers.
- Do not destroy existing functionality when modifying a project.
- When asked to modify a project, preserve existing files unless changes are necessary.
- Explain important changes briefly.
- If images or videos are needed, identify suitable Pexels search terms.

The user may later use A² Builder to publish websites
or package websites as applications.

User request:
${prompt}
`;

    let answer;

    if (provider === "openrouter") {
      answer = await askOpenRouter(systemPrompt);
    } else {
      answer = await askGemini(systemPrompt);
    }

    res.json({
      success: true,
      provider,
      answer
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// ===============================
// PEXELS PHOTO SEARCH
// ===============================

app.get("/api/pexels/photos", async (req, res) => {
  try {
    const query = req.query.q;

    if (!query) {
      return res.status(400).json({
        error: "Search query is required"
      });
    }

    const data = await searchPexelsPhotos(query);

    res.json({
      success: true,
      ...data
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// ===============================
// PEXELS VIDEO SEARCH
// ===============================

app.get("/api/pexels/videos", async (req, res) => {
  try {
    const query = req.query.q;

    if (!query) {
      return res.status(400).json({
        error: "Search query is required"
      });
    }

    const data = await searchPexelsVideos(query);

    res.json({
      success: true,
      ...data
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// ===============================
// START SERVER
// ===============================

app.listen(PORT, "0.0.0.0", () => {
  console.log(`A² Builder backend running on port ${PORT}`);
});
