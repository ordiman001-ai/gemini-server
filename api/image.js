const IMG_MODEL = 'qwen/image';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { prompt } = req.body;
    const KEY = process.env.GEMINI_API_KEY;
    
    if (!KEY) {
        return res.status(200).json({ error: 'Нет ключа GEMINI_API_KEY. Проверь Environment Variables на Vercel.' });
    }

    const body = {
      model: IMG_MODEL,
      prompt: 'Мотивационная иллюстрация без текста на картинке: ' + prompt,
      n: 1,
      response_format: 'b64_json' // Просим сервер вернуть картинку кодом, чтобы сразу показать её
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
    
    // Если прокси-сервер выдал ошибку
    if (data.error) {
        return res.status(200).json({ error: data.error.message || 'Ошибка API Polza' });
    }
    
    // Защита от асинхронных ответов (очередей)
    if (data.requestId) {
        return res.status(200).json({ error: 'Сервер сейчас перегружен и поставил запрос в очередь. Попробуй еще раз чуть позже.' });
    }

    // Пытаемся достать картинку в формате base64
    const b64 = data.data && data.data[0] && data.data[0].b64_json;
    if (!b64) {
        // Запасной план: если Polza AI прислал прямую ссылку (URL) вместо base64
        const url = data.data && data.data[0] && data.data[0].url;
        if (url) {
            return res.status(200).json({ image: url });
        }
        
        // Если ответ вообще не содержит картинки
        return res.status(200).json({ error: 'Неожиданный ответ от Polza: ' + JSON.stringify(data).slice(0, 300) });
    }
    
    // Возвращаем успешный ответ с готовой картинкой
    return res.status(200).json({ image: 'data:image/png;base64,' + b64 });
    
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
};
