const BASE_URL  = 'https://api.polza.ai/v1';
const IMG_MODEL = 'qwen/image';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { prompt } = req.body;
    const KEY = process.env.POLZA_API_KEY;
    if (!KEY) return res.status(200).json({ error: 'нет POLZA_API_KEY на сервере' });

    const r = await fetch(BASE_URL.replace(/\/$/, '') + '/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEY },
      body: JSON.stringify({
        model: IMG_MODEL,
        prompt: 'Motivational illustration, no text on image: ' + prompt,
        n: 1,
        size: '1024x1024'
      })
    });

    const data = await r.json();
    if (data.error) return res.status(200).json({ error: (data.error.message || JSON.stringify(data.error)) });

    const item = (data.data || [])[0] || {};
    // Вариант 1: base64
    if (item.b64_json) {
      const b = item.b64_json.startsWith('data:') ? item.b64_json : 'data:image/png;base64,' + item.b64_json;
      return res.status(200).json({ image: b });
    }
    // Вариант 2: прямая ссылка
    if (item.url) return res.status(200).json({ image: item.url });
    // Иногда модель кладёт ссылку в другое поле
    if (data.url) return res.status(200).json({ image: data.url });

    return res.status(200).json({ error: 'формат ответа не распознан: ' + JSON.stringify(data).slice(0, 400) });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
};
