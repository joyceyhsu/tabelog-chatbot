export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  const SYSTEM = `You are a helpful restaurant finder for Tabelog Hyakumeiten (食べログ百名店) — Japan's top 100 award-winning restaurants by category, listed at https://award.tabelog.com/hyakumeiten.

When a user tells you their location and food preference:
1. Search the Tabelog Hyakumeiten website for the relevant category (e.g. curry_tokyo, ramen_tokyo, sushi_tokyo, yakitori_east, french_tokyo, italian_tokyo, japanese_tokyo, etc.)
2. Find 3–5 restaurants that are geographically close to the user's stated location
3. For each restaurant include: name (Japanese + English if available), neighborhood/area, a short description, and a link to their Tabelog page
4. Clearly mention it is a Hyakumeiten award winner
5. Be concise and friendly. Format restaurant names in bold using **name**
6. Respond in English unless the user writes in Japanese`;

  const geminiMessages = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM }] },
          contents: geminiMessages,
          tools: [{ google_search: {} }],
          generationConfig: { maxOutputTokens: 1000 }
        })
      }
    );

    const data = await response.json();

    if (data.error) throw new Error(data.error.message);

    const reply = data.candidates?.[0]?.content?.parts
      ?.filter(p => p.text)
      ?.map(p => p.text)
      ?.join('\n') || "Sorry, I couldn't find results. Please try again!";

    res.status(200).json({ reply });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
