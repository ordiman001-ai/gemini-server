const BASE_URL = 'https://api.polza.ai/v1';
const MODEL    = 'google/gemini-3.1-flash-lite';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { system, contents, wantJson } = req.body;
    const KEY = process.env.POLZA_API_KEY;
    if (!KEY) return res.status(200).json({ reply: 'На сервере не задан POLZA_API_KEY (Vercel → Settings → Environment Variables → Redeploy).', newTasks: [] });

    let messages = [{ role: 'system', content: system }];
    (contents || []).forEach(c => {
      const text = (c.parts || []).map(p => p.text).join('\n');
      messages.push({ role: c.role === 'model' ? 'assistant' : 'user', content: text });
    });
    if (wantJson) messages.push({ role: 'system', content: 'Верни ТОЛЬКО валидный JSON без markdown. Сохраняй ВСЕ поля, которые требует основная инструкция (reply, newTasks, important, calActions).' });

    const r = await fetch(BASE_URL.replace(/\/$/, '') + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEY },
      body: JSON.stringify({ model: MODEL, messages, temperature: 0.9 })
    });
    const data = await r.json();
    if (data.error) return res.status(200).json({ reply: 'Ошибка ИИ: ' + (data.error.message || JSON.stringify(data.error)), newTasks: [] });

    let raw = (((data.choices || [])[0] || {}).message || {}).content || '';
    if (!raw) return res.status(200).json({ reply: 'Пустой ответ: ' + JSON.stringify(data).slice(0, 300), newTasks: [] });

    if (!wantJson) return res.status(200).json({ reply: raw, newTasks: [] });
    raw = raw.replace(/```json|```/g, '').trim();
    try { const p = JSON.parse(raw); return res.status(200).json({ reply: p.reply || raw, newTasks: Array.isArray(p.newTasks) ? p.newTasks : [], important: typeof p.important === 'string' ? p.important : '', calActions: Array.isArray(p.calActions) ? p.calActions : (p.calAction ? [p.calAction] : []), goalPlan: p.goalPlan || null }); }
    catch (e) { return res.status(200).json({ reply: raw, newTasks: [] }); }
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
};
