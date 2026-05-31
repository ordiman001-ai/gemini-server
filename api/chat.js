module.exports = async (req, res) => {
  // Разрешаем приложению обращаться к серверу
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { system, contents, wantJson } = req.body;
    const KEY = process.env.GEMINI_API_KEY;   // ключ спрятан здесь
    const MODEL = 'gemini-2.5-flash';

    const body = {
      system_instruction: { parts: [{ text: system }] },
      contents: contents,
      generationConfig: { temperature: 0.9 }
    };
    if (wantJson) body.generationConfig.responseMimeType = 'application/json';

    const r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent?key=' + KEY,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    const data = await r.json();
    let parts = (((data.candidates || [])[0] || {}).content || {}).parts;
    let raw = parts && parts[0] ? parts[0].text : '';

    if (!wantJson) return res.status(200).json({ reply: raw || '', newTasks: [] });
    raw = (raw || '').replace(/```json|```/g, '').trim();
    try {
      const p = JSON.parse(raw);
      return res.status(200).json({ reply: p.reply || raw, newTasks: Array.isArray(p.newTasks) ? p.newTasks : [] });
    } catch (e) {
      return res.status(200).json({ reply: raw, newTasks: [] });
    }
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
};
