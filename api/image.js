const IMG_MODEL = 'google/gemini-2.5-flash-image';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { prompt } = req.body;
    const KEY = process.env.GEMINI_API_KEY;
    if (!KEY) return res.status(200).json({ error: 'нет ключа GEMINI_API_KEY' });

    const body = {
      model: IMG_MODEL,
      prompt: 'Мотивационная иллюстрация без текста на картинке: ' + prompt,
      n: 1,
      response_format: 'b64_json'
    };

    const r = await fetch('https://api.polza.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KEY}`
      },
      body: JSON.stringify(body)
    });
    
    const data = await r.json();
    
    if (data.error) return res.status(200).json({ error: data.error.message || 'ошибка' });
    
    const b64 = data.data && data.data[0] && data.data[0].b64_json;
    if (!b64) {
        // Фолбэк: если прокси возвращает прямую ссылку на картинку вместо base64
        const url = data.data && data.data[0] && data.data[0].url;
        if (url) return res.status(200).json({ image: url });
        return res.status(200).json({ error: 'Ответ Polza: ' + JSON.stringify(data).slice(0, 600) });
    }
    
    return res.status(200).json({ image: 'data:image/png;base64,' + b64 });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
};
