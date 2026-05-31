const MODEL = 'gemini-2.5-flash';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { system, contents, wantJson } = req.body;
    const KEY = process.env.GEMINI_API_KEY;
    if (!KEY) return res.status(200).json({ reply: 'На сервере не задан GEMINI_API_KEY. Проверь Environment Variables на Vercel и сделай Redeploy.', newTasks: [] });

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

    if (data.error) {
      return res.status(200).json({ reply: 'Ошибка Gemini: ' + (data.error.message || JSON.stringify(data.error)), newTasks: [] });
    }

    let parts = (((data.candidates || [])[0] || {}).content || {}).parts;
    let raw = parts && parts[0] ? parts[0].text : '';
    if (!raw) return res.status(200).json({ reply: 'Пустой ответ. Сырой ответ Google: ' + JSON.stringify(data).slice(0, 300), newTasks: [] });

    if (!wantJson) return res.status(200).json({ reply: raw, newTasks: [] });
    raw = raw.replace(/```json|```/g, '').trim();
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
