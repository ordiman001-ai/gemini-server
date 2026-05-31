const MODEL = 'google/gemini-3.1-flash-lite';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { system, contents, wantJson } = req.body;
    const KEY = process.env.GEMINI_API_KEY;
    if (!KEY) return res.status(200).json({ reply: 'На сервере не задан GEMINI_API_KEY.', newTasks: [] });

    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    
    if (contents && Array.isArray(contents)) {
      contents.forEach(msg => {
        const text = msg.parts && msg.parts[0] ? msg.parts[0].text : '';
        messages.push({ role: msg.role === 'model' ? 'assistant' : 'user', content: text });
      });
    }

    const body = { model: MODEL, messages: messages, temperature: 0.9 };
    if (wantJson) body.response_format = { type: "json_object" };

    const r = await fetch('https://api.polza.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
      body: JSON.stringify(body)
    });
    
    const data = await r.json();
    if (data.error) return res.status(200).json({ reply: 'Ошибка API: ' + (data.error.message || JSON.stringify(data.error)), newTasks: [] });

    let raw = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';
    if (!raw) return res.status(200).json({ reply: 'Пустой ответ от прокси', newTasks: [] });

    if (!wantJson) return res.status(200).json({ reply: raw, newTasks: [] });
    
    raw = raw.replace(/```json|```/g, '').trim();
    try {
      const p = JSON.parse(raw);
      return res.status(200).json({ 
        reply: p.reply || raw, 
        newTasks: Array.isArray(p.newTasks) ? p.newTasks : [],
        imagePrompt: p.imagePrompt || null // Теперь сервер отправляет картинку в приложение
      });
    } catch (e) {
      return res.status(200).json({ reply: raw, newTasks: [], imagePrompt: null });
    }
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
};
