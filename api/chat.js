// === НАСТРОЙКИ ===
const BASE_URL = 'https://api.polza.ai/v1';        // адрес API Polza (если не сработает — см. чек-лист внизу)
const MODEL    = 'google/gemini-3.1-flash-lite';   // твоя модель
// =================

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { system, contents, wantJson } = req.body;
    const KEY = process.env.POLZA_API_KEY;
    if (!KEY) return res.status(200).json({ reply: 'На сервере не задан POLZA_API_KEY. Проверь Environment Variables на Vercel и сделай Redeploy.', newTasks: [] });

    // Переводим наш формат в формат OpenAI
    let messages = [{ role: 'system', content: system }];
    (contents || []).forEach(c => {
      const text = (c.parts || []).map(p => p.text).join('\n');
      messages.push({ role: c.role === 'model' ? 'assistant' : 'user', content: text });
    });
    if (wantJson) {
      messages.push({ role: 'system', content: 'Верни ТОЛЬКО валидный JSON вида {"reply":"...","newTasks":[...]} без markdown и без пояснений.' });
    }

    const r = await fetch(BASE_URL.replace(/\/$/, '') + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + KEY
      },
      body: JSON.stringify({ model: MODEL, messages: messages, temperature: 0.9 })
    });

    const data = await r.json();

    if (data.error) {
      const msg = data.error.message || JSON.stringify(data.error);
      return res.status(200).json({ reply: 'Ошибка от Polza/модели: ' + msg, newTasks: [] });
    }

    let raw = (((data.choices || [])[0] || {}).message || {}).content || '';
    if (!raw) return res.status(200).json({ reply: 'Пустой ответ сервера. Сырой ответ: ' + JSON.stringify(data).slice(0, 400), newTasks: [] });

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
