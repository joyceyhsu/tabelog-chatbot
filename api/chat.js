export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  const SYSTEM = `You are a helpful restaurant finder for Tabelog Hyakumeiten... (your prompt here)`;

  const geminiMessages = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  try {
    // UPDATED TO GEMINI 2.0 FLASH
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Note: system_instruction works in v1 for 2.0 models
        system_instruction: { parts: [{ text: SYSTEM }] },
        contents: geminiMessages,
        generationConfig: { maxOutputTokens: 1000 }
      })
    });

    const data = await response.json();

    if (data.error) throw new Error(data.error.message);

    // Cleaner way to extract the text response
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't find results.";

    res.status(200).json({ reply });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
