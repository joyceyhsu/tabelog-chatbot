export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  const SYSTEM = `You are a helpful restaurant finder for Tabelog Hyakumeiten (食べログ百名店). 
  1. Find 3–5 award winners close to the user's location.
  2. For each: **name**, neighborhood, description, and Tabelog link.
  3. Respond in English unless Japanese is used.`;

  // Format messages for the Gemini API
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  // Add system instruction as the very first message
  contents.unshift({
    role: 'user',
    parts: [{ text: `INSTRUCTIONS: ${SYSTEM}` }]
  });

  try {
    // The URL must be a clean string without extra commas or 'const' inside
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        contents: contents,
        generationConfig: { 
          maxOutputTokens: 1000,
          temperature: 0.7
        }
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't find any recommendations right now.";

    res.status(200).json({ reply });

  } catch (err) {
    console.error("API Error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
