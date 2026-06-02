const BASE_URL = 'https://api.polza.ai/v1';
const VISION_MODEL = 'google/gemma-3-4b-it'; // мультимодальная модель (принимает фото). Уточни точный id в каталоге Polza.

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { image, caption, system } = req.body;
    const KEY = process.env.POLZA_API_KEY;
    if (!KEY) return res.status(200).json({ reply: '' });

    const messages = [
      { role: 'system', content: system || 'Ты дружелюбный тренер. Опиши, что на фото, и поддержи пользователя.' },
      { role: 'user', content: [
        { type: 'text', text: caption || 'Вот мой отчёт.' },
        { type: 'image_url', image_url: { url: image } }
      ]}
    ];

    const r = await fetch(BASE_URL + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEY },
      body: JSON.stringify({ model: VISION_MODEL, messages, temperature: 0.8 })
    });
    const data = await r.json();
    if (data.error) return res.status(200).json({ reply: '' }); // тихий откат — приложение ответит обычным способом
    const reply = (((data.choices || [])[0] || {}).message || {}).content || '';
    return res.status(200).json({ reply });
  } catch (e) {
    return res.status(200).json({ reply: '' });
  }
};
