module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { prompt } = req.body;
    
    // Формируем запрос на английском для лучшего понимания моделью, добавляем фитнес-контекст
    const encodedPrompt = encodeURIComponent('motivational fitness gym aesthetic, no text, ' + prompt);
    
    // Стучимся в бесплатный синхронный API
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=800&nologo=true`;

    // Скачиваем картинку напрямую на сервере Vercel
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
        return res.status(200).json({ error: 'Не удалось сгенерировать изображение.' });
    }

    // Переводим картинку в буфер, а затем в формат base64
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    
    // Отдаем твоему приложению точно в таком же виде, как оно привыкло получать
    return res.status(200).json({ image: 'data:image/jpeg;base64,' + base64 });
    
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
};
