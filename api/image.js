const IMG_MODEL = 'gemini-2.5-flash-image';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { prompt } = req.body;
    const KEY = process.env.GEMINI_API_KEY;
    if (!KEY) return res.status(200).json({ error: 'нет ключа GEMINI_API_KEY' });

    const r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + IMG_MODEL + ':generateContent?key=' + KEY,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Мотивационная иллюстрация без текста на картинке: ' + prompt }] }],
          generationConfig: { responseModalities: ['IMAGE'] }
        }) }
    );
    const data = await r.json();
    if (data.error) return res.status(200).json({ error: data.error.message || 'ошибка' });
    const parts = (((data.candidates || [])[0] || {}).content || {}).parts || [];
    const img = parts.find(p => p.inlineData || p.inline_data);
    const inline = img && (img.inlineData || img.inline_data);
    if (!inline) return res.status(200).json({ error: 'нет картинки. Ответ Google: ' + JSON.stringify(data).slice(0, 500) });
    return res.status(200).json({ image: 'data:' + (inline.mimeType || inline.mime_type || 'image/png') + ';base64,' + inline.data });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
};
